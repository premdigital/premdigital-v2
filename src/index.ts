// @ts-nocheck
// src/index.ts
import inquirer from 'inquirer';
import * as fs from 'fs';
import chalk from 'chalk';
import { PATHS } from './config';
import { runCommand } from './utils/system';
import { createSsh, deleteSsh } from './core/ssh';
import { createVmess, createVless, createTrojan, deleteXray } from './core/xray';
import os from 'os';
import { exec } from 'child_process';
import util from 'util';
import { checkServiceStatus, getAccountSummary } from './core/status';
import { runAutoDelete } from './core/autodelete';
import { saveDomain, generateSSL, installUdp, setSshBanner } from './core/setup'; 

const execPromise = util.promisify(exec);

async function askToReturn() {
    await inquirer.prompt([{ type: 'input', name: 'enter', message: '\nTekan Enter untuk kembali ke menu...' }]);
}

async function getDomain() {
    try {
        if (fs.existsSync(PATHS.domainFile)) { 
            const d = fs.readFileSync(PATHS.domainFile, 'utf8').trim();
          
            if (d.length > 2) return d;
        }
    } catch (e) {}
    return "Belum Diatur";
}

async function getRealtimeMetrics() {
    const totalRam = Math.round(os.totalmem() / 1024 / 1024);
    const usedRam = Math.round((os.totalmem() - os.freemem()) / 1024 / 1024);
    const cpus = os.cpus();
    
    let ip = "Tidak diketahui";
    let city = "Tidak diketahui";
    let isp = "Tidak diketahui";
    let storageUsed = "0";
    let storageTotal = "0";

    try {
      
        const response = await fetch('http://ip-api.com/json/');
        const data = await response.json();
        if (data.status === 'success') {
            ip = data.query;
            city = data.city;
            isp = data.isp;
        }

        const { stdout } = await execPromise("df -h / | tail -1 | awk '{print $3 \",\" $2}'");
        const storageData = stdout.trim().split(',');
        if (storageData.length === 2) {
          
            storageUsed = storageData[0].replace('G', '').replace('M', '');
            storageTotal = storageData[1].replace('G', '').replace('M', '');
        }
    } catch (e) {
      
    }
    
    return {
        ip: ip, 
        city: city, 
        isp: isp,
        usedRamMb: usedRam, 
        totalRamMb: totalRam,
        storageUsed: storageUsed, 
        storageTotal: storageTotal,
        osName: os.type() + " " + os.release(),
        cpuCores: cpus.length, 
        cpuModel: cpus[0] ? cpus[0].model : "Unknown CPU"
    };
}

function getBotConfig() {
    return { token: process.env.TELEGRAM_BOT_TOKEN || '', chatId: process.env.ADMIN_ID || '' };
}
function saveBotConfig(token: string, chatId: string) { 
    return true; 
}
async function sendTelegramMessage(msg: string) { 
    return; 
}

