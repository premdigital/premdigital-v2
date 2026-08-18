// src/bot.ts
import TelegramBot from 'node-telegram-bot-api';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { PATHS } from './config';
import { getBotConfig } from './modules/telegram';
import { createSsh, setPassword } from './core/ssh';
import { createVmess, createVless, createTrojan } from './core/xray';
import { getRealtimeMetrics } from './modules/system';
import { encryptWithPublicKeyFromEnv } from './utils/crypto';

// Fungsi helper untuk mengambil domain
async function getDomain() {
    try {
        if (fs.existsSync(PATHS.domainFile)) { return fs.readFileSync(PATHS.domainFile, 'utf-8').trim(); }
    } catch (e) {}
    return "Belum Diatur";
}

const config = getBotConfig();

if (!config || !config.token) {
    console.error("❌ Bot Token belum disetting! Jalankan menu CLI [13] terlebih dahulu.");
    process.exit(1);
}

// Inisialisasi Bot
const bot = new TelegramBot(config.token, { polling: true });

console.log("🤖 Prem Digital Bot sedang berjalan... (Tekan CTRL+C untuk berhenti)");

// Command /start atau /menu
bot.onText(/\/(start|menu)/, async (msg) => {
    const chatId = msg.chat.id;
    
    // Keamanan: Hanya respon ke admin (Chat ID yang terdaftar di panel)
    if (chatId.toString() !== config.chatId) {
        bot.sendMessage(chatId, "⛔ Anda tidak memiliki akses ke bot ini.");
        return;
    }

    const options: TelegramBot.SendMessageOptions = {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [{ text: '🚀 Buat SSH', callback_data: 'create_ssh' }, { text: '🚀 Buat VMESS', callback_data: 'create_vmess' }],
                [{ text: '🚀 Buat VLESS', callback_data: 'create_vless' }, { text: '🚀 Buat TROJAN', callback_data: 'create_trojan' }],
                [{ text: '📊 Cek Info Server', callback_data: 'check_server' }]
            ]
        }
    };

    bot.sendMessage(chatId, "<b>👑 PREM DIGITAL PANEL BOT 👑</b>\n\nSelamat datang, Admin! Silakan pilih menu di bawah ini:", options);
});

// Menangani Klik Tombol (Callback Query)
bot.on('callback_query', async (query) => {
    const chatId = query.message?.chat.id;
    const data = query.data;
    if (!chatId) return;

    bot.answerCallbackQuery(query.id); // Hilangkan loading di tombol

    if (data === 'create_ssh') {
        bot.sendMessage(chatId, "Silakan ketik format berikut:\n\n`ssh <username> <password> <hari>`\n\nContoh: `ssh joko rahasia 30`", { parse_mode: 'Markdown' });
    } 
    else if (data === 'create_vmess') {
        bot.sendMessage(chatId, "Silakan ketik format berikut:\n\n`vmess <username> <hari>`\n\nContoh: `vmess joko 30`", { parse_mode: 'Markdown' });
    }
    else if (data === 'create_vless') {
        bot.sendMessage(chatId, "Silakan ketik format berikut:\n\n`vless <username> <hari>`\n\nContoh: `vless joko 30`", { parse_mode: 'Markdown' });
    }
    else if (data === 'create_trojan') {
        bot.sendMessage(chatId, "Silakan ketik format berikut:\n\n`trojan <username> <hari>`\n\nContoh: `trojan joko 30`", { parse_mode: 'Markdown' });
    }
    else if (data === 'check_server') {
        bot.sendMessage(chatId, "⏳ Sedang mengecek server...");
        const metrics = await getRealtimeMetrics();
        const domain = await getDomain();
        const msg = `📊 <b>INFO SERVER</b>\n\n` +
                    `🌐 Domain: <code>${domain}</code>\n` +
                    `🖥️ IP: <code>${metrics.ip}</code>\n` +
                    `🏙️ Lokasi: ${metrics.city}\n` +
                    `🏢 ISP: ${metrics.isp}\n` +
                    `⚙️ RAM: ${metrics.usedRamMb}/${metrics.totalRamMb} MB\n` +
                    `💾 Storage: ${metrics.storageUsed}/${metrics.storageTotal}`;
        bot.sendMessage(chatId, msg, { parse_mode: 'HTML' });
    }
});

