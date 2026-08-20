#!/bin/bash
# ==========================================
# Script Instalasi SSH & Dropbear (Tahap 2)
# Created by: PremDigital
# ==========================================

GREEN="\033[0;32m"
YELLOW="\033[1;33m"
NC="\033[0m"

echo -e "${YELLOW}=== Memulai Setup Dropbear & SSH Websocket ===${NC}"

# 1. Instal Dropbear
echo -e "${GREEN}[1/4] Menginstal Dropbear...${NC}"
apt install -y dropbear

# Konfigurasi Dropbear untuk jalan di port 143 dan 109
sed -i 's/NO_START=1/NO_START=0/g' /etc/default/dropbear
sed -i 's/DROPBEAR_PORT=22/DROPBEAR_PORT=143/g' /etc/default/dropbear
sed -i 's/DROPBEAR_EXTRA_ARGS=.*/DROPBEAR_EXTRA_ARGS="-p 109"/g' /etc/default/dropbear

systemctl restart dropbear
systemctl enable dropbear

# 2. Instal SSH Websocket (Proxy Python)
echo -e "${GREEN}[2/4] Menginstal Websocket Proxy (Python)...${NC}"
apt install -y python3

mkdir -p /usr/local/bin
cat > /usr/local/bin/ws-proxy.py << 'END'
import socket
import threading
import sys

# Websocket Proxy super ringan.
# Menerima koneksi di port tertentu dan meneruskannya ke Dropbear (143)
def handle_client(client_socket):
    try:
        request = client_socket.recv(1024).decode('utf-8')
        if "HTTP" in request:
            response = "HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n"
            client_socket.send(response.encode('utf-8'))
        
        target = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        target.connect(('127.0.0.1', 143)) # Arahkan ke Dropbear
        
        threading.Thread(target=forward, args=(client_socket, target)).start()
        threading.Thread(target=forward, args=(target, client_socket)).start()
    except Exception as e:
        client_socket.close()

def forward(source, destination):
    try:
        while True:
            data = source.recv(4096)
            if not data: break
            destination.sendall(data)
    except:
        pass
    finally:
        source.close()
        destination.close()

server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
# Listen di port 8880 (Nginx nanti diarahkan ke sini)
server.bind(('0.0.0.1', 8880))
server.listen(100)

while True:
    client, addr = server.accept()
    threading.Thread(target=handle_client, args=(client,)).start()
END

chmod +x /usr/local/bin/ws-proxy.py

# 3. Buat Service Systemd untuk Websocket Proxy
echo -e "${GREEN}[3/4] Membuat Systemd Service untuk Websocket...${NC}"
cat > /etc/systemd/system/ws-proxy.service << END
[Unit]
Description=Python SSH Websocket Proxy
After=network.target nss-lookup.target

[Service]
Type=simple
User=root
CapabilityBoundingSet=CAP_NET_ADMIN CAP_NET_BIND_SERVICE
AmbientCapabilities=CAP_NET_ADMIN CAP_NET_BIND_SERVICE
NoNewPrivileges=true
ExecStart=/usr/bin/python3 /usr/local/bin/ws-proxy.py
Restart=on-failure

[Install]
WantedBy=multi-user.target
END

systemctl daemon-reload
systemctl enable ws-proxy
systemctl start ws-proxy

# 4. Tambahkan Routing Nginx untuk WS (Buka Port 80 untuk SSH)
echo -e "${GREEN}[4/4] Menyambungkan Nginx dengan Websocket...${NC}"
# Kita tambahkan blok location ke config nginx xray yang dibuat di Tahap 1
DOMAIN=$(cat /etc/xray/domain)
cat > /etc/nginx/conf.d/xray.conf << END
server {
    listen 80;
    server_name $DOMAIN;
    
    # Routing untuk SSH Websocket (Misal path /ssh)
    location /ssh {
        proxy_pass http://127.0.0.1:8880;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host \$host;
    }

    # Jika bukan /ssh, arahkan ke web statis
    location / {
        root /var/www/html;
        index index.html;
    }
}
END

systemctl restart nginx

echo -e "${YELLOW}=== Tahap 2 Selesai! Dropbear & SSH Websocket Berjalan ===${NC}"
