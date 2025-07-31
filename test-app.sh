#!/bin/bash

echo "=== Testing FamFlix Application ==="

echo "1. Checking if PM2 is running:"
pm2 status

echo ""
echo "2. Checking PM2 logs:"
pm2 logs famflix --lines 20

echo ""
echo "3. Checking if port 5000 is listening:"
netstat -tlnp | grep :5000 || echo "Port 5000 not listening"

echo ""
echo "4. Checking if nginx is running:"
sudo systemctl status nginx --no-pager

echo ""
echo "5. Testing local connection to port 5000:"
curl -I http://localhost:5000 || echo "Local connection failed"

echo ""
echo "6. Testing local connection to port 80:"
curl -I http://localhost:80 || echo "Local connection failed"

echo ""
echo "=== Test Complete ===" 