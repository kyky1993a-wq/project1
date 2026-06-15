#!/bin/bash
# 육아일기 서버 자동 배포 스크립트
# 사용법: chmod +x deploy.sh && ./deploy.sh

set -e
APP_DIR="/home/ubuntu/diary-app"
echo "======================================"
echo "  육아일기 서버 배포 시작"
echo "======================================"

# 1. 시스템 패키지
echo "[1/8] 패키지 설치 중..."
sudo apt-get update -qq
sudo apt-get install -y python3 python3-pip python3-venv nginx certbot python3-certbot-nginx postgresql postgresql-contrib netfilter-persistent iptables-persistent curl -qq

# Node.js 20
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash - > /dev/null 2>&1
    sudo apt-get install -y nodejs -qq
fi

echo "[2/8] 방화벽 포트 개방..."
sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null || true
sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null || true
sudo netfilter-persistent save > /dev/null 2>&1 || true

# 3. PostgreSQL 설정
echo "[3/8] PostgreSQL 설정..."
sudo systemctl start postgresql
sudo systemctl enable postgresql

# DB + 유저 생성 (이미 있으면 건너뜀)
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='diary_db'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE DATABASE diary_db;"
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='diary_user'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE USER diary_user WITH PASSWORD '$(grep DB_PASSWORD $APP_DIR/.env.production 2>/dev/null | cut -d= -f2 || echo "diary1234!")';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE diary_db TO diary_user;" > /dev/null

# 4. 백엔드 의존성
echo "[4/8] Python 패키지 설치..."
cd "$APP_DIR/backend"
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt -q

# 5. 사진 디렉터리 생성
mkdir -p "$APP_DIR/backend/storage/photos"

# 6. 프론트엔드 빌드
echo "[5/8] 프론트엔드 빌드..."
cd "$APP_DIR/frontend"
npm install --silent
npm run build

# 7. systemd 서비스
echo "[6/8] 서비스 등록..."
sudo cp "$APP_DIR/server/diary.service" /etc/systemd/system/diary.service
sudo systemctl daemon-reload
sudo systemctl enable diary
sudo systemctl restart diary

# 8. Nginx
echo "[7/8] Nginx 설정..."
sudo cp "$APP_DIR/server/nginx.conf" /etc/nginx/sites-available/diary
sudo ln -sf /etc/nginx/sites-available/diary /etc/nginx/sites-enabled/diary
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

echo ""
echo "======================================"
echo "  배포 완료!"
echo "  http://$(curl -s ifconfig.me) 에서 확인하세요"
echo "======================================"
