# EC2 Deployment Guide

This guide will help you deploy the FamFlix application to an Amazon EC2 instance.

## Prerequisites

1. **AWS Account** with EC2 access
2. **EC2 Instance** running Ubuntu 20.04 or later
3. **SSH Key Pair** for accessing the instance
4. **Security Group** configured for:
   - SSH (port 22)
   - HTTP (port 80)
   - HTTPS (port 443)
   - Application (port 5000)

## Step 1: Launch EC2 Instance

### Instance Specifications
- **AMI**: Ubuntu Server 20.04 LTS (HVM)
- **Instance Type**: t3.medium or larger (recommended: t3.large for production)
- **Storage**: 20GB+ EBS volume
- **Security Group**: Allow SSH (22), HTTP (80), HTTPS (443), Custom TCP (5000)

### Launch Steps
1. Go to AWS EC2 Console
2. Click "Launch Instance"
3. Choose Ubuntu Server 20.04 LTS
4. Select instance type (t3.medium minimum)
5. Configure security group with required ports
6. Launch and download your key pair (.pem file)

## Step 2: Prepare Your Local Environment

### Install Required Tools
```bash
# Install rsync if not already installed
sudo apt-get install rsync  # Ubuntu/Debian
brew install rsync          # macOS

# Make scripts executable
chmod +x scripts/deploy-ec2.sh
chmod +x scripts/copy-to-ec2.sh
```

### Configure SSH Key
```bash
# Set proper permissions for your SSH key
chmod 400 ~/.ssh/your-key.pem

# Test SSH connection
ssh -i ~/.ssh/your-key.pem ubuntu@YOUR_EC2_IP
```

## Step 3: Deploy to EC2

### Option A: Automated Deployment (Recommended)

1. **Run the EC2 setup script** (first time only):
```bash
# Copy the setup script to EC2
scp -i ~/.ssh/your-key.pem scripts/deploy-ec2.sh ubuntu@YOUR_EC2_IP:/tmp/

# SSH into EC2 and run the setup
ssh -i ~/.ssh/your-key.pem ubuntu@YOUR_EC2_IP
sudo bash /tmp/deploy-ec2.sh
```

2. **Deploy your application**:
```bash
# From your local project directory
./scripts/copy-to-ec2.sh YOUR_EC2_IP ~/.ssh/your-key.pem
```

### Option B: Manual Deployment

1. **SSH into your EC2 instance**:
```bash
ssh -i ~/.ssh/your-key.pem ubuntu@YOUR_EC2_IP
```

2. **Run the setup script**:
```bash
sudo bash /tmp/deploy-ec2.sh
```

3. **Copy your application files**:
```bash
# From your local machine
rsync -av --exclude='node_modules' --exclude='.git' --exclude='.env' \
  -e "ssh -i ~/.ssh/your-key.pem" ./ ubuntu@YOUR_EC2_IP:/opt/famflix/
```

4. **Install and build the application**:
```bash
# SSH into EC2
ssh -i ~/.ssh/your-key.pem ubuntu@YOUR_EC2_IP

# Install dependencies
cd /opt/famflix
sudo -u famflix npm ci --only=production

# Build the application
sudo -u famflix npm run build

# Run database migrations
sudo -u famflix npm run db:push

# Start the application
sudo systemctl start famflix
```

## Step 4: Verify Deployment

### Check Application Status
```bash
# Check if the service is running
sudo systemctl status famflix

# Check PM2 status
sudo -u famflix pm2 status

# View application logs
sudo tail -f /opt/famflix/logs/out.log
```

### Test the Application
```bash
# Health check
curl http://YOUR_EC2_IP/health

# Main application
curl http://YOUR_EC2_IP
```

### Monitor the Application
```bash
# Run the monitoring script
sudo -u famflix /opt/famflix/monitor.sh
```

## Step 5: Configure Domain (Optional)

### Set up Domain Name
1. Point your domain to your EC2 public IP
2. Update the `PUBLIC_URL` in `/opt/famflix/.env`
3. Restart the application:
```bash
sudo systemctl restart famflix
```

