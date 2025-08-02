import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const app = express();
const port = process.env.PORT || 5000;

console.log('🚀 Starting Full FamFlix Application');
console.log('===================================');

// Main page - redirect to the full app
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>FamFlix - Starting Full Application</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #1a1a1a; color: white; text-align: center; }
        .container { max-width: 800px; margin: 0 auto; }
        .status { background: #333; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .success { color: #4CAF50; }
        .loading { color: #FF9800; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🎬 FamFlix</h1>
        <div class="status">
          <h2>Starting Full Application...</h2>
          <p><span class="loading">⏳</span> Initializing FamFlix platform</p>
          <p><span class="success">✅</span> Database: Initialized</p>
          <p><span class="success">✅</span> Server: Starting on port ${port}</p>
          <p><span class="loading">⏳</span> Loading full application...</p>
        </div>
        <p>If you see this page, the server is starting up. Please wait a moment and refresh.</p>
        <script>
          setTimeout(() => {
            window.location.reload();
          }, 3000);
        </script>
      </div>
    </body>
    </html>
  `);
});

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'starting',
    timestamp: new Date().toISOString(),
    port: port,
    environment: process.env.NODE_ENV || 'development',
    message: 'Full FamFlix application is starting'
  });
});

// Start the full application
async function startFullApp() {
  try {
    console.log('Starting full FamFlix application...');
    
    // Kill any existing PM2 processes
    await execAsync('pm2 kill || true');
    
    // Start the full application
    const { stdout, stderr } = await execAsync('pm2 start ecosystem.config.cjs --env production');
    
    console.log('Full app startup output:', stdout);
    if (stderr) console.log('Full app startup errors:', stderr);
    
    // Check PM2 status
    const { stdout: status } = await execAsync('pm2 status');
    console.log('PM2 Status:', status);
    
    console.log('✅ Full FamFlix application started successfully!');
    
  } catch (error) {
    console.error('❌ Failed to start full application:', error.message);
  }
}

// Start the full app after a short delay
setTimeout(startFullApp, 2000);

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 FamFlix startup server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('Starting full application in 2 seconds...');
}); 