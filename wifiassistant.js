/*
  wifiassistant
  Author: benygt45
  Platform: Linux / Termux
*/

const { execSync } = require("child_process");
const readline = require("readline");
const fs = require("fs");
const os = require("os");
const path = require("path");

function cmd(c) {
  try {
    return execSync(c, { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });
  } catch {
    return "Komut desteklenmiyor veya yetki yok.";
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ---------- UI ----------
const C = {
  c: "\x1b[36m",
  g: "\x1b[32m",
  y: "\x1b[33m",
  r: "\x1b[31m",
  x: "\x1b[0m"
};

function banner() {
  console.clear();
  console.log(`${C.c}
 __      ___ _____ ___ ___ ___ ___ ___ _____ ___ ___
 \\ \\    / (_)  ___|_ _/ __| __| _ \\ __|_   _| __| _ \\
  \\ \\/\\/ /| | |_   | | (__| _||  _/ _|  | | | _||   /
   \\_/\\_/ |_|_|   |___\\___|___|_| |___| |_| |___|_|_\\
${C.x}`);
  console.log(`${C.g}wifiassistant | Linux / Termux | by benygt45${C.x}\n`);

  console.log("[1] Kayitli Wi-Fi Profilleri");
  console.log("[2] Aktif Wi-Fi Bilgisi");
  console.log("[3] Cevredeki Wi-Fi Aglarini Tara");
  console.log("[4] IP Bilgisi");
  console.log("[5] Gateway / DNS");
  console.log("[6] Internet Kontrol (Ping)");
  console.log("[7] Ag Arayuzleri");
  console.log("[8] MAC Adresi");
  console.log("[9] Kanal / Frekans Bilgisi");
  console.log("[10] Wi-Fi Baglantisini Kes");
  console.log("[11] Wi-Fi'ye Baglan (SSID)");
  console.log("[12] MTU Bilgisi");
  console.log("[13] DHCP Bilgisi");
  console.log("[14] Sistem Bilgisi");
  console.log("[15] JSON Rapor Olustur");
  console.log("[16] TXT Rapor Olustur");
  console.log("[17] Calisan Ag Servisleri");
  console.log("[18] Yardim");
  console.log("[0] Exit\n");
}

// ---------- FUNCTIONS ----------
const profiles = () => cmd("nmcli -f NAME,TYPE connection show");
const activeWifi = () => cmd("nmcli -t -f IN-USE,SSID,SECURITY,SIGNAL device wifi list");
const scanWifi = () => cmd("nmcli device wifi list");
const ipInfo = () => cmd("ip addr");
const gatewayDns = () => cmd("ip route && resolvectl status 2>/dev/null");
const pingTest = () => cmd("ping -c 2 8.8.8.8");
const interfaces = () => cmd("ip link");
const macAddr = () => cmd("ip link show | grep link/ether");
const channelInfo = () => cmd("iw dev 2>/dev/null");
const disconnectWifi = () => cmd("nmcli device disconnect wlan0");
const connectWifi = ssid => cmd(`nmcli device wifi connect "${ssid}"`);
const mtuInfo = () => cmd("ip link show | grep mtu");
const dhcpInfo = () => cmd("nmcli device show");
const systemInfo = () =>
  `OS: ${os.type()} ${os.release()}\nUser: ${os.userInfo().username}`;
const services = () => cmd("ps aux | grep -E 'NetworkManager|wpa'");

function jsonReport() {
  const file = path.join(os.homedir(), "wifiassistant_report.json");
  const data = {
    user: "benygt45",
    ip: ipInfo(),
    wifi: activeWifi(),
    system: systemInfo()
  };
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  return file;
}

function txtReport() {
  const file = path.join(os.homedir(), "wifiassistant_report.txt");
  let t = "=== WIFIASSISTANT REPORT ===\n\n";
  t += systemInfo() + "\n\n";
  t += activeWifi();
  fs.writeFileSync(file, t);
  return file;
}

// ---------- MENU ----------
function pause() {
  rl.question("\nEnter", menu);
}

function menu() {
  banner();
  rl.question("> ", c => {
    if (c === "1") { console.log(profiles()); return pause(); }
    if (c === "2") { console.log(activeWifi()); return pause(); }
    if (c === "3") { console.log(scanWifi()); return pause(); }
    if (c === "4") { console.log(ipInfo()); return pause(); }
    if (c === "5") { console.log(gatewayDns()); return pause(); }
    if (c === "6") { console.log(pingTest()); return pause(); }
    if (c === "7") { console.log(interfaces()); return pause(); }
    if (c === "8") { console.log(macAddr()); return pause(); }
    if (c === "9") { console.log(channelInfo()); return pause(); }
    if (c === "10") { console.log(disconnectWifi()); return pause(); }
    if (c === "11") {
      return rl.question("SSID: ", s => {
        console.log(connectWifi(s));
        pause();
      });
    }
    if (c === "12") { console.log(mtuInfo()); return pause(); }
    if (c === "13") { console.log(dhcpInfo()); return pause(); }
    if (c === "14") { console.log(systemInfo()); return pause(); }
    if (c === "15") { console.log("Olusturuldu:", jsonReport()); return pause(); }
    if (c === "16") { console.log("Olusturuldu:", txtReport()); return pause(); }
    if (c === "17") { console.log(services()); return pause(); }
    if (c === "18") {
      console.log("Linux / Termux icin yazilmistir. Windows desteklenmez.");
      return pause();
    }
    if (c === "0") {
      rl.close();
      process.exit(0);
    }
    menu();
  });
}

menu();
