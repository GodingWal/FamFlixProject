import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { registerRoutes } from "./routes";
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

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO for real-time updates
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? [process.env.PUBLIC_URL || 'https://fam-flix.com'] 
      : ["http://localhost:3000", "http://localhost:5000"],
    credentials: true
  }
});

// Enhanced error handling for production
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Export io for use in other modules
export { io };

// Production middleware setup
if (process.env.NODE_ENV === 'production') {
  app.use(productionSecurity);
  app.use(rateLimiter);
  // app.use(performanceMonitor); // Temporarily disabled to fix headers error
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

// Request timing and monitoring middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api") && !path.includes('/health')) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
      // Only log response in development
      if (process.env.NODE_ENV === 'development' && capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
      
      // Log slow requests
      if (duration > 1000) {
        log(`SLOW REQUEST: ${req.method} ${path} - ${res.statusCode} (${duration}ms)`, 'performance');
      }
      
      // Alert on errors in production
      if (process.env.NODE_ENV === 'production' && res.statusCode >= 500) {
        log(`ERROR: ${req.method} ${path} - ${res.statusCode} (${duration}ms)`, 'error');
      }
    }
  });

  next();
});

(async () => {
  try {
    // Initialize database tables
    if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required for production");
    }
    
    await initDatabase();
    log("Database initialized successfully");
    
    // Initialize Redis for encryption caching
    const redis = initializeRedis();
    if (redis) {
      const health = await checkCacheHealth();
      if (health.redis) {
        log(`Redis initialized successfully (latency: ${health.latency}ms)`, "encryption");
      } else {
        log("Redis connection failed", "encryption");
      }
    } else {
      log("Redis not configured - running without cache encryption", "encryption");
    }
    
    // Serve static files for cloned voice audio
    app.use('/cloned-voice', express.static('public/cloned-voice', {
      setHeaders: (res, path) => {
        if (path.endsWith('.mp3')) {
          res.setHeader('Content-Type', 'audio/mpeg');
        }
      }
    }));

    // Simple test routes
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
          </script>
        </body>
        </html>
      `);
    });

    await registerRoutes(app, io);

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
    
    if (!isProduction) {
      log("Setting up Vite development server", "express");
      await setupVite(app, httpServer);
    } else {
      log("Serving static files in production mode", "express");
      serveStatic(app);
    }

    // Serve on port 5000 for development, PORT env var for production
    const port = Number(process.env.PORT) || 5000;
    const host = '0.0.0.0';
    
    const serverInstance = httpServer.listen(port, host, () => {
      log(`Server running on ${host}:${port}`, "express");
      log(`Environment: ${process.env.NODE_ENV || 'development'}`, "express");
      log(`Socket.IO server initialized and ready`, "express");
      
      // Log public URLs if available
      if (process.env.PUBLIC_URL) {
        log(`Public URL: ${process.env.PUBLIC_URL}`, "express");
      }
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      log('SIGTERM received, shutting down gracefully', 'express');
      serverInstance.close(() => {
        log('Server closed', 'express');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      log('SIGINT received, shutting down gracefully', 'express');
      serverInstance.close(() => {
        log('Server closed', 'express');
        process.exit(0);
      });
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