async function displayDashboard() {
    console.clear();
    const domain = await getDomain();
    console.log(chalk.cyan("Memuat data server... ⏳"));
    const metrics = await getRealtimeMetrics();
    
    const sshStatus = (await runCommand('systemctl is-active ssh')) === 'active' ? chalk.green('ON ') : chalk.red('OFF');
    const xrayStatus = (await runCommand('systemctl is-active xray')) === 'active' ? chalk.green('ON ') : chalk.red('OFF');
    const botStatus = getBotConfig() ? chalk.green('ON ') : chalk.red('OFF');

    console.clear();
    console.log(chalk.cyan("✧═════════════════════════════════════════════════✧"));
    console.log(chalk.green.bold("               PREM DIGITAL PANEL                  "));
    console.log(chalk.cyan("✧═════════════════════════════════════════════════✧\n"));

    const lbl = (text: string) => chalk.white(`  ◇ ${text.padEnd(8, ' ')} :`);

    console.log(`${lbl('OS')} ${chalk.cyan(metrics.osName.substring(0,24))}`);
    console.log(`${lbl('Domain')} ${chalk.cyan(domain.substring(0,24))}`);
    console.log(`${lbl('IP VPS')} ${chalk.cyan(metrics.ip)}`);
    console.log(`${lbl('RAM')} ${chalk.cyan(`${metrics.usedRamMb} / ${metrics.totalRamMb} MB`)}`);
    console.log(`${lbl('CPU')} ${chalk.cyan(`${metrics.cpuCores} Core | ${metrics.cpuModel.substring(0,14)}`)}`);
    console.log(`${lbl('Storage')} ${chalk.cyan(`${metrics.storageUsed} / ${metrics.storageTotal} (Free ${metrics.storageFree})`)}`);
    console.log(`${lbl('CITY')} ${chalk.cyan(metrics.city.substring(0,24))}`);
    console.log(`${lbl('ISP')} ${chalk.cyan(metrics.isp.substring(0,24))}\n`);

    console.log(chalk.cyan("✧═════════════════════════════════════════════════✧"));
    console.log(` SSH:${sshStatus} | XRAY:${xrayStatus} | BOT:${botStatus} | STAT:${chalk.green('GOOD')}`);
    console.log(chalk.cyan("✧═════════════════════════════════════════════════✧\n"));
}

async function mainMenu() {
    await displayDashboard();

    console.log(`  1 ✧ ${chalk.cyan('SSH / WS'.padEnd(18))}  8 ✧ ${chalk.whiteBright('ACCOUNT SUMMARY')}`);
    console.log(`  2 ✧ ${chalk.cyan('VMESS'.padEnd(18))}  9 ✧ ${chalk.yellowBright('ADD DOMAIN')}`);
    console.log(`  3 ✧ ${chalk.cyan('VLESS'.padEnd(18))} 10 ✧ ${chalk.greenBright('CERT SSL')}`);
    console.log(`  4 ✧ ${chalk.cyan('TROJAN'.padEnd(18))} 11 ✧ ${chalk.cyanBright('CHECK SERVICE')}`);
    console.log(`  5 ✧ ${chalk.gray('ZIVPN (Soon)'.padEnd(18))} 12 ✧ ${chalk.magentaBright('ALL SERVICE')}`);
    console.log(`  6 ✧ ${chalk.green('INSTALL UDP'.padEnd(18))} 13 ✧ ${chalk.blueBright('SETTING BOT')}`);
    console.log(`  7 ✧ ${chalk.green('PASANG BANNER'.padEnd(18))} 14 ✧ ${chalk.gray('AUTO DELETE')}`);
    console.log(`\n                x ✧ ${chalk.redBright('EXIT / KELUAR')}\n`);

    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'menuOption',
            message: chalk.magentaBright('Select Option (1-14 / x) :')
        }
    ]);

    switch (answers.menuOption.toLowerCase().trim()) {
        case '1': await handleCreateSsh(); break;
        case '2': await handleCreateVmess(); break;
async function handleCreateVless() { console.log("Fitur Vless menyusul..."); }
        case '4': await handleCreateTrojan(); break;
        case '6': await handleInstallUdp(); break;
        case '7': await handleSetBanner(); break;
        case '8': await handleAccountSummary(); break;
        case '9': await handleAddDomain(); break;
        case '10': await handleCertSSL(); break;
        case '11': await handleCheckStatus(); break;
        case '12': await handleAllService(); break; 
        case '13': await handleSetupBot(); break;
        case '14': await handleAutoDelete(); break;
        case '5': 
            console.log(chalk.yellow("\nMenu tersebut belum tersedia."));
            await askToReturn();
            break;
        case 'x':
            console.log(chalk.green("\nTerima kasih telah menggunakan Prem Digital Panel! 🚀\n"));
            process.exit(0);
        default:
            console.log(chalk.red("\nPilihan tidak valid. Silakan masukkan angka 1-14 atau x."));
            await askToReturn();
            break;
    }
}

