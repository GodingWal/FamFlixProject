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
if (process.env.DATABASE_URL) {
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
    console.log('Database pool created');
  } catch (error) {
    console.log('Database pool creation failed:', error.message);
  }
}

// Main page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>FamFlix - Database Test Server</title>
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
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎬 FamFlix - Database Test Server</h1>
          <p>Testing database connectivity from EC2 instance</p>
        </div>
        
        <div class="status">
          <h2>System Status</h2>
          <p><span class="success">✅</span> Web Server: Running on port ${port}</p>
          <p><span class="success">✅</span> Nginx Proxy: Active</p>
          <p><span class="warning">⚠️</span> Database: Testing connectivity</p>
          <p><span class="success">✅</span> Environment: ${process.env.NODE_ENV || 'development'}</p>
          <p><span class="success">✅</span> Deployment: Automated via GitHub Actions</p>
        </div>
        
        <div class="status">
          <h2>🔍 Database Tests</h2>
          <p>Test the database connection from within the EC2 instance:</p>
          <button class="btn" onclick="testDatabase()">Test Database Connection</button>
          <button class="btn" onclick="testSimpleQuery()">Test Simple Query</button>
          <button class="btn" onclick="testConnectionPool()">Test Connection Pool</button>
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
        async function testDatabase() {
          const resultDiv = document.getElementById('db-result');
          resultDiv.innerHTML = 'Testing database connection...';
          resultDiv.className = 'result';
          
          try {
            const response = await fetch('/api/test-db');
            const result = await response.json();
            
            if (response.ok) {
              resultDiv.className = 'result success';
              resultDiv.innerHTML = '<strong>✅ Database connection successful!</strong><br>' + 
                'Status: ' + result.status + '<br>' +
                'Time: ' + result.timestamp + '<br>' +
                'PostgreSQL Version: ' + result.version;
            } else {
              resultDiv.className = 'result error';
              resultDiv.innerHTML = '<strong>❌ Database connection failed!</strong><br>' + 
                'Error: ' + result.error;
            }
          } catch (error) {
            resultDiv.className = 'result error';
            resultDiv.innerHTML = '<strong>❌ Test failed!</strong><br>' + 
              'Error: ' + error.message;
          }
        }
        
        async function testSimpleQuery() {
          const resultDiv = document.getElementById('db-result');
          resultDiv.innerHTML = 'Testing simple query...';
          resultDiv.className = 'result';
          
          try {
            const response = await fetch('/api/test-query');
            const result = await response.json();
            
            if (response.ok) {
              resultDiv.className = 'result success';
              resultDiv.innerHTML = '<strong>✅ Query successful!</strong><br>' + 
                'Result: ' + JSON.stringify(result.result);
            } else {
              resultDiv.className = 'result error';
              resultDiv.innerHTML = '<strong>❌ Query failed!</strong><br>' + 
                'Error: ' + result.error;
            }
          } catch (error) {
            resultDiv.className = 'result error';
            resultDiv.innerHTML = '<strong>❌ Test failed!</strong><br>' + 
              'Error: ' + error.message;
          }
        }
        
        async function testConnectionPool() {
          const resultDiv = document.getElementById('db-result');
          resultDiv.innerHTML = 'Testing connection pool...';
          resultDiv.className = 'result';
          
          try {
            const response = await fetch('/api/test-pool');
            const result = await response.json();
            
            if (response.ok) {
              resultDiv.className = 'result success';
              resultDiv.innerHTML = '<strong>✅ Connection pool test successful!</strong><br>' + 
                'Active connections: ' + result.activeConnections + '<br>' +
                'Idle connections: ' + result.idleConnections + '<br>' +
                'Total connections: ' + result.totalConnections;
            } else {
              resultDiv.className = 'result error';
              resultDiv.innerHTML = '<strong>❌ Connection pool test failed!</strong><br>' + 
                'Error: ' + result.error;
            }
          } catch (error) {
            resultDiv.className = 'result error';
            resultDiv.innerHTML = '<strong>❌ Test failed!</strong><br>' + 
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
    database: dbPool ? 'pool-created' : 'no-pool',
    features: ['web-server', 'nginx-proxy', 'deployment-automation', 'database-testing']
  });
});

// Database test endpoint
app.get('/api/test-db', async (req, res) => {
  if (!dbPool) {
    return res.status(500).json({ error: 'Database pool not available' });
  }
  
  try {
    const client = await dbPool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as version');
    client.release();
    
    res.json({
      status: 'connected',
      timestamp: result.rows[0].current_time,
      version: result.rows[0].version.split(' ')[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Simple query test endpoint
app.get('/api/test-query', async (req, res) => {
  if (!dbPool) {
    return res.status(500).json({ error: 'Database pool not available' });
  }
  
  try {
    const client = await dbPool.connect();
    const result = await client.query('SELECT 1 as test_value, NOW() as timestamp');
    client.release();
    
    res.json({
      result: {
        test_value: result.rows[0].test_value,
        timestamp: result.rows[0].timestamp
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Connection pool test endpoint
app.get('/api/test-pool', async (req, res) => {
  if (!dbPool) {
    return res.status(500).json({ error: 'Database pool not available' });
  }
  
  try {
    res.json({
      activeConnections: dbPool.totalCount,
      idleConnections: dbPool.idleCount,
      totalConnections: dbPool.totalCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`FamFlix database test server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('Database pool:', dbPool ? 'Created' : 'Not created');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
}); 