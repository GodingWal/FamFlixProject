#!/bin/bash

echo "Setting up nginx (provider-agnostic)..."

# Install nginx if not installed
sudo apt update -y
sudo apt install nginx -y

# Copy nginx configuration
if [ -f nginx-famflix.conf ]; then
  sudo cp nginx-famflix.conf /etc/nginx/sites-available/famflix
else
  # Fallback inline config
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
fi

# Enable the site
sudo ln -sf /etc/nginx/sites-available/famflix /etc/nginx/sites-enabled/

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx

echo "Nginx setup completed!"
echo "Check nginx status: sudo systemctl status nginx" 