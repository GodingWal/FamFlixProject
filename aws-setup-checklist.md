# AWS EC2 Setup Checklist for FamFlixProject

## ✅ Pre-Setup Requirements

- [ ] AWS Account with billing enabled
- [ ] Domain name purchased (optional but recommended)
- [ ] API keys ready:
  - [ ] OpenAI API Key ✅ (provided)
  - [ ] Stripe Secret Key
  - [ ] ElevenLabs API Key ✅ (already configured in .env)

## 🚀 Step 1: Create EC2 Instance

### 1.1 Launch EC2 Instance
- [ ] Go to AWS Console → EC2 → Launch Instance
- [ ] Choose Ubuntu 22.04 LTS
- [ ] Instance type: t3.medium (2 vCPU, 4GB RAM)
- [ ] Storage: 20GB SSD
- [ ] Security Group: Create new
  - [ ] SSH (22): Your IP
  - [ ] HTTP (80): 0.0.0.0/0
  - [ ] HTTPS (443): 0.0.0.0/0
  - [ ] Custom TCP (3000): 0.0.0.0/0

### 1.2 Download Key Pair
- [ ] Download .pem key file
- [ ] Set permissions: `chmod 400 your-key.pem`

## 🗄️ Step 2: Create RDS Database

### 2.1 Launch RDS Instance
- [ ] Go to AWS Console → RDS → Create Database
- [ ] Engine: PostgreSQL 15
- [ ] Template: Free tier or Production
- [ ] Instance: db.t3.micro
- [ ] Storage: 20GB
- [ ] Public access: Yes
- [ ] Security group: Create new

### 2.2 Configure Security Group
- [ ] Allow inbound PostgreSQL (5432) from EC2 security group
- [ ] Save database endpoint and credentials

## 🔴 Step 3: Create ElastiCache Redis

### 3.1 Launch Redis Cluster
- [ ] Go to AWS Console → ElastiCache → Create
- [ ] Engine: Redis 7.x
- [ ] Node type: cache.t3.micro
- [ ] Number of nodes: 1
- [ ] Security group: Allow from EC2

## 🖥️ Step 4: Server Setup

### 4.1 Connect to EC2
```bash
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

### 4.2 Install Dependencies
```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
sudo apt install nginx git postgresql-client -y
```

### 4.3 Clone Repository
```bash
mkdir -p /home/ubuntu/famflix
cd /home/ubuntu/famflix
git clone https://github.com/GodingWal/FamFlixProject.git .
```

### 4.4 Set Up Environment
```bash
# Copy template and edit
cp env.production.template .env.production
nano .env.production

# Update with your actual values:
# DATABASE_URL=postgresql://username:password@your-rds-endpoint:5432/famflix
# REDIS_URL=redis://your-elasticache-endpoint:6379
# OPENAI_API_KEY=your_openai_key
# JWT_SECRET=your_secure_jwt_secret
# SESSION_SECRET=your_secure_session_secret
```

### 4.5 Install and Build
```bash
npm install
npm run build
npm run db:push
```

## 🌐 Step 5: Configure Nginx

### 5.1 Copy Configuration
```bash
sudo cp nginx-famflix.conf /etc/nginx/sites-available/famflix
sudo ln -s /etc/nginx/sites-available/famflix /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
```

### 5.2 Update Domain
```bash
sudo nano /etc/nginx/sites-available/famflix
# Replace 'your-domain.com' with your actual domain
```

### 5.3 Test and Restart
```bash
sudo nginx -t
sudo systemctl restart nginx
```

## 🚀 Step 6: Deploy Application

### 6.1 Set Up PM2
```bash
# Copy ecosystem file
cp ecosystem.config.js /home/ubuntu/famflix/

# Make deploy script executable
chmod +x deploy.sh

# Start application
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 6.2 Test Application
- [ ] Visit your EC2 public IP in browser
- [ ] Test API endpoints
- [ ] Check logs: `pm2 logs famflix`

## 🔐 Step 7: SSL Certificate (Optional)

### 7.1 Install Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 7.2 Get SSL Certificate
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

## 📊 Step 8: Monitoring

### 8.1 Set Up Log Rotation
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 8.2 Monitor Application
```bash
pm2 monit
pm2 status
```

## 🔄 Step 9: Deployment Pipeline

### 9.1 Test Deployment
```bash
./deploy.sh
```

### 9.2 Set Up GitHub Actions (Optional)
- [ ] Create `.github/workflows/deploy.yml`
- [ ] Add GitHub secrets:
  - [ ] EC2_HOST
  - [ ] EC2_USERNAME
  - [ ] EC2_SSH_KEY

## ✅ Verification Checklist

- [ ] Application loads in browser
- [ ] Database connection works
- [ ] Redis connection works
- [ ] API endpoints respond
- [ ] File uploads work
- [ ] Authentication works
- [ ] SSL certificate installed (if using domain)
- [ ] Logs are being generated
- [ ] PM2 monitoring works

## 🚨 Security Checklist

- [ ] Environment variables are secure
- [ ] Database is not publicly accessible
- [ ] Redis is not publicly accessible
- [ ] SSH key is properly secured
- [ ] Firewall rules are minimal
- [ ] Regular backups are enabled
- [ ] Monitoring is set up

## 💰 Cost Estimation

- EC2 t3.medium: ~$30/month
- RDS db.t3.micro: ~$15/month
- ElastiCache cache.t3.micro: ~$15/month
- **Total: ~$60/month**

## 📞 Support

If you encounter issues:
1. Check PM2 logs: `pm2 logs famflix`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Check system logs: `sudo journalctl -u nginx`
4. Verify environment variables are set correctly 