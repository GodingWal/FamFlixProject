#!/bin/bash

# FamFlix EC2 Deployment Script
# This script deploys the FamFlix application to an EC2 instance

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 FamFlix EC2 Deployment Script${NC}"
echo "=============================================="
echo ""

# Configuration
APP_NAME="famflix"
APP_DIR="/opt/famflix"
SERVICE_USER="famflix"
NODE_VERSION="20"
PM2_CONFIG="ecosystem.config.cjs"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ This script must be run as root (use sudo)${NC}"
    exit 1
fi

# Function to log with timestamp
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Update system packages
log "Updating system packages..."
apt-get update -y
apt-get upgrade -y

# Install essential packages
log "Installing essential packages..."
apt-get install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# Install Node.js
if ! command_exists node; then
    log "Installing Node.js $NODE_VERSION..."
    curl -fsSL https://deb.nodesource.com/setup_$NODE_VERSION.x | bash -
    apt-get install -y nodejs
else
    log "Node.js already installed: $(node --version)"
fi

# Install PM2 globally
if ! command_exists pm2; then
    log "Installing PM2..."
    npm install -g pm2
else
    log "PM2 already installed: $(pm2 --version)"
fi

# Install PostgreSQL
if ! command_exists psql; then
    log "Installing PostgreSQL..."
    apt-get install -y postgresql postgresql-contrib
    
    # Start and enable PostgreSQL
    systemctl start postgresql
    systemctl enable postgresql
    
    # Create database and user
    sudo -u postgres psql -c "CREATE DATABASE famflix;"
    sudo -u postgres psql -c "CREATE USER famflix WITH PASSWORD 'famflix_password';"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE famflix TO famflix;"
    sudo -u postgres psql -c "ALTER USER famflix CREATEDB;"
else
    log "PostgreSQL already installed"
fi

# Install Redis
if ! command_exists redis-server; then
    log "Installing Redis..."
    apt-get install -y redis-server
    
    # Start and enable Redis
    systemctl start redis-server
    systemctl enable redis-server
else
    log "Redis already installed"
fi

# Install Nginx
if ! command_exists nginx; then
    log "Installing Nginx..."
    apt-get install -y nginx
    
    # Start and enable Nginx
    systemctl start nginx
    systemctl enable nginx
else
    log "Nginx already installed"
fi

# Create application user
if ! id "$SERVICE_USER" &>/dev/null; then
    log "Creating application user: $SERVICE_USER"
    useradd -r -s /bin/bash -d $APP_DIR $SERVICE_USER
else
    log "User $SERVICE_USER already exists"
fi

# Create application directory
log "Setting up application directory..."
mkdir -p $APP_DIR
chown $SERVICE_USER:$SERVICE_USER $APP_DIR

# Install UFW firewall
if ! command_exists ufw; then
    log "Installing and configuring firewall..."
    apt-get install -y ufw
    ufw allow ssh
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow 5000/tcp
    ufw --force enable
else
    log "Firewall already configured"
fi

# Create environment file
log "Creating environment configuration..."
cat > $APP_DIR/.env << EOF
# Production Environment Variables
NODE_ENV=production
PORT=5000

# Database Configuration
DATABASE_URL=postgresql://famflix:famflix_password@localhost:5432/famflix

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Encryption Key (32 bytes hex) - CHANGE THIS IN PRODUCTION
ENCRYPTION_KEY=a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd

# JWT Secret - CHANGE THIS IN PRODUCTION
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Session Secret - CHANGE THIS IN PRODUCTION
SESSION_SECRET=your-super-secret-session-key-change-this-in-production

# Admin Credentials - CHANGE THESE IN PRODUCTION
ADMIN_EMAIL=admin@famflix.com
ADMIN_PASSWORD=changeme123

# File Upload Settings
MAX_FILE_SIZE=104857600
UPLOAD_DIR=./uploads

# Public URL (update with your domain)
PUBLIC_URL=http://localhost:5000

# Optional: OpenAI Configuration
# OPENAI_API_KEY=your-openai-api-key

# Optional: Stripe Configuration
# STRIPE_SECRET_KEY=your-stripe-secret-key
# STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
EOF

chown $SERVICE_USER:$SERVICE_USER $APP_DIR/.env
chmod 600 $APP_DIR/.env

