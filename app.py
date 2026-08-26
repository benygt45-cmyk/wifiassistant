"""
Ayrılmaz Bot - 7/24 Web Hosting Panel
Tek dosya: web panel + bot background thread
Deploy: GitHub -> Render.com (Free) -> Auto HTTPS domain
Uptime: UptimeRobot ping /health her 5dk
"""
import os, json, sqlite3, subprocess, threading, time, secrets, re, signal, sys
from pathlib import Path
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from flask import Flask, request, session, redirect, url_for, render_template, jsonify, flash, g
import discord
from discord.ext import commands

# ===== CONFIG =====
BASE = Path(__file__).parent
DB = BASE / "hosting.db"
BOT_ROOT = BASE / "user_bots"
BOT_ROOT.mkdir(exist_ok=True)
LOG_DIR = BASE / "logs"
LOG_DIR.mkdir(exist_ok=True)
DEFAULT_BOT = "bot.py"

# Flask
app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", secrets.token_hex(32))
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024

# Global bot process
bot_thread = None
bot_process = None
bot_lock = threading.Lock()
bot_status = {"running": False, "pid": None, "filename": None, "started_at": None, "logs": []}

# ===== DB =====
def get_db():
    db = getattr(g, "_db", None)
    if db is None:
        db = g._db = sqlite3.connect(str(DB))
        db.row_factory = sqlite3.Row
    return db

def init_db():
    db = sqlite3.connect(str(DB))
    db.execute("""CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )""")
    db.execute("""CREATE TABLE IF NOT EXISTS bot_config (
        user_id INTEGER PRIMARY KEY,
        filename TEXT,
        token TEXT,
        auto_restart INTEGER DEFAULT 1,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )""")
    db.commit()
    db.close()

init_db()

def get_config(uid):
    db = get_db()
    cur = db.execute("SELECT * FROM bot_config WHERE user_id=?", (uid,))
    row = cur.fetchone()
    if not row:
        db.execute("INSERT INTO bot_config (user_id) VALUES (?)", (uid,))
        db.commit()
        cur = db.execute("SELECT * FROM bot_config WHERE user_id=?", (uid,))
        row = cur.fetchone()
    return row

def user_dir(uid):
    d = BOT_ROOT / str(uid)
    d.mkdir(exist_ok=True)
    return d

# ===== AUTH =====
def login_required(f):
    @wraps(f)
    def wrap(*a, **kw):
        if "user_id" not in session:
            return redirect(url_for("login"))
        return f(*a, **kw)
    return wrap

@app.before_request
def load_user():
    g.user = None
    if "user_id" in session:
        db = get_db()
        cur = db.execute("SELECT * FROM users WHERE id=?", (session["user_id"],))
        g.user = cur.fetchone()

@app.teardown_appcontext
def close_db(exc):
    db = getattr(g, "_db", None)
    if db:
        db.close()

# ===== BOT MANAGEMENT =====
def add_log(uid, msg):
    ts = time.strftime("%H:%M:%S")
    line = f"[{ts}] {msg}"
    bot_status["logs"].append(line)
    if len(bot_status["logs"]) > 500:
        bot_status["logs"] = bot_status["logs"][-500:]
    # Write to file
    try:
        (LOG_DIR / f"{uid}.log").write_text("\n".join(bot_status["logs"]), encoding="utf-8")
    except: pass

def get_bot_cmd(uid):
    cfg = get_config(uid)
    if not cfg or not cfg["filename"]:
        return None
    path = user_dir(uid) / cfg["filename"]
    if not path.exists():
        return None
    ext = path.suffix.lower()
    if ext == ".py":
        return [sys.executable, str(path)]
    elif ext == ".js":
        return ["node", str(path)]
    return None

