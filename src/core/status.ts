// src/core/status.ts
import * as fs from 'fs';
import { PATHS } from '../config';
import { runCommand } from '../utils/system';

export async function checkServiceStatus() {
    const services = ['ssh', 'dropbear', 'ws-openssh', 'xray', 'udpgw'];
    const statusResult: { [key: string]: string } = {};

    for (const service of services) {
        const result = await runCommand(`systemctl is-active ${service}`);
        statusResult[service] = result === 'active' ? '🟢 Active' : '🔴 Inactive';
    }
    return statusResult;
}

// FUNGSI BARU: ACCOUNT SUMMARY
export async function getAccountSummary() {
    const summary = { sshCount: 0, xrayCount: 0, sshUsers: [] as string[], xrayUsers: [] as string[] };

    try {
        if (fs.existsSync(PATHS.userDbSsh)) {
            const lines = fs.readFileSync(PATHS.userDbSsh, 'utf-8').split('\n');
            lines.forEach(line => {
                if (line.trim()) {
                    const parts = line.split('|');
                    summary.sshUsers.push(`- ${parts[0]} (Exp: ${parts[2]})`);
                    summary.sshCount++;
                }
            });
        }
    } catch (e) {}

    try {
        if (fs.existsSync(PATHS.userDbXray)) {
            const lines = fs.readFileSync(PATHS.userDbXray, 'utf-8').split('\n');
            lines.forEach(line => {
                if (line.trim()) {
                    const parts = line.split(':');
                    summary.xrayUsers.push(`- ${parts[0]} (Exp: ${parts[1]})`);
                    summary.xrayCount++;
                }
            });
        }
    } catch (e) {}

    return summary;
}