### Configure SSL with Let's Encrypt
```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com

# Test automatic renewal
sudo certbot renew --dry-run
```

## Management Commands

### Application Management
```bash
# Start application
sudo systemctl start famflix

# Stop application
sudo systemctl stop famflix

# Restart application
sudo systemctl restart famflix

# View logs
sudo tail -f /opt/famflix/logs/out.log

# Monitor application
sudo -u famflix /opt/famflix/monitor.sh
```

### PM2 Commands
```bash
# View PM2 status
sudo -u famflix pm2 status

# View PM2 logs
sudo -u famflix pm2 logs famflix

# Restart PM2 process
sudo -u famflix pm2 restart famflix

# Reload PM2 process
sudo -u famflix pm2 reload famflix
```

### Database Management
```bash
# Access PostgreSQL
sudo -u postgres psql

# Run migrations
sudo -u famflix npm run db:push

# Backup database
sudo -u postgres pg_dump famflix > backup.sql
```

### Deployment Updates
```bash
# Deploy updates
sudo -u famflix /opt/famflix/deploy.sh

# Or manually:
cd /opt/famflix
sudo -u famflix npm ci --only=production
sudo -u famflix npm run build
sudo -u famflix npm run db:push
sudo systemctl restart famflix
```

## Troubleshooting

### Common Issues

1. **Application won't start**:
```bash
# Check logs
sudo journalctl -u famflix -f

# Check PM2 logs
sudo -u famflix pm2 logs famflix

# Check if port is in use
sudo netstat -tlnp | grep :5000
```

2. **Database connection issues**:
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check database connection
sudo -u postgres psql -c "\l"
```

3. **Nginx issues**:
```bash
# Check Nginx status
sudo systemctl status nginx

# Check Nginx configuration
sudo nginx -t

# View Nginx logs
sudo tail -f /var/log/nginx/error.log
```

4. **Redis issues**:
```bash
# Check Redis status
sudo systemctl status redis-server

# Test Redis connection
redis-cli ping
```

### Performance Monitoring

```bash
# System resources
htop
df -h
free -h

# Application performance
sudo -u famflix pm2 monit

# Network connections
sudo netstat -tlnp
```

## Security Considerations

### Essential Security Steps
1. **Change default passwords** in `/opt/famflix/.env`
2. **Configure firewall** (UFW is already set up)
3. **Set up SSL certificate** for HTTPS
4. **Regular security updates**:
```bash
sudo apt-get update && sudo apt-get upgrade -y
```

### Security Monitoring
```bash
# Check for failed login attempts
sudo tail -f /var/log/auth.log

# Monitor system logs
sudo journalctl -f

# Check for suspicious processes
sudo ps aux | grep -v grep | grep -E "(node|npm|pm2)"
```

## Backup Strategy

### Database Backups
```bash
# Create backup script
sudo nano /opt/famflix/backup.sh

# Add to crontab for daily backups
sudo crontab -e
# Add: 0 2 * * * /opt/famflix/backup.sh
```

### Application Backups
```bash
# Backup application files
sudo tar -czf /backup/famflix-$(date +%Y%m%d).tar.gz /opt/famflix

# Backup configuration
sudo cp /opt/famflix/.env /backup/env-$(date +%Y%m%d).backup
```

## Scaling Considerations

### Vertical Scaling
- Upgrade instance type for more CPU/RAM
- Increase EBS volume size for more storage

### Horizontal Scaling
- Use multiple EC2 instances behind a load balancer
- Set up auto-scaling groups
- Use RDS for database instead of local PostgreSQL
- Use ElastiCache for Redis instead of local Redis

## Cost Optimization

### Instance Types
- **Development**: t3.micro or t3.small
- **Production**: t3.medium or t3.large
- **High Traffic**: t3.xlarge or larger

### Storage
- Use EBS gp3 volumes for better performance/cost ratio
- Consider S3 for file storage instead of local storage

### Monitoring
- Set up CloudWatch alarms for cost monitoring
- Use AWS Cost Explorer to track spending 