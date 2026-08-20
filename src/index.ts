import { config } from 'dotenv';
import inquirer from 'inquirer';
import fs from 'fs';
import { setupBot } from './bot/bot.js';
import { handleCreateVmess } from './cli/vmess.js';

// Load environment variables
config();

let isBotRunning = false;

// Fungsi untuk mengecek dan menjalankan bot
function startBot() {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (botToken && botToken.trim() !== '') {
        if (!isBotRunning) {
            try {
                setupBot(botToken);
                isBotRunning = true;
                console.log("✅ Bot Telegram berhasil dihubungkan!");
            } catch (error) {
                console.log("❌ Gagal menjalankan bot. Pastikan token valid.");
            }
        }
    }
}

// Coba jalankan bot saat pertama kali panel dibuka
startBot();

// Fitur Setting Bot via CLI
async function handleSettingBot() {
    console.clear();
    console.log("--- SETTING BOT TELEGRAM ---");
    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'token',
            message: 'Masukkan Token Bot Telegram (dari @BotFather):'
        },
        {
            type: 'input',
            name: 'adminId',
            message: 'Masukkan ID Telegram Admin (contoh: 12345678):'
        }
    ]);

    // Simpan ke file .env
    const envContent = `TELEGRAM_BOT_TOKEN=${answers.token}\nADMIN_ID=${answers.adminId}\n`;
    fs.writeFileSync('.env', envContent);
    
    // Update sistem yang sedang berjalan agar tidak perlu restart panel
    process.env.TELEGRAM_BOT_TOKEN = answers.token;
    process.env.ADMIN_ID = answers.adminId;

    console.log("\n✅ Konfigurasi tersimpan ke .env!");
    startBot();
    await pause();
}

// Menu Utama CLI
async function mainMenu() {
    console.clear();
    console.log("====================================");
    console.log("   PREMDIGITAL VPN PANEL (V2.0)     ");
    console.log(`   Status Bot: ${isBotRunning ? 'AKTIF 🟢' : 'MATI 🔴'}`);
    console.log("====================================");

    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'Pilih Menu:',
            choices: [
                '1. Buat Akun Vmess',
                '2. Buat Akun Vless (Menyusul)',
                '3. Setting Bot Telegram',
                '4. Keluar'
            ]
        }
    ]);

    switch (action) {
        case '1. Buat Akun Vmess':
            await handleCreateVmess();
            break;
        case '2. Buat Akun Vless (Menyusul)':
            console.log("Fitur Vless segera hadir!");
            await pause();
            break;
        case '3. Setting Bot Telegram':
            await handleSettingBot();
            break;
        case '4. Keluar':
            console.log("Terima kasih telah menggunakan PremDigital Panel.");
            process.exit(0);
    }
    
    // Looping menu
    mainMenu();
}

async function pause() {
    await inquirer.prompt([{ type: 'input', name: 'enter', message: 'Tekan Enter untuk kembali ke menu...' }]);
}

// Jalankan menu CLI
mainMenu();
