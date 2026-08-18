// uninstall.ts
import inquirer from 'inquirer';
import chalk from 'chalk';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

function run(cmd: string) {
    try {
        // stdio: 'ignore' agar pesan error/log sistem tidak mengotori layar
        execSync(cmd, { stdio: 'ignore' });
    } catch (e) {
        // Abaikan error jika file/service tidak ditemukan
    }
}

async function main() {
    console.clear();
    console.log(chalk.red.bold("=== ⚠️ UNINSTALL PREM DIGITAL PANEL ⚠️ ==="));
    console.log(chalk.yellow("Peringatan: Ini akan menghapus seluruh file panel, pengaturan, dan shortcut."));
    console.log(chalk.gray("Catatan: Akun VPN (SSH/Xray) yang sudah dibuat TIDAK akan terhapus.\n"));
    
    const confirm = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'sure',
            message: 'Anda yakin ingin MENGHAPUS panel ini secara permanen?',
            default: false
        }
    ]);

    if (!confirm.sure) {
        console.log(chalk.green("\nDibatalkan. Panel Anda aman. 🚀\n"));
        process.exit(0);
    }

    console.log(chalk.cyan("\nMemulai proses uninstalasi... ⏳"));

    // 1. Hapus alias (shortcut menu) dari .bashrc
    console.log(chalk.white(" 🗑  Menghapus shortcut 'menu'..."));
    const bashrcPath = path.join(os.homedir(), '.bashrc');
    if (fs.existsSync(bashrcPath)) {
        run(`sed -i '/alias menu=/d' ${bashrcPath}`);
    }

    // 2. Stop dan Hapus service BadVPN UDPGW (jika terinstall)
    console.log(chalk.white(" 🗑  Mengecek dan menghapus UDPGW..."));
    run('systemctl stop udpgw');
    run('systemctl disable udpgw');
    run('rm -f /etc/systemd/system/udpgw.service');
    run('rm -f /usr/local/bin/badvpn-udpgw');
    run('systemctl daemon-reload');

    // 3. Menghapus folder dan zip panel
    console.log(chalk.white(" 🗑  Menghapus folder utama panel..."));
    run('rm -f /root/premdigital-panel.zip');

    console.log(chalk.green.bold("\n✅ UNINSTALL BERHASIL!"));
    console.log(chalk.yellow("Ketik 'exit' lalu login kembali ke VPS Anda agar perubahan selesai sepenuhnya."));

    // Menghapus folder dirinya sendiri di background (agar proses tidak crash sebelum exit)
    run('rm -rf /root/premdigital-panel &');
    
    process.exit(0);
}

main();