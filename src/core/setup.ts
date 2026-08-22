// src/core/setup.ts
import * as fs from 'fs';
import { PATHS } from '../config';
import { runCommand } from '../utils/system';
import chalk from 'chalk';

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
        const acmePath = '/root/.acme.sh/acme.sh';
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

export async function installUdp() {
    try {
        // Pre-compiled 64-bit
        await runCommand('wget -qO /usr/local/bin/badvpn-udpgw "https://raw.githubusercontent.com/daybreakersx/premscript/master/badvpn-udpgw64"');
        
        await runCommand('chmod +x /usr/local/bin/badvpn-udpgw');

        const serviceConfig = `[Unit]
Description=BadVPN UDP Gateway By Prem Digital
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/badvpn-udpgw --listen-addr 127.0.0.1:7100 --max-clients 1000
Restart=always

[Install]
WantedBy=multi-user.target`;

        fs.writeFileSync('/etc/systemd/system/udpgw.service', serviceConfig);
        await runCommand('systemctl daemon-reload');
        await runCommand('systemctl enable udpgw 2>/dev/null');
        await runCommand('systemctl restart udpgw');
        await runCommand('ufw allow 7100/tcp 2>/dev/null || true');
        await runCommand('ufw allow 7100/udp 2>/dev/null || true');
        
        return true;
    } catch (error) {
        throw new Error("Gagal menginstal UDP Custom (BadVPN).");
    }
}
                             
export async function setSshBanner() {
  
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
        
        await runCommand('systemctl daemon-reload');
        await runCommand('systemctl enable udpgw 2>/dev/null');
        await runCommand('systemctl restart udpgw');
        await runCommand('ufw allow 7100/tcp 2>/dev/null || true');
        await runCommand('ufw allow 7100/udp 2>/dev/null || true');
        return true;
    } catch (error) {
        throw new Error("Gagal menginstal UDP Custom (BadVPN).");
    }
}
  export async function installWsOpenSsh() {
    try {
      
        await runCommand('apt-get install python3 -y > /dev/null 2>&1');
        
        const wsScript = `#!/usr/bin/env python3
import socket, threading

def handle_client(client_socket):
    try:
        request = client_socket.recv(1024).decode('utf-8', errors='ignore')
        if not request:
            client_socket.close()
            return
            
        # Balas dengan HTTP 101 Switching Protocols agar terbaca sebagai WebSocket
        response = "HTTP/1.1 101 Switching Protocols\\r\\nUpgrade: websocket\\r\\nConnection: Upgrade\\r\\n\\r\\n"
        client_socket.send(response.encode())
        
        # Sambungkan ke SSH lokal (Port 22)
        ssh_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        ssh_socket.connect(('127.0.0.1', 22,80,443))
        
        def forward(source, destination):
            try:
                while True:
                    data = source.recv(4096)
                    if not data: break
                    destination.sendall(data)
            except: pass
            finally:
                source.close()
                destination.close()
                
        threading.Thread(target=forward, args=(client_socket, ssh_socket)).start()
        threading.Thread(target=forward, args=(ssh_socket, client_socket)).start()
    except:
        client_socket.close()

server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
server.bind(('0.0.0.0', 80,443)) # Berjalan di Port 80
server.listen(100)

while True:
    client, addr = server.accept()
    threading.Thread(target=handle_client, args=(client,)).start()
`;
        
        fs.writeFileSync('/usr/local/bin/ws-openssh', wsScript);
        await runCommand('chmod +x /usr/local/bin/ws-openssh');

        const serviceConfig = `[Unit]
Description=WebSocket Proxy For OpenSSH
Documentation=Prem Digital
After=network.target nss-lookup.target

[Service]
Type=simple
User=root
CapabilityBoundingSet=CAP_NET_ADMIN CAP_NET_BIND_SERVICE
AmbientCapabilities=CAP_NET_ADMIN CAP_NET_BIND_SERVICE
NoNewPrivileges=true
ExecStart=/usr/bin/python3 /usr/local/bin/ws-openssh
Restart=on-failure

[Install]
WantedBy=multi-user.target`;

        fs.writeFileSync('/etc/systemd/system/udpgw.service', serviceConfig);
        await runCommand('systemctl daemon-reload');
        await runCommand('systemctl enable ws-openssh 2>/dev/null');
        await runCommand('systemctl restart ws-openssh');
        await runCommand('ufw allow 80/tcp 2>/dev/null || true');
        
        return true;
      } catch (error) {
        throw new Error("Gagal menginstal WS-OpenSSH.");
      
        console.log(chalk.yellow("\nMenginstal Stunnel4 untuk Port 443 SSL... ⏳"));
        await runCommand('apt-get install stunnel4 -y >/dev/null 2>&1');
      
        await runCommand('openssl req -new -newkey rsa:2048 -days 3650 -nodes -x509 -subj "/C=ID/ST=Jakarta/L=Jakarta/O=PremDigital/OU=PremDigital/CN=premdigital.net" -keyout /etc/stunnel/stunnel.pem -out /etc/stunnel/stunnel.pem >/dev/null 2>&1');
      
        const stunnelConf = `pid = /var/run/stunnel.pid
cert = /etc/stunnel/stunnel.pem
client = no
socket = a:SO_REUSEADDR=1
socket = l:TCP_NODELAY=1
socket = r:TCP_NODELAY=1

[dropbear]
accept = 443
connect = 127.0.0.1:109`;
        
        fs.writeFileSync('/etc/stunnel/stunnel.conf', stunnelConf);

        await runCommand("sed -i 's/ENABLED=0/ENABLED=1/g' /etc/default/stunnel4");
        await runCommand('systemctl restart stunnel4');
        await runCommand('systemctl enable stunnel4 2>/dev/null');
      
        await runCommand('ufw allow 443/tcp 2>/dev/null || true');
        await runCommand('iptables -A INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null || true');
        
    } 
  }
export async function restartAllServices() {
    try {
        console.log(chalk.yellow("\nMemulai ulang (Restart) semua layanan VPS... ⏳"));
        
        // Daftar semua service yang mau di-restart
        const services = [
            'ssh', 'sshd', 'dropbear', 'ws-openssh', 
            'stunnel4', 'udpgw', 'xray', 'nginx'
        ];

        for (const service of services) {
            console.log(chalk.cyan(`Restarting ${service}...`));
            await runCommand(`systemctl restart ${service} 2>/dev/null || true`);
        }

        console.log(chalk.greenBright("\n✅ Semua layanan berhasil di-restart! VPS sekarang fresh kembali."));
        return true;
    } catch (error) {
        console.log(chalk.red("\n❌ Terjadi kesalahan saat merestart layanan."));
    }
}