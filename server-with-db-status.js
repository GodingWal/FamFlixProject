import express from 'express';
import pg from 'pg';

const { Pool } = pg;
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.static('dist/public'));

// Database connection (optional)
let dbPool = null;
let dbStatus = 'not-initialized';

async function initializeDatabase() {
  if (!process.env.DATABASE_URL) {
    dbStatus = 'no-database-url';
    return;
  }

  try {
    dbPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    });
    
    // Test connection
    const client = await dbPool.connect();
    const { rows: tables } = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    client.release();
    dbStatus = `connected (${tables.length} tables)`;
    console.log('Database connected successfully');
  } catch (error) {
    dbStatus = `error: ${error.message}`;
    console.log('Database connection failed:', error.message);
  }
}

// Initialize database on startup
initializeDatabase();

// Main page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>FamFlix - Database Status Server</title>
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
        .table-list { background: #444; padding: 15px; border-radius: 4px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎬 FamFlix - Database Status Server</h1>
          <p>Server is running with database status monitoring</p>
        </div>
        
        <div class="status">
          <h2>System Status</h2>
          <p><span class="success">✅</span> Web Server: Running on port ${port}</p>
          <p><span class="success">✅</span> Nginx Proxy: Active</p>
          <p><span class="${dbStatus.includes('connected') ? 'success' : 'warning'}">⚠️</span> Database: ${dbStatus}</p>
          <p><span class="success">✅</span> Environment: ${process.env.NODE_ENV || 'development'}</p>
          <p><span class="success">✅</span> Deployment: Automated via GitHub Actions</p>
        </div>
        
        <div class="status">
          <h2>🔍 Database Actions</h2>
          <p>Test and manage the database connection:</p>
          <button class="btn" onclick="checkDatabase()">Check Database Status</button>
          <button class="btn" onclick="listTables()">List Database Tables</button>
          <button class="btn" onclick="testQuery()">Test Database Query</button>
          <button class="btn" onclick="initDatabase()">Initialize Database</button>
          <div id="db-result"></div>
        </div>
        
        <div class="status">
          <h3>Environment Information</h3>
          <p><strong>DATABASE_URL:</strong> ${process.env.DATABASE_URL ? 'Set' : 'Not set'}</p>
          <p><strong>NODE_ENV:</strong> ${process.env.NODE_ENV || 'development'}</p>
          <p><strong>Server Time:</strong> ${new Date().toISOString()}</p>
          <p><strong>Database Status:</strong> ${dbStatus}</p>
        </div>
      </div>
      
      <script>
        async function checkDatabase() {
          const resultDiv = document.getElementById('db-result');
          resultDiv.innerHTML = 'Checking database status...';
          resultDiv.className = 'result';
          
          try {
            const response = await fetch('/api/db-status');
            const result = await response.json();
            
            if (response.ok) {
              resultDiv.className = 'result success';
              resultDiv.innerHTML = '<strong>✅ Database Status:</strong><br>' + 
                'Status: ' + result.status + '<br>' +
                'Tables: ' + result.tableCount + '<br>' +
                'Connection: Active';
            } else {
              resultDiv.className = 'result error';
              resultDiv.innerHTML = '<strong>❌ Database Status:</strong><br>' + 
                'Error: ' + result.error;
            }
          } catch (error) {
            resultDiv.className = 'result error';
            resultDiv.innerHTML = '<strong>❌ Check failed:</strong><br>' + 
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
                html += '<div class="table-list">';
                result.tables.forEach(table => {
                  html += `• ${table}<br>`;
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
        
        async function testQuery() {
          const resultDiv = document.getElementById('db-result');
          resultDiv.innerHTML = 'Testing database query...';
          resultDiv.className = 'result';
          
          try {
            const response = await fetch('/api/test-query');
            const result = await response.json();
            
            if (response.ok) {
              resultDiv.className = 'result success';
              resultDiv.innerHTML = '<strong>✅ Query Test Successful:</strong><br>' + 
                'Result: ' + JSON.stringify(result.result);
            } else {
              resultDiv.className = 'result error';
              resultDiv.innerHTML = '<strong>❌ Query Test Failed:</strong><br>' + 
                'Error: ' + result.error;
            }
          } catch (error) {
            resultDiv.className = 'result error';
            resultDiv.innerHTML = '<strong>❌ Query test failed:</strong><br>' + 
              'Error: ' + error.message;
          }
        }
        
        async function initDatabase() {
          const resultDiv = document.getElementById('db-result');
          resultDiv.innerHTML = 'Initializing database...';
          resultDiv.className = 'result';
          
          try {
            const response = await fetch('/api/init-database');
            const result = await response.json();
            
            if (response.ok) {
              resultDiv.className = 'result success';
              resultDiv.innerHTML = '<strong>✅ Database Initialized:</strong><br>' + 
                'Tables created: ' + result.tablesCreated + '<br>' +
                'Status: ' + result.status;
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
    database: dbStatus,
    features: ['web-server', 'nginx-proxy', 'deployment-automation', 'database-monitoring']
  });
});

// Database status endpoint
app.get('/api/db-status', async (req, res) => {
  if (!dbPool) {
    return res.status(500).json({ error: 'Database pool not available' });
  }
  
  try {
    const client = await dbPool.connect();
    const { rows: tables } = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);
    client.release();
    
    res.json({
      status: 'connected',
      tableCount: tables.length,
      tables: tables.map(t => t.table_name)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List tables endpoint
app.get('/api/list-tables', async (req, res) => {
  if (!dbPool) {
    return res.status(500).json({ error: 'Database pool not available' });
  }
  
  try {
    const client = await dbPool.connect();
    const { rows: tables } = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    client.release();
    
    res.json({
      tables: tables.map(t => t.table_name)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test query endpoint
app.get('/api/test-query', async (req, res) => {
  if (!dbPool) {
    return res.status(500).json({ error: 'Database pool not available' });
  }
  
  try {
    const client = await dbPool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as version');
    client.release();
    
    res.json({
      result: {
        current_time: result.rows[0].current_time,
        version: result.rows[0].version.split(' ')[0]
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize database endpoint
app.post('/api/init-database', async (req, res) => {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    const { stdout, stderr } = await execAsync('npm run db:push');
    
    // Re-initialize the database connection
    await initializeDatabase();
    
    res.json({
      status: 'initialized',
      tablesCreated: 'Schema updated',
      output: stdout
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`FamFlix database status server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('Database status:', dbStatus);
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
}); 