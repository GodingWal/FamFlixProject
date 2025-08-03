#!/bin/bash

echo "🚀 Starting FamFlix deployment..."

# Build the application locally
echo "📦 Building application..."
npm run build

# Deploy to EC2
echo "☁️ Deploying to EC2..."
ssh -i /home/nero/Goding.pem ubuntu@ec2-18-116-239-92.us-east-2.compute.amazonaws.com << 'EOF'
cd /home/ubuntu/famflix/FamFlixProject
git pull origin main
npm ci
npm run build
pm2 restart famflix
echo "✅ Deployment completed successfully!"
EOF

echo "🎉 Deployment finished!" 