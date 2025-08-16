import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { Express } from 'express';
import session from 'express-session';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { storage } from './storage';
import { insertUserSchema, User as SelectUser } from '@shared/schema';
import { log } from './vite';
import { z } from 'zod';
import crypto from 'crypto';
import { passwordResetTokens } from '@shared/schema';
import { pool } from './db';

// Extend Express.User interface to use our User type
declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

// Convert callback-based scrypt to Promise-based
const scryptAsync = promisify(scrypt);

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || randomBytes(32).toString('hex');
const REFRESH_SECRET = process.env.REFRESH_SECRET || randomBytes(32).toString('hex');

// Function to hash a password using bcrypt
async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10);
}

// Function to compare a supplied password with a stored hash
async function comparePasswords(supplied: string, stored: string) {
  return await bcrypt.compare(supplied, stored);
}

// Enhanced schema with validation for registration
const registerSchema = insertUserSchema.extend({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  email: z.string().email('Invalid email address'),
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters').regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores')
});

// Schema for login
const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

// Function to generate access and refresh tokens
export const generateTokens = (user: { id: number; role: string }) => {
  const accessToken = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: user.id }, REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

// Role-based access control middleware
export const requireRole = (roles: string[]) => (req: any, res: any, next: any) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
};

// Security middleware helpers for auth endpoints
const idempotencyCache = new Map<string, number>();
const idempotencyGuard = (windowMs: number = 2 * 60 * 1000) => (req: any, res: any, next: any) => {
  const key = (req.get('x-idempotency-key') || req.headers['x-idempotency-key'] || req.body?.idempotencyKey) as string | undefined;
  if (!key) return next();
  const now = Date.now();
  idempotencyCache.forEach((ts, k) => {
    if (now - ts > windowMs) idempotencyCache.delete(k);
  });
  const cacheKey = `${req.method}:${req.originalUrl}:${key}`;
  if (idempotencyCache.has(cacheKey)) {
    return res.status(409).json({ message: 'Duplicate request' });
  }
  idempotencyCache.set(cacheKey, now);
  next();
};

const loginAttempts = new Map<string, { count: number; resetTime: number }>();
const loginRateLimiter = (max: number = Number(process.env.LOGIN_RATE_LIMIT || 10), windowMs: number = 60 * 1000) => (req: any, res: any, next: any) => {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const current = loginAttempts.get(ip) || { count: 0, resetTime: now + windowMs };
  if (now > current.resetTime) {
    current.count = 0;
    current.resetTime = now + windowMs;
  }
  current.count++;
  loginAttempts.set(ip, current);
  res.setHeader('X-RateLimit-Limit', String(max));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - current.count)));
  if (current.count > max) {
    return res.status(429).json({ message: 'Too many login attempts', retryAfter: Math.ceil((current.resetTime - now) / 1000) });
  }
  next();
};

const captchaGuard = (req: any, res: any, next: any) => {
  const required = process.env.CAPTCHA_REQUIRED === 'true' && process.env.NODE_ENV === 'production';
  if (!required) return next();
  const token = req.body?.captchaToken || req.get('x-captcha-token');
  if (!token) {
    return res.status(400).json({ message: 'CAPTCHA required' });
  }
  next();
};

