// src/core/xray.ts
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { PATHS } from '../config';
import { XrayConfig, XrayClient } from '../types';
import { runCommand, isValidUsername } from '../utils/system';

// Fungsi membaca dan mengubah file config xray
function updateXrayConfig(protocol: 'vmess' | 'vless' | 'trojan', newClient: XrayClient) {
    try {
        if (!fs.existsSync(PATHS.xrayConfig)) throw new Error("File config Xray tidak ditemukan!");
        
        const rawData = fs.readFileSync(PATHS.xrayConfig, 'utf-8');
        const config: XrayConfig = JSON.parse(rawData);
        
        const inboundIndex = config.inbounds.findIndex(i => i.protocol === protocol);
        
        if (inboundIndex !== -1) {
            const clients = config.inbounds[inboundIndex].settings.clients;
            
            // CEK DUPLIKAT: Jangan buat kalau email/username sudah ada
            const isExists = clients.some(c => c.email === newClient.email);
            if (isExists) throw new Error(`Username ${newClient.email} sudah ada di protokol ${protocol}`);

            config.inbounds[inboundIndex].settings.clients.push(newClient);
            fs.writeFileSync(PATHS.xrayConfig, JSON.stringify(config, null, 2));
            return true;
        }
        return false;
    } catch (error: any) {
        throw new Error(`Gagal update config Xray: ${error.message}`);
    }
}

// Fungsi mencatat expired akun Xray
function saveExpiry(username: string, days: number) {
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + days);
    const dateStr = expDate.toISOString().split('T')[0]; 
    
    const dbDir = path.dirname(PATHS.userDbXray);
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    if (!fs.existsSync(PATHS.userDbXray)) fs.writeFileSync(PATHS.userDbXray, '');

    fs.appendFileSync(PATHS.userDbXray, `${username}:${dateStr}\n`);
    return dateStr;
}

export async function createVmess(username: string, days: number, domain: string) {
    if (!isValidUsername(username)) throw new Error("Username hanya huruf dan angka!");
    const uuid = uuidv4();
    const client: XrayClient = { id: uuid, alterId: 0, email: username };
    
    if (updateXrayConfig('vmess', client)) {
        const exp = saveExpiry(username, days);
        await runCommand('systemctl restart xray');
        
        const vmessJson = JSON.stringify({
            v: "2", ps: username, add: domain, port: "443", id: uuid,
            aid: "0", scy: "auto", net: "ws", path: "/vmess",
            type: "none", host: domain, tls: "tls"
        });
        const link = `vmess://${Buffer.from(vmessJson).toString('base64')}`;
        return { username, uuid, expired: exp, link };
    }
    throw new Error("Protokol Vmess tidak ditemukan di config.");
}

export async function createVless(username: string, days: number, domain: string) {
    if (!isValidUsername(username)) throw new Error("Username hanya huruf dan angka!");
    const uuid = uuidv4();
    const client: XrayClient = { id: uuid, email: username };
    
    if (updateXrayConfig('vless', client)) {
        const exp = saveExpiry(username, days);
        await runCommand('systemctl restart xray');
        
        const link = `vless://${uuid}@${domain}:443?path=%2Fvless&security=tls&encryption=none&type=ws#${username}`;
        return { username, uuid, expired: exp, link };
    }
    throw new Error("Protokol Vless tidak ditemukan di config.");
}

export async function createTrojan(username: string, days: number, domain: string) {
    if (!isValidUsername(username)) throw new Error("Username hanya huruf dan angka!");
    const pass = Math.random().toString(16).slice(-8);
    const client: XrayClient = { password: pass, email: username };
    
    if (updateXrayConfig('trojan', client)) {
        const exp = saveExpiry(username, days);
        await runCommand('systemctl restart xray');
        
        const link = `trojan://${pass}@${domain}:443?path=%2Ftrojan&security=tls&type=ws#${username}`;
        return { username, password: pass, expired: exp, link };
    }
    throw new Error("Protokol Trojan tidak ditemukan di config.");
}

export async function deleteXray(username: string) {
    if (!isValidUsername(username)) throw new Error("Username tidak valid!");
    try {
        if (!fs.existsSync(PATHS.xrayConfig)) return false;

        const rawData = fs.readFileSync(PATHS.xrayConfig, 'utf-8');
        const config: XrayConfig = JSON.parse(rawData);
        let found = false;

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
            if (fs.existsSync(PATHS.userDbXray)) {
                await runCommand(`sed -i "/^${username}:/d" ${PATHS.userDbXray}`);
            }
            await runCommand('systemctl restart xray');
            return true;
        }
        return false;
    } catch (error: any) {
        throw new Error(`Gagal menghapus akun Xray: ${error.message}`);
    }
}