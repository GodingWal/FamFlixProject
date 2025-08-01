const express = require('express');
const app = express();
const port = process.env.PORT || 5000;

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>FamFlix Test Server</title></head>
    <body>
      <h1>✅ FamFlix Test Server is Running!</h1>
      <p>Time: ${new Date().toISOString()}</p>
      <p>Port: ${port}</p>
      <p>Environment: ${process.env.NODE_ENV || 'development'}</p>
      <p>Database URL: ${process.env.DATABASE_URL ? 'Set' : 'Not set'}</p>
    </body>
    </html>
  `);
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    port: port,
    environment: process.env.NODE_ENV || 'development'
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Test server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}); 