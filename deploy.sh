#!/bin/bash

echo "🚀 Starting FamFlix deployment..."

# Create logs directory if it doesn't exist
mkdir -p logs

# Pull latest changes from GitHub
echo "📥 Pulling latest changes..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the application
echo "🔨 Building application..."
npm run build

# Run database migrations
echo "🗄️ Running database migrations..."
npm run db:push

# Restart the application
echo "🔄 Restarting application..."
pm2 restart famflix

# Check status
echo "✅ Checking application status..."
pm2 status

echo "🎉 Deployment completed successfully!"
echo "📊 Application logs: pm2 logs famflix"
echo "🔍 Monitor: pm2 monit" 