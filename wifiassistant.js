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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

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

  console.log("[1] Kayitli Wi-Fi Profilleri (sinirli)");
  console.log("[2] Aktif Wi-Fi Bilgisi (sinirli)");
  console.log("[3] Cevredeki Wi-Fi Aglarini Tara (sinirli)");
  console.log("[4] IP Bilgisi");
  console.log("[5] Gateway / DNS");
  console.log("[6] Internet Kontrol (Ping)");
  console.log("[7] Ag Arayuzleri");
  console.log("[8] MAC Adresi");
  console.log("[9] Kanal / Frekans Bilgisi (sinirli)");
  console.log("[10] Wi-Fi Baglantisini Kes (root gerekebilir)");
  console.log("[11] Wi-Fi'ye Baglan (SSID, root gerekebilir)");
  console.log("[12] MTU Bilgisi");
  console.log("[13] DHCP Bilgisi");
  console.log("[14] Sistem Bilgisi");
  console.log("[15] JSON Rapor Olustur");
  console.log("[16] TXT Rapor Olustur");
  console.log("[17] Calisan Ag Servisleri");
  console.log("[18] Gelismis Baglanti Testi");
  console.log("[19] Profil Yedekleme");
  console.log("[20] Profil Geri Yukleme");
  console.log("[21] Yardim (Detayli)");
  console.log("[22] Guvenlik Uyarilari");
  console.log("[23] Loglama Sistemi");
  console.log("[24] QR Wi-Fi Araclari");
  console.log("[25] Yardim (Kisa)");
  console.log("[0] Exit\n");
}

// ---- MEVCUT FONKSIYONLAR ----
const profiles = () => "Android Termux: Wi-Fi profilleri root yoksa listelenemez.";
const activeWifi = () => "Android Termux: Aktif Wi-Fi bilgisi root gerekebilir.";
const scanWifi = () => cmd("nmcli device wifi list 2>/dev/null");
const ipInfo = () => cmd("ip addr");
const gatewayDns = () => cmd("ip route && resolvectl status 2>/dev/null");

function pingTest() {
  try {
    const res = execSync("ping -c 3 8.8.8.8", { encoding: "utf8" });
    const avg = res.match(/= ([0-9.]+)\/([0-9.]+)\//);
    return avg ? `Ping OK | Ortalama: ${avg[2]} ms` : res;
  } catch {
    return "Ping basarisiz veya internet yok.";
  }
}

const interfaces = () => cmd("ip link");
const macAddr = () => cmd("ip link show | grep link/ether");
const channelInfo = () => "Android Termux: Kanal bilgisi root gerekebilir.";
const disconnectWifi = () => "Android Termux: Wi-Fi disconnect root gerekebilir.";
const connectWifi = ssid => `Android Termux: Wi-Fi baglanmak root gerekebilir. SSID: ${ssid}`;
const mtuInfo = () => cmd("ip link show | grep mtu");
const dhcpInfo = () => cmd("nmcli device show 2>/dev/null");
const systemInfo = () => `OS: ${os.type()} ${os.release()}\nUser: ${os.userInfo().username}`;
const services = () => cmd("ps aux | grep -E 'NetworkManager|wpa'");

// ---- YENI EKLENENLER ----
function advancedPing() {
  try {
    const r = execSync("ping -c 5 1.1.1.1", { encoding:"utf8" });
    const m = r.match(/= ([0-9.]+)\/([0-9.]+)\//);
    return m ? `Gelismis Ping Ortalama: ${m[2]} ms` : r;
  } catch {
    return "Gelismis ping basarisiz.";
  }
}

const profileBackup = () =>
  "Termux: Wi-Fi profilleri root olmadan yedeklenemez.";

const profileRestore = () =>
  "Termux: Wi-Fi profilleri root olmadan geri yuklenemez.";

const securityWarnings = () =>
  "Uyari: Acik veya sifresiz Wi-Fi aglari guvenlik riski tasir.";

function logSystem() {
  const file = path.join(os.homedir(), "wifiassistant.log");
  fs.appendFileSync(file, new Date().toISOString() + " calistirildi\n");
  return `Log yazildi: ${file}`;
}

const qrWifi = () =>
  "QR Wi-Fi: Termux terminal ortaminda sinirlidir.";

const helpDetailed = () =>
  "wifiassistant detayli yardim: Termux / Linux icin ag araci.";

const helpShort = () =>
  "wifiassistant: Termux ag araci.";

// ---- MENU ----
function pause() { rl.question("\nEnter...", menu); }

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
    if(c==="18"){ console.log(advancedPing()); return pause(); }
    if(c==="19"){ console.log(profileBackup()); return pause(); }
    if(c==="20"){ console.log(profileRestore()); return pause(); }
    if(c==="21"){ console.log(helpDetailed()); return pause(); }
    if(c==="22"){ console.log(securityWarnings()); return pause(); }
    if(c==="23"){ console.log(logSystem()); return pause(); }
    if(c==="24"){ console.log(qrWifi()); return pause(); }
    if(c==="25"){ console.log(helpShort()); return pause(); }
    if(c==="0"){ rl.close(); process.exit(0); }
    menu();
  });
}

menu();
