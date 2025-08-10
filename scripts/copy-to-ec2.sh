#!/bin/bash

# FamFlix EC2 File Copy Script
# This script copies the application files to an EC2 instance

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📁 FamFlix EC2 File Copy Script${NC}"
echo "=============================================="
echo ""

# Configuration
APP_DIR="/opt/famflix"
SERVICE_USER="famflix"

# Check if EC2_IP is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Usage: $0 <EC2_IP_ADDRESS> [SSH_KEY_PATH]${NC}"
    echo ""
    echo "Example:"
    echo "  $0 52.23.45.67"
    echo "  $0 52.23.45.67 ~/.ssh/my-key.pem"
    echo ""
    echo "Make sure to:"
    echo "1. Replace <EC2_IP_ADDRESS> with your actual EC2 public IP"
    echo "2. Optionally provide the path to your SSH key file"
    echo "3. Ensure your EC2 security group allows SSH (port 22)"
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

# Create a temporary directory for the application files
log "Preparing application files..."
TEMP_DIR=$(mktemp -d)
APP_TEMP_DIR="$TEMP_DIR/famflix"

# Copy application files (excluding unnecessary files)
log "Copying application files to temporary directory..."
rsync -av --exclude='node_modules' \
         --exclude='.git' \
         --exclude='.env' \
         --exclude='dist' \
         --exclude='logs' \
         --exclude='uploads' \
         --exclude='*.log' \
         --exclude='.DS_Store' \
         --exclude='Thumbs.db' \
         ./ "$APP_TEMP_DIR/"

# Create a deployment package
log "Creating deployment package..."
cd "$TEMP_DIR"
tar -czf famflix-deploy.tar.gz famflix/

# Copy the package to EC2
log "Copying deployment package to EC2..."
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no famflix-deploy.tar.gz ubuntu@$EC2_IP:/tmp/

# Extract and deploy on EC2
log "Deploying application on EC2..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@$EC2_IP << 'EOF'
    set -e
    
    echo "📦 Extracting application files..."
    sudo tar -xzf /tmp/famflix-deploy.tar.gz -C /opt/
    sudo chown -R famflix:famflix /opt/famflix
    
    echo "📦 Installing dependencies (including dev for build)..."
    cd /opt/famflix
    sudo -u famflix npm ci
    
    echo "🏗️ Building application..."
    sudo -u famflix npm run build
    
    echo "🧹 Pruning to production dependencies..."
    sudo -u famflix npm prune --production
    
    echo "🗄️ Running database migrations..."
    sudo -u famflix npm run db:push
    
    echo "🚀 Starting application..."
    sudo systemctl start famflix
    
    echo "✅ Deployment completed!"
    echo ""
    echo "📊 Application status:"
    sudo systemctl status famflix --no-pager
    
    echo ""
    echo "🌐 Application is now running at: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
    echo ""
    echo "🔧 Useful commands:"
    echo "• View logs: sudo tail -f /opt/famflix/logs/out.log"
    echo "• Monitor app: sudo -u famflix /opt/famflix/monitor.sh"
    echo "• Deploy updates: sudo -u famflix /opt/famflix/deploy.sh"
    echo "• PM2 status: sudo -u famflix pm2 status"
EOF

# Clean up
log "Cleaning up temporary files..."
rm -rf "$TEMP_DIR"

echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo "=============================================="
echo ""
echo "🌐 Your FamFlix application is now running at:"
echo "   http://$EC2_IP"
echo ""
echo "🔧 Management Commands:"
echo "• SSH into server: ssh -i $SSH_KEY ubuntu@$EC2_IP"
echo "• View application logs: sudo tail -f /opt/famflix/logs/out.log"
echo "• Monitor application: sudo -u famflix /opt/famflix/monitor.sh"
echo "• Deploy updates: sudo -u famflix /opt/famflix/deploy.sh"
echo ""
echo "📊 Health Check:"
echo "• Application: http://$EC2_IP/health"
echo "• Nginx: http://$EC2_IP"
echo ""
echo -e "${YELLOW}⚠️  Security Reminders:${NC}"
echo "• Change default passwords in /opt/famflix/.env"
echo "• Configure SSL certificate for HTTPS"
echo "• Set up proper firewall rules"
echo "• Regular security updates" 