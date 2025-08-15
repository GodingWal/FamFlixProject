#!/bin/bash

# FamFlix GCE File Copy/Deploy Script
# Copies application files to a Google Compute Engine instance and deploys

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}📁 FamFlix GCE Deploy Script${NC}"
echo "=============================================="
echo ""

# Usage
if [ -z "$1" ]; then
  echo -e "${RED}❌ Usage: $0 <GCE_IP_OR_DNS> [SSH_KEY_PATH] [SSH_USER]${NC}"
  echo ""
  echo "Examples:"
  echo "  $0 34.134.33.7 ~/.ssh/gcp_key goding"
  echo "  $0 my-instance.us-central1-b.c.project.internal ~/.ssh/gcp_key"
  exit 1
fi

GCE_HOST="$1"
SSH_KEY="${2:-~/.ssh/id_rsa}"
SSH_USER="${3:-goding}"

APP_DIR="/opt/famflix"
SERVICE_USER="famflix"

log() { echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"; }

# Validate SSH key
if [ ! -f "$SSH_KEY" ]; then
  echo -e "${RED}❌ SSH key not found at: $SSH_KEY${NC}"
  exit 1
fi

# Test SSH
log "Testing SSH to $SSH_USER@$GCE_HOST..."
if ! ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=10 "$SSH_USER"@"$GCE_HOST" "echo SSH_OK" >/dev/null 2>&1; then
  echo -e "${RED}❌ SSH connection failed${NC}"
  exit 1
fi

# Prepare temp staging
log "Preparing application files..."
TEMP_DIR=$(mktemp -d)
APP_TEMP_DIR="$TEMP_DIR/famflix"

log "Copying workspace to temp (excluding artifacts)..."
rsync -av --exclude='node_modules' \
          --exclude='.git' \
          --exclude='.env' \
          --exclude='dist' \
          --exclude='logs' \
          --exclude='uploads' \
          --exclude='*.log' \
          ./ "$APP_TEMP_DIR/" >/dev/null

log "Creating tarball..."
cd "$TEMP_DIR"
tar -czf famflix-deploy.tar.gz famflix/

log "Transferring package to GCE..."
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no famflix-deploy.tar.gz "$SSH_USER"@"$GCE_HOST":/tmp/

log "Deploying on GCE..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SSH_USER"@"$GCE_HOST" << 'EOF'
set -e

APP_DIR=/opt/famflix
SERVICE_USER=famflix

echo "📦 Extracting files..."
sudo mkdir -p "$APP_DIR"
sudo tar -xzf /tmp/famflix-deploy.tar.gz -C /opt/
sudo chown -R "$SERVICE_USER":"$SERVICE_USER" "$APP_DIR" || true

echo "🔍 Installing base dependencies (Node, PM2, Nginx) if missing..."
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
if ! command -v pm2 >/dev/null 2>&1; then
  sudo npm i -g pm2
fi
if ! command -v nginx >/dev/null 2>&1; then
  sudo apt-get update -y && sudo apt-get install -y nginx
fi

echo "📦 Installing npm deps, building, and starting..."
cd "$APP_DIR"
sudo -u "$SERVICE_USER" npm ci || sudo npm ci
sudo -u "$SERVICE_USER" npm run build || sudo npm run build

echo "🗄️ Applying DB schema (best effort)..."
sudo -u "$SERVICE_USER" npm run db:push || true

echo "🚀 Starting with PM2..."
sudo -u "$SERVICE_USER" pm2 start ecosystem.config.cjs --env production || sudo -u "$SERVICE_USER" pm2 restart famflix
sudo -u "$SERVICE_USER" pm2 save || true

echo "🛠️ Configuring Nginx..."
sudo bash -lc 'cat > /etc/nginx/sites-available/famflix <<NGX
server {
    listen 80;
    server_name _;
    client_max_body_size 100M;
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
    location /health {
        proxy_pass http://localhost:5000/health;
        access_log off;
    }
}
NGX'
sudo ln -sf /etc/nginx/sites-available/famflix /etc/nginx/sites-enabled/famflix
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

echo "✅ Deployed. Health:"
curl -sS -m 10 http://localhost:5000/health || true
EOF

log "Cleaning up..."
rm -rf "$TEMP_DIR"

echo ""
echo -e "${GREEN}🎉 GCE deployment complete!${NC}"
echo "Visit: http://$GCE_HOST"


