import { Request, Response, NextFunction } from 'express';

// Rate limiting store
const requestCounts = new Map<string, { count: number; resetTime: number }>();

// Security middleware for production
export function rateLimit(maxRequests: number = 100, windowMs: number = 60000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    
    // Clean up expired entries
    for (const [key, value] of Array.from(requestCounts.entries())) {
      if (now > value.resetTime) {
        requestCounts.delete(key);
      }
    }
    
    const current = requestCounts.get(clientId) || { count: 0, resetTime: now + windowMs };
    
    if (now > current.resetTime) {
      current.count = 1;
      current.resetTime = now + windowMs;
    } else {
      current.count++;
    }
    
    requestCounts.set(clientId, current);
    
    if (current.count > maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((current.resetTime - now) / 1000),
      });
    }
    
    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': Math.max(0, maxRequests - current.count).toString(),
      'X-RateLimit-Reset': new Date(current.resetTime).toISOString(),
    });
    
    next();
  };
}

// Request size limiter
export function requestSizeLimit(maxSize: number = 50 * 1024 * 1024) {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.get('content-length') || '0');
    
    if (contentLength > maxSize) {
      return res.status(413).json({
        error: 'Request too large',
        maxSize: `${Math.round(maxSize / 1024 / 1024)}MB`,
      });
    }
    
    next();
  };
}

// Security headers
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Security headers for production
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  });
  
  // HSTS in production
  if (process.env.NODE_ENV === 'production') {
    res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
}

// Request validation
export function validateRequest(req: Request, res: Response, next: NextFunction) {
  // Validate Content-Type for POST/PUT/PATCH requests
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.get('content-type');
    
    if (!contentType) {
      return res.status(400).json({
        error: 'Content-Type header is required',
      });
    }
    
    const validTypes = [
      'application/json',
      'multipart/form-data',
      'application/x-www-form-urlencoded',
    ];
    
    const isValid = validTypes.some(type => contentType.includes(type));
    
    if (!isValid) {
      return res.status(400).json({
        error: 'Invalid Content-Type',
        validTypes,
      });
    }
  }
  
  next();
}

// Health check endpoint
export function healthCheck(req: Request, res: Response) {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
    memory: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
    },
    environment: process.env.NODE_ENV || 'development',
  });
}