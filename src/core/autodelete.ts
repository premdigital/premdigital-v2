// src/core/autodelete.ts
import * as fs from 'fs';
import { PATHS } from '../config';
import { deleteSsh } from './ssh';
import { deleteXray } from './xray';

export async function runAutoDelete() {
    const today = new Date();
    // Set jam ke 00:00:00 untuk perbandingan tanggal yang akurat
    today.setHours(0, 0, 0, 0); 
    
    let deletedCount = 0;

    console.log("Memulai proses Auto Delete...");

    // 1. Cek Akun Xray Expired
    try {
        if (fs.existsSync(PATHS.userDbXray)) {
            const lines = fs.readFileSync(PATHS.userDbXray, 'utf-8').split('\n');
            for (const line of lines) {
                if (!line.trim()) continue;
                
                const [username, expDateStr] = line.split(':');
                if (username && expDateStr) {
                    const expDate = new Date(expDateStr);
                    if (today > expDate) {
                        console.log(`- Menghapus Xray: ${username} (Expired: ${expDateStr})`);
                        await deleteXray(username);
                        deletedCount++;
                    }
                }
            }
        }
    } catch (e: any) {
        console.error("Gagal mengecek expired Xray:", e.message);
    }

    // 2. Cek Akun SSH Expired (Format db: user|pass|YYYY-MM-DD)
    try {
        if (fs.existsSync(PATHS.userDbSsh)) {
            const lines = fs.readFileSync(PATHS.userDbSsh, 'utf-8').split('\n');
            for (const line of lines) {
                if (!line.trim()) continue;
                
                const parts = line.split('|');
                if (parts.length >= 3) {
                    const username = parts[0];
                    const expDateStr = parts[2];
                    const expDate = new Date(expDateStr);
                    
                    if (today > expDate) {
                         console.log(`- Menghapus SSH: ${username} (Expired: ${expDateStr})`);
                         await deleteSsh(username);
                         deletedCount++;
                    }
                }
            }
        }
    } catch (e: any) {
         console.error("Gagal mengecek expired SSH:", e.message);
    }

    return deletedCount;
}