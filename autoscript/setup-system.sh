#!/bin/bash
# ==========================================
# Script Instalasi BadVPN & Optimasi (Tahap 3)
# Created by: PremDigital
# ==========================================

GREEN="\033[0;32m"
YELLOW="\033[1;33m"
NC="\033[0m"

echo -e "${YELLOW}=== Memulai Setup BadVPN & Optimasi Sistem ===${NC}"

# 1. Instal BadVPN (Badvpn-udpgw)
echo -e "${GREEN}[1/3] Menginstal BadVPN untuk Game & Voice Call...${NC}"
apt install -y cmake make gcc g++
# Hapus jika sudah ada versi lama
rm -rf /root/badvpn
cd /root
git clone https://github.com/ambrop72/badvpn.git
cd badvpn
mkdir build && cd build
cmake .. -DBUILD_NOTHING_BY_DEFAULT=1 -DBUILD_UDPGW=1
make install

# Buat Systemd untuk BadVPN (Listen di Port 7300, port standar UDP Custom)
cat > /etc/systemd/system/badvpn.service << END
[Unit]
Description=BadVPN UDPGW Service
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/badvpn-udpgw --listen-addr 127.0.0.1:7300 --max-clients 500 --max-connections-for-client 10 --client-socket-sndbuf 100000
Restart=on-failure

[Install]
WantedBy=multi-user.target
END

systemctl daemon-reload
systemctl enable badvpn
systemctl start badvpn

# 2. Optimasi Kernel (BBR & TCP)
echo -e "${GREEN}[2/3] Menerapkan Optimasi TCP BBR...${NC}"
cat > /etc/sysctl.d/99-premdigital-bbr.conf << END
# BBR TCP Congestion Control
net.core.default_qdisc=fq
net.ipv4.tcp_congestion_control=bbr
# Tweak Network buffer
net.core.rmem_max=16777216
net.core.wmem_max=16777216
net.ipv4.tcp_rmem=4096 87380 16777216
net.ipv4.tcp_wmem=4096 65536 16777216
net.ipv4.tcp_fastopen=3
END

sysctl --system

# 3. Pengaturan Timezone & Auto-Reboot
echo -e "${GREEN}[3/3] Mengatur Waktu (Asia/Jakarta) & Auto Reboot...${NC}"
ln -fs /usr/share/zoneinfo/Asia/Jakarta /etc/localtime
dpkg-reconfigure --frontend noninteractive tzdata

# Tambahkan Cronjob untuk Auto-Reboot jam 05:00 pagi setiap hari
(crontab -l 2>/dev/null | grep -v "reboot"; echo "0 5 * * * /sbin/reboot") | crontab -

echo -e "${YELLOW}=== Tahap 3 Selesai! BadVPN & Optimasi Berhasil ===${NC}"