// ==== SUB MENU: ACCOUNT SUMMARY ====
async function handleAccountSummary() {
    console.clear();
    console.log(chalk.whiteBright.bold("=== 📊 ACCOUNT SUMMARY & MANAGEMENT ===\n"));
    const answers = await inquirer.prompt([
        {
            type: 'list', name: 'action', message: chalk.yellow('Pilih Kategori Layanan:'),
            choices: [
                { name: ` 1 ✧ ${chalk.cyan('Akun SSH & OpenVPN')} (List & Hapus)`, value: 'ssh' },
                { name: ` 2 ✧ ${chalk.magentaBright('Akun X-RAY')} (VMess, VLess, Trojan)`, value: 'xray' },
                new inquirer.Separator(),
                { name: ` 0 ✧ ${chalk.gray('Back To Menu')}`, value: 'back' }
            ]
        }
    ]);
    if (answers.action === 'ssh') await handleSshSummary();
    else if (answers.action === 'xray') await handleXraySummary();
    else mainMenu();
}

async function handleSshSummary() {
    console.clear(); console.log(chalk.cyan.bold("=== 📝 DAFTAR AKUN SSH ===\n"));
    const summary = await getAccountSummary();
    console.log(`Total Aktif: ${chalk.bold(summary.sshCount)} Akun\n`);
    if (summary.sshCount === 0) console.log(chalk.gray("Tidak ada akun SSH yang aktif."));
    summary.sshUsers.forEach(u => console.log(chalk.white(u)));
    console.log('\n');

    const ans = await inquirer.prompt([{ type: 'list', name: 'action', message: chalk.yellow('Tindakan:'), choices: [{ name: `1. 🗑 Hapus Akun SSH`, value: 'delete' }, { name: `0. 🔙 Kembali`, value: 'back' }] }]);
    if (ans.action === 'delete') {
        const userAns = await inquirer.prompt([{ type: 'input', name: 'username', message: 'Username SSH yang dihapus:' }]);
        console.log(chalk.cyan("\nMemproses... ⏳"));
        try {
            if (await deleteSsh(userAns.username)) { console.log(chalk.green(`✅ Sukses: Akun [${userAns.username}] dihapus!`)); await sendTelegramMessage(`🗑 <b>AKUN SSH DIHAPUS</b>\nUser: <code>${userAns.username}</code>`); } 
            else console.log(chalk.yellow(`⚠️ Gagal: Akun tidak ditemukan.`));
        } catch (err: any) { console.log(`\n${chalk.red.bold('❌ Error:')} ${err.message}`); }
        await inquirer.prompt([{ type: 'input', name: 'enter', message: chalk.gray('\nPress Enter To Return ...') }]);
        await handleSshSummary();
    } else await handleAccountSummary();
}

async function handleXraySummary() {
    console.clear(); console.log(chalk.magentaBright.bold("=== 📝 DAFTAR AKUN X-RAY ===\n"));
    const summary = await getAccountSummary();
    console.log(`Total Aktif: ${chalk.bold(summary.xrayCount)} Akun\n`);
    if (summary.xrayCount === 0) console.log(chalk.gray("Tidak ada akun X-Ray aktif."));
    summary.xrayUsers.forEach(u => console.log(chalk.white(u)));
    console.log('\n');

    const ans = await inquirer.prompt([{ type: 'list', name: 'action', message: chalk.yellow('Tindakan:'), choices: [{ name: `1. 🗑 Hapus Akun X-Ray`, value: 'delete' }, { name: `0. 🔙 Kembali`, value: 'back' }] }]);
    if (ans.action === 'delete') {
        const userAns = await inquirer.prompt([{ type: 'input', name: 'username', message: 'Username X-Ray yang dihapus:' }]);
        console.log(chalk.cyan("\nMemproses... ⏳"));
        try {
            if (await deleteXray(userAns.username)) { console.log(chalk.green(`✅ Sukses: Akun [${userAns.username}] dihapus!`)); await sendTelegramMessage(`🗑 <b>AKUN XRAY DIHAPUS</b>\nUser: <code>${userAns.username}</code>`); } 
            else console.log(chalk.yellow(`⚠️ Gagal: Akun tidak ditemukan.`));
        } catch (err: any) { console.log(`\n${chalk.red.bold('❌ Error:')} ${err.message}`); }
        await inquirer.prompt([{ type: 'input', name: 'enter', message: chalk.gray('\nPress Enter To Return ...') }]);
        await handleXraySummary();
    } else await handleAccountSummary();
}