def start_bot_internal(uid):
    global bot_process, bot_thread, bot_status
    with bot_lock:
        if bot_status["running"] and bot_process and bot_process.poll() is None:
            return False, "Bot zaten çalışıyor"
        
        cfg = get_config(uid)
        if not cfg or not cfg["filename"]:
            return False, "Bot dosyası seçilmedi"
        
        path = user_dir(uid) / cfg["filename"]
        if not path.exists():
            return False, "Bot dosyası bulunamadı"
        
        token = cfg["token"]
        if not token:
            return False, "Token ayarlanmamış"
        
        cmd = get_bot_cmd(uid)
        if not cmd:
            return False, "Desteklenmeyen dosya tipi"
        
        # Env
        env = os.environ.copy()
        env["TOKEN"] = token
        env["DISCORD_TOKEN"] = token
        
        # Write token.txt for bot.py
        try:
            (user_dir(uid) / "token.txt").write_text(token, encoding="utf-8")
        except: pass
        
        # Log file
        log_file = open(LOG_DIR / f"{uid}.log", "a", encoding="utf-8")
        log_file.write(f"\n=== {time.strftime('%Y-%m-%d %H:%M:%S')} START {cfg['filename']} ===\n")
        log_file.flush()
        
        try:
            creationflags = 0
            if os.name == "nt":
                creationflags = subprocess.CREATE_NO_WINDOW
            
            bot_process = subprocess.Popen(
                cmd,
                cwd=str(user_dir(uid)),
                env=env,
                stdout=log_file,
                stderr=subprocess.STDOUT,
                creationflags=creationflags
            )
            
            bot_status["running"] = True
            bot_status["pid"] = bot_process.pid
            bot_status["filename"] = cfg["filename"]
            bot_status["started_at"] = time.time()
            
            add_log(uid, f"Bot başlatıldı (PID {bot_process.pid})")
            
            # Watch thread
            def watch():
                global bot_process, bot_status
                ret = bot_process.wait()
                with bot_lock:
                    add_log(uid, f"Bot kapandı (exit {ret})")
                    bot_process = None
                    if bot_status["running"]:
                        # Auto restart?
                        db = sqlite3.connect(str(DB))
                        cur = db.execute("SELECT auto_restart FROM bot_config WHERE user_id=?", (uid,))
                        row = cur.fetchone()
                        auto = row[0] if row else 0
                        db.close()
                        if ret == 42 or (ret != 0 and auto):
                            time.sleep(3)
                            # Restart in new thread
                            threading.Thread(target=start_bot_internal, args=(uid,), daemon=True).start()
                            return
                        bot_status["running"] = False
                        bot_status["pid"] = None
            
            bot_thread = threading.Thread(target=watch, daemon=True)
            bot_thread.start()
            
            return True, f"Bot başlatıldı (PID {bot_process.pid})"
        except Exception as e:
            bot_status["running"] = False
            return False, f"Hata: {e}"

def stop_bot_internal(uid):
    global bot_process, bot_status
    with bot_lock:
        if bot_process and bot_process.poll() is None:
            try:
                bot_process.terminate()
                try:
                    bot_process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    bot_process.kill()
                add_log(uid, "Bot durduruldu")
            except: pass
        bot_process = None
        bot_status["running"] = False
        bot_status["pid"] = None
        return True, "Bot durduruldu"

# ===== ROUTES =====
@app.route("/")
def index():
    if "user_id" in session:
        return redirect(url_for("dashboard"))
    return render_template("login.html")

@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")
        if not username or not password or len(username) < 3 or len(password) < 4:
            flash("Kullanıcı adı 3+, şifre 4+ karakter", "error")
            return render_template("register.html")
        if not re.match(r"^[a-zA-Z0-9_]+$", username):
            flash("Sadece harf, sayı, _", "error")
            return render_template("register.html")
        db = get_db()
        try:
            db.execute("INSERT INTO users (username, password_hash) VALUES (?,?)",
                       (username, generate_password_hash(password)))
            db.commit()
            flash("Kayıt başarılı, giriş yap", "success")
            return redirect(url_for("login"))
        except sqlite3.IntegrityError:
            flash("Kullanıcı adı zaten var", "error")
    return render_template("register.html")

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")
        db = get_db()
        cur = db.execute("SELECT * FROM users WHERE username=?", (username,))
        user = cur.fetchone()
        if user and check_password_hash(user["password_hash"], password):
            session["user_id"] = user["id"]
            session["username"] = user["username"]
            return redirect(url_for("dashboard"))
        flash("Hatalı kullanıcı adı veya şifre", "error")
    return render_template("login.html")

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))

