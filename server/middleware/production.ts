import { Request, Response, NextFunction } from 'express';
import { log } from '../vite.js';

// Production security middleware (simplified to prevent header conflicts)
export const productionSecurity = (req: Request, res: Response, next: NextFunction) => {
  // Security headers are now handled by helmet in routes.ts to prevent conflicts
  // Only add non-conflicting headers here if needed
  next();
};

// Request rate limiting per IP
const requestCounts = new Map<string, { count: number, resetTime: number }>();
const RATE_LIMIT = 100; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  
  const clientData = requestCounts.get(ip);
  
  if (!clientData || now > clientData.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    next();
    return;
  }
  
  if (clientData.count >= RATE_LIMIT) {
    log(`Rate limit exceeded for IP: ${ip}`, 'security');
    res.status(429).json({ 
      error: 'Too many requests',
      retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
    });
    return;
  }
  
  clientData.count++;
  next();
};

// Request size limiter
export const requestSizeLimiter = (maxSize: number = 50 * 1024 * 1024) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    
    if (contentLength > maxSize) {
      log(`Request too large: ${contentLength} bytes from IP: ${req.ip}`, 'security');
      res.status(413).json({ error: 'Request entity too large' });
      return;
    }
    
    next();
  };
};

// Performance monitoring middleware
export const performanceMonitor = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime.bigint();
  const startMemory = process.memoryUsage();
  
  // Store original methods to prevent double responses
  const originalSend = res.send;
  const originalJson = res.json;
  const originalEnd = res.end;
  
  let responseSent = false;
  
  // Override response methods to track if response was sent
  res.send = function(body?: any) {
    if (!responseSent) {
      responseSent = true;
      return originalSend.call(res, body);
    }
    return res;
  };
  
  res.json = function(body?: any) {
    if (!responseSent) {
      responseSent = true;
      return originalJson.call(res, body);
    }
    return res;
  };
  
  res.end = function(...args: any[]) {
    if (!responseSent) {
      responseSent = true;
      return (originalEnd as any).call(res, ...args);
    }
    return res;
  } as any;
  
  res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - start) / 1000000; // Convert to ms
    const endMemory = process.memoryUsage();
    const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
    
    // Log slow requests (>1000ms)
    if (duration > 1000) {
      log(`Slow request: ${req.method} ${req.path} - ${duration.toFixed(2)}ms`, 'performance');
    }
    
    // Log high memory usage requests (>10MB)
    if (Math.abs(memoryDelta) > 10 * 1024 * 1024) {
      log(`High memory request: ${req.method} ${req.path} - ${(memoryDelta / 1024 / 1024).toFixed(2)}MB`, 'performance');
    }
    
    // Add performance headers only if headers haven't been sent and response wasn't sent
    if (!res.headersSent && !responseSent) {
      try {
        res.setHeader('X-Response-Time', `${duration.toFixed(2)}ms`);
        res.setHeader('X-Memory-Delta', `${(memoryDelta / 1024).toFixed(2)}KB`);
      } catch (error) {
        // Silently ignore header setting errors
        log(`Could not set performance headers: ${error}`, 'performance');
      }
    }
  });
  
  next();
};

// Error tracking middleware
export const errorTracker = (err: any, req: Request, res: Response, next: NextFunction) => {
  // Log error with context
  const errorContext = {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString(),
  };
  
  log(`Error: ${JSON.stringify(errorContext)}`, 'error');
  
  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ 
      error: 'Internal server error',
      requestId: req.headers['x-request-id'] || 'unknown'
    });
  } else {
    res.status(500).json({ 
      error: err.message,
      stack: err.stack,
      context: errorContext
    });
  }
};

// Graceful shutdown handler
export const setupGracefulShutdown = (server: any) => {
  const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
  
  signals.forEach(signal => {
    process.on(signal, () => {
      log(`Received ${signal}, starting graceful shutdown...`, 'server');
      
      server.close((err: any) => {
        if (err) {
          log(`Error during server shutdown: ${err.message}`, 'error');
          process.exit(1);
        }
        
        log('Server closed gracefully', 'server');
        process.exit(0);
      });
      
      // Force shutdown after 30 seconds
      setTimeout(() => {
        log('Forced shutdown after timeout', 'server');
        process.exit(1);
      }, 30000);
    });
  });
};

// Resource monitoring
export const monitorResources = () => {
  setInterval(() => {
    const memory = process.memoryUsage();
    const cpu = process.cpuUsage();
    
    // Log if memory usage is high (>500MB)
    if (memory.heapUsed > 500 * 1024 * 1024) {
      log(`High memory usage: ${(memory.heapUsed / 1024 / 1024).toFixed(2)}MB`, 'performance');
    }
    
    // Check for memory leaks (RSS growing faster than heap)
    const memoryRatio = memory.rss / memory.heapUsed;
    if (memoryRatio > 3) {
      log(`Potential memory leak detected: RSS/Heap ratio = ${memoryRatio.toFixed(2)}`, 'performance');
    }
    
  }, 60000); // Check every minute
};