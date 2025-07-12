import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { Express } from 'express';
import session from 'express-session';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import jwt from 'jsonwebtoken';
import { storage } from './storage';
import { insertUserSchema, User as SelectUser } from '@shared/schema';
import { log } from './vite';
import { z } from 'zod';

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

// Function to hash a password with a random salt
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

// Function to compare a supplied password with a stored hash
async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split('.');
  const hashedBuf = Buffer.from(hashed, 'hex');
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
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
  app.use(passport.initialize());
  app.use(passport.session());

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

  // Login endpoint
  app.post('/api/login', (req, res, next) => {
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
        
        // Log the user in
        req.login(user, (loginErr) => {
          if (loginErr) {
            log(`Error during login: ${loginErr.message}`, 'auth');
            return res.status(500).json({ message: 'Login failed' });
          }
          
          // Return user without sensitive data
          const { password, ...safeUser } = user;
          return res.status(200).json(safeUser);
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

  // Logout endpoint
  app.post('/api/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        log(`Logout error: ${err.message}`, 'auth');
        return res.status(500).json({ message: 'Logout failed' });
      }
      
      res.status(200).json({ message: 'Logged out successfully' });
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
}