// ==== SUB MENU: ALL SERVICE ====
async function handleAllService() {
    console.clear(); console.log(chalk.magentaBright.bold("=== ⚙️ MENU ALL SERVICE ===\n"));
    const answers = await inquirer.prompt([{ type: 'list', name: 'action', message: chalk.yellow('Select Option :'), choices: [
        { name: `  1 ✧ ${chalk.cyan('Check service')}`, value: '1' }, { name: `  2 ✧ ${chalk.cyan('Restart All Service')}`, value: '2' }, { name: `  3 ✧ ${chalk.cyan('SPEED TEST VPS')}`, value: '3' },
        { name: `  4 ✧ ${chalk.red('Rebuild Vps')}`, value: '4' }, { name: `  5 ✧ ${chalk.green('Restart Panel')} (Clear Cache)`, value: '5' }, { name: `  6 ✧ ${chalk.blueBright('Reboot VPS')} (Auto)`, value: '6' },
        new inquirer.Separator(), { name: `  0 ✧ ${chalk.gray('Back To Menu')}`, value: '0' }
    ]}]);
    switch (answers.action) {
        case '1': await handleCheckStatus(); break;
        case '2': console.log(chalk.cyan("\nRestarting... ⏳")); await runCommand('systemctl restart xray ssh dropbear ws-openssh udpgw nginx 2>/dev/null'); console.log(chalk.green("✅ Berhasil!")); await askToReturn(); break;
        case '3': console.log(chalk.cyan("\nSpeedtest... ⏳")); try { console.log(chalk.green(await runCommand('curl -s https://raw.githubusercontent.com/sivel/speedtest-cli/master/speedtest.py | python3 -'))); } catch (e) { console.log(chalk.red("❌ Gagal.")); } await askToReturn(); break;
        case '4': const c = await inquirer.prompt([{ type: 'confirm', name: 'sure', message: 'Rebuild VPS?', default: false }]); if(c.sure) { await runCommand('apt-get update && apt-get upgrade -y && apt-get autoremove -y'); console.log(chalk.green("✅ Selesai!")); } await askToReturn(); break;
        case '5': await runCommand('sync; echo 3 > /proc/sys/vm/drop_caches; journalctl --vacuum-time=1d 2>/dev/null'); console.log(chalk.green("✅ Cache dibersihkan!")); await askToReturn(); break;
        case '6': const t = await inquirer.prompt([{ type: 'input', name: 'jam', message: 'Jam reboot (00-23):', default: '00' }]); await runCommand(`crontab -l 2>/dev/null | grep -v '/sbin/reboot' > /tmp/cronjob || true; echo "0 ${t.jam} * * * /sbin/reboot" >> /tmp/cronjob; crontab /tmp/cronjob && rm /tmp/cronjob`); console.log(chalk.green(`✅ Diatur jam ${t.jam}:00`)); await askToReturn(); break;
        case '0': mainMenu(); break;
    }
}

// --- HANDLER STANDAR LAINNYA ---
async function handleInstallUdp() { console.clear(); console.log(chalk.greenBright.bold("=== 🚀 INSTALL BADVPN UDPGW ===")); const confirm = await inquirer.prompt([{ type: 'confirm', name: 'sure', message: 'Install UDPGW?', default: true }]); if (confirm.sure) { console.log(chalk.cyan("\nInstalasi... ⏳")); try { await installUdp(); console.log(chalk.green("\n✅ SUKSES di Port 7300.")); } catch (err: any) { console.log(`\n${chalk.red.bold('❌ Error:')} ${err.message}`); } } await askToReturn(); }

