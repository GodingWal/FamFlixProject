#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔍 FamFlix 502 Error Diagnostic Tool');
console.log('=====================================');

// Check PM2 status
console.log('\n📊 PM2 Status:');
try {
  const pm2Status = execSync('pm2 status --no-daemon', { encoding: 'utf8' });
  console.log(pm2Status);
} catch (error) {
  console.log('❌ PM2 not running or error:', error.message);
}

// Check if port 5000 is listening
console.log('\n🔌 Port 5000 Status:');
try {
  const portCheck = execSync('netstat -tlnp | grep :5000', { encoding: 'utf8' });
  console.log('✅ Port 5000 is listening:');
  console.log(portCheck);
} catch (error) {
  console.log('❌ Port 5000 is not listening');
}

// Test local connection
console.log('\n🌐 Local Connection Test:');
try {
  const localTest = execSync('curl -I http://localhost:5000 --max-time 5', { encoding: 'utf8' });
  console.log('✅ Local connection successful:');
  console.log(localTest);
} catch (error) {
  console.log('❌ Local connection failed:', error.message);
}

// Check PM2 logs
console.log('\n📝 Recent PM2 Logs:');
try {
  const pm2Logs = execSync('pm2 logs famflix --lines 20 --nostream', { encoding: 'utf8' });
  console.log(pm2Logs);
} catch (error) {
  console.log('❌ Could not get PM2 logs:', error.message);
}

// Check Nginx error logs
console.log('\n🚨 Nginx Error Logs:');
try {
  const nginxErrors = execSync('sudo tail -n 20 /var/log/nginx/error.log', { encoding: 'utf8' });
  console.log(nginxErrors);
} catch (error) {
  console.log('❌ Could not get Nginx error logs:', error.message);
}

// Check if build exists
console.log('\n📦 Build Status:');
try {
  if (fs.existsSync('dist/index.js')) {
    const stats = fs.statSync('dist/index.js');
    console.log(`✅ Build exists (${stats.size} bytes, modified: ${stats.mtime})`);
  } else {
    console.log('❌ Build not found at dist/index.js');
  }
} catch (error) {
  console.log('❌ Error checking build:', error.message);
}

// Check environment variables
console.log('\n🔧 Environment Variables:');
console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('PORT:', process.env.PORT || 'not set (default: 5000)');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Not set');

// Check system resources
console.log('\n💾 System Resources:');
try {
  const memory = execSync('free -h', { encoding: 'utf8' });
  console.log(memory);
} catch (error) {
  console.log('❌ Could not get memory info:', error.message);
}

console.log('\n📊 Diagnostic Summary:');
console.log('Run this script on your EC2 instance to get detailed diagnostics.');
console.log('Then share the output to identify the exact issue.'); 