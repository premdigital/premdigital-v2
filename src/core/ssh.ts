// src/core/ssh.ts
import * as fs from 'fs';
import * as path from 'path';
import { PATHS } from '../config';
import { runCommand, isValidUsername } from '../utils/system';

export async function createSsh(username: string, pass: string, days: number) {
    if (!isValidUsername(username)) {
        throw new Error("Username hanya boleh huruf dan angka!");
    }

    try {
        // Cek dulu apakah user sudah ada di VPS untuk mencegah error "user already exists"
        try {
            await runCommand(`id -u ${username}`);
            // Jika tidak error, berarti user sudah ada
            throw new Error(`Username ${username} sudah terdaftar di server.`);
        } catch (checkErr: any) {
            // Jika error dari id -u, berarti user belum ada.
            // Namun, jika error pesannya dari throw kita di atas, lemparkan kembali.
            if (checkErr.message && checkErr.message.includes('sudah terdaftar')) {
                throw checkErr; 
            }
            // Jika bukan, lanjutkan pembuatan user
        }

        // Hitung tanggal expired (contoh: 2026-08-20)
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + days);
        const expStr = expDate.toISOString().split('T')[0];

        // Jalankan perintah linux untuk buat user
        // MENGUBAH /bin/false menjadi /bin/true agar kompatibel dengan SSH/UDP/WS/Dropbear
        await runCommand(`useradd -e "${expStr}" -s /bin/true -M "${username}"`);
        await runCommand(`echo "${username}:${pass}" | chpasswd`);

        // Pastikan folder untuk database txt sudah ada sebelum menulis
        const dbDir = path.dirname(PATHS.userDbSsh);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        
        // Buat file jika belum ada
        if (!fs.existsSync(PATHS.userDbSsh)) {
            fs.writeFileSync(PATHS.userDbSsh, '');
        }

        // Simpan ke database lokal kita
        fs.appendFileSync(PATHS.userDbSsh, `${username}|${pass}|${expStr}\n`);

        return { username, password: pass, expired: expStr };
    } catch (error: any) {
        // Tampilkan pesan error spesifik jika ada, untuk memudahkan debugging
        const errMsg = error instanceof Error ? error.message : String(error);
        throw new Error(`Gagal membuat akun SSH: ${errMsg}`);
    }
}

export async function deleteSsh(username: string) {
    if (!isValidUsername(username)) {
        throw new Error("Username tidak valid!");
    }

    try {
        // Cek apakah user ada di Linux
        let userExists = true;
        try {
            await runCommand(`id -u ${username}`);
        } catch (e) {
            userExists = false;
        }

        if (!userExists) {
            // Jika user tidak ada di VPS, coba hapus dari database TXT saja (jika nyangkut)
            if (fs.existsSync(PATHS.userDbSsh)) {
                await runCommand(`sed -i "/^${username}|/d" ${PATHS.userDbSsh}`);
            }
            return false; // Mengembalikan false agar index.ts memunculkan info "akun tidak ditemukan"
        }

        // Hapus user di Linux (-f force, -r hapus home directory)
        // Kadang userdel -f -r bisa gagal jika home directory tidak ada, karena kita pakai -M saat create.
        // Cukup pakai userdel -f
        await runCommand(`userdel -f ${username}`);
        
        // Hapus dari database txt
        if (fs.existsSync(PATHS.userDbSsh)) {
            await runCommand(`sed -i "/^${username}|/d" ${PATHS.userDbSsh}`);
        }
        
        return true;
    } catch (error: any) {
        const errMsg = error instanceof Error ? error.message : String(error);
        throw new Error(`Gagal menghapus akun SSH: ${errMsg}`);
    }
}