// FUNGSI HANDLE
async function handleSetBanner() {
    console.clear();
    console.log(chalk.greenBright.bold("=== 📝 PASANG BANNER SSH (ISSUE.NET) ==="));
    const confirm = await inquirer.prompt([
        { type: 'confirm', name: 'sure', message: 'Pasang Banner berwarna "PREM DIGITAL VPN" untuk SSH?', default: true }
    ]);
    
    if (confirm.sure) {
        console.log(chalk.cyan("\nMemasang banner dan merestart SSH... ⏳"));
        try {
            await setSshBanner();
            console.log(chalk.green("\n✅ SUKSES! Banner telah dipasang di /etc/issue.net"));
            console.log(chalk.gray("Aplikasi seperti HTTP Custom / Injector sekarang akan merespon dengan baik."));
        } catch (err: any) { 
            console.log(`\n${chalk.red.bold('❌ Error:')} ${err.message}`); 
        }
    }
    await askToReturn();
}

async function handleAddDomain() { console.clear(); console.log(chalk.yellowBright.bold("=== 🌐 ADD DOMAIN VPS ===")); const data = await inquirer.prompt([{ type: 'input', name: 'domain', message: 'Masukkan Domain Baru:' }]); if (data.domain) { try { await saveDomain(data.domain); console.log(chalk.green(`\n✅ Sukses! Domain diubah.`)); } catch (err: any) { console.log(`\n${chalk.red.bold('❌ Error:')} ${err.message}`); } } await askToReturn(); }
async function handleCertSSL() { console.clear(); console.log(chalk.greenBright.bold("=== 🔒 GENERATE CERT SSL ===")); const domain = await getDomain(); if (domain === "Belum Diatur") { console.log(chalk.red("\n❌ Atur domain dulu [9].")); return askToReturn(); } const confirm = await inquirer.prompt([{ type: 'confirm', name: 'sure', message: `Pasang SSL untuk ${domain}?`, default: true }]); if (confirm.sure) { const data = await inquirer.prompt([{ type: 'input', name: 'email', message: 'Email:', default: 'admin@' + domain }]); console.log(chalk.cyan("\nMemproses (1-2 Menit)... ⏳")); try { await generateSSL(domain, data.email); console.log(chalk.green.bold(`\n✅ SUKSES! SSL dipasang.`)); } catch (err: any) { console.log(`\n${chalk.red.bold('❌ Gagal:')} ${err.message}`); } } await askToReturn(); }
async function handleSetupBot() { console.clear(); console.log(chalk.cyanBright.bold("=== 🤖 PENGATURAN BOT ===")); const data = await inquirer.prompt([{ type: 'input', name: 'token', message: 'Bot Token:' }, { type: 'input', name: 'chatId', message: 'Chat ID:' }]); if (data.token && data.chatId) { if (saveBotConfig(data.token, data.chatId)) { if (await sendTelegramMessage("✅ <b>PANEL</b>\nBot Terhubung!")) console.log(chalk.green("🎉 Berhasil.")); else console.log(chalk.red("⚠️ Gagal terhubung.")); } } await askToReturn(); }

