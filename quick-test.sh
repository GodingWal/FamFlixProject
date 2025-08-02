#!/bin/bash

echo "🔍 Quick FamFlix 502 Test"
echo "========================"

echo -e "\n1. PM2 Status:"
pm2 status

echo -e "\n2. Port 5000 Check:"
netstat -tlnp | grep :5000 || echo "❌ Port 5000 not listening"

echo -e "\n3. Local Connection Test:"
curl -I http://localhost:5000 --max-time 5 || echo "❌ Local connection failed"

echo -e "\n4. Recent PM2 Logs:"
pm2 logs famflix --lines 10 --nostream

echo -e "\n5. Build Check:"
ls -la dist/index.js 2>/dev/null && echo "✅ Build exists" || echo "❌ Build missing"

echo -e "\n6. Environment:"
echo "NODE_ENV: $NODE_ENV"
echo "PORT: $PORT"

echo -e "\n7. Nginx Error Log (last 5 lines):"
sudo tail -n 5 /var/log/nginx/error.log 2>/dev/null || echo "❌ Cannot access Nginx logs"

echo -e "\n📊 Test Complete!" 