// Environment variables loaded by PM2
import 'express-async-errors'; // Automatically catch async errors
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();
import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { registerRoutes } from "./routes";
import { setupAuth } from "./auth";
import { setupVite, serveStatic, log } from "./vite";
import { initDatabase } from "./db";
import { healthCheck } from "./middleware/security";
import { simpleHealthCheck, detailedHealthCheck } from "./health";
import { initializeRedis, checkCacheHealth } from "./encryption";
import { 
  productionSecurity, 
  rateLimiter, 
  requestSizeLimiter, 
  performanceMonitor, 
  errorTracker,
  setupGracefulShutdown,
  monitorResources
} from "./middleware/production";
import helmet from "helmet";
import { randomUUID } from "crypto";
import url from "url";

const app = express();
const httpServer = createServer(app);

// Disable X-Powered-By header
app.disable('x-powered-by');

// Behind Nginx/proxies, trust X-Forwarded-* headers for correct client IPs
app.set('trust proxy', true);

// Helmet security headers (loosen CSP in dev for Vite)
app.use(
  helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Strict but flexible CORS (no extra dependency)
function expandOriginsFromPublicUrl(pubUrl?: string): string[] {
  if (!pubUrl) return [];
  try {
    const u = new url.URL(pubUrl);
    const host = u.hostname.replace(/^www\./, '');
    const variants = new Set<string>();
    const schemes = ['http:', 'https:'];
    const hosts = [host, `www.${host}`];
    for (const scheme of schemes) {
      for (const h of hosts) {
        variants.add(`${scheme}//${h}`);
      }
    }
    return Array.from(variants);
  } catch {
    return [pubUrl];
  }
}

const defaultDevOrigins = ["http://localhost:3000", "http://localhost:5000", "http://127.0.0.1:3000", "http://127.0.0.1:5000"];
const configuredOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const pubUrlOrigins = expandOriginsFromPublicUrl(process.env.PUBLIC_URL);
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? (configuredOrigins.length ? configuredOrigins : pubUrlOrigins.length ? pubUrlOrigins : ['https://fam-flix.com'])
  : [...defaultDevOrigins];

app.use((req, res, next) => {
  const origin = req.headers.origin as string | undefined;
  if (origin) {
    // Allow if exact match or matches by hostname variant
    const originUrlOk = (() => {
      try {
        const o = new url.URL(origin);
        const candidates = new Set<string>([...allowedOrigins, ...expandOriginsFromPublicUrl(process.env.PUBLIC_URL)]);
        if (candidates.has(origin)) return true;
        // Compare by hostname ignoring www and allowing either scheme
        const host = o.hostname.replace(/^www\./, '');
        for (const cand of candidates) {
          try {
            const cu = new url.URL(cand);
            if (cu.hostname.replace(/^www\./, '') === host) return true;
          } catch {}
        }
        return false;
      } catch {
        return false;
      }
    })();
    if (originUrlOk) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-Id');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

// Request ID propagation
app.use((req, res, next) => {
  const existing = req.get('x-request-id');
  const requestId = existing && existing.trim() !== '' ? existing : randomUUID();
  res.setHeader('X-Request-Id', requestId);
  (req as any).requestId = requestId;
  next();
});

// Initialize Socket.IO for real-time updates
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? [process.env.PUBLIC_URL || 'https://fam-flix.com'] 
      : ["http://localhost:3000", "http://localhost:5000"],
    credentials: true
  }
});

// -----------------------------------------------------------------------------
// Utility: simple environment variable assertion.  In production mode you
// generally want to fail fast if critical configuration is missing.  Add any
// additional required variables to the array below as your project grows.
function assertEnv(name: string) {
  if (!process.env[name] || process.env[name] === '') {
    const message = `${name} environment variable is missing`;
    log(message, 'error');
    return false;
  }
  return true;
}

// Validate configuration early in production
if (process.env.NODE_ENV === 'production') {
  // Warn about missing critical envs; do not crash the server
  assertEnv('DATABASE_URL');
  assertEnv('SESSION_SECRET');
}

// Enhanced error handling for production
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit immediately, let PM2 handle restart
  log(`Uncaught Exception: ${error.message}`, 'error');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit immediately, let PM2 handle restart
  log(`Unhandled Rejection: ${reason}`, 'error');
});