async function handleCreateSsh() {
    console.clear();
    console.log(chalk.cyan("======================================"));
    console.log(chalk.green.bold("       MEMBUAT AKUN SSH/WS...         "));
    console.log(chalk.cyan("======================================\n"));

    const data = await inquirer.prompt([
        { type: 'input', name: 'user', message: 'Masukkan Username SSH :' }, 
        { type: 'password', name: 'pass', message: 'Masukkan Password SSH :' }, 
        { type: 'number', name: 'hari', message: 'Masa Aktif (Hari)   :', default: 30 }
    ]);
    console.log(chalk.cyan("\nMemproses... ⏳"));
    
    try {
        const domain = await getDomain(); 
        const metrics = await getRealtimeMetrics(); 
        const ip = metrics.ip;
        
        const now = new Date();
        const createdDate = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
        const year = now.getFullYear();

        const result = await createSsh(data.user, data.pass, data.hari);
        
        const teleMessage = `✅ SSH Account Created Successfully!

🔐 SSH Premium Details
────────────────────────
📡 SSH WS    :
${domain}:80@${result.username}:${result.password}

🔒 SSH SSL   :
ssl-${domain}:443@${result.username}:${result.password}

📶 SSH UDP   :
udp-${domain}:1-65535@${result.username}:${result.password}

🌐 SSH SLOWDNS :
ns-${domain}:5300@${result.username}:${result.password}

────────────────────────
🔑 Account ZIVPN UDP
📡 DOMAIN    :
udp-${domain}

🔑 Password  :
${result.password}

✍️ TUTORIAL
⚙️ LOGIN KE APK ZIVPN
🔍 Garis tiga {pojok kiri atas}
🛠 UDP Tunnel Setting
Udp Server.  : 👉 ${domain}
Udp Password : 👉 ${result.password}
✅ Apply
✅ Centang UDP
▶ START
────────────────────────
🌍 Host        :
${domain}

🏢 ISP         :
${metrics.isp}

🏙️ City        :
${metrics.city}

👤 Username    :
${result.username}

🔑 Password    :
${result.password}

🗝️ Public Key  :
b543cde3a314ae80e8ee61xxxxxxxxxxxxxxXXXXXxxx

📅 Expiry Date :
${result.expired}

⏰ Expiry Time :
${data.hari} Days

📌 IP Limit    :
5

────────────────────────
🛠 Ports:
• TLS        :
443, 8443

• Non-TLS    :
80, 8080

• OVPN TCP   :
1194

• OVPN UDP   :
25000

• SSH OHP    :
9080

• UDP Custom :
1-65535

────────────────────────
🧩 Payload WS:

GET / HTTP/1.1
Host: ${domain}
Connection: Upgrade
User-Agent: [ua]
Upgrade: websocket


🧩 Payload Enhanced:

PATCH / HTTP/1.1
Host: ${domain}
Host: bug.com
Connection: Upgrade
User-Agent: [ua]
Upgrade: websocket


📥 SALURAN FREE CONFIG
🔗 https://whatsapp.com/channel/0029VbCmaeM0G0XbknOTZP3c

© Prem Digital Bot - ${year}
✨ Terima kasih telah menggunakan layanan kami!`;

        await sendTelegramMessage(teleMessage);
        
        console.clear(); 
        console.log(chalk.cyan("======================================"));
        console.log(chalk.greenBright.bold("       AKUN SSH BERHASIL DIBUAT       "));
        console.log(chalk.cyan("======================================"));
        console.log(chalk.white(` Host      : ${chalk.yellow(domain)}`));
        console.log(chalk.white(` IP Server : ${chalk.yellow(ip)}`));
        console.log(chalk.white(` Username  : ${chalk.yellow(result.username)}`));
        console.log(chalk.white(` Password  : ${chalk.yellow(result.password)}`));
        console.log(chalk.white(` Created   : ${chalk.yellow(createdDate)}`));
        console.log(chalk.white(` Expired   : ${chalk.red(result.expired)} (${data.hari} Hari)`));
        console.log(chalk.cyan("======================================"));
        console.log(chalk.white("SSH WS    :"));
        console.log(chalk.yellow(`${domain}:80@${result.username}:${result.password}\n`));
        console.log(chalk.white("SSH SSL   :"));
        console.log(chalk.yellow(`ssl.${domain}:443@${result.username}:${result.password}\n`));
        console.log(chalk.white("SSH UDP   :"));
        console.log(chalk.yellow(`udp.${domain}:1-65535@${result.username}:${result.password}`));
        console.log(chalk.cyan("======================================"));
        console.log(chalk.gray("Note: Detail tutorial lengkap (Payload, ZIVPN) telah dikirim ke Telegram."));
        console.log(chalk.cyan("======================================\n"));

    } catch (err: any) { 
        console.log(`\n${chalk.red.bold('❌ Error:')} ${err.message}`); 
    } 
    await askToReturn(); 
}

async function handleCreateVmess() { console.log("Fitur Vmess dipanggil"); }
async function handleCreateVless() { console.log("Fitur Vless dipanggil"); }
async function handleCreateTrojan() { console.log("Fitur Trojan dipanggil"); }
mainMenu();