/*
  wifiassistant - Termux uyumlu (PRO)
  Author: benygt45
*/

const { execSync } = require("child_process");
const readline = require("readline");
const fs = require("fs");
const os = require("os");
const path = require("path");

function cmd(c) {
  try {
    return execSync(c, { encoding: "utf8", stdio: ["pipe","pipe","ignore"] });
  } catch {
    return "";
  }
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const C = { c:"\x1b[36m", g:"\x1b[32m", y:"\x1b[33m", r:"\x1b[31m", x:"\x1b[0m" };

const LOG_FILE = path.join(os.homedir(), "wifiassistant.log");
const BACKUP_FILE = path.join(os.homedir(), "wifi_profiles_backup.json");

function logEvent(type, msg) {
  fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] [${type}] ${msg}\n`);
}

function banner(){
  console.clear();
  console.log(`${C.c}
 __      ___ _____ ___ ___ ___ ___ ___ _____ ___ ___
 \\ \\    / (_)  ___|_ _/ __| __| _ \\ __|_   _| __| _ \\
  \\ \\/\\/ /| | |_   | | (__| _||  _/ _|  | | | _||   /
   \\_/\\_/ |_|_|   |___\\___|___|_| |___| |_| |___|_|_\\
${C.x}`);
  console.log(`${C.g}wifiassistant PRO | Termux / Linux | by benygt45${C.x}\n`);

  console.log("[1] Kayitli Wi-Fi Profilleri");
  console.log("[2] Aktif Wi-Fi Bilgisi");
  console.log("[3] Cevredeki Wi-Fi Aglarini Tara");
  console.log("[4] IP Bilgisi");
  console.log("[5] Gateway / DNS");
  console.log("[6] Gelismis Baglanti Testi (PRO)");
  console.log("[7] Ag Arayuzleri");
  console.log("[8] MAC Adresi");
  console.log("[9] Guvenlik Uyarilari (PRO)");
  console.log("[10] Wi-Fi Baglantisini Kes");
  console.log("[11] Wi-Fi'ye Baglan");
  console.log("[12] MTU Bilgisi");
  console.log("[13] DHCP Bilgisi");
  console.log("[14] Sistem Bilgisi");
  console.log("[15] JSON Rapor Olustur");
  console.log("[16] TXT Rapor Olustur");
  console.log("[17] Wi-Fi Profil Yedekle (PRO)");
  console.log("[18] Wi-Fi Profil Geri Yukle (PRO)");
  console.log("[19] QR Wi-Fi Olustur (PRO)");
  console.log("[20] Loglari Goruntule (PRO)");
  console.log("[21] Yardim");
  console.log("[0] Exit\n");
}

// ---------- BASIC ----------
const profiles = () => cmd("nmcli connection show");
const activeWifi = () => cmd("nmcli -t -f active,ssid,signal dev wifi | grep '^yes'");
const scanWifi = () => cmd("nmcli -t -f in-use,ssid,bssid,security,signal dev wifi list");
const ipInfo = () => cmd("ip addr");
const gatewayDns = () => cmd("ip route && cat /etc/resolv.conf");
const interfaces = () => cmd("ip link");
const macAddr = () => cmd("ip link show | grep link/ether");
const mtuInfo = () => cmd("ip link show | grep mtu");
const dhcpInfo = () => cmd("nmcli device show");
const systemInfo = () => `OS: ${os.type()} ${os.release()}\nUser: ${os.userInfo().username}`;

// ---------- PRO ----------
function backupProfiles() {
  const raw = profiles();
  fs.writeFileSync(BACKUP_FILE, JSON.stringify({ date:new Date(), data:raw }, null, 2));
  logEvent("BACKUP", "Wi-Fi profilleri yedeklendi");
  return `Yedek alindi: ${BACKUP_FILE}`;
}

function restoreProfiles() {
  if(!fs.existsSync(BACKUP_FILE)) return "Yedek bulunamadi.";
  logEvent("RESTORE", "Profil geri yukleme denemesi");
  return "Geri yukleme Termux/Linux sinirlarina baglidir.";
}

function advancedTest() {
  const res = cmd("ping -c 5 8.8.8.8");
  if(!res) return "Ping basarisiz.";
  const loss = res.match(/(\\d+)% packet loss/);
  const avg = res.match(/= [\\d.]+\\/([\\d.]+)\\//);
  const score = loss && avg ? Math.max(0,100-parseInt(loss[1])-parseFloat(avg[1])) : "N/A";
  logEvent("TEST", `Loss:${loss ? loss[1] : "?"} Avg:${avg ? avg[1] : "?"} Score:${score}`);
  return res + "\nStabilite Skoru: " + score;
}

function securityCheck() {
  const list = scanWifi();
  if(!list) return "Tarama yapilamadi.";
  let warn = "";
  const seen = {};
  list.split("\n").forEach(l=>{
    const p = l.split(":");
    if(p.length < 4) return;
    if(seen[p[1]] && seen[p[1]] !== p[2]) warn += "SSID spoof supheli: " + p[1] + "\n";
    if(p[3] === "--") warn += "Acik ag: " + p[1] + "\n";
    seen[p[1]] = p[2];
  });
  if(warn) logEvent("SECURITY", warn.trim());
  return warn || "Risk tespit edilmedi.";
}

function qrWifi() {
  const info = activeWifi();
  if(!info) return "Aktif Wi-Fi yok.";
  const ssid = info.split(":")[1];
  const qr = `WIFI:T:WPA;S:${ssid};P:password;;`;
  try {
    execSync(`qrencode -o ${ssid}.png "${qr}"`);
    return `QR olusturuldu: ${ssid}.png`;
  } catch {
    return "QR STRING:\n" + qr;
  }
}

// ---------- REPORTS ----------
function jsonReport() {
  const file = path.join(os.homedir(), "wifiassistant_report.json");
  const data = { ip: ipInfo(), wifi: scanWifi(), system: systemInfo() };
  fs.writeFileSync(file, JSON.stringify(data,null,2));
  return file;
}

function txtReport() {
  const file = path.join(os.homedir(), "wifiassistant_report.txt");
  fs.writeFileSync(file, systemInfo() + "\n\n" + scanWifi());
  return file;
}

// ---------- HELP ----------
function helpMenu() {
  return `
wifiassistant PRO - Yardim

- Wi-Fi profil yedekleme / geri yukleme
- Gelismis baglanti testi
- Guvenlik uyarilari
- Loglama
- QR Wi-Fi

Not: Root yoksa bazi ozellikler sinirlidir.
`;
}

// ---------- MENU ----------
function pause() { rl.question("\nEnter", menu); }

function menu() {
  banner();
  rl.question("> ", c => {
    if(c==="1"){ console.log(profiles()); return pause(); }
    if(c==="2"){ console.log(activeWifi()); return pause(); }
    if(c==="3"){ console.log(scanWifi()); return pause(); }
    if(c==="4"){ console.log(ipInfo()); return pause(); }
    if(c==="5"){ console.log(gatewayDns()); return pause(); }
    if(c==="6"){ console.log(advancedTest()); return pause(); }
    if(c==="7"){ console.log(interfaces()); return pause(); }
    if(c==="8"){ console.log(macAddr()); return pause(); }
    if(c==="9"){ console.log(securityCheck()); return pause(); }
    if(c==="12"){ console.log(mtuInfo()); return pause(); }
    if(c==="13"){ console.log(dhcpInfo()); return pause(); }
    if(c==="14"){ console.log(systemInfo()); return pause(); }
    if(c==="15"){ console.log("Olusturuldu:", jsonReport()); return pause(); }
    if(c==="16"){ console.log("Olusturuldu:", txtReport()); return pause(); }
    if(c==="17"){ console.log(backupProfiles()); return pause(); }
    if(c==="18"){ console.log(restoreProfiles()); return pause(); }
    if(c==="19"){ console.log(qrWifi()); return pause(); }
    if(c==="20"){ console.log(fs.existsSync(LOG_FILE)?fs.readFileSync(LOG_FILE,"utf8"):"Log yok"); return pause(); }
    if(c==="21"){ console.log(helpMenu()); return pause(); }
    if(c==="0"){ rl.close(); process.exit(0); }
    menu();
  });
}

menu();
