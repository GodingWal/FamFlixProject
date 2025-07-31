#!/bin/bash

echo "Setting up nginx..."

# Install nginx if not installed
sudo apt update -y
sudo apt install nginx -y

# Copy nginx configuration
sudo cp nginx-famflix.conf /etc/nginx/sites-available/famflix

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