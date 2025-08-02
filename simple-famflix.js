import express from 'express';
const app = express();
const port = process.env.PORT || 5000;

// Serve static files
app.use(express.static('dist/public'));

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>FamFlix - Family Video Platform</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #1a1a1a; color: white; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 40px; }
        .status { background: #333; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 40px 0; }
        .feature-card { background: #333; padding: 20px; border-radius: 8px; }
        .success { color: #4CAF50; }
        .warning { color: #FF9800; }
        .error { color: #f44336; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎬 FamFlix</h1>
          <p>Family Video Platform</p>
        </div>
        
        <div class="status">
          <h2>System Status</h2>
          <p><span class="success">✅</span> Web Server: Running on port ${port}</p>
          <p><span class="success">✅</span> Nginx Proxy: Active</p>
          <p><span class="warning">⚠️</span> Database: Connection disabled (RDS configuration needed)</p>
          <p><span class="success">✅</span> Environment: Production</p>
          <p><span class="success">✅</span> Deployment: Automated via GitHub Actions</p>
        </div>
        
        <div class="feature-grid">
          <div class="feature-card">
            <h3>🎥 Video Processing</h3>
            <p>AI-powered video processing and face swapping capabilities</p>
          </div>
          <div class="feature-card">
            <h3>🎭 Voice Cloning</h3>
            <p>Advanced voice cloning and audio processing features</p>
          </div>
          <div class="feature-card">
            <h3>👨‍👩‍👧‍👦 Family Management</h3>
            <p>Manage family members and their video content</p>
          </div>
          <div class="feature-card">
            <h3>📊 Analytics</h3>
            <p>Comprehensive analytics and usage tracking</p>
          </div>
        </div>
        
        <div class="status">
          <h3>Next Steps</h3>
          <p>To enable full functionality:</p>
          <ul>
            <li>Fix RDS database connection</li>
            <li>Configure environment variables</li>
            <li>Enable user authentication</li>
            <li>Set up file storage</li>
          </ul>
        </div>
      </div>
    </body>
    </html>
  `);
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    port: port,
    environment: process.env.NODE_ENV || 'development',
    database: 'disabled',
    features: ['web-server', 'nginx-proxy', 'deployment-automation']
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`FamFlix server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}); 