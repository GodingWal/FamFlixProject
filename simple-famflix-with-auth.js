import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.static('dist/public'));

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'famflix_jwt_secret_2025_secure_and_random_string_for_production';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'famflix_refresh_secret_2025_secure_and_random_string_for_production';

// In-memory user storage (for demo purposes)
const users = new Map();
const sessions = new Map();

// Validation schemas
const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(2, 'Display name must be at least 2 characters')
});

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
});

// Token generation
const generateTokens = (user) => {
  const accessToken = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: user.id }, REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Main page
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
        .auth-section { background: #333; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 5px; }
        .form-group input { width: 100%; padding: 8px; border: none; border-radius: 4px; background: #555; color: white; }
        .btn { background: #4CAF50; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
        .btn:hover { background: #45a049; }
        .auth-result { margin-top: 10px; padding: 10px; border-radius: 4px; }
        .auth-success { background: #4CAF50; color: white; }
        .auth-error { background: #f44336; color: white; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎬 FamFlix</h1>
          <p>Family Video Platform with Authentication</p>
        </div>
        
        <div class="status">
          <h2>System Status</h2>
          <p><span class="success">✅</span> Web Server: Running on port ${port}</p>
          <p><span class="success">✅</span> Nginx Proxy: Active</p>
          <p><span class="success">✅</span> Authentication: Enabled (In-Memory)</p>
          <p><span class="warning">⚠️</span> Database: Connection disabled (RDS configuration needed)</p>
          <p><span class="success">✅</span> Environment: Production</p>
          <p><span class="success">✅</span> Deployment: Automated via GitHub Actions</p>
        </div>
        
        <div class="auth-section">
          <h2>🔐 Authentication Test</h2>
          <p>Test the authentication system with these endpoints:</p>
          
          <h3>Register a new user:</h3>
          <div class="form-group">
            <label>Username:</label>
            <input type="text" id="reg-username" placeholder="testuser">
          </div>
          <div class="form-group">
            <label>Email:</label>
            <input type="email" id="reg-email" placeholder="test@example.com">
          </div>
          <div class="form-group">
            <label>Password:</label>
            <input type="password" id="reg-password" placeholder="testpass123">
          </div>
          <div class="form-group">
            <label>Display Name:</label>
            <input type="text" id="reg-displayName" placeholder="Test User">
          </div>
          <button class="btn" onclick="registerUser()">Register</button>
          <div id="register-result"></div>
          
          <h3>Login:</h3>
          <div class="form-group">
            <label>Username:</label>
            <input type="text" id="login-username" placeholder="testuser">
          </div>
          <div class="form-group">
            <label>Password:</label>
            <input type="password" id="login-password" placeholder="testpass123">
          </div>
          <button class="btn" onclick="loginUser()">Login</button>
          <div id="login-result"></div>
          
          <h3>Test Protected Route:</h3>
          <button class="btn" onclick="testProtectedRoute()">Test /api/me</button>
          <div id="protected-result"></div>
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
            <li>Configure persistent user storage</li>
            <li>Enable file storage (S3)</li>
            <li>Set up email notifications</li>
          </ul>
        </div>
      </div>
      
      <script>
        let currentToken = '';
        
        async function registerUser() {
          const username = document.getElementById('reg-username').value;
          const email = document.getElementById('reg-email').value;
          const password = document.getElementById('reg-password').value;
          const displayName = document.getElementById('reg-displayName').value;
          
          try {
            const response = await fetch('/api/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username, email, password, displayName })
            });
            
            const result = await response.json();
            const resultDiv = document.getElementById('register-result');
            
            if (response.ok) {
              resultDiv.className = 'auth-result auth-success';
              resultDiv.textContent = 'Registration successful! User created.';
            } else {
              resultDiv.className = 'auth-result auth-error';
              resultDiv.textContent = 'Registration failed: ' + result.message;
            }
          } catch (error) {
            document.getElementById('register-result').className = 'auth-result auth-error';
            document.getElementById('register-result').textContent = 'Error: ' + error.message;
          }
        }
        
        async function loginUser() {
          const username = document.getElementById('login-username').value;
          const password = document.getElementById('login-password').value;
          
          try {
            const response = await fetch('/api/login-jwt', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username, password })
            });
            
            const result = await response.json();
            const resultDiv = document.getElementById('login-result');
            
            if (response.ok) {
              currentToken = result.accessToken;
              resultDiv.className = 'auth-result auth-success';
              resultDiv.textContent = 'Login successful! Token: ' + result.accessToken.substring(0, 20) + '...';
            } else {
              resultDiv.className = 'auth-result auth-error';
              resultDiv.textContent = 'Login failed: ' + result.message;
            }
          } catch (error) {
            document.getElementById('login-result').className = 'auth-result auth-error';
            document.getElementById('login-result').textContent = 'Error: ' + error.message;
          }
        }
        
        async function testProtectedRoute() {
          if (!currentToken) {
            document.getElementById('protected-result').className = 'auth-result auth-error';
            document.getElementById('protected-result').textContent = 'Please login first to get a token.';
            return;
          }
          
          try {
            const response = await fetch('/api/me', {
              headers: { 'Authorization': 'Bearer ' + currentToken }
            });
            
            const result = await response.json();
            const resultDiv = document.getElementById('protected-result');
            
            if (response.ok) {
              resultDiv.className = 'auth-result auth-success';
              resultDiv.textContent = 'Protected route successful! User: ' + result.username;
            } else {
              resultDiv.className = 'auth-result auth-error';
              resultDiv.textContent = 'Protected route failed: ' + result.message;
            }
          } catch (error) {
            document.getElementById('protected-result').className = 'auth-result auth-error';
            document.getElementById('protected-result').textContent = 'Error: ' + error.message;
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
    database: 'disabled',
    authentication: 'enabled',
    features: ['web-server', 'nginx-proxy', 'deployment-automation', 'authentication']
  });
});

// Authentication endpoints
app.post('/api/register', async (req, res) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    
    // Check if username already exists
    if (users.has(validatedData.username)) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);
    
    // Create user
    const user = {
      id: Date.now(),
      username: validatedData.username,
      email: validatedData.email,
      displayName: validatedData.displayName,
      password: hashedPassword,
      role: 'user',
      createdAt: new Date().toISOString()
    };
    
    users.set(validatedData.username, user);
    
    // Return user without password
    const { password, ...safeUser } = user;
    res.status(201).json(safeUser);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
    }
    res.status(500).json({ message: 'Registration failed' });
  }
});

app.post('/api/login-jwt', async (req, res) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const user = users.get(validatedData.username);
    
    if (!user || !(await bcrypt.compare(validatedData.password, user.password))) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    
    const tokens = generateTokens(user);
    const { password, ...safeUser } = user;
    
    res.json({
      user: safeUser,
      ...tokens
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
    }
    res.status(500).json({ message: 'Login failed' });
  }
});

app.post('/api/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
    const user = users.get(decoded.username);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    const tokens = generateTokens(user);
    res.json(tokens);
  } catch (error) {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
});

// Protected route example
app.get('/api/me', authenticateToken, (req, res) => {
  const user = users.get(req.user.username);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  
  const { password, ...safeUser } = user;
  res.json(safeUser);
});

app.listen(port, '0.0.0.0', () => {
  console.log(`FamFlix server with authentication running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('Authentication: Enabled (In-Memory)');
  console.log('Database: Disabled (RDS configuration needed)');
}); 