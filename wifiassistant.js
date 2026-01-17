const { execSync } = require("child_process");
const readline = require("readline");
const fs = require("fs");
const os = require("os");
const path = require("path");

function cmd(c) {
  try { return execSync(c, { encoding: "utf8" }); }
  catch (e) { return e.stdout || e.message; }
}

function isAdmin() {
  try { execSync("net session", { stdio: "ignore" }); return true; }
  catch { return false; }
}

if (!isAdmin()) {
  console.log("CMD'yi YONETICI olarak acmalisin.");
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

// ---------- UI ----------
const C = {
  r: "\x1b[31m", g: "\x1b[32m", y: "\x1b[33m", b: "\x1b[34m",
  c: "\x1b[36m", w: "\x1b[37m", x: "\x1b[0m"
};

function banner() {
  console.clear();
  console.log(`${C.c}
 __      ___ _____ ___ ___ ___ ___ ___ _____ ___ ___
 \\ \\    / (_)  ___|_ _/ __| __| _ \\ __|_   _| __| _ \\
  \\ \\/\\/ /| | |_   | | (__| _||  _/ _|  | | | _||   /
   \\_/\\_/ |_|_|   |___\\___|___|_| |___| |_| |___|_|_\\
${C.x}`);
  console.log(`${C.g}wifiassistant | Windows${C.x}\n`);
  console.log("[1] Kayitli Wi-Fi Listesi");
  console.log("[2] Wi-Fi Sifresi Goster");
  console.log("[3] IP Bilgisi");
  console.log("[4] Aktif Wi-Fi Bilgisi");
  console.log("[5] Cevredeki Wi-Fi Aglarini Tara");
  console.log("[6] Sifreleme / Kanal / BSSID Analizi");
  console.log("[7] Internet Var mi? (Ping)");
  console.log("[8] Gateway / DNS");
  console.log("[9] Wi-Fi'ye Baglan");
  console.log("[10] Wi-Fi Baglantisini Kes");
  console.log("[11] INTERNETI Ac / Kapat");
  console.log("[12] IP Yenile (release/renew)");
  console.log("[13] Event Log Ozeti");
  console.log("[14] Rapor Olustur (TXT)");
  console.log("[15] JSON Rapor Export");
  console.log("[16] MAC / MTU / DHCP");
  console.log("[17] Surucu & Sistem Bilgisi");
  console.log("[18] Yardim");
  console.log("[0] Exit\n");
}

// ---------- CORE ----------
function getProfiles() {
  return cmd("netsh wlan show profiles")
    .split("\n").filter(x => x.includes("All User Profile"))
    .map(x => x.split(":")[1].trim());
}

function getPassword(ssid) {
  const d = cmd(`netsh wlan show profile name="${ssid}" key=clear`);
  const l = d.split("\n").find(x => x.includes("Key Content"));
  return l ? l.split(":")[1].trim() : "Yok";
}

function activeWifi() { return cmd("netsh wlan show interfaces"); }
function scanWifi() { return cmd("netsh wlan show networks mode=bssid"); }

function encryptionAndChannel() {
  const s = scanWifi();
  const lines = s.split("\n").filter(l =>
    l.includes("Authentication") || l.includes("Channel") || l.includes("SSID")
  );
  return lines.join("\n");
}

function pingCheck() { return cmd("ping -n 2 8.8.8.8"); }
function gatewayDNS() { return cmd("ipconfig /all"); }

function connectWifi(ssid) { return cmd(`netsh wlan connect name="${ssid}"`); }
function disconnectWifi() { return cmd("netsh wlan disconnect"); }

function activeInterfaceName() {
  const t = cmd("netsh interface show interface");
  const l = t.split("\n").find(x => x.includes("Connected"));
  return l ? l.trim().split(/\s+/).slice(-1)[0] : null;
}

function internetToggle() {
  const iface = activeInterfaceName();
  if (!iface) return "Aktif interface bulunamadi.";
  const state = cmd("netsh interface show interface")
    .includes(`Connected     ${iface}`) ? "disable" : "enable";
  return cmd(`netsh interface set interface "${iface}" admin=${state}`);
}

function ipRenew() { return cmd("ipconfig /release & ipconfig /renew"); }

function eventLogSummary() {
  return cmd(`wevtutil qe Microsoft-Windows-WLAN-AutoConfig/Operational /c:10 /f:text`);
}

function macMtuDhcp() {
  return cmd("getmac /v & netsh interface ipv4 show subinterfaces & netsh interface ipv4 show config");
}

function driverSystemInfo() {
  return cmd("netsh wlan show drivers") + "\n" +
         `OS: ${os.type()} ${os.release()}\nUser: ${os.userInfo().username}`;
}

// ---------- REPORTS ----------
function createTxtReport() {
  const f = path.join(os.homedir(), "Desktop", "wifiassistant_report.txt");
  let r = "=== WIFIASSISTANT RAPOR ===\n\n";
  r += "[IP]\n" + cmd("ipconfig") + "\n";
  r += "[AKTIF]\n" + activeWifi() + "\n";
  r += "[PROFILLER]\n";
  getProfiles().forEach(p => r += `- ${p} | KEY: ${getPassword(p)}\n`);
  fs.writeFileSync(f, r, "utf8");
  return f;
}

function createJsonReport() {
  const f = path.join(os.homedir(), "Desktop", "wifiassistant_report.json");
  const o = {
    ip: cmd("ipconfig"),
    active: activeWifi(),
    profiles: getProfiles().map(p => ({ ssid: p, key: getPassword(p) })),
    system: { os: os.release(), user: os.userInfo().username }
  };
  fs.writeFileSync(f, JSON.stringify(o, null, 2), "utf8");
  return f;
}

// ---------- CLI ARGS ----------
const args = process.argv.slice(2);
if (args.includes("--scan")) { console.log(scanWifi()); process.exit(0); }
if (args.includes("--status")) { console.log(activeWifi()); process.exit(0); }

// ---------- MENU ----------
function pause() { rl.question("\nEnter", menu); }

function menu() {
  banner();
  rl.question("> ", c => {
    if (c==="1"){ banner(); getProfiles().forEach((p,i)=>console.log(`${i+1}) ${p}`)); return pause(); }
    if (c==="2"){ banner(); const l=getProfiles(); l.forEach((p,i)=>console.log(`${i+1}) ${p}`));
      return rl.question("\nNumara: ", n=>{ banner(); console.log("SSID:",l[n-1]); console.log("KEY :",getPassword(l[n-1])); pause();});}
    if (c==="3"){ banner(); console.log(cmd("ipconfig")); return pause(); }
    if (c==="4"){ banner(); console.log(activeWifi()); return pause(); }
    if (c==="5"){ banner(); console.log(scanWifi()); return pause(); }
    if (c==="6"){ banner(); console.log(encryptionAndChannel()); return pause(); }
    if (c==="7"){ banner(); console.log(pingCheck()); return pause(); }
    if (c==="8"){ banner(); console.log(gatewayDNS()); return pause(); }
    if (c==="9"){ banner(); const l=getProfiles(); l.forEach((p,i)=>console.log(`${i+1}) ${p}`));
      return rl.question("\nNumara: ", n=>{ banner(); console.log(connectWifi(l[n-1])); pause();});}
    if (c==="10"){ banner(); console.log(disconnectWifi()); return pause(); }
    if (c==="11"){ banner(); console.log(internetToggle()); return pause(); }
    if (c==="12"){ banner(); console.log(ipRenew()); return pause(); }
    if (c==="13"){ banner(); console.log(eventLogSummary()); return pause(); }
    if (c==="14"){ banner(); console.log("Olusturuldu:", createTxtReport()); return pause(); }
    if (c==="15"){ banner(); console.log("Olusturuldu:", createJsonReport()); return pause(); }
    if (c==="16"){ banner(); console.log(macMtuDhcp()); return pause(); }
    if (c==="17"){ banner(); console.log(driverSystemInfo()); return pause(); }
    if (c==="18"){ banner(); console.log("Komutlar: wifiassistant --scan | --status"); return pause(); }
    if (c==="0"){ rl.close(); process.exit(0); }
    menu();
  });
}

menu();
