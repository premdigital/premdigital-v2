import fs from 'fs';

export function getBotConfig() {
    return {
        token: process.env.TELEGRAM_BOT_TOKEN || '',
        chatId: process.env.ADMIN_ID || ''
    };
}

export function saveBotConfig(token: string, chatId: string): boolean {
    try {
        fs.writeFileSync('.env', `TELEGRAM_BOT_TOKEN=${token}\nADMIN_ID=${chatId}\n`);
        process.env.TELEGRAM_BOT_TOKEN = token;
        process.env.ADMIN_ID = chatId;
        return true;
    } catch (e) {
        return false;
    }
}

export async function sendTelegramMessage(msg: string) {
    const conf = getBotConfig();
    if (!conf.token || !conf.chatId) return;
    try {
        await fetch(`https://api.telegram.org/bot${conf.token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: conf.chatId, text: msg, parse_mode: 'HTML' })
        });
    } catch (e) {}
}
