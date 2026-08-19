import * as fs from 'fs';
import { PATHS } from '../config';
import { deleteSsh } from './ssh';
import { deleteXray } from './xray';

export async function runAutoDelete() {
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    let deletedCount = 0;
    console.log("Memulai proses Auto Delete...");

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
    } catch (e: any) { console.error("Gagal mengecek expired Xray:", e.message); }

    try {
        if (fs.existsSync(PATHS.userDbSsh)) {
            const lines = fs.readFileSync(PATHS.userDbSsh, 'utf-8').split('\n');
            for (const line of lines) {
                if (!line.trim()) continue;
                const parts = line.split('|');
                if (parts.length >= 2) {
                    const username = parts[0];
                    const expDateStr = parts.length >= 3 ? parts[2] : parts[1];
                    const expDate = new Date(expDateStr);
                    if (today > expDate) {
                         console.log(`- Menghapus SSH: ${username} (Expired: ${expDateStr})`);
                         await deleteSsh(username);
                         deletedCount++;
                    }
                }
            }
        }
    } catch (e: any) { console.error("Gagal mengecek expired SSH:", e.message); }

    return deletedCount;
}

const isCLI = typeof require !== 'undefined' && require.main === module;
if (isCLI) {
    runAutoDelete().then(count => console.log(`Selesai. Total dihapus: ${count}`));
}
