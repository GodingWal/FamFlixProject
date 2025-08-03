#!/bin/bash

# FamFlix Manual EC2 Deployment Script
# This script deploys the application to EC2 manually

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 FamFlix Manual EC2 Deployment${NC}"
echo "=============================================="
echo ""

# Check if EC2_IP is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Usage: $0 <EC2_IP_ADDRESS> [SSH_KEY_PATH]${NC}"
    echo ""
    echo "Example:"
    echo "  $0 52.23.45.67"
    echo "  $0 52.23.45.67 ~/.ssh/my-key.pem"
    exit 1
fi

EC2_IP="$1"
SSH_KEY="${2:-~/.ssh/id_rsa}"

# Function to log with timestamp
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

# Check if SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${YELLOW}⚠️  SSH key not found at: $SSH_KEY${NC}"
    echo "Please provide the correct path to your SSH key file."
    exit 1
fi

# Test SSH connection
log "Testing SSH connection to $EC2_IP..."
if ! ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o StrictHostKeyChecking=no ubuntu@$EC2_IP "echo 'SSH connection successful'" 2>/dev/null; then
    echo -e "${RED}❌ Failed to connect to EC2 instance${NC}"
    echo "Please check:"
    echo "1. EC2 IP address is correct"
    echo "2. SSH key path is correct"
    echo "3. EC2 security group allows SSH (port 22)"
    echo "4. EC2 instance is running"
    exit 1
fi

log "✅ SSH connection successful"

# Deploy to EC2
log "🚀 Starting deployment to EC2..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@$EC2_IP << 'EOF'
    set -e
    
    echo "📦 Checking if application directory exists..."
    if [ ! -d "/opt/famflix" ]; then
        echo "❌ Application directory not found. Please run the EC2 setup script first:"
        echo "   sudo bash /tmp/deploy-ec2.sh"
        exit 1
    fi
    
    echo "📦 Navigating to application directory..."
    cd /opt/famflix
    
    echo "📦 Checking if this is a git repository..."
    if [ ! -d ".git" ]; then
        echo "📦 Initializing git repository..."
        sudo -u famflix git init
        sudo -u famflix git remote add origin https://github.com/GodingWal/FamFlixProject.git
    fi
    
    echo "📦 Fetching latest changes..."
    sudo -u famflix git fetch origin
    
    echo "📦 Checking out main branch..."
    sudo -u famflix git checkout main || sudo -u famflix git checkout -b main origin/main
    
    echo "📦 Pulling latest changes..."
    sudo -u famflix git pull origin main
    
    echo "📦 Installing dependencies..."
    sudo -u famflix npm ci --only=production
    
    echo "🏗️ Building application..."
    sudo -u famflix npm run build
    
    echo "🗄️ Running database migrations..."
    sudo -u famflix npm run db:push
    
    echo "🚀 Restarting application..."
    sudo systemctl restart famflix
    
    echo "⏳ Waiting for application to start..."
    sleep 10
    
    echo "📊 Checking application status..."
    sudo systemctl status famflix --no-pager
    
    echo "🏥 Running health check..."
    if curl -f http://localhost:5000/health >/dev/null 2>&1; then
        echo "✅ Health check passed!"
    else
        echo "⚠️ Health check failed, but application might still be starting..."
    fi
    
    echo ""
    echo "🎉 Deployment completed!"
    echo "🌐 Application should be available at: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
    echo ""
    echo "🔧 Useful commands:"
    echo "• View logs: sudo tail -f /opt/famflix/logs/out.log"
    echo "• Monitor app: sudo -u famflix /opt/famflix/monitor.sh"
    echo "• PM2 status: sudo -u famflix pm2 status"
EOF

echo ""
echo -e "${GREEN}🎉 Manual deployment completed!${NC}"
echo "=============================================="
echo ""
echo "🌐 Your application should now be running at:"
echo "   http://$EC2_IP"
echo ""
echo "🔧 To check the application status:"
echo "   ssh -i $SSH_KEY ubuntu@$EC2_IP"
echo "   sudo systemctl status famflix"
echo ""
echo "📊 To view logs:"
echo "   ssh -i $SSH_KEY ubuntu@$EC2_IP"
echo "   sudo tail -f /opt/famflix/logs/out.log" 