# Create Nginx configuration
log "Configuring Nginx..."
cat > /etc/nginx/sites-available/famflix << EOF
server {
    listen 80;
    server_name _;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    # 'must-revalidate' is not a valid nginx token for gzip_proxied
    # Use standard safe set or simplify to 'any'
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss;

    # Client max body size for file uploads
    client_max_body_size 100M;

    # Proxy to Node.js application
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:5000/health;
        access_log off;
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/famflix /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Create PM2 ecosystem file
log "Creating PM2 configuration..."
cat > $APP_DIR/ecosystem.config.cjs << EOF
module.exports = {
  apps: [{
    name: 'famflix',
    script: 'dist/index.js',
    cwd: '$APP_DIR',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'uploads'],
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF

chown $SERVICE_USER:$SERVICE_USER $APP_DIR/ecosystem.config.cjs

# Create logs directory
mkdir -p $APP_DIR/logs
chown $SERVICE_USER:$SERVICE_USER $APP_DIR/logs

# Create uploads directory
mkdir -p $APP_DIR/uploads
chown $SERVICE_USER:$SERVICE_USER $APP_DIR/uploads

# Create deployment script
log "Creating deployment script..."
cat > $APP_DIR/deploy.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Deploying FamFlix application..."

# Navigate to app directory
cd /opt/famflix

# Pull latest changes (if using git)
# git pull origin main

# Install dependencies
npm ci --only=production

# Build the application
npm run build

# Run database migrations
npm run db:push

# Restart the application
pm2 restart famflix

echo "✅ Deployment completed successfully!"
echo "📊 Application status:"
pm2 status
EOF

chmod +x $APP_DIR/deploy.sh
chown $SERVICE_USER:$SERVICE_USER $APP_DIR/deploy.sh

# Create systemd service for PM2
log "Creating systemd service..."
cat > /etc/systemd/system/famflix.service << EOF
[Unit]
Description=FamFlix Application
After=network.target postgresql.service redis-server.service

[Service]
Type=forking
User=$SERVICE_USER
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/pm2 start ecosystem.config.cjs
ExecReload=/usr/bin/pm2 reload famflix
ExecStop=/usr/bin/pm2 stop famflix
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start services
systemctl daemon-reload
systemctl enable famflix
systemctl enable nginx

# Set up log rotation
log "Setting up log rotation..."
cat > /etc/logrotate.d/famflix << EOF
$APP_DIR/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 $SERVICE_USER $SERVICE_USER
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# Create monitoring script
log "Creating monitoring script..."
cat > $APP_DIR/monitor.sh << 'EOF'
#!/bin/bash

echo "📊 FamFlix Application Status"
echo "=============================="

# PM2 status
echo "PM2 Status:"
pm2 status

echo ""
echo "System Resources:"
echo "Memory Usage:"
free -h

echo ""
echo "Disk Usage:"
df -h

echo ""
echo "Application Logs (last 10 lines):"
tail -10 /opt/famflix/logs/out.log

echo ""
echo "Error Logs (last 10 lines):"
tail -10 /opt/famflix/logs/err.log
EOF

chmod +x $APP_DIR/monitor.sh
chown $SERVICE_USER:$SERVICE_USER $APP_DIR/monitor.sh

# Final setup instructions
echo ""
echo -e "${GREEN}🎉 EC2 Server Setup Completed!${NC}"
echo "=============================================="
echo ""
echo "📋 Next Steps:"
echo "1. Copy your application files to: $APP_DIR"
echo "2. Run: sudo -u $SERVICE_USER bash -c 'cd $APP_DIR && npm install'"
echo "3. Run: sudo -u $SERVICE_USER bash -c 'cd $APP_DIR && npm run build'"
echo "4. Start the application: systemctl start famflix"
echo "5. Check status: systemctl status famflix"
echo ""
echo "🔧 Useful Commands:"
echo "• View logs: tail -f $APP_DIR/logs/out.log"
echo "• Monitor app: $APP_DIR/monitor.sh"
echo "• Deploy updates: $APP_DIR/deploy.sh"
echo "• PM2 commands: pm2 status, pm2 logs, pm2 restart famflix"
echo ""
echo "🌐 Application will be available at: http://YOUR_EC2_IP"
echo ""
echo -e "${YELLOW}⚠️  Security Notes:${NC}"
echo "• Change default passwords in $APP_DIR/.env"
echo "• Configure SSL certificate for HTTPS"
echo "• Set up proper firewall rules"
echo "• Regular security updates" 