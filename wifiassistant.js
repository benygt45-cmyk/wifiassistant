/*
  wifiassistant - Termux uyumlu
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
    return "Komut desteklenmiyor veya yetki yok.";
  }
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const C = { c:"\x1b[36m", g:"\x1b[32m", y:"\x1b[33m", r:"\x1b[31m", x:"\x1b[0m" };

function banner(){
  console.clear();
  console.log(`${C.c}
 __      ___ _____ ___ ___ ___ ___ ___ _____ ___ ___
 \\ \\    / (_)  ___|_ _/ __| __| _ \\ __|_   _| __| _ \\
  \\ \\/\\/ /| | |_   | | (__| _||  _/ _|  | | | _||   /
   \\_/\\_/ |_|_|   |___\\___|___|_| |___| |_| |___|_|_\\
${C.x}`);
  console.log(`${C.g}wifiassistant | Termux / Linux | by benygt45${C.x}\n`);

  console.log("[1] Kayitli Wi-Fi Profilleri (sınırlı)");
  console.log("[2] Aktif Wi-Fi Bilgisi (sınırlı)");
  console.log("[3] Cevredeki Wi-Fi Aglarini Tara (sınırlı)");
  console.log("[4] IP Bilgisi");
  console.log("[5] Gateway / DNS");
  console.log("[6] Internet Kontrol (Ping)");
  console.log("[7] Ag Arayuzleri");
  console.log("[8] MAC Adresi");
  console.log("[9] Kanal / Frekans Bilgisi (sınırlı)");
  console.log("[10] Wi-Fi Baglantisini Kes (root gerekebilir)");
  console.log("[11] Wi-Fi'ye Baglan (SSID, root gerekebilir)");
  console.log("[12] MTU Bilgisi");
  console.log("[13] DHCP Bilgisi");
  console.log("[14] Sistem Bilgisi");
  console.log("[15] JSON Rapor Olustur");
  console.log("[16] TXT Rapor Olustur");
  console.log("[17] Calisan Ag Servisleri (sınırlı)");
  console.log("[18] Yardim");
  console.log("[0] Exit\n");
}

// ---------- FUNCTIONS ----------
const profiles = () => "Android Termux: Wi-Fi profilleri sınırlı, root yoksa listelenemez.";
const activeWifi = () => "Android Termux: Aktif Wi-Fi bilgisi root gerekebilir.";
const scanWifi = () => cmd("nmcli device wifi list 2>/dev/null");
const ipInfo = () => cmd("ip addr");
const gatewayDns = () => cmd("ip route && resolvectl status 2>/dev/null");
const pingTest = () => cmd("ping -c 2 8.8.8.8");
const interfaces = () => cmd("ip link");
const macAddr = () => cmd("ip link show | grep link/ether");
const channelInfo = () => "Android Termux: Kanal bilgisi root gerekebilir.";
const disconnectWifi = () => "Android Termux: Wi-Fi disconnect root gerekebilir.";
const connectWifi = ssid => `Android Termux: Wi-Fi bağlanmak için root gerekebilir. SSID: ${ssid}`;
const mtuInfo = () => cmd("ip link show | grep mtu");
const dhcpInfo = () => cmd("nmcli device show 2>/dev/null");
const systemInfo = () => `OS: ${os.type()} ${os.release()}\nUser: ${os.userInfo().username}`;
const services = () => cmd("ps aux | grep -E 'NetworkManager|wpa'");

// ---------- REPORTS ----------
function jsonReport() {
  const file = path.join(os.homedir(), "wifiassistant_report.json");
  const data = { user:"benygt45", ip: ipInfo(), wifi: scanWifi(), system: systemInfo() };
  fs.writeFileSync(file, JSON.stringify(data,null,2));
  return file;
}

function txtReport() {
  const file = path.join(os.homedir(), "wifiassistant_report.txt");
  let t = "=== WIFIASSISTANT REPORT ===\n\n";
  t += systemInfo() + "\n\n";
  t += scanWifi();
  fs.writeFileSync(file, t);
  return file;
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
    if(c==="6"){ console.log(pingTest()); return pause(); }
    if(c==="7"){ console.log(interfaces()); return pause(); }
    if(c==="8"){ console.log(macAddr()); return pause(); }
    if(c==="9"){ console.log(channelInfo()); return pause(); }
    if(c==="10"){ console.log(disconnectWifi()); return pause(); }
    if(c==="11"){ rl.question("SSID: ", s => { console.log(connectWifi(s)); pause(); }); return; }
    if(c==="12"){ console.log(mtuInfo()); return pause(); }
    if(c==="13"){ console.log(dhcpInfo()); return pause(); }
    if(c==="14"){ console.log(systemInfo()); return pause(); }
    if(c==="15"){ console.log("Olusturuldu:", jsonReport()); return pause(); }
    if(c==="16"){ console.log("Olusturuldu:", txtReport()); return pause(); }
    if(c==="17"){ console.log(services()); return pause(); }
    if(c==="18"){ console.log("Termux / Linux icin yazilmistir."); return pause(); }
    if(c==="0"){ rl.close(); process.exit(0); }
    menu();
  });
}

menu();
