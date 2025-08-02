import 'dotenv/config';
import { spawn } from 'child_process';
import net from 'net';

console.log('🔍 FamFlix Server Diagnostic Tool');
console.log('=================================');

// Check if port 5000 is in use
function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`❌ Port ${port} is already in use`);
        resolve(false);
      } else {
        console.log(`❌ Error checking port ${port}:`, err.message);
        resolve(false);
      }
    });
    server.once('listening', () => {
      server.close();
      console.log(`✅ Port ${port} is available`);
      resolve(true);
    });
    server.listen(port);
  });
}

// Check environment variables
function checkEnvVars() {
  console.log('\n📋 Environment Variables:');
  console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
  console.log('PORT:', process.env.PORT || 'not set (default: 5000)');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Not set');
  console.log('REDIS_URL:', process.env.REDIS_URL ? '✅ Set' : '❌ Not set');
  console.log('NODE_TLS_REJECT_UNAUTHORIZED:', process.env.NODE_TLS_REJECT_UNAUTHORIZED || 'not set');
}

// Check if build exists
function checkBuild() {
  console.log('\n📦 Build Status:');
  try {
    const fs = require('fs');
    if (fs.existsSync('dist/index.js')) {
      const stats = fs.statSync('dist/index.js');
      console.log(`✅ Build exists (${stats.size} bytes, modified: ${stats.mtime})`);
      return true;
    } else {
      console.log('❌ Build not found at dist/index.js');
      return false;
    }
  } catch (err) {
    console.log('❌ Error checking build:', err.message);
    return false;
  }
}

// Try to start the server with verbose logging
async function tryStartServer() {
  console.log('\n🚀 Attempting to start server...');
  
  const serverProcess = spawn('node', ['dist/index.js'], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: '5000',
      NODE_TLS_REJECT_UNAUTHORIZED: '0'
    },
    stdio: 'pipe'
  });

  let output = '';
  let errorOutput = '';

  serverProcess.stdout.on('data', (data) => {
    const text = data.toString();
    output += text;
    console.log('STDOUT:', text.trim());
  });

  serverProcess.stderr.on('data', (data) => {
    const text = data.toString();
    errorOutput += text;
    console.log('STDERR:', text.trim());
  });

  // Give the server 5 seconds to start
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Check if server is running
  const isPortInUse = !(await checkPort(5000));
  
  if (isPortInUse) {
    console.log('\n✅ Server appears to be running on port 5000');
    
    // Try to fetch from the server
    try {
      const response = await fetch('http://localhost:5000/health');
      const data = await response.json();
      console.log('✅ Health check response:', data);
    } catch (err) {
      console.log('❌ Failed to fetch health check:', err.message);
    }
  } else {
    console.log('\n❌ Server failed to bind to port 5000');
    if (errorOutput) {
      console.log('\nError output:', errorOutput);
    }
  }

  // Kill the process
  serverProcess.kill();
}

// Run diagnostics
async function runDiagnostics() {
  checkEnvVars();
  
  const portAvailable = await checkPort(5000);
  
  if (!portAvailable) {
    console.log('\n⚠️  Port 5000 is in use. Checking what process is using it...');
    const { exec } = require('child_process');
    exec('lsof -i :5000 || netstat -tlnp | grep :5000', (err, stdout) => {
      if (stdout) console.log('Process using port 5000:', stdout);
    });
  }
  
  const buildExists = checkBuild();
  
  if (buildExists && portAvailable) {
    await tryStartServer();
  }
  
  console.log('\n📊 Diagnostic Summary:');
  console.log('- Port 5000:', portAvailable ? '✅ Available' : '❌ In use');
  console.log('- Build:', buildExists ? '✅ Exists' : '❌ Missing');
  console.log('- Database URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Not set');
  console.log('- Redis URL:', process.env.REDIS_URL ? '✅ Set' : '❌ Not set');
}

runDiagnostics().catch(console.error);