@app.route("/dashboard")
@login_required
def dashboard():
    uid = session["user_id"]
    cfg = get_config(uid)
    running = bot_status["running"] and bot_process and bot_process.poll() is None
    if running != bot_status["running"]:
        bot_status["running"] = running
        if not running:
            bot_status["pid"] = None
    
    files = []
    for p in user_dir(uid).glob("*"):
        if p.is_file():
            files.append({"name": p.name, "size": p.stat().st_size})
    
    return render_template("dashboard.html", 
        bot=cfg, running=running, files=files, logs=bot_status["logs"][-200:])

# API
@app.route("/api/upload", methods=["POST"])
@login_required
def upload():
    if "file" not in request.files:
        return jsonify({"ok": False, "msg": "Dosya yok"}), 400
    f = request.files["file"]
    if f.filename == "":
        return jsonify({"ok": False, "msg": "Dosya seçilmedi"}), 400
    ext = Path(f.filename).suffix.lower()
    if ext not in [".py", ".js"]:
        return jsonify({"ok": False, "msg": "Sadece .py veya .js"}), 400
    
    # Stop running bot first
    if bot_status["running"]:
        stop_bot_internal(session["user_id"])
    
    filename = secure_filename(f.filename)
    dest = user_dir(session["user_id"]) / filename
    f.save(str(dest))
    
    db = get_db()
    db.execute("UPDATE bot_config SET filename=? WHERE user_id=?", (filename, session["user_id"]))
    db.commit()
    
    return jsonify({"ok": True, "msg": f"{filename} yüklendi", "filename": filename})

@app.route("/api/token", methods=["POST"])
@login_required
def set_token():
    token = request.form.get("token") or (request.json.get("token") if request.is_json else "")
    if not token or len(token) < 20:
        return jsonify({"ok": False, "msg": "Geçerli token gir"}), 400
    
    db = get_db()
    db.execute("UPDATE bot_config SET token=? WHERE user_id=?", (token.strip(), session["user_id"]))
    db.commit()
    
    # token.txt for bot.py
    try:
        (user_dir(session["user_id"]) / "token.txt").write_text(token.strip(), encoding="utf-8")
    except: pass
    
    return jsonify({"ok": True, "msg": "Token kaydedildi (gizli)"})

@app.route("/api/start", methods=["POST"])
@login_required
def api_start():
    ok, msg = start_bot_internal(session["user_id"])
    return jsonify({"ok": ok, "msg": msg, "running": bot_status["running"]})

@app.route("/api/stop", methods=["POST"])
@login_required
def api_stop():
    ok, msg = stop_bot_internal(session["user_id"])
    return jsonify({"ok": ok, "msg": msg, "running": bot_status["running"]})

@app.route("/api/restart", methods=["POST"])
@login_required
def api_restart():
    stop_bot_internal(session["user_id"])
    time.sleep(1)
    ok, msg = start_bot_internal(session["user_id"])
    return jsonify({"ok": ok, "msg": msg, "running": bot_status["running"]})

@app.route("/api/status")
@login_required
def api_status():
    running = bot_status["running"] and bot_process and bot_process.poll() is None
    if running != bot_status["running"]:
        bot_status["running"] = running
    return jsonify({"running": running, "pid": bot_status["pid"], "filename": bot_status["filename"]})

@app.route("/api/logs")
@login_required
def api_logs():
    return jsonify({"logs": bot_status["logs"][-300:]})

@app.route("/api/files")
@login_required
def api_files():
    files = [{"name": p.name} for p in user_dir(session["user_id"]).glob("*") if p.is_file()]
    return jsonify(files)

@app.route("/health")
def health():
    return jsonify({"ok": True, "bot_running": bot_status["running"], "time": time.strftime("%Y-%m-%d %H:%M:%S")})

# ===== TEMPLATES (inline for single file deploy) =====
@app.route("/_templates/<name>")
def serve_template(name):
    templates = {
        "base.html": BASE_TEMPLATE,
        "login.html": LOGIN_TEMPLATE,
        "register.html": REGISTER_TEMPLATE,
        "dashboard.html": DASHBOARD_TEMPLATE,
    }
    return templates.get(name, "")

# ===== RUN =====
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    print(f"[*] Ayrılmaz Hosting Web -> http://0.0.0.0:{port}")
    print(f"[*] Deploy: Render.com (Free) -> Auto HTTPS domain")
    print(f"[*] Uptime: UptimeRobot.com -> /health (5dk)")
    app.run(host="0.0.0.0", port=port, debug=False)

