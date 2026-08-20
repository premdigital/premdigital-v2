#!/bin/bash
# ==========================================
# Script UNINSTALL PREMDIGITAL PANEL + VPN CORE
# ==========================================

RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
NC="\033[0m"

echo -e "${RED}⚠️ PERINGATAN! ⚠️${NC}"
echo -e "Script ini akan menghapus SELURUH komponen PremDigital Panel,"
echo -e "Xray, Nginx, Dropbear, dan BadVPN dari server ini."
read -p "Apakah Anda yakin ingin melanjutkan? (y/n): " confirm

if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo -e "${YELLOW}Proses uninstall dibatalkan.${NC}"
    exit 0
fi

echo -e "${YELLOW}Memulai proses penghapusan...${NC}"

# 1. Hentikan semua Service
echo -e "${GREEN}[1/5] Menghentikan semua layanan...${NC}"
systemctl stop xray
systemctl stop nginx
systemctl stop dropbear
systemctl stop ws-proxy
systemctl stop badvpn

# 2. Hapus Service dari Systemd
echo -e "${GREEN}[2/5] Menghapus konfigurasi Systemd...${NC}"
systemctl disable xray
systemctl disable nginx
systemctl disable dropbear
systemctl disable ws-proxy
systemctl disable badvpn

rm -f /etc/systemd/system/ws-proxy.service
rm -f /etc/systemd/system/badvpn.service
systemctl daemon-reload

# 3. Hapus Aplikasi dan Dependencies
echo -e "${GREEN}[3/5] Menghapus paket aplikasi dasar...${NC}"
apt remove --purge -y xray nginx dropbear socat nodejs
apt autoremove -y

# 4. Hapus Folder & File Konfigurasi
echo -e "${GREEN}[4/5] Menghapus direktori data dan log...${NC}"
rm -rf /usr/local/etc/xray
rm -rf /var/log/xray
rm -rf /etc/xray
rm -rf /var/www/html/*
rm -rf /root/premdigital-panel
rm -rf /root/badvpn
rm -rf ~/.acme.sh
rm -f /usr/local/bin/ws-proxy.py
rm -f /usr/local/bin/badvpn-udpgw
rm -f /etc/sysctl.d/99-premdigital-bbr.conf

# 5. Hapus Alias & Cronjob
echo -e "${GREEN}[5/5] Membersihkan pintasan dan cronjob...${NC}"
sed -i '/alias menu=/d' ~/.bashrc
(crontab -l 2>/dev/null | grep -v "autodelete") | crontab -
(crontab -l 2>/dev/null | grep -v "reboot") | crontab -

echo -e "${YELLOW}====================================================${NC}"
echo -e "${GREEN}✅ UNINSTALL SELESAI! Server sudah bersih. ✅${NC}"
echo -e "${YELLOW}====================================================${NC}"
echo -e "Sangat disarankan untuk melakukan Reboot VPS Anda."