// Menangani ketikan perintah (contoh: ssh joko rahasia 30)
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text?.trim() || '';
    
    // Abaikan jika bukan admin
    if (chatId.toString() !== config.chatId) return;

    // --- CREATE SSH ---
    if (text.startsWith('ssh ')) {
        const parts = text.split(' ');
        if (parts.length === 4) {
            bot.sendMessage(chatId, "⏳ Sedang memproses akun SSH...");
            try {
                const user = parts[1];
                const pass = parts[2];
                const days = parseInt(parts[3]);
                
                const domain = await getDomain();
                const metrics = await getRealtimeMetrics();
                const year = new Date().getFullYear();
                
                const result = await createSsh(user, pass, days);

                // ENCRYPT password with admin public key and send ciphertext to Telegram
                let encrypted = 'ENCRYPTION-ERROR';
                try {
                    encrypted = encryptWithPublicKeyFromEnv(result.password);
                } catch (e: any) {
                    console.error('Encrypt error:', e.message || e);
                }

                const teleMessage = `✅ SSH Account Created Successfully!\n\n` +
                `🔐 SSH Premium Details\n` +
                `────────────────────────\n` +
                `📡 SSH WS    :\n${domain}:80@${result.username}\n\n` +
                `🔒 SSH SSL   :\nssl-${domain}:443@${result.username}\n\n` +
                `📶 SSH UDP   :\nudp-${domain}:1-65535@${result.username}\n\n` +
                `🌐 SSH SLOWDNS :\nns-${domain}:5300@${result.username}\n\n` +
                `────────────────────────\n` +
                `🔑 Account ZIVPN UDP\n📡 DOMAIN    :\nudp-${domain}\n\n` +
                `🔑 Password (ENCRYPTED, base64) :\n<code>${encrypted}</code>\n\n` +
                `Cara decrypt:\nnode scripts/decrypt_rsa.js --data "${encrypted}" --key /path/to/private.pem\n\n` +
                `✍️ TUTORIAL\n⚙️ LOGIN KE APK ZIVPN\n...\n────────────────────────\n` +
                `🌍 Host : ${domain}\n\n` +
                `👤 Username : ${result.username}\n` +
                `📅 Expiry Date : ${result.expired}\n` +
                `⏰ Expiry Time : ${days} Days\n\n` +
                `© Prem Digital Bot - ${year}`;

                bot.sendMessage(chatId, teleMessage, { parse_mode: 'HTML' });
            } catch (e: any) {
                bot.sendMessage(chatId, `❌ Gagal: ${e.message}`);
            }
        } else {
            bot.sendMessage(chatId, "❌ Format salah. Gunakan: `ssh username password hari`", { parse_mode: 'Markdown' });
        }
    }

    // Reset password via bot (generate new password and send encrypted)
    else if (text.startsWith('/reset_ssh ')) {
        const parts = text.split(' ');
        if (parts.length === 2) {
            const username = parts[1];
            bot.sendMessage(chatId, '⏳ Memproses reset password...');
            try {
                const newPass = crypto.randomBytes(9).toString('base64');
                await setPassword(username, newPass);

                let encrypted = 'ENCRYPTION-ERROR';
                try { encrypted = encryptWithPublicKeyFromEnv(newPass); } catch (e: any) { console.error('Encrypt error:', e.message || e); }

                const msg = `✅ Password Reset\nUser: <code>${username}</code>\nPassword (ENCRYPTED, base64):\n<code>${encrypted}</code>\n\nCara decrypt:\nnode scripts/decrypt_rsa.js --data "${encrypted}" --key /path/to/private.pem`;
                bot.sendMessage(chatId, msg, { parse_mode: 'HTML' });
            } catch (e: any) { bot.sendMessage(chatId, `❌ Gagal reset: ${e.message}`); }
        } else {
            bot.sendMessage(chatId, "❌ Format salah. Gunakan: `/reset_ssh username`", { parse_mode: 'Markdown' });
        }
    }
    
    // --- CREATE VMESS ---
    else if (text.startsWith('vmess ')) {
        const parts = text.split(' ');
        if (parts.length === 3) {
            bot.sendMessage(chatId, "⏳ Sedang memproses akun VMESS...");
            try {
                const user = parts[1];
                const days = parseInt(parts[2]);
                const domain = await getDomain();
                const result = await createVmess(user, days, domain);

                bot.sendMessage(chatId, `✅ <b>AKUN VMESS BERHASIL!</b>\n\nUser: <code>${result.username}</code>\nExp: ${result.expired}\n\n<code>${result.link}</code>`, { parse_mode: 'HTML' });
            } catch (e: any) { bot.sendMessage(chatId, `❌ Gagal: ${e.message}`); }
        }
    }

    // --- CREATE VLESS ---
    else if (text.startsWith('vless ')) {
        const parts = text.split(' ');
        if (parts.length === 3) {
            bot.sendMessage(chatId, "⏳ Sedang memproses akun VLESS...");
            try {
                const user = parts[1];
                const days = parseInt(parts[2]);
                const domain = await getDomain();
                const result = await createVless(user, days, domain);

                bot.sendMessage(chatId, `✅ <b>AKUN VLESS BERHASIL!</b>\n\nUser: <code>${result.username}</code>\nExp: ${result.expired}\n\n<code>${result.link}</code>`, { parse_mode: 'HTML' });
            } catch (e: any) { bot.sendMessage(chatId, `❌ Gagal: ${e.message}`); }
        }
    }

    // --- CREATE TROJAN ---
    else if (text.startsWith('trojan ')) {
        const parts = text.split(' ');
        if (parts.length === 3) {
            bot.sendMessage(chatId, "⏳ Sedang memproses akun TROJAN...");
            try {
                const user = parts[1];
                const days = parseInt(parts[2]);
                const domain = await getDomain();
                const result = await createTrojan(user, days, domain);

                bot.sendMessage(chatId, `✅ <b>AKUN TROJAN BERHASIL!</b>\n\nUser: <code>${result.username}</code>\nPass: <code>${result.password}</code>\nExp: ${result.expired}\n\n<code>${result.link}</code>`, { parse_mode: 'HTML' });
            } catch (e: any) { bot.sendMessage(chatId, `❌ Gagal: ${e.message}`); }
        }
    }
});