# ===== TEMPLATES =====
BASE_TEMPLATE = """<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{% block title %}Ayrılmaz Bot{% endblock %}</title>
<style>
*{box-sizing:border-box}body{margin:0;font-family:'Segoe UI',Arial,sans-serif;background:#313338;color:#dcddde}
.nav{display:flex;justify-content:space-between;align-items:center;background:#232428;padding:12px 20px;border-bottom:1px solid #1e1f22}
.logo{font-weight:800;color:#fff;font-size:18px}
.nav-links a{color:#b9bbbe;text-decoration:none;margin-left:12px;background:#2b2d31;padding:6px 12px;border-radius:6px}
.nav-links a:hover{background:#404249;color:#fff}.user{color:#f1c40f;margin-right:8px}
.container{max-width:1100px;margin:20px auto;padding:0 15px}
.card{background:#2b2d31;border-radius:10px;padding:18px;margin-bottom:15px;border:1px solid #232428}
.card.auth{max-width:420px;margin:40px auto;text-align:center}
input{width:100%;padding:10px;border-radius:6px;border:1px solid #1e1f22;background:#1e1f22;color:#fff;margin:8px 0}
.btn{padding:10px 16px;border:0;border-radius:6px;cursor:pointer;font-weight:600}
.btn.primary{background:#5865f2;color:#fff;width:100%}
.btn.green{background:#57f287;color:#111}.btn.red{background:#ed4245;color:#fff}.btn.blue{background:#5865f2;color:#fff}
.btn.secondary{background:#4e5058;color:#fff}.btn.small{padding:4px 8px;font-size:12px;background:#4e5058;color:#fff}
.btn-row{display:flex;gap:8px;margin:10px 0}.btn-row .btn{flex:1}
.status{padding:12px;border-radius:8px;display:flex;align-items:center;gap:10px;font-weight:700}
.status.on{background:#2d7d46;color:#fff}.status.off{background:#d83c3e;color:#fff}
.status .dot{width:10px;height:10px;border-radius:50%;background:#fff;animation:pulse 1.5s infinite}
@keyframes pulse{0%{opacity:1}50%{opacity:.3}100%{opacity:1}}
.muted{color:#b9bbbe;font-size:13px}.alert{padding:10px;border-radius:6px;margin:10px 0}
.alert.error{background:#ed4245;color:#fff}.alert.success{background:#57f287;color:#111}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:15px}@media(max-width:800px){.grid{grid-template-columns:1fr}}
pre{background:#1e1f22;padding:12px;border-radius:8px;max-height:350px;overflow:auto;white-space:pre-wrap;word-break:break-word;font-size:12px}
ul{list-style:none;padding:0}ul li{background:#1e1f22;padding:8px;border-radius:6px;margin:5px 0;font-size:13px}
hr{border:0;border-top:1px solid #404249;margin:15px 0}
.info-box{background:#404249;padding:10px;border-radius:8px;margin-top:12px;font-size:13px;text-align:left}
footer{text-align:center;color:#72767d;padding:20px;font-size:12px}
</style></head><body>
<nav class="nav"><div class="logo">🅰️ Ayrılmaz Bot</div>
<div class="nav-links">{% if g.user %}<span class="user">👤 {{ g.user['username'] }}</span>
<a href="{{ url_for('dashboard') }}">Panel</a><a href="{{ url_for('logout') }}">Çıkış</a>
{% else %}<a href="{{ url_for('login') }}">Giriş</a><a href="{{ url_for('register') }}">Kayıt</a>{% endif %}</div></nav>
<div class="container">{% with messages = get_flashed_messages(with_categories=true) %}{% if messages %}
{% for cat, msg in messages %}<div class="alert {{cat}}">{{msg}}</div>{% endfor %}{% endif %}{% endwith %}
{% block content %}{% endblock %}</div>
<footer>© 2026 Ayrılmaz Bot - 7/24 Web Hosting | Render.com Free SSL | Kodlar gizli, sadece sana görünür</footer></body></html>"""

