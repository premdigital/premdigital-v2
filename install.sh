#!/bin/bash
# ==========================================
# AUTO INSTALLER PREMDIGITAL PANEL + VPN CORE
# Created by: PremDigital
# ==========================================

GREEN="\033[0;32m"
YELLOW="\033[1;33m"
NC="\033[0m"

echo -e "${YELLOW}====================================================${NC}"
echo -e "${GREEN}   MENGINSTAL PREMDIGITAL VPN CORE & PANEL BOT  ${NC}"
echo -e "${YELLOW}====================================================${NC}"

# 1. Eksekusi Core VPN
echo -e "${GREEN}>>> Tahap 1: Menginstal Xray & Nginx...${NC}"
bash <(curl -sL https://raw.githubusercontent.com/premdigital/premdigital-v2/main/autoscript/setup-xray.sh)

echo -e "${GREEN}>>> Tahap 2: Menginstal Dropbear & SSH WS...${NC}"
bash <(curl -sL https://raw.githubusercontent.com/premdigital/premdigital-v2/main/autoscript/setup-ssh.sh)

echo -e "${GREEN}>>> Tahap 3: Menginstal BadVPN & Optimasi...${NC}"
bash <(curl -sL https://raw.githubusercontent.com/premdigital/premdigital-v2/main/autoscript/setup-system.sh)

# 2. Eksekusi Panel Node.js
echo -e "${GREEN}>>> Tahap 4: Menginstal Panel Manajemen Bot...${NC}"
# Pastikan menggunakan Node.js versi terbaru
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs unzip cron openssl

rm -rf /root/premdigital-panel
git clone https://github.com/premdigital/premdigital-v2.git /root/premdigital-panel
cd /root/premdigital-panel

npm install
npm run build

# Generate Kunci RSA untuk Keamanan Telegram
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem

# Pasang alias & Cronjob Autodelete
sed -i '/alias menu=/d' ~/.bashrc
echo "alias menu='cd /root/premdigital-panel && npm start'" >> ~/.bashrc
(crontab -l 2>/dev/null | grep -v "autodelete"; echo "0 0 * * * cd /root/premdigital-panel && /usr/bin/npm run autodelete >> /var/log/autodelete.log 2>&1") | crontab -

echo -e "${YELLOW}====================================================${NC}"
echo -e "${GREEN}✅ SEMUA INSTALASI SELESAI! ✅${NC}"
echo -e "${YELLOW}====================================================${NC}"
echo -e "Silakan lakukan langkah terakhir:"
echo -e "1. Ketik: ${GREEN}cd /root/premdigital-panel${NC}"
echo -e "2. Ketik: ${GREEN}cp .env.example .env${NC}"
echo -e "3. Edit isi .env sesuai data Anda (Token Bot, dll)"
echo -e "4. Ketik: ${GREEN}source ~/.bashrc && menu${NC} untuk masuk ke panel"
