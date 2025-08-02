import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.static('dist/public'));

console.log('🚀 Starting FamFlix Final Deployment Server');
console.log('==========================================');

// Main page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>FamFlix - Final Deployment</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #1a1a1a; color: white; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 40px; }
        .status { background: #333; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .success { color: #4CAF50; }
        .warning { color: #FF9800; }
        .error { color: #f44336; }
        .btn { background: #4CAF50; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin: 5px; }
        .btn:hover { background: #45a049; }
        .result { margin-top: 10px; padding: 10px; border-radius: 4px; }
        .result.success { background: #4CAF50; color: white; }
        .result.error { background: #f44336; color: white; }
        .log { background: #222; padding: 10px; border-radius: 4px; font-family: monospace; white-space: pre-wrap; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎬 FamFlix - Final Deployment</h1>
          <p>Server is running! Let's get the database working.</p>
        </div>
        
        <div class="status">
          <h2>✅ Server Status</h2>
          <p><span class="success">✅</span> Web Server: Running on port ${port}</p>
          <p><span class="success">✅</span> Nginx Proxy: Active</p>
          <p><span class="success">✅</span> Environment: ${process.env.NODE_ENV || 'development'}</p>
          <p><span class="success">✅</span> Deployment: Automated via GitHub Actions</p>
        </div>
        
        <div class="status">
          <h2>🗄️ Database Setup</h2>
          <p>Initialize the database tables and test connectivity:</p>
          <button class="btn" onclick="initDatabase()">Initialize Database Tables</button>
          <button class="btn" onclick="testDatabase()">Test Database Connection</button>
          <button class="btn" onclick="listTables()">List Database Tables</button>
          <button class="btn" onclick="startFullApp()">Start Full FamFlix App</button>
          <div id="db-result"></div>
        </div>
        
        <div class="status">
          <h3>Environment Information</h3>
          <p><strong>DATABASE_URL:</strong> ${process.env.DATABASE_URL ? 'Set' : 'Not set'}</p>
          <p><strong>NODE_ENV:</strong> ${process.env.NODE_ENV || 'development'}</p>
          <p><strong>Server Time:</strong> ${new Date().toISOString()}</p>
        </div>
      </div>
      
      <script>
        async function initDatabase() {
          const resultDiv = document.getElementById('db-result');
          resultDiv.innerHTML = 'Initializing database tables...';
          resultDiv.className = 'result';
          
          try {
            const response = await fetch('/api/init-db', { method: 'POST' });
            const result = await response.json();
            
            if (response.ok) {
              resultDiv.className = 'result success';
              resultDiv.innerHTML = '<strong>✅ Database Initialized!</strong><br>' + 
                'Tables created successfully<br>' +
                '<div class="log">' + result.output + '</div>';
            } else {
              resultDiv.className = 'result error';
              resultDiv.innerHTML = '<strong>❌ Database Initialization Failed:</strong><br>' + 
                'Error: ' + result.error;
            }
          } catch (error) {
            resultDiv.className = 'result error';
            resultDiv.innerHTML = '<strong>❌ Initialization failed:</strong><br>' + 
              'Error: ' + error.message;
          }
        }
        
        async function testDatabase() {
          const resultDiv = document.getElementById('db-result');
          resultDiv.innerHTML = 'Testing database connection...';
          resultDiv.className = 'result';
          
          try {
            const response = await fetch('/api/test-db');
            const result = await response.json();
            
            if (response.ok) {
              resultDiv.className = 'result success';
              resultDiv.innerHTML = '<strong>✅ Database Connection Successful!</strong><br>' + 
                'Status: ' + result.status + '<br>' +
                'Tables: ' + result.tableCount + '<br>' +
                'PostgreSQL Version: ' + result.version;
            } else {
              resultDiv.className = 'result error';
              resultDiv.innerHTML = '<strong>❌ Database Connection Failed:</strong><br>' + 
                'Error: ' + result.error;
            }
          } catch (error) {
            resultDiv.className = 'result error';
            resultDiv.innerHTML = '<strong>❌ Test failed:</strong><br>' + 
              'Error: ' + error.message;
          }
        }
        
        async function listTables() {
          const resultDiv = document.getElementById('db-result');
          resultDiv.innerHTML = 'Listing database tables...';
          resultDiv.className = 'result';
          
          try {
            const response = await fetch('/api/list-tables');
            const result = await response.json();
            
            if (response.ok) {
              resultDiv.className = 'result success';
              let html = '<strong>✅ Database Tables:</strong><br>';
              if (result.tables.length > 0) {
                html += '<div class="log">';
                result.tables.forEach(table => {
                  html += `• ${table}\\n`;
                });
                html += '</div>';
              } else {
                html += 'No tables found';
              }
              resultDiv.innerHTML = html;
            } else {
              resultDiv.className = 'result error';
              resultDiv.innerHTML = '<strong>❌ Failed to list tables:</strong><br>' + 
                'Error: ' + result.error;
            }
          } catch (error) {
            resultDiv.className = 'result error';
            resultDiv.innerHTML = '<strong>❌ List tables failed:</strong><br>' + 
              'Error: ' + error.message;
          }
        }
        
        async function startFullApp() {
          const resultDiv = document.getElementById('db-result');
          resultDiv.innerHTML = 'Starting full FamFlix application...';
          resultDiv.className = 'result';
          
          try {
            const response = await fetch('/api/start-full-app', { method: 'POST' });
            const result = await response.json();
            
            if (response.ok) {
              resultDiv.className = 'result success';
              resultDiv.innerHTML = '<strong>✅ Full App Started!</strong><br>' + 
                'The full FamFlix application is now running<br>' +
                '<a href="/" style="color: white;">Refresh page to see the full app</a>';
            } else {
              resultDiv.className = 'result error';
              resultDiv.innerHTML = '<strong>❌ Failed to start full app:</strong><br>' + 
                'Error: ' + result.error;
            }
          } catch (error) {
            resultDiv.className = 'result error';
            resultDiv.innerHTML = '<strong>❌ Start failed:</strong><br>' + 
              'Error: ' + error.message;
          }
        }
      </script>
    </body>
    </html>
  `);
});

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    port: port,
    environment: process.env.NODE_ENV || 'development',
    message: 'Final deployment server is running'
  });
});

// Initialize database endpoint
app.post('/api/init-db', async (req, res) => {
  try {
    console.log('Initializing database tables...');
    const { stdout, stderr } = await execAsync('npm run db:push');
    
    res.json({
      status: 'success',
      output: stdout + (stderr ? '\n' + stderr : '')
    });
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Test database endpoint
app.get('/api/test-db', async (req, res) => {
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    const client = await pool.connect();
    const { rows: tables } = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);
    
    const versionResult = await client.query('SELECT version() as version');
    client.release();
    await pool.end();
    
    res.json({
      status: 'connected',
      tableCount: tables.length,
      version: versionResult.rows[0].version.split(' ')[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List tables endpoint
app.get('/api/list-tables', async (req, res) => {
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    const client = await pool.connect();
    const { rows: tables } = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    client.release();
    await pool.end();
    
    res.json({
      tables: tables.map(t => t.table_name)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start full app endpoint
app.post('/api/start-full-app', async (req, res) => {
  try {
    console.log('Starting full FamFlix application...');
    const { stdout, stderr } = await execAsync('pm2 start ecosystem.config.cjs --env production');
    
    res.json({
      status: 'success',
      output: stdout + (stderr ? '\n' + stderr : '')
    });
  } catch (error) {
    console.error('Failed to start full app:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`✅ FamFlix final deployment server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
  console.log('🚀 Server is ready for database initialization!');
}); 