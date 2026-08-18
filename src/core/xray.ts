// src/core/xray.ts
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { PATHS } from '../config';
import { XrayConfig, XrayClient } from '../types';
import { runCommand } from '../utils/system';

// Fungsi untuk membaca dan mengubah file config xray (menggantikan jq)
function updateXrayConfig(protocol: 'vmess' | 'vless' | 'trojan', newClient: XrayClient) {
    try {
        const rawData = fs.readFileSync(PATHS.xrayConfig, 'utf-8');
        const config: XrayConfig = JSON.parse(rawData);

        // Cari inbound (port/protokol) yang sesuai
        const inboundIndex = config.inbounds.findIndex(i => i.protocol === protocol);
        
        if (inboundIndex !== -1) {
            // Tambahkan user baru ke array clients
            config.inbounds[inboundIndex].settings.clients.push(newClient);
            
            // Simpan kembali ke file
            fs.writeFileSync(PATHS.xrayConfig, JSON.stringify(config, null, 2));
            return true;
        }
        return false;
    } catch (error) {
        console.error("Gagal mengupdate config Xray:", error);
        return false;
    }
}

// Fungsi mencatat expired akun Xray
function saveExpiry(username: string, days: number) {
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + days);
    const dateStr = expDate.toISOString().split('T')[0]; // Format YYYY-MM-DD
    
    fs.appendFileSync(PATHS.userDbXray, `${username}:${dateStr}\n`);
    return dateStr;
}

export async function createVmess(username: string, days: number, domain: string) {
    const uuid = uuidv4();
    const client: XrayClient = { id: uuid, alterId: 0, email: username };
    
    if (updateXrayConfig('vmess', client)) {
        const exp = saveExpiry(username, days);
        await runCommand('systemctl restart xray');
        
        // Buat format link vmess
        const vmessJson = JSON.stringify({
            v: "2", ps: username, add: domain, port: "443", id: uuid,
            aid: "0", scy: "auto", net: "ws", path: "/vmess",
            type: "none", host: domain, tls: "tls"
        });
        const link = `vmess://${Buffer.from(vmessJson).toString('base64')}`;
        
        return { username, uuid, expired: exp, link };
    }
    throw new Error("Gagal membuat Vmess");
}

export async function createVless(username: string, days: number, domain: string) {
    const uuid = uuidv4();
    const client: XrayClient = { id: uuid, email: username };
    
    if (updateXrayConfig('vless', client)) {
        const exp = saveExpiry(username, days);
        await runCommand('systemctl restart xray');
        
        const link = `vless://${uuid}@${domain}:443?path=%2Fvless&security=tls&encryption=none&type=ws#${username}`;
        return { username, uuid, expired: exp, link };
    }
    throw new Error("Gagal membuat Vless");
}
// ... (Kode sebelumnya biarkan saja) ...

export async function createTrojan(username: string, days: number, domain: string) {
    // Generate password acak 8 karakter (hex)
    const pass = Math.random().toString(16).slice(-8);
    // Trojan menggunakan field 'password' bukan 'id'
    const client: XrayClient = { password: pass, email: username };
    
    if (updateXrayConfig('trojan', client)) {
        const exp = saveExpiry(username, days);
        await runCommand('systemctl restart xray');
        
        const link = `trojan://${pass}@${domain}:443?path=%2Ftrojan&security=tls&type=ws#${username}`;
        return { username, password: pass, expired: exp, link };
    }
    throw new Error("Gagal membuat Trojan");
}

export async function deleteXray(username: string) {
    try {
        const rawData = fs.readFileSync(PATHS.xrayConfig, 'utf-8');
        const config: XrayConfig = JSON.parse(rawData);
        let found = false;

        // Loop semua inbound dan hapus client dengan email (username) yang cocok
        config.inbounds.forEach(inbound => {
            if (inbound.settings.clients) {
                const initialLength = inbound.settings.clients.length;
                inbound.settings.clients = inbound.settings.clients.filter(c => c.email !== username);
                if (inbound.settings.clients.length < initialLength) {
                    found = true;
                }
            }
        });

        if (found) {
            fs.writeFileSync(PATHS.xrayConfig, JSON.stringify(config, null, 2));
            
            // Hapus dari database txt menggunakan perintah sed Linux
            await runCommand(`sed -i "/^${username}:/d" ${PATHS.userDbXray}`);
            await runCommand('systemctl restart xray');
            return true;
        }
        return false;
    } catch (error) {
        throw new Error("Gagal menghapus akun Xray.");
    }
}