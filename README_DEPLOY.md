# Ayrılmaz Bot - 7/24 Web Hosting Deploy
# Tek komutla GitHub'a push ve Render'a deploy

## 1. GitHub Repo Oluştur
# GitHub.com -> New Repository -> "ayrilmaz-bot" (Public)

## 2. Bu klasörü GitHub'a Push
git init
git add .
git commit -m "Initial deploy"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADIN/ayrilmaz-bot.git
git push -u origin main

## 3. Render.com Deploy (Otomatik)
# 1. https://dashboard.render.com -> New + -> Blueprint
# 2. GitHub repo seç -> "ayrilmaz-bot"
# 3. render.yaml otomatik algılanır -> Apply
# 4. 2-3 dakika sonra: https://ayrilmaz-bot.onrender.com (Free HTTPS domain)

## 4. 7/24 Uptime (Bot asla uyumaz)
# https://uptimerobot.com -> Free hesap -> New Monitor
# Type: HTTP(s) | URL: https://ayrilmaz-bot.onrender.com/health | Interval: 5 minutes

## 5. Kullanım
# 1. https://ayrilmaz-bot.onrender.com -> Kayıt ol
# 2. Panel -> bot.py dosyasını yükle (.py veya .js)
# 3. Token gir -> Kaydet
# 4. ▶ Başlat -> Bot 7/24 çalışır
# 5. Sayfayı kapatsan bile bot ARKA PLANDA çalışmaya devam eder

## Avantajlar
✅ Masaüstü uygulama YOK (tray, pythonw, CMD sorunları yok)
✅ Sayfa kapansa bile bot thread'de çalışır
✅ Render.com Free SSL domain (https://xxx.onrender.com)
✅ Kimse kodunu göremez (session ile izole)
✅ Her kullanıcı kendi botunu ayrı klasörde çalıştırır
✅ Loglar panelden canlı izlenir
✅ Token gizli saklanır

## Dosyalar
app.py          # Ana uygulama (Flask + Bot thread)
requirements.txt
Procfile        # Render start command
render.yaml     # Blueprint config
.gitignore
README_DEPLOY.md