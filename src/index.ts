import { config } from 'dotenv';
import inquirer from 'inquirer';
import fs from 'fs';

// Load environment variables
config();

async function askToReturn() {
    await inquirer.prompt([{ type: 'input', name: 'enter', message: 'Tekan Enter untuk kembali ke menu...' }]);
}

async function handleSetting() {
    console.clear();
    console.log("--- SETTING PANEL ---");
    const answers = await inquirer.prompt([
        { type: 'input', name: 'token', message: 'Masukkan Token Bot Telegram (Kosongkan jika hanya ingin CLI):' },
        { type: 'input', name: 'adminId', message: 'Masukkan ID Telegram Admin:' }
    ]);

    const envContent = `TELEGRAM_BOT_TOKEN=${answers.token}\nADMIN_ID=${answers.adminId}\n`;
    fs.writeFileSync('.env', envContent);
    process.env.TELEGRAM_BOT_TOKEN = answers.token;
    
    console.log("\n✅ Konfigurasi tersimpan ke .env!");
    await askToReturn();
}

async function handleCreateVmess() {
    console.clear();
    console.log("--- BUAT AKUN VMESS (SIMULASI) ---");
    const answers = await inquirer.prompt([
        { type: 'input', name: 'user', message: 'Masukkan Username:' },
        { type: 'input', name: 'exp', message: 'Masa Aktif (Hari):' }
    ]);
    console.log(`\n✅ Akun Vmess ${answers.user} berhasil dibuat untuk ${answers.exp} hari!`);
    await askToReturn();
}

async function mainMenu() {
    console.clear();
    console.log("====================================");
    console.log("   PREMDIGITAL VPN PANEL (V2.0)     ");
    console.log(`   Mode Bot: ${process.env.TELEGRAM_BOT_TOKEN ? 'AKTIF 🟢' : 'MATI 🔴'}`);
    console.log("====================================");

    const { action } = await inquirer.prompt([
        { type: 'list', name: 'action', message: 'Pilih Menu:', choices: ['1. Buat Akun Vmess', '2. Setting Token', '3. Keluar'] }
    ]);

    switch (action) {
        case '1. Buat Akun Vmess': await handleCreateVmess(); break;
        case '2. Setting Token': await handleSetting(); break;
        case '3. Keluar': console.log("Terima kasih."); process.exit(0);
    }
    mainMenu();
}

mainMenu();