// Set up authentication with Passport.js
export function setupAuth(app: Express) {
  // Get a secure random string for session secret or use a default (in dev only)
  const sessionSecret = process.env.SESSION_SECRET || randomBytes(32).toString('hex');
  
  // Configure session
  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', 
      maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
    },
    store: storage.sessionStore
  };

  // Trust the proxy for secure cookies in production
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }
  
  // Set up session handling
  app.use(session(sessionSettings));
  app.use(passport.initialize() as any);
  app.use(passport.session() as any);

  // Pre-route security middleware for auth endpoints
  app.use('/api/login', captchaGuard, loginRateLimiter(), idempotencyGuard());
  app.use('/api/login-jwt', captchaGuard, loginRateLimiter(), idempotencyGuard());
  // Hardened: only support standard login and JWT endpoints
  app.use('/api/register', captchaGuard, idempotencyGuard());
  app.use('/api/request-password-reset', captchaGuard);

  // Configure Local Strategy for username/password authentication
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: 'Invalid username or password' });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  // Configure JWT Strategy for API authentication
  passport.use(
    new JwtStrategy({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: JWT_SECRET,
    }, async (jwtPayload, done) => {
      try {
        const user = await storage.getUser(jwtPayload.id);
        if (!user) {
          return done(null, false);
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  // Serialize user to the session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user from the session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Registration endpoint
  app.post('/api/register', async (req, res) => {
    try {
      // Validate the registration data
      const validatedData = registerSchema.parse(req.body);
      
      // Check if username is already taken
      const existingUsername = await storage.getUserByUsername(validatedData.username);
      if (existingUsername) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      
      // Check if email is already registered
      const existingEmail = await storage.getUserByEmail(validatedData.email);
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already registered' });
      }
      
      // Hash the password
      const hashedPassword = await hashPassword(validatedData.password);
      
      // Create the user with hashed password
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword
      });
      
      // Log the user in
      req.login(user, (loginErr) => {
        if (loginErr) {
          log(`Error logging in after registration: ${loginErr.message}`, 'auth');
          return res.status(500).json({ message: 'Error logging in after registration' });
        }
        
        // Return user without sensitive data
        const { password, ...safeUser } = user;
        return res.status(201).json(safeUser);
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Return validation errors
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      
      log(`Registration error: ${(error as Error).message}`, 'auth');
      return res.status(500).json({ message: 'Registration failed' });
    }
  });

  // Login endpoint with enhanced error handling
  app.post('/api/login', async (req, res) => {
    try {
      log('Main login endpoint called', 'auth');
      
      // Validate login data
      const validatedData = loginSchema.parse(req.body);
      const { username, password } = validatedData;
      
      log(`Login attempt for username: ${username}`, 'auth');
      
      // Use the enhanced login logic instead of Passport
      const user = await Promise.race([
        storage.getUserByUsername(username),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database query timeout')), 5000)
        )
      ]) as Express.User | undefined;
      
      if (!user) {
        log('User not found in main login', 'auth');
        return res.status(401).json({ message: 'Invalid username or password' });
      }
      
      log('User found, checking password in main login', 'auth');
      
      const isValidPassword = await Promise.race([
        comparePasswords(password, user.password),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Password comparison timeout')), 3000)
        )
      ]) as boolean;
      
      if (!isValidPassword) {
        log('Password invalid in main login', 'auth');
        return res.status(401).json({ message: 'Invalid username or password' });
      }
      
      log('Password valid, generating tokens in main login', 'auth');
      
      // Generate JWT tokens
      const tokens = generateTokens(user);
      
      // Return user data and tokens
      const { password: _, ...safeUser } = user;
      log('Main login successful', 'auth');
      
      return res.status(200).json({
        user: safeUser,
        ...tokens
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        log('Validation error in main login', 'auth');
        return res.status(400).json({ 
          message: 'Validation failed', 
          errors: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      
      log(`Main login error: ${(error as Error).message}`, 'auth');
      return res.status(500).json({ message: 'Login failed' });
    }
  });

  // JWT-based login endpoint
  // Removed in favor of unified passport-based /api/login-jwt below
  // Token refresh endpoint
  app.post('/api/refresh-token', async (req, res) => {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token required' });
    }
    
    try {
      const decoded = jwt.verify(refreshToken, REFRESH_SECRET) as { id: number };
      const user = await storage.getUser(decoded.id);
      
      if (!user) {
        return res.status(401).json({ message: 'Invalid token' });
      }
      
      const newTokens = generateTokens(user);
      return res.json(newTokens);
    } catch (err) {
      return res.status(401).json({ message: 'Token expired or invalid' });
    }
  });

  // Logout endpoint
  app.post('/api/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        log(`Logout error: ${err.message}`, 'auth');
        return res.status(500).json({ message: 'Logout failed' });
      }
      
      // Clear the session
      req.session.destroy((sessionErr) => {
        if (sessionErr) {
          log(`Session destroy error: ${sessionErr.message}`, 'auth');
        }
        
        // Clear session cookie
        res.clearCookie('connect.sid', {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production'
        });
        
        res.status(200).json({ message: 'Logged out successfully' });
      });
    });
  });

  // Get current user endpoint (supports both session and JWT auth)
  app.get('/api/me', (req, res, next) => {
    // First try session-based auth
    if (req.isAuthenticated()) {
      const { password, ...safeUser } = req.user;
      return res.json(safeUser);
    }
    
    // Then try JWT-based auth
    passport.authenticate('jwt', { session: false }, (err: any, user: Express.User | false) => {
      if (err) {
        return res.status(500).json({ message: 'Authentication error' });
      }
      
      if (!user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const { password, ...safeUser } = user;
      return res.json(safeUser);
    })(req, res, next);
  });

  // Token refresh endpoint
  app.post('/api/refresh-token', async (req, res) => {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token required' });
    }
    
    try {
      const decoded = jwt.verify(refreshToken, REFRESH_SECRET) as { id: number };
      const user = await storage.getUser(decoded.id);
      
      if (!user) {
        return res.status(401).json({ message: 'Invalid token' });
      }
      
      const newTokens = generateTokens(user);
      return res.json(newTokens);
    } catch (err) {
      return res.status(401).json({ message: 'Token expired or invalid' });
    }
  });
  
  // Remove simplified debug endpoints for production readiness


  // Remove debug/shortcut login endpoints for production readiness

  // Enhanced login endpoint with JWT token generation
  app.post('/api/login-jwt', (req, res, next) => {
    try {
      // Validate login data
      loginSchema.parse(req.body);
      
      // Authenticate with passport
      passport.authenticate('local', (err: any, user: Express.User | false, info: { message?: string }) => {
        if (err) {
          log(`Login error: ${err.message}`, 'auth');
          return res.status(500).json({ message: 'Login failed' });
        }
        
        if (!user) {
          return res.status(401).json({ message: info?.message || 'Invalid username or password' });
        }
        
        // Generate JWT tokens
        const tokens = generateTokens(user);
        
        // Return user data and tokens
        const { password, ...safeUser } = user;
        return res.status(200).json({
          user: safeUser,
          ...tokens
        });
      })(req, res, next);
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
      
      log(`Login error: ${(error as Error).message}`, 'auth');
      return res.status(500).json({ message: 'Login failed' });
    }
  });

  // Helper middleware for protected routes (supports both session and JWT auth)
  app.use('/api/protected/*', (req, res, next) => {
    // First try session-based auth
    if (req.isAuthenticated()) {
      return next();
    }
    
    // Then try JWT-based auth
    passport.authenticate('jwt', { session: false }, (err: any, user: Express.User | false) => {
      if (err || !user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      req.user = user;
      next();
    })(req, res, next);
  });

  // Password reset request endpoint
  app.post('/api/request-password-reset', async (req, res) => {
    try {
      const { username, email } = req.body;
      if (!username && !email) {
        return res.status(400).json({ message: 'Username or email is required' });
      }
      // Find user by username or email
      let user = null;
      if (username) {
        user = await storage.getUserByUsername(username);
      } else if (email) {
        user = await storage.getUserByEmail(email);
      }
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      // Generate secure token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes
      await storage.createPasswordResetToken({
        userId: user.id,
        token,
        expiresAt,
      });
      // TODO: Send email with the password‑reset link.  For now, log it using the
      // shared logger to make it easier to trace in production logs.  Once
      // integrated with an email service (e.g. nodemailer or an external API),
      // replace this call with the actual delivery implementation.
      log(`Password reset link for user ${user.username}: http://localhost:5000/reset-password?token=${token}`, 'auth');
      return res.json({ message: 'Password reset link sent (check your email or ask admin)' });
    } catch (error) {
      log(`Password reset request error: ${(error as Error).message}`, 'auth');
      return res.status(500).json({ message: 'Failed to request password reset' });
    }
  });

  // Password reset completion endpoint
  app.post('/api/reset-password', async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        return res.status(400).json({ message: 'Token and new password are required' });
      }
      // Find token
      const resetToken = await storage.getPasswordResetTokenByToken(token);
      if (!resetToken || new Date(resetToken.expiresAt) < new Date()) {
        return res.status(400).json({ message: 'Invalid or expired token' });
      }
      // Get user
      const user = await storage.getUser(resetToken.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      // Hash new password
      const hashedPassword = await hashPassword(newPassword);
      // Update user with new password - we'll need to add a method for this
      // For now, we'll use a direct database update
      if (pool) {
        await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, user.id]);
      }
      await storage.markPasswordResetTokenUsed(token);
      return res.json({ message: 'Password has been reset successfully' });
    } catch (error) {
      log(`Password reset error: ${(error as Error).message}`, 'auth');
      return res.status(500).json({ message: 'Failed to reset password' });
    }
  });
}