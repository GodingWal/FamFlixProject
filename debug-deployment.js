import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

console.log('🔍 Debug Deployment Script');
console.log('==========================');

async function debugDeployment() {
  try {
    console.log('\n📋 Step 1: Check current directory and files');
    const cwd = process.cwd();
    console.log('Current directory:', cwd);
    
    const files = await fs.readdir(cwd);
    console.log('Files in directory:', files.filter(f => f.endsWith('.js')).slice(0, 10));
    
    console.log('\n📋 Step 2: Check Node.js version');
    const { stdout: nodeVersion } = await execAsync('node --version');
    console.log('Node.js version:', nodeVersion.trim());
    
    console.log('\n📋 Step 3: Check if port 5000 is already in use');
    try {
      const { stdout: netstat } = await execAsync('netstat -tlnp | grep :5000');
      console.log('Port 5000 status:', netstat.trim());
    } catch (error) {
      console.log('Port 5000 is not in use');
    }
    
    console.log('\n📋 Step 4: Check PM2 status');
    try {
      const { stdout: pm2Status } = await execAsync('pm2 status');
      console.log('PM2 Status:');
      console.log(pm2Status);
    } catch (error) {
      console.log('PM2 not running or no processes');
    }
    
    console.log('\n📋 Step 5: Check environment variables');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('PORT:', process.env.PORT);
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    
    console.log('\n📋 Step 6: Test simple server startup');
    console.log('Attempting to start a minimal server...');
    
    // Create a minimal test server
    const testServerCode = `
import express from 'express';
const app = express();
const port = process.env.PORT || 5000;

app.get('/', (req, res) => {
  res.send('Minimal test server is working!');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', port, time: new Date().toISOString() });
});

app.listen(port, '0.0.0.0', () => {
  console.log('Minimal test server running on port', port);
}).on('error', (error) => {
  console.error('Server startup error:', error.message);
  process.exit(1);
});
`;
    
    await fs.writeFile('minimal-test-server.js', testServerCode);
    console.log('Created minimal test server');
    
    console.log('\n📋 Step 7: Try to start minimal server');
    try {
      const { stdout, stderr } = await execAsync('timeout 10 node minimal-test-server.js');
      console.log('Minimal server output:', stdout);
      if (stderr) console.log('Minimal server errors:', stderr);
    } catch (error) {
      console.log('Minimal server test completed or failed:', error.message);
    }
    
    console.log('\n📋 Step 8: Check system resources');
    try {
      const { stdout: memory } = await execAsync('free -h');
      console.log('Memory usage:');
      console.log(memory);
    } catch (error) {
      console.log('Could not check memory usage');
    }
    
    console.log('\n📋 Step 9: Check disk space');
    try {
      const { stdout: disk } = await execAsync('df -h');
      console.log('Disk usage:');
      console.log(disk);
    } catch (error) {
      console.log('Could not check disk usage');
    }
    
    console.log('\n📋 Step 10: Check if we can bind to port 5000');
    try {
      const { stdout: testBind } = await execAsync('timeout 5 node -e "const net = require(\'net\'); const server = net.createServer(); server.listen(5000, \'0.0.0.0\', () => { console.log(\'Port 5000 is available\'); server.close(); });"');
      console.log('Port binding test:', testBind.trim());
    } catch (error) {
      console.log('Port binding test failed:', error.message);
    }
    
    console.log('\n💡 Debug Summary:');
    console.log('1. Check if Node.js is working');
    console.log('2. Check if port 5000 is available');
    console.log('3. Check if PM2 is working');
    console.log('4. Check system resources');
    console.log('5. Check file permissions');
    
  } catch (error) {
    console.error('❌ Debug deployment failed:', error.message);
  }
}

debugDeployment(); 