// Minimal request logging
app.use((req, res, next) => {
  const rid = (req as any).requestId || 'unknown';
  log(`${req.method} ${req.path} [${rid}]`, 'request');
  next();
});

// Export io for use in other modules
export { io };

// Production middleware setup
// In production we enable security and rate‑limiting middleware by default.  If you
// need to disable them temporarily (for example, while debugging), set
// `DISABLE_PRODUCTION_MIDDLEWARE=true` in your environment.
if (process.env.NODE_ENV === 'production' && process.env.DISABLE_PRODUCTION_MIDDLEWARE !== 'true') {
  app.use(productionSecurity);
  app.use(rateLimiter);
  app.use(performanceMonitor);
  // Monitor server resource usage (CPU/memory) and log if thresholds are exceeded.
  monitorResources();
}

// Request parsing with size limits
app.use(requestSizeLimiter());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Health check endpoints
app.get('/health', simpleHealthCheck);
app.get('/api/health', simpleHealthCheck);
app.get('/health/detailed', detailedHealthCheck);
app.get('/api/health/detailed', detailedHealthCheck);

// Request timing middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api") && !path.includes('/health')) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });
  
  next();
});

(async () => {
  try {
    // Initialize database tables
    if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
      log('DATABASE_URL missing in production; continuing with limited features', 'db');
    }
    
    await initDatabase();
    log("Database initialized successfully");
    
    // Initialize Redis for encryption caching
    try {
      const redis = initializeRedis();
      if (redis) {
        log("Redis instance created", "express");
        log("Redis initialized (health check deferred)", "encryption");
      } else {
        log("Redis not configured - running without cache encryption", "encryption");
      }
    } catch (redisError) {
      log(`Redis initialization error: ${(redisError as Error).message}`, "error");
      log("Continuing without Redis cache", "encryption");
    }
    
    // Serve static files for cloned voice audio
    // Temporarily disabled to test server startup
    /*
    app.use('/cloned-voice', express.static('public/cloned-voice', {
      setHeaders: (res, path) => {
        if (path.endsWith('.mp3')) {
          res.setHeader('Content-Type', 'audio/mpeg');
        }
      }
    }));
    */

    // Simple test routes
    // Temporarily disabled to test server startup
    /*
    app.get('/simple', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>FamFlix Simple Test</title></head>
        <body>
          <h1>✅ FamFlix Server Working</h1>
          <p>Time: ${new Date().toISOString()}</p>
          <p>Express is responding correctly.</p>
          <p><a href="/">Go to main site</a></p>
        </body>
        </html>
      `);
    });

    // Simple API test endpoint
    app.get('/api/test', (req, res) => {
      res.json({
        status: 'API working',
        timestamp: new Date().toISOString(),
        message: 'Basic API routing is functional'
      });
    });

    app.get('/debug', (req, res) => {
      res.json({
        status: 'working',
        timestamp: new Date().toISOString(),
        server: 'express',
        environment: process.env.NODE_ENV || 'development',
        port: 5000,
        viteServer: 'initialized',
        routes: ['/', '/simple', '/debug', '/api/health'],
        headers: req.headers,
        userAgent: req.get('User-Agent')
      });
    });

    // Network diagnostic endpoint
    app.get('/network-test', (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'text/html');
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Network Diagnostics</title>
          <style>
            body { font-family: Arial; padding: 20px; background: #f5f5f5; }
            .test { background: white; margin: 10px 0; padding: 15px; border-radius: 5px; }
            .success { border-left: 4px solid green; }
            .error { border-left: 4px solid red; }
            .pending { border-left: 4px solid orange; }
          </style>
        </head>
        <body>
          <h1>FamFlix Network Diagnostics</h1>
          <div id="results"></div>
          
          <script>
            const results = document.getElementById('results');
            
            function addResult(test, status, message) {
              const div = document.createElement('div');
              div.className = 'test ' + status;
              div.innerHTML = '<strong>' + test + ':</strong> ' + message;
              results.appendChild(div);
            }
            
            // Test 1: Basic connectivity
            addResult('Server Response', 'success', 'HTML loaded successfully');
            
            // Test 2: JavaScript execution
            addResult('JavaScript', 'success', 'Script execution working');
            
            // Test 3: Fetch API
            addResult('Fetch API', 'pending', 'Testing...');
            fetch('/api/health')
              .then(r => r.json())
              .then(data => {
                addResult('API Endpoint', 'success', 'Health check: ' + JSON.stringify(data));
              })
              .catch(err => {
                addResult('API Endpoint', 'error', 'Failed: ' + err.message);
              });
            
            // Test 4: Module loading
            addResult('Module System', 'pending', 'Testing ES modules...');
            try {
              import('/src/main.tsx')
                .then(() => {
                  addResult('React Module', 'success', 'Main.tsx loaded successfully');
                })
                .catch(err => {
                  addResult('React Module', 'error', 'Import failed: ' + err.message);
                });
            } catch (err) {
              addResult('Module System', 'error', 'Dynamic import not supported: ' + err.message);
            }
            
            // Test 5: Vite HMR
            addResult('Vite HMR', 'pending', 'Checking hot reload...');
            fetch('/@vite/client')
              .then(r => {
                if (r.ok) {
                  addResult('Vite Client', 'success', 'Vite development server accessible');
                } else {
                  addResult('Vite Client', 'error', 'Status: ' + r.status);
                }
              })
              .catch(err => {
                addResult('Vite Client', 'error', 'Cannot reach Vite: ' + err.message);
              });
              
            setTimeout(() => {
              addResult('Summary', 'success', 'Diagnostic complete. Check individual tests above.');
            }, 2000);
          <\/script>
        </body>
        </html>
      `);
    });
    */

    log("About to register routes...", "express");
    // Register API routes
    try {
      // Initialize Passport and register /api/login, /api/register routes
      setupAuth(app);
      log("Authentication setup completed successfully", "express");
      
      // Register other API routes
      await registerRoutes(app, io);
      log("Routes registration completed successfully", "express");
      
      // Add a simple API test route to verify API routing works
      app.get('/api/test-routing', (req: Request, res: Response) => {
        res.json({ 
          message: 'API routing is working!',
          timestamp: new Date().toISOString(),
          path: req.path,
          method: req.method
        });
      });
      
      log("API routes registered successfully", "express");
    } catch (error) {
      log(`Error registering routes: ${(error as Error).message}`, "express");
      console.error('Full route registration error:', error);
    }

    // Error tracking middleware (before final error handler)
    app.use(errorTracker as any);

    // Error handling middleware should be last
    app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
      // Handle Zod validation errors
      if (err.name === 'ZodError') {
        if (!res.headersSent) {
          res.status(400).json({ 
            message: 'Validation error', 
            errors: err.issues 
          });
        }
        return;
      }

      // Handle body-parser JSON syntax errors as 400 Bad Request
      // Common properties: err instanceof SyntaxError, err.type === 'entity.parse.failed'
      if (
        (err instanceof SyntaxError && 'status' in err && (err as any).status === 400) ||
        (typeof err?.type === 'string' && err.type === 'entity.parse.failed')
      ) {
        log(`Invalid JSON payload on ${req.method} ${req.path}: ${err.message}`, 'error');
        if (!res.headersSent) {
          return res.status(400).json({ message: 'Invalid JSON payload' });
        }
        return;
      }
      
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      log(`Error ${status}: ${message} on ${req.method} ${req.path}`, "error");
      console.error('Full error:', err);
      
      // Check if headers have already been sent
      if (!res.headersSent) {
        res.status(status).json({ message });
      } else {
        log('Headers already sent, cannot send error response', 'error');
      }
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    const isProduction = process.env.NODE_ENV === "production";
    
    // Enable Vite and static file serving for full application
    if (!isProduction) {
      log("Setting up Vite development server", "express");
      await setupVite(app, httpServer);
    } else {
      log("Serving static files in production mode", "express");
      try {
        serveStatic(app);
        log("Static files setup complete", "express");
      } catch (staticErr) {
        log(`Static files not found: ${(staticErr as Error).message}`, 'error');
        // Provide a minimal fallback page so the site doesn't show 502
        app.get('*', (_req: Request, res: Response) => {
          res.status(200).send(`
            <!DOCTYPE html>
            <html>
            <head><title>FamFlix</title></head>
            <body style="font-family: Arial; padding: 40px; text-align: center;">
              <h1>FamFlix server is running</h1>
              <p>Client build not found. Please run: <code>npm run build</code> and redeploy.</p>
            </body>
            </html>
          `);
        });
      }
    }

    // Add a simple test route to verify server can start
    app.get('/test', (req: Request, res: Response) => {
      res.json({ message: 'Server is working!' });
    });

    // Root health/fallback
    app.get('/', (_req: Request, res: Response) => {
      res.status(200).send('FamFlix API is up');
    });

    // Serve on port 5000 for development, PORT env var for production
    const port = Number(process.env.PORT) || 5000;
    const host = '0.0.0.0';
    
    log("About to start server listening...", "express");
    
    // Re-enable server listening to test if it works without Redis
    const serverInstance = httpServer.listen(port, host, () => {
      log(`🚀 Server running on ${host}:${port}`, "express");
      log(`Environment: ${process.env.NODE_ENV || 'development'}`, "express");
      log(`Socket.IO server initialized and ready`, "express");
      
      // Log public URLs if available
      if (process.env.PUBLIC_URL) {
        log(`Public URL: ${process.env.PUBLIC_URL}`, "express");
      }
    });

    // Log a friendly message indicating the server is up and running
    log("Server initialization complete.", "express");
    console.log("✅ Server initialization completed successfully!");
    
    // -------------------------------------------------------------------------
    // NOTE:
    // The following `setTimeout` block was used during development to verify
    // that the server could shut down cleanly.  It forcibly exited the
    // process after 5 seconds, causing the server to stop shortly after
    // startup.  This behavior interferes with normal operation, so it has
    // been commented out.  If you need to re‑enable it for debugging, you
    // can uncomment the block below.
    //
    // setTimeout(() => {
    //   console.log("🔄 Forcing process exit after 5 seconds...");
    //   process.exit(0);
    // }, 5000);

    // Graceful shutdown
    process.on('SIGTERM', () => {
      log('SIGTERM received, shutting down gracefully', 'express');
      // serverInstance.close(() => { // This line was removed as serverInstance is commented out
      //   log('Server closed', 'express');
      //   process.exit(0);
      // });
    });

    process.on('SIGINT', () => {
      log('SIGINT received, shutting down gracefully', 'express');
      // serverInstance.close(() => { // This line was removed as serverInstance is commented out
      //   log('Server closed', 'express');
      //   process.exit(0);
      // });
    });
  } catch (error) {
    log(`Failed to start server: ${(error as Error).message}`, "error");
    console.error('Full server startup error:', error);
    
    // In production, try to at least serve a basic error page
    if (process.env.NODE_ENV === 'production') {
      app.get('*', (req, res) => {
        res.status(500).send(`
          <!DOCTYPE html>
          <html>
          <head><title>FamFlix - Service Unavailable</title></head>
          <body style="font-family: Arial; padding: 40px; text-align: center;">
            <h1>🔧 FamFlix is temporarily unavailable</h1>
            <p>We're experiencing technical difficulties. Please try again in a few minutes.</p>
            <p>Error: ${(error as Error).message}</p>
            <p><small>Time: ${new Date().toISOString()}</small></p>
          </body>
          </html>
        `);
      });
      
      const port = Number(process.env.PORT) || 5000;
      httpServer.listen(port, '0.0.0.0', () => {
        log(`Emergency server running on port ${port}`, "express");
      });
    } else {
      process.exit(1);
    }
  }
})();