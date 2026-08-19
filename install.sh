#!/bin/bash
# Script Instalasi Otomatis PremDigital Panel V2

GREEN="\033[0;32m"
YELLOW="\033[1;33m"
NC="\033[0m"

echo -e "${YELLOW}Memulai instalasi PremDigital Panel V2...${NC}"

echo -e "${GREEN}[1/5] Menginstal dependencies sistem...${NC}"
apt update && apt upgrade -y
apt install -y git nodejs npm unzip curl cron openssl

echo -e "${GREEN}[2/5] Mengunduh source code dari GitHub...${NC}"
rm -rf /root/premdigital-panel
git clone https://github.com/premdigital/premdigital-v2.git /root/premdigital-panel
cd /root/premdigital-panel

echo -e "${GREEN}[3/5] Mengompilasi TypeScript dan menginstal modul...${NC}"
npm install
npm run build

echo -e "${GREEN}[4/5] Membuat kunci keamanan (RSA)...${NC}"
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem

echo -e "${GREEN}[5/5] Memasang Cronjob dan Shortcut Menu...${NC}"
sed -i '/alias menu=/d' ~/.bashrc
echo "alias menu='cd /root/premdigital-panel && npm start'" >> ~/.bashrc
(crontab -l 2>/dev/null | grep -v "autodelete"; echo "0 0 * * * cd /root/premdigital-panel && /usr/bin/npm run autodelete >> /var/log/autodelete.log 2>&1") | crontab -

echo -e "${YELLOW}====================================================${NC}"
echo -e "${GREEN}✅ INSTALASI SELESAI! ✅${NC}"
echo -e "${YELLOW}====================================================${NC}"
echo -e "Langkah terakhir:"
echo -e "1. Ketik: ${GREEN}cd /root/premdigital-panel${NC}"
echo -e "2. Ketik: ${GREEN}cp .env.example .env${NC}"
echo -e "3. Edit isi .env sesuai data Anda (Token Bot, dll)"
echo -e "4. Pastikan path public key di .env adalah /root/premdigital-panel/public.pem"
echo -e "5. Ketik: ${GREEN}source ~/.bashrc && menu${NC} untuk masuk ke panel"
