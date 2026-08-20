#!/bin/bash
# ==========================================
# Script Instalasi Xray & Nginx (Tahap 1)
# Created by: PremDigital
# ==========================================

GREEN="\033[0;32m"
YELLOW="\033[1;33m"
NC="\033[0m"

echo -e "${YELLOW}=== Memulai Setup Xray & Nginx ===${NC}"

# 1. Update dan Install Dependencies Dasar
echo -e "${GREEN}[1/5] Menginstal komponen dasar (Nginx, Curl, Socat)...${NC}"
apt update -y
apt install -y curl socat nginx uuid-runtime jq xz-utils

# 2. Meminta Input Domain
read -p "Masukkan Domain VPS Anda (contoh: sg1.premdigital.com): " DOMAIN
mkdir -p /etc/xray
echo "$DOMAIN" > /etc/xray/domain

# 3. Instal Acme.sh & Generate SSL
echo -e "${GREEN}[2/5] Meminta Sertifikat SSL dari Let's Encrypt (Acme.sh)...${NC}"
systemctl stop nginx
curl https://get.acme.sh | sh
~/.acme.sh/acme.sh --set-default-ca --server letsencrypt
~/.acme.sh/acme.sh --register-account -m admin@$DOMAIN
~/.acme.sh/acme.sh --issue -d $DOMAIN --standalone -k ec-256
~/.acme.sh/acme.sh --installcert -d $DOMAIN --fullchainpath /etc/xray/xray.crt --keypath /etc/xray/xray.key --ecc
chmod 644 /etc/xray/xray.crt /etc/xray/xray.key

# 4. Instal Xray Core Official
echo -e "${GREEN}[3/5] Mengunduh dan menginstal Xray Core Terbaru...${NC}"
bash -c "$(curl -L https://github.com/XTLS/Xray-install/raw/main/install-release.sh)" @ install

# 5. Konfigurasi Xray (Config.json Dasar)
echo -e "${GREEN}[4/5] Mengonfigurasi Xray Core...${NC}"
cat > /usr/local/etc/xray/config.json << END
{
  "log": {
    "access": "/var/log/xray/access.log",
    "error": "/var/log/xray/error.log",
    "loglevel": "warning"
  },
  "inbounds": [
    {
      "port": 443,
      "protocol": "vless",
      "settings": {
        "clients": [],
        "decryption": "none",
        "fallbacks": [
          {"dest": 80}
        ]
      },
      "streamSettings": {
        "network": "tcp",
        "security": "tls",
        "tlsSettings": {
          "alpn": ["http/1.1"],
          "certificates": [
            {
              "certificateFile": "/etc/xray/xray.crt",
              "keyFile": "/etc/xray/xray.key"
            }
          ]
        }
      }
    }
  ],
  "outbounds": [
    {
      "protocol": "freedom",
      "settings": {}
    }
  ]
}
END

# 6. Konfigurasi Nginx (Fallback & Web)
echo -e "${GREEN}[5/5] Mengonfigurasi Nginx...${NC}"
cat > /etc/nginx/conf.d/xray.conf << END
server {
    listen 80;
    server_name $DOMAIN;
    root /var/www/html;
    index index.html;
}
END

systemctl restart xray
systemctl restart nginx
systemctl enable xray
systemctl enable nginx

echo -e "${YELLOW}=== Tahap 1 Selesai! Xray & Nginx Berhasil Diinstal ===${NC}"