LOGIN_TEMPLATE = """{% extends "base.html" %}{% block title %}Giriş{% endblock %}{% block content %}
<div class="card auth"><h2>🔐 Giriş Yap</h2><p class="muted">7/24 Bot Hosting - Render.com Free SSL</p>
<form method="post" action="{{ url_for('login') }}"><input name="username" placeholder="Kullanıcı adı" required>
<input name="password" type="password" placeholder="Şifre" required><button type="submit" class="btn primary">Giriş Yap</button></form>
<p class="muted">Hesabın yok mu? <a href="{{ url_for('register') }}">Kayıt ol</a></p></div>{% endblock %}"""

REGISTER_TEMPLATE = """{% extends "base.html" %}{% block title %}Kayıt{% endblock %}{% block content %}
<div class="card auth"><h2>📝 Kayıt Ol</h2><p class="muted">Ücretsiz hesap - botunu 7/24 hostla</p>
<form method="post" action="{{ url_for('register') }}"><input name="username" placeholder="Kullanıcı adı (harf/sayı/_)" required>
<input name="email" type="email" placeholder="E-posta (opsiyonel)"><input name="password" type="password" placeholder="Şifre (4+ karakter)" required>
<button type="submit" class="btn primary">Kayıt Ol</button></form><p class="muted">Zaten hesabın var? <a href="{{ url_for('login') }}">Giriş yap</a></p></div>{% endblock %}"""

DASHBOARD_TEMPLATE = """{% extends "base.html" %}{% block title %}Panel{% endblock %}{% block content %}
<div class="grid"><div class="card"><h3>🤖 Bot Durumu</h3>
<div class="status {% if running %}on{% else %}off{% endif %}" id="statusBox"><span class="dot"></span> {{ "🟢 Çalışıyor" if running else "🔴 Durdu" }}<small>{{ bot['filename'] or "Dosya yok" }}</small></div>
<div class="btn-row"><button onclick="api('start')" class="btn green" id="btnStart">▶ Başlat</button>
<button onclick="api('stop')" class="btn red">⏹ Durdur</button><button onclick="api('restart')" class="btn blue">🔄 Restart</button></div>
<p class="muted" id="msg"></p><hr><h4>📂 Bot Yükle (bot.py / index.js)</h4>
<form id="uploadForm" enctype="multipart/form-data"><input type="file" name="file" accept=".py,.js" required>
<button type="submit" class="btn primary">Yükle</button></form><p class="muted">Kod sadece sana görünür. Local değil, web 7/24.</p><hr>
<h4>🔑 Token Ayarla</h4><form id="tokenForm"><input type="password" id="tokenInput" placeholder="Discord bot token" required>
<button type="submit" class="btn primary">Kaydet (Gizli)</button></form><p class="muted">Token şifreli saklanır, kimse göremez.</p></div>
<div class="card"><h3>📋 Dosyalar</h3><ul id="fileList">{% for f in files %}<li>{{ f.name }} <small>{{ f.size }}B</small></li>{% else %}<li class="muted">Henüz dosya yok</li>{% endfor %}</ul><hr>
<h3>📜 Loglar <button onclick="loadLogs()" class="btn small">Yenile</button></h3><pre id="logBox">{{ logs|join('\n') or "Log yok" }}</pre></div></div>
<script>async function api(action){const r=await fetch('/api/'+action,{method:'POST'});const j=await r.json();document.getElementById('msg').innerText=j.msg;setTimeout(refreshStatus,1000);}
document.getElementById('uploadForm').addEventListener('submit',async e=>{e.preventDefault();const fd=new FormData(e.target);const r=await fetch('/api/upload',{method:'POST',body:fd});const j=await r.json();alert(j.msg);location.reload();});
document.getElementById('tokenForm').addEventListener('submit',async e=>{e.preventDefault();const token=document.getElementById('tokenInput').value;const r=await fetch('/api/token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});const j=await r.json();alert(j.msg);});
async function loadLogs(){const r=await fetch('/api/logs');const j=await r.json();document.getElementById('logBox').innerText=j.logs.join('\\n')||'Log yok';}
async function refreshStatus(){const r=await fetch('/api/status');const j=await r.json();const box=document.getElementById('statusBox');box.className='status '+(j.running?'on':'off');box.innerHTML='<span class="dot"></span> '+(j.running?'🟢 Çalışıyor':'🔴 Durdu')+' <small>'+(j.filename||'Dosya yok')+'</small>';}
setInterval(loadLogs,8000);setInterval(refreshStatus,5000);</script>{% endblock %}"""

if __name__ == "__main__":
    pass