#!/usr/bin/env node

import { execSync } from 'child_process';

console.log('🔧 Fixing FamFlix Server Startup Issue');
console.log('=====================================');

try {
  console.log('\n1. Killing all PM2 processes...');
  execSync('pm2 kill', { stdio: 'inherit' });
  
  console.log('\n2. Cleaning build directory...');
  execSync('rm -rf dist', { stdio: 'inherit' });
  
  console.log('\n3. Pulling latest changes...');
  execSync('git pull origin main', { stdio: 'inherit' });
  
  console.log('\n4. Installing dependencies...');
  execSync('npm install', { stdio: 'inherit' });
  
  console.log('\n5. Building application...');
  execSync('npm run build', { stdio: 'inherit' });
  
  console.log('\n6. Starting PM2 with correct config...');
  execSync('pm2 start ecosystem.config.cjs --env production', { stdio: 'inherit' });
  
  console.log('\n7. Waiting for startup...');
  execSync('sleep 5', { stdio: 'inherit' });
  
  console.log('\n8. Checking PM2 status...');
  execSync('pm2 status', { stdio: 'inherit' });
  
  console.log('\n9. Testing local connection...');
  try {
    execSync('curl -I http://localhost:5000', { stdio: 'inherit' });
    console.log('✅ Server is responding on port 5000!');
  } catch (error) {
    console.log('❌ Server is not responding on port 5000');
    console.log('\n10. Checking PM2 logs for errors...');
    execSync('pm2 logs famflix --lines 30', { stdio: 'inherit' });
  }
  
} catch (error) {
  console.error('Error during fix:', error.message);
  process.exit(1);
}

console.log('\n✅ Fix complete! Check if the website is working at http://18.116.239.92');