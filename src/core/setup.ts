// src/core/setup.ts
import * as fs from 'fs';
import { PATHS } from '../config';
import { runCommand } from '../utils/system';

export async function saveDomain(domain: string) {
    try {
        fs.writeFileSync(PATHS.domainFile, domain);
        return true;
    } catch (error) { throw new Error("Gagal menyimpan file domain."); }
}

export async function generateSSL(domain: string, email: string) {
    try {
        await runCommand('systemctl stop xray nginx ws-openssh 2>/dev/null');
        await runCommand(`curl https://get.acme.sh | sh -s email=${email}`);
        const acmePath = '~/.acme.sh/acme.sh';
        await runCommand(`${acmePath} --issue -d ${domain} --standalone --force`);
        await runCommand(`${acmePath} --installcert -d ${domain} --fullchainpath /etc/xray/xray.crt --keypath /etc/xray/xray.key`);
        await runCommand('cat /etc/xray/xray.crt /etc/xray/xray.key > /etc/xray/xray.pem');
        await runCommand('systemctl restart xray ws-openssh');
        return true;
    } catch (error) {
        await runCommand('systemctl restart xray ws-openssh 2>/dev/null');
        throw new Error("Gagal membuat sertifikat SSL.");
    }
}

// FUNGSI BARU: INSTALL UDP (BADVPN)
export async function installUdp() {
    try {
        await runCommand('apt install build-essential cmake libssl-dev unzip wget -y > /dev/null 2>&1');
        
        // Cek apakah udpgw sudah terinstall
        const check = await runCommand('ls /usr/local/bin/badvpn-udpgw 2>/dev/null');
        if (!check) {
            await runCommand('wget -q https://github.com/ambrop72/badvpn/archive/master.zip');
            await runCommand('unzip -q master.zip');
            // Proses compile cmake memakan waktu
            await runCommand('cd badvpn-master && mkdir build && cd build && cmake .. -DBUILD_NOTHING_BY_DEFAULT=1 -DBUILD_UDPGW=1 && make install');
            await runCommand('rm -rf badvpn-master master.zip');
        }

        const serviceConfig = `[Unit]
Description=BadVPN UDP Gateway By Prem Digital
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/badvpn-udpgw --listen-addr 127.0.0.1:7300 --max-clients 1000 --max-connections-for-client 10
Restart=always

[Install]
WantedBy=multi-user.target`;

        fs.writeFileSync('/etc/systemd/system/udpgw.service', serviceConfig);
        await runCommand('systemctl daemon-reload');
        await runCommand('systemctl enable udpgw 2>/dev/null');
        await runCommand('systemctl restart udpgw');
        await runCommand('ufw allow 7300/tcp 2>/dev/null');
        await runCommand('ufw allow 7300/udp 2>/dev/null');
        return true;
    } catch (error) {
        throw new Error("Gagal menginstal UDP Custom (BadVPN).");
    }
}
export async function setSshBanner() {
    // Banner ini sudah menggunakan tag HTML agar berwarna-warni di log HTTP Custom!
    // Spasi sudah dihitung matematis (Lebar 38 Karakter) agar RATA TENGAH SEMPURNA di layar HP.
    const banner = `<font color="#00FFFF"><b>======================================</b></font>
<font color="#00FF00"><b>           PREM DIGITAL VPN           </b></font>
<font color="#00FFFF"><b>======================================</b></font>
<font color="#FF0000"><b>               NO FRAUD               </b></font>
<font color="#FF0000"><b>              NO HACKING              </b></font>
<font color="#FF0000"><b>              NO CARDING              </b></font>
<font color="#FF0000"><b>              NO TORRENT              </b></font>
<font color="#FF0000"><b>          NO CRIMINAL CYBER           </b></font>
<font color="#FFFF00"><b>      MAX LOGIN 1 / 2 / 5 DEVICE      </b></font>
<font color="#FFFF00"><b>        AUTO DELETE MULTILOGIN        </b></font>
<font color="#00FFFF"><b>======================================</b></font>
<font color="#FFFFFF"><b>       THANK YOU FOR YOUR ORDER       </b></font>
<font color="#00FFFF"><b>======================================</b></font>
`;

    try {
        // Tulis teks banner ke file sistem SSH VPS
        fs.writeFileSync('/etc/issue.net', banner, 'utf-8');
        
        // Aktifkan pengaturan banner di SSHD config
        await runCommand(`sed -i 's/#Banner none/Banner \\/etc\\/issue.net/g' /etc/ssh/sshd_config`);
        await runCommand(`sed -i 's/#Banner \\/etc\\/issue.net/Banner \\/etc\\/issue.net/g' /etc/ssh/sshd_config`);
        
        // Pastikan Dropbear juga membaca issue.net (jika menggunakan config default)
        await runCommand(`sed -i 's/DROPBEAR_BANNER=""/DROPBEAR_BANNER="\\/etc\\/issue.net"/g' /etc/default/dropbear 2>/dev/null`);
        
        // Restart layanan SSH agar banner langsung aktif
        await runCommand(`systemctl restart ssh dropbear ws-openssh 2>/dev/null`);
        return true;
    } catch (error) {
        throw new Error("Gagal memasang banner. Pastikan Anda menjalankan ini di VPS (Root).");
    }
}