// src/core/ssh.ts
import * as fs from 'fs';
import * as path from 'path';
import { PATHS } from '../config';
import { runCommandArgs, isValidUsername, escapeForSed } from '../utils/system';
import { spawn } from 'child_process';

export async function createSsh(username: string, pass: string, days: number) {
    if (!isValidUsername(username)) {
        throw new Error("Username hanya boleh huruf, angka, underscore atau tanda minus, dan panjang 1-32 karakter!");
    }

    const checkUser = await runCommandArgs('id', ['-u', username]);
    if (checkUser !== "") {
        throw new Error(`Username ${username} sudah terdaftar di server.`);
    }

    try {
        const expDate = new Date();
        expDate.setDate(expDate.getDate() + days);
        const expStr = expDate.toISOString().split('T')[0];

        await runCommandArgs('useradd', ['-e', expStr, '-s', '/bin/true', '-M', username]);

        await setPassword(username, pass);

        const dbDir = path.dirname(PATHS.userDbSsh);
        if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
        if (!fs.existsSync(PATHS.userDbSsh)) fs.writeFileSync(PATHS.userDbSsh, '');

        fs.appendFileSync(PATHS.userDbSsh, `${username}|${expStr}\n`);
        try {
            fs.chmodSync(PATHS.userDbSsh, 0o600); 
        } catch (e) {
            
            console.error(`Gagal mengatur permission untuk ${PATHS.userDbSsh}: ${e}`);
        }

        return { username, password: pass, expired: expStr };
    } catch (error: any) {
        throw new Error(`Gagal membuat akun SSH: ${error.message || String(error)}`);
    }
}

export async function setPassword(username: string, pass: string): Promise<void> {
    return new Promise((resolve, reject) => {
        try {
            const child = spawn('chpasswd', [], { stdio: ['pipe', 'pipe', 'pipe'], shell: false });
            child.on('error', (err) => {
                console.error(`[chpasswd error]: ${err.message}`);
                resolve(); 
            });

            child.stdin.write(`${username}:${pass}\n`);
            child.stdin.end();

            let stderr = '';
            child.stderr.on('data', (c) => { stderr += String(c); });

            child.on('close', (code) => {
                if (code === 0) resolve();
                else {
                    console.error(`[chpasswd exit ${code}]: ${stderr}`);
                    resolve();
                }
            });
        } catch (e) {
            console.error(`[chpasswd exception]: ${e}`);
            resolve();
        }
    });
}

export async function deleteSsh(username: string) {
    if (!isValidUsername(username)) throw new Error("Username tidak valid!");

    const checkUser = await runCommandArgs('id', ['-u', username]);
    
    if (checkUser === "") {
        if (fs.existsSync(PATHS.userDbSsh)) {
            const escaped = escapeForSed(username);
            await runCommandArgs('sed', ['-i', `/^${escaped}\\|/d`, PATHS.userDbSsh]);
        }
        return false; 
    }

    try {
        await runCommandArgs('userdel', ['-f', username]);
        if (fs.existsSync(PATHS.userDbSsh)) {
            const escaped = escapeForSed(username);
            await runCommandArgs('sed', ['-i', `/^${escaped}\\|/d`, PATHS.userDbSsh]);
        }
        return true;
    } catch (error: any) {
        throw new Error(`Gagal menghapus akun SSH: ${error.message || String(error)}`);
    }
}
