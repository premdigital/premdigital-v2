// src/core/ssh.ts
import * as fs from 'fs';
import * as path from 'path';
import { PATHS } from '../config';
import { runCommand, isValidUsername } from '../utils/system';

export async function createSsh(username: string, pass: string, days: number) {
    if (!isValidUsername(username)) {
        throw new Error("Username hanya boleh huruf dan angka!");
    }

    // Cek apakah user sudah ada (runCommand mengembalikan teks jika user ada, kosong jika tidak)
    const checkUser = await runCommand(`id -u ${username}`);
    if (checkUser !== "") {
        throw new Error(`Username ${username} sudah terdaftar di server.`);
    }

    try {
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + days);
        const expStr = expDate.toISOString().split('T')[0];

        // MENGUBAH /bin/false menjadi /bin/true agar kompatibel dengan WS/Dropbear
        await runCommand(`useradd -e "${expStr}" -s /bin/true -M "${username}"`);
        await runCommand(`echo "${username}:${pass}" | chpasswd`);

        const dbDir = path.dirname(PATHS.userDbSsh);
        if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
        if (!fs.existsSync(PATHS.userDbSsh)) fs.writeFileSync(PATHS.userDbSsh, '');

        fs.appendFileSync(PATHS.userDbSsh, `${username}|${pass}|${expStr}\n`);

        return { username, password: pass, expired: expStr };
    } catch (error: any) {
        throw new Error(`Gagal membuat akun SSH: ${error.message || String(error)}`);
    }
}

export async function deleteSsh(username: string) {
    if (!isValidUsername(username)) throw new Error("Username tidak valid!");

    const checkUser = await runCommand(`id -u ${username}`);
    
    // Jika user tidak ada di VPS Linux
    if (checkUser === "") {
        if (fs.existsSync(PATHS.userDbSsh)) {
            await runCommand(`sed -i "/^${username}|/d" ${PATHS.userDbSsh}`);
        }
        return false; // User tidak ditemukan
    }

    try {
        await runCommand(`userdel -f ${username}`);
        if (fs.existsSync(PATHS.userDbSsh)) {
            await runCommand(`sed -i "/^${username}|/d" ${PATHS.userDbSsh}`);
        }
        return true;
    } catch (error: any) {
        throw new Error(`Gagal menghapus akun SSH: ${error.message || String(error)}`);
    }
}