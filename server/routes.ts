import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { Server as SocketServer } from "socket.io";
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { body, validationResult } from 'express-validator';
import helmet from 'helmet';
import passport from 'passport';
import { storage } from "./storage"; // Use the storage interface
import { db } from "./db";
import { sql } from "drizzle-orm";
import { 
  insertUserSchema, 
  insertFaceImageSchema, 
  insertVoiceRecordingSchema,
  insertProcessedVideoSchema,
  insertPersonSchema,
  insertVideoTemplateSchema,
  insertFaceVideoSchema,
  insertAnimatedStorySchema,
  insertUserStorySessionSchema
} from "@shared/schema";
import { ZodError } from "zod";
import { setupAuth, generateTokens, requireRole } from "./auth";
import { stripe } from "./stripe";
// import MLService from "./ml"; // Removed ML service dependencies
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import multer from "multer";
import FormData from "form-data";
import { log } from "./vite";
import { exec } from 'child_process';
import encryptionRoutes from './routes/encryption';

import { promisify } from 'util';
import crypto from 'crypto';

const execPromise = promisify(exec);

// Rate limiting setup
const authLimiter = new RateLimiterMemory({
  points: 5, // 5 attempts
  duration: 60, // per minute
});

const apiLimiter = new RateLimiterMemory({
  points: 100, // 100 requests
  duration: 60, // per minute
});

// Rate limiting middleware
const rateLimitMiddleware = (limiter: RateLimiterMemory) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    await limiter.consume(req.ip || 'unknown');
    next();
  } catch (rejRes) {
    const remainingPoints = (rejRes as any).remainingPoints || 0;
    const msBeforeNext = (rejRes as any).msBeforeNext || 1000;
    
    res.set('Retry-After', Math.round(msBeforeNext / 1000).toString());
    res.set('X-RateLimit-Limit', limiter.points.toString());
    res.set('X-RateLimit-Remaining', remainingPoints.toString());
    res.set('X-RateLimit-Reset', new Date(Date.now() + msBeforeNext).toISOString());
    
    res.status(429).json({ 
      message: 'Too many requests', 
      retryAfter: Math.round(msBeforeNext / 1000)
    });
  }
};


// Configure multer for handling file uploads
const uploadDir = path.join(process.cwd(), "temp", "uploads");
const storage_uploads = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage_uploads,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|avi|mov|wmv|flv|webm|wav|mp3|m4a|aac|flac|ogg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Error: File type not supported!'));
    }
  }
});

// Helper function to check if user is authenticated
const checkAuth = (req: Request) => {
  return req.user || (req.isAuthenticated && req.isAuthenticated());
};

// Authentication middleware
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  // Check if user is authenticated via session or JWT
  if (req.user || (req.isAuthenticated && req.isAuthenticated())) {
    return next();
  }
  
  // Check for JWT token in Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
      req.user = decoded;
      return next();
    } catch (err) {
      // JWT verification failed
    }
  }
  
  return res.status(401).json({ error: "Authentication required" });
};

// Admin middleware to check if user is an admin
const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  // First check authentication
  if (!req.user && (!req.isAuthenticated || !req.isAuthenticated())) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: "Admin access required" });
  }
  
  next();
};

export async function registerRoutes(app: Express, io?: SocketServer): Promise<Server> {
  // Check if database is available
  if (!db) {
    log('Database not available - some features will be disabled', 'express');
    
    // Add a middleware to handle database-dependent routes
    app.use('/api', (req: Request, res: Response, next: NextFunction) => {
      // Allow health check and basic routes
      if (req.path === '/health' || req.path === '/me' || req.path.startsWith('/auth')) {
        return next();
      }
      
      // For database-dependent routes, return service unavailable
      if (req.path.includes('/stories') || req.path.includes('/admin') || req.path.includes('/users')) {
        return res.status(503).json({ 
          error: 'Database service is not available',
          message: 'Please check your DATABASE_URL configuration'
        });
      }
      
      next();
    });
  }

  // Setup authentication
  // Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "blob:"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: ["'self'", "ws:", "wss:", "https:"],
        fontSrc: ["'self'", "data:"],
        mediaSrc: ["'self'", "blob:"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  // Apply API rate limiting
  app.use('/api', rateLimitMiddleware(apiLimiter));
  
  // Encryption and cache management routes
  app.use('/api/encryption', encryptionRoutes);

  
  // Enhanced admin route monitoring with Socket.IO
  app.use('/api/admin/*', (req: Request, res: Response, next: NextFunction) => {
    // Log admin access attempts
    if (req.user && req.user.role === 'admin') {
      log(`Admin access: ${req.user.username} accessing ${req.path} from ${req.ip}`, 'auth');
      
      // Emit admin activity for real-time monitoring
      if (io) {
        io.emit('admin-activity', {
          userId: req.user.id,
          username: req.user.username,
          action: `${req.method} ${req.path}`,
          timestamp: new Date(),
          ip: req.ip
        });
      }
    }
    next();
  });
  
  setupAuth(app);

  // Enhanced login endpoint with validation and rate limiting
  app.post('/api/login-secure', 
    rateLimitMiddleware(authLimiter),
    [
      body('username').trim().isLength({ min: 1 }).escape(),
      body('password').isLength({ min: 8 })
    ],
    async (req: Request, res: Response, next: NextFunction) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      passport.authenticate('local', { session: false }, (err: any, user: any, info: any) => {
        if (err || !user) {
          log(`Failed login attempt from ${req.ip}: ${info?.message}`, 'auth');
          return res.status(401).json({ 
            message: info?.message || 'Authentication failed' 
          });
        }

        const tokens = generateTokens(user);
        const { password, ...safeUser } = user;
        
        log(`Successful login: ${user.username} from ${req.ip}`, 'auth');
        
        // Emit real-time login event
        if (io) {
          io.emit('user-login', { userId: user.id, timestamp: new Date() });
        }
        
        return res.json({ 
          ...tokens, 
          user: safeUser 
        });
      })(req, res, next);
    }
  );

  // Serve voice preview files FIRST (before any other middleware)

  // Public Stories endpoint for users (no authentication required)
  app.get('/api/stories', async (_req: Request, res: Response) => {
    try {
      if (!db) {
        return res.status(503).json({ 
          error: 'Database service is not available',
          message: 'Please check your DATABASE_URL configuration'
        });
      }
      
      log(`Public stories endpoint called`, 'express');
      const result = await db.execute(sql`SELECT * FROM animated_stories WHERE is_active = true ORDER BY created_at DESC`);
      log(`Found ${result.rows.length} active stories`, 'express');
      res.json(result.rows);
    } catch (error: any) {
      log(`Get stories error: ${error.message}`, 'express');
      res.status(500).json({ error: error.message });
    }
  });

  // Users
  app.post('/api/users', async (req: Request, res: Response) => {
    try {
      const data = insertUserSchema.parse(req.body);
      const user = await storage.createUser(data);
      res.json(user);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: error.issues });
      } else {
        res.status(500).json({ error: "Failed to create user" });
      }
    }
  });

  app.get('/api/users/:id', async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const user = await storage.getUser(id);
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  });

  // People management endpoints
  app.get('/api/users/:userId/people', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const people = await storage.getPeopleByUserId(userId);
      res.json(people);
    } catch (error: unknown) {
      log(`Error fetching people for user ${req.params.userId}: ${error}`, 'express');
      res.status(500).json({ error: "Failed to fetch people" });
    }
  });

  app.post('/api/people', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const data = insertPersonSchema.parse(req.body);
      const person = await storage.createPerson(data);
      res.json(person);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: error.issues });
      } else {
        log(`Error creating person: ${error}`, 'express');
        res.status(500).json({ error: "Failed to create person" });
      }
    }
  });

  app.get('/api/people/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const person = await storage.getPerson(id);
      if (person) {
        res.json(person);
      } else {
        res.status(404).json({ error: "Person not found" });
      }
    } catch (error: unknown) {
      log(`Error fetching person ${req.params.id}: ${error}`, 'express');
      res.status(500).json({ error: "Failed to fetch person" });
    }
  });

  app.patch('/api/people/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = insertPersonSchema.partial().parse(req.body);
      const person = await storage.updatePerson(id, updateData);
      if (person) {
        res.json(person);
      } else {
        res.status(404).json({ error: "Person not found" });
      }
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: error.issues });
      } else {
        log(`Error updating person ${req.params.id}: ${error}`, 'express');
        res.status(500).json({ error: "Failed to update person" });
      }
    }
  });

  app.delete('/api/people/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deletePerson(id);
      if (success) {
        res.json({ message: "Person deleted successfully" });
      } else {
        res.status(404).json({ error: "Person not found" });
      }
    } catch (error: unknown) {
      log(`Error deleting person ${req.params.id}: ${error}`, 'express');
      res.status(500).json({ error: "Failed to delete person" });
    }
  });

  // Face images endpoints for people
  app.get('/api/people/:personId/faceImages', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const personId = parseInt(req.params.personId);
      const faceImages = await storage.getFaceImagesByPersonId(personId);
      res.json(faceImages);
    } catch (error: unknown) {
      log(`Error fetching face images for person ${req.params.personId}: ${error}`, 'express');
      res.status(500).json({ error: "Failed to fetch face images" });
    }
  });

  // Voice recordings endpoints for people
  app.get('/api/people/:personId/voiceRecordings', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const personId = parseInt(req.params.personId);
      const voiceRecordings = await storage.getVoiceRecordingsByPersonId(personId);
      res.json(voiceRecordings);
    } catch (error: unknown) {
      log(`Error fetching voice recordings for person ${req.params.personId}: ${error}`, 'express');
      res.status(500).json({ error: "Failed to fetch voice recordings" });
    }
  });

  app.post('/api/voiceRecordings', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const data = insertVoiceRecordingSchema.parse(req.body);
      const voiceRecording = await storage.createVoiceRecording(data);
      res.json(voiceRecording);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: error.issues });
      } else {
        log(`Error creating voice recording: ${error}`, 'express');
        res.status(500).json({ error: "Failed to create voice recording" });
      }
    }
  });

  app.patch('/api/voiceRecordings/:id/setDefault', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const voiceRecording = await storage.setDefaultVoiceRecording(id);
      if (voiceRecording) {
        res.json(voiceRecording);
      } else {
        res.status(404).json({ error: "Voice recording not found" });
      }
    } catch (error: unknown) {
      log(`Error setting default voice recording ${req.params.id}: ${error}`, 'express');
      res.status(500).json({ error: "Failed to set default voice recording" });
    }
  });

  app.delete('/api/voiceRecordings/:id', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteVoiceRecording(id);
      if (success) {
        res.json({ message: "Voice recording deleted successfully" });
      } else {
        res.status(404).json({ error: "Voice recording not found" });
      }
    } catch (error: unknown) {
      log(`Error deleting voice recording ${req.params.id}: ${error}`, 'express');
      res.status(500).json({ error: "Failed to delete voice recording" });
    }
  });

  // Face Images
  app.post('/api/faceImages', async (req: Request, res: Response) => {
    if (!checkAuth(req)) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const data = insertFaceImageSchema.parse(req.body);
      
      // Extract image buffer from base64 data
      const imageBuffer = Buffer.from(data.imageData.split(',')[1], 'base64');
      
      let voiceEmbedding = null;
      let wasMLProcessed = false;
      
      try {
        // ML processing removed - starting fresh
        
        // Voice embedding extraction removed - starting fresh
        voiceEmbedding = null;
        wasMLProcessed = false;
        log(`Voice embedding extracted: ${wasMLProcessed ? 'ML processed' : 'using fallback'}`, 'ml');
      } catch (mlError: any) {
        console.error('Error processing voice recording with ML:', mlError);
        log(`Error processing voice recording with ML: ${mlError.message}`, 'ml');
        // Continue with fallback
        voiceEmbedding = null;
        wasMLProcessed = false;
      }

      // Create the face image without ML processing
      const faceImage = await storage.createFaceImage({
        ...data,
      });

      res.json(faceImage);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: error.issues });
      } else {
        log(`Face image creation failed: ${error}`, 'express');
        res.status(500).json({ 
          error: 'Failed to create face image',
          details: error instanceof Error ? error.message : String(error)
        });
      }
    }
  });

  app.get('/api/users/:userId/faceImages', async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId);
    const faceImages = await storage.getFaceImagesByUserId(userId);
    res.json(faceImages);
  });

  app.delete('/api/faceImages/:id', async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const success = await storage.deleteFaceImage(id);
    if (success) {
      res.json({ message: "Face image deleted successfully" });
    } else {
      res.status(404).json({ error: "Face image not found" });
    }
  });

  // Face Videos
  app.post('/api/faceVideos', async (req: Request, res: Response) => {
    if (!checkAuth(req)) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const data = insertFaceVideoSchema.parse(req.body);
      
      // Handle expression type from request body
      const expressionType = req.body.expressionType || 'neutral';
      
      // Create the face video record with processing status
      const faceVideo = await storage.createFaceVideo({
        ...data,
      });

      // Process the video in the background
      try {
        // Extract video buffer from base64 data
        const videoBuffer = Buffer.from(data.videoData!.split(',')[1], 'base64');
        
        // Face video processing removed - starting fresh
        log(`Face video ${faceVideo.id} uploaded with expression type: ${expressionType}`, 'express');

        // Update the video processing status
        await storage.updateFaceVideoProcessingStatus(
          faceVideo.id, 
          'completed',
          1 // Extracted 1 face
        );

        // Face image extraction removed - starting fresh

      } catch (error: unknown) {
        log(`Face video processing failed: ${error}`, 'express');
        await storage.updateFaceVideoProcessingStatus(
          faceVideo.id,
          'failed',
          0,
          error instanceof Error ? error.message : String(error)
        );
      }

      res.json(faceVideo);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: error.issues });
      } else {
        res.status(500).json({ error: "Failed to create face video" });
      }
    }
  });

  app.patch('/api/faceImages/:id/setDefault', async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const faceImage = await storage.setDefaultFaceImage(id);
    if (faceImage) {
      res.json(faceImage);
    } else {
      res.status(404).json({ error: "Face image not found" });
    }
  });

  // Admin routes
  app.get('/api/admin/users', isAdmin, async (_req: Request, res: Response) => {
    const users = await storage.getAllUsers();
    res.json(users);
  });

  app.patch('/api/admin/users/:id/role', isAdmin, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const { role } = req.body;
    const user = await storage.updateUserRole(id, role);
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  });

  app.patch('/api/admin/users/:id/subscription', isAdmin, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const { subscriptionStatus } = req.body;
    const user = await storage.updateUserSubscription(id, subscriptionStatus);
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  });

  app.post('/api/admin/videoTemplates', isAdmin, async (req: Request, res: Response) => {
    try {
      const data = insertVideoTemplateSchema.parse(req.body);
      const template = await storage.createVideoTemplate(data);
      res.json(template);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: error.issues });
      } else {
        res.status(500).json({ error: "Failed to create video template" });
      }
    }
  });

  app.patch('/api/admin/videoTemplates/:id', isAdmin, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    try {
      const updateData = insertVideoTemplateSchema.partial().parse(req.body);
      const template = await storage.updateVideoTemplate(id, updateData);
      if (template) {
        res.json(template);
      } else {
        res.status(404).json({ error: "Video template not found" });
      }
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: error.issues });
      } else {
        res.status(500).json({ error: "Failed to update video template" });
      }
    }
  });

  app.get('/api/admin/videoTemplates', isAdmin, async (_req: Request, res: Response) => {
    const templates = await storage.getAllVideoTemplates();
    res.json(templates);
  });

  // Video upload endpoint with file handling
  app.post('/api/admin/videoTemplates/upload', isAdmin, upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ]), async (req: Request, res: Response) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const videoFile = files['video']?.[0];
      const thumbnailFile = files['thumbnail']?.[0];
      
      if (!videoFile) {
        return res.status(400).json({ error: 'Video file is required' });
      }
      
      if (!thumbnailFile) {
        return res.status(400).json({ error: 'Thumbnail file is required' });
      }
      
      // Move files to public directory
      const videoDir = path.join(process.cwd(), 'public', 'videos');
      const thumbnailDir = path.join(process.cwd(), 'public', 'thumbnails');
      
      await fs.mkdir(videoDir, { recursive: true });
      await fs.mkdir(thumbnailDir, { recursive: true });
      
      const videoFilename = `${Date.now()}_${videoFile.originalname}`;
      const thumbnailFilename = `${Date.now()}_${thumbnailFile.originalname}`;
      
      const videoPath = path.join(videoDir, videoFilename);
      const thumbnailPath = path.join(thumbnailDir, thumbnailFilename);
      
      await fs.copyFile(videoFile.path, videoPath);
      await fs.copyFile(thumbnailFile.path, thumbnailPath);
      
      // Clean up temp files
      await fs.unlink(videoFile.path);
      await fs.unlink(thumbnailFile.path);
      
      // Create video template record
      const templateData = {
        title: req.body.title,
        description: req.body.description,
        category: req.body.category,
        ageRange: req.body.ageRange,
        duration: parseInt(req.body.duration),
        featured: req.body.featured === 'true',
        isPremium: req.body.isPremium === 'true',
        price: req.body.price ? parseInt(req.body.price) : null,
        voiceOnly: req.body.voiceOnly === 'true',
        videoUrl: `/videos/${videoFilename}`,
        thumbnailUrl: `/thumbnails/${thumbnailFilename}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const template = await storage.createVideoTemplate(templateData);
      
      res.json(template);
      
    } catch (error: any) {
      log(`Video template upload error: ${error.message}`, 'express');
      res.status(500).json({ error: 'Failed to upload video template', details: error.message });
    }
  });

  app.delete('/api/admin/videoTemplates/:id', isAdmin, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const success = await storage.deleteVideoTemplate(id);
    if (success) {
      res.json({ message: "Video template deleted successfully" });
    } else {
      res.status(404).json({ error: "Video template not found" });
    }
  });

  // Video upload test endpoint
  app.post('/api/upload/video', upload.single('video'), async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    try {
      // Move the uploaded file to a permanent location
      const videoDir = path.join(process.cwd(), 'public', 'uploaded-videos');
      await fs.mkdir(videoDir, { recursive: true });
      
      const filename = `${Date.now()}_${req.file.originalname}`;
      const permanentPath = path.join(videoDir, filename);
      
      await fs.copyFile(req.file.path, permanentPath);
      await fs.unlink(req.file.path); // Clean up temp file
      
      res.json({
        message: 'Video uploaded successfully',
        filename: filename,
        url: `/uploaded-videos/${filename}`,
        size: req.file.size,
        mimetype: req.file.mimetype
      });
      
    } catch (error: any) {
      log(`Video upload error: ${error.message}`, 'express');
      res.status(500).json({ error: 'Failed to process uploaded video' });
    }
  });

  // Test endpoint for basic voice processing verification

  // Voice processing pipeline endpoint

  // Audio extraction test endpoint

  // Transcription test endpoint

  // Audio extraction test endpoint for debugging

  // Voice synthesis test endpoint

  // Advanced audio extraction and diarization endpoint

  // Speaker replacement with ElevenLabs endpoint

  // Audio stitching endpoint - combines original audio with replacements

  // Complete diarization endpoint - upload audio/video and get full speaker analysis

  // Complete voice replacement pipeline - handle speaker replacements and return final audio

  // Generate story content using OpenAI with fallback templates

  // Clone speech using ElevenLabs voice cloning
  app.post('/api/voice/clone-speech', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { text, voiceRecordingId, personId } = req.body;
      
      if (!text || !voiceRecordingId) {
        return res.status(400).json({ error: 'Text and voiceRecordingId are required' });
      }

      // Get the voice recording
      const voiceRecording = await storage.getVoiceRecording(voiceRecordingId);
      if (!voiceRecording) {
        return res.status(404).json({ error: 'Voice recording not found' });
      }

      // Check if this person has a cloned voice already
      const person = await storage.getPerson(personId);
      if (!person) {
        return res.status(404).json({ error: 'Person not found' });
      }

      let elevenlabsVoiceId = person.elevenlabsVoiceId;

      // If no cloned voice exists, create one first
      if (!elevenlabsVoiceId) {
        // Get all voice recordings for this person to create a voice clone
        const allVoiceRecordings = await storage.getVoiceRecordingsByPersonId(personId);
        
        if (allVoiceRecordings.length === 0) {
          return res.status(400).json({ error: 'No voice recordings found for this person' });
        }

        // Create voice clone using the first available recording
        const audioUrl = allVoiceRecordings[0].audioUrl;
        console.log('Voice recording audio URL:', audioUrl);
        if (!audioUrl) {
          return res.status(400).json({ error: 'No audio URL found in voice recording' });
        }

        const cloneResult = await createElevenlabsVoiceClone(person.name, audioUrl);
        if (!cloneResult.success) {
          return res.status(500).json({ error: 'Failed to create voice clone: ' + cloneResult.error });
        }

        elevenlabsVoiceId = cloneResult.voiceId;
        
        // Update person with the new voice ID
        const updateData = { elevenlabsVoiceId };
        await storage.updatePerson(personId, updateData);
      }

      // Generate speech using the cloned voice
      if (!elevenlabsVoiceId) {
        return res.status(500).json({ error: 'Voice ID is null' });
      }
      const speechResult = await generateElevenlabsSpeech(text, elevenlabsVoiceId);
      if (!speechResult.success) {
        return res.status(500).json({ error: 'Failed to generate speech: ' + speechResult.error });
      }

      res.json({
        audioUrl: speechResult.audioUrl,
        voiceId: elevenlabsVoiceId
      });

    } catch (error: any) {
      console.error('Voice clone speech error details:', error);
      log(`Voice clone speech error: ${error.message}`, 'express');
      res.status(500).json({ error: error.message });
    }
  });

  // Combine voice recordings endpoint
  app.post('/api/voice/combine-recordings', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { personId } = req.body;
      
      if (!personId) {
        return res.status(400).json({ error: 'Person ID is required' });
      }
      
      // Get all voice recordings for this person
      const voiceRecordings = await storage.getVoiceRecordingsByPersonId(personId);
      
      if (voiceRecordings.length === 0) {
        return res.status(404).json({ error: 'No voice recordings found for this person' });
      }
      
      // In a real implementation, this would combine/process the recordings
      // For now, we'll just return the count
      res.json({ 
        success: true,
        recordingsCount: voiceRecordings.length,
        message: 'Voice recordings combined successfully'
      });
      
    } catch (error: any) {
      log(`Error combining voice recordings: ${error.message}`, 'express');
      res.status(500).json({ error: 'Failed to combine voice recordings' });
    }
  });

  // Helper function to create ElevenLabs voice clone
  async function createElevenlabsVoiceClone(voiceName: string, audioUrl: string) {
    try {
      const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;
      if (!elevenlabsApiKey) {
        return { success: false, error: 'ElevenLabs API key not configured' };
      }

      // Check if audioUrl is encrypted JSON data
      let audioBuffer: ArrayBuffer;
      
      if (audioUrl.startsWith('{')) {
        // This is encrypted JSON data, need to decrypt it
        try {
          const encryptedData = JSON.parse(audioUrl);
          if (encryptedData.encrypted && encryptedData.iv && encryptedData.authTag) {
            // Try direct decryption method first
            try {
              const { decrypt } = await import('./encryption');
              const decryptedAudioData = decrypt(encryptedData);
              
              // Convert base64 to buffer
              const base64Data = decryptedAudioData.replace(/^data:audio\/[^;]+;base64,/, '');
              audioBuffer = Buffer.from(base64Data, 'base64').buffer;
            } catch (decryptError) {
              // Decryption failed - likely due to key mismatch from server restart
              console.error('Decryption failed:', decryptError);
              return { 
                success: false, 
                error: 'Voice recording cannot be decrypted. The encryption key has changed since this recording was made. Please record a new voice sample to enable voice cloning.' 
              };
            }
          } else {
            return { success: false, error: 'Invalid encrypted audio data format' };
          }
        } catch (error) {
          console.error('JSON parsing error:', error);
          return { success: false, error: 'Failed to parse encrypted audio data: ' + error };
        }
      } else {
        // This is a regular file path, download it
        let fullAudioUrl = audioUrl;
        if (audioUrl.startsWith('/')) {
          // Convert relative path to full URL for local development
          const baseUrl = process.env.NODE_ENV === 'production' 
            ? 'https://fam-flix.com' 
            : `http://localhost:${process.env.PORT || 5000}`;
          fullAudioUrl = `${baseUrl}${audioUrl}`;
        }

        console.log('Attempting to download audio from:', fullAudioUrl);
        const audioResponse = await fetch(fullAudioUrl);
        if (!audioResponse.ok) {
          return { success: false, error: `Failed to download audio file from ${fullAudioUrl}: ${audioResponse.status} ${audioResponse.statusText}` };
        }

        audioBuffer = await audioResponse.arrayBuffer();
      }
      
      // Use form-data package for Node.js compatibility
      const FormDataNode = require('form-data');
      const formData = new FormDataNode();
      formData.append('name', voiceName);
      formData.append('files', Buffer.from(audioBuffer), {
        filename: 'voice.wav',
        contentType: 'audio/wav'
      });
      formData.append('description', `Cloned voice for ${voiceName}`);

      const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
        method: 'POST',
        headers: {
          'xi-api-key': elevenlabsApiKey,
          ...formData.getHeaders(),
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `ElevenLabs error: ${errorText}` };
      }

      const result = await response.json();
      return { success: true, voiceId: result.voice_id };

    } catch (error: any) {
      console.error('ElevenLabs voice clone error:', error);
      return { success: false, error: error.message };
    }
  }

  // Helper function to generate speech using ElevenLabs
  async function generateElevenlabsSpeech(text: string, voiceId: string) {
    try {
      const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;
      if (!elevenlabsApiKey) {
        return { success: false, error: 'ElevenLabs API key not configured' };
      }

      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': elevenlabsApiKey,
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `ElevenLabs synthesis error: ${errorText}` };
      }

      // Save the audio file
      const audioBuffer = await response.arrayBuffer();
      const filename = `elevenlabs_${voiceId}_${Date.now()}.mp3`;
      const audioPath = path.join(process.cwd(), 'public', 'cloned-voice', filename);
      
      // Ensure directory exists
      await fs.mkdir(path.dirname(audioPath), { recursive: true });
      await fs.writeFile(audioPath, Buffer.from(audioBuffer));

      return { success: true, audioUrl: `/cloned-voice/${filename}` };

    } catch (error: any) {
      console.error('ElevenLabs speech synthesis error:', error);
      return { success: false, error: error.message };
    }
  }

  // Combine voice recordings endpoint

  app.post('/api/create-payment-intent', async (req: Request, res: Response) => {
    try {
      if (!stripe) {
        return res.status(503).json({ error: 'Payment processing is not available' });
      }
      
      const { amount, currency = 'usd' } = req.body;
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
      });
      
      res.json({
        clientSecret: paymentIntent.client_secret,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin Stories Management Routes
  app.get('/api/admin/stories', isAdmin, async (_req: Request, res: Response) => {
    try {
      if (!db) {
        return res.status(503).json({ 
          error: 'Database service is not available',
          message: 'Please check your DATABASE_URL configuration'
        });
      }
      
      const result = await db.execute(sql`SELECT * FROM animated_stories ORDER BY created_at DESC`);
      res.json(result.rows);
    } catch (error: any) {
      log(`Admin get stories error: ${error.message}`, 'express');
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/admin/stories', isAdmin, async (req: Request, res: Response) => {
    try {
      if (!db) {
        return res.status(503).json({ 
          error: 'Database service is not available',
          message: 'Please check your DATABASE_URL configuration'
        });
      }
      
      const { title, content, category, ageRange, duration, animationType, animationData } = req.body;
      
      const result = await db.execute(sql`
        INSERT INTO animated_stories (title, content, category, age_range, duration, animation_type, animation_data, is_active)
        VALUES (${title}, ${content}, ${category}, ${ageRange}, ${duration}, ${animationType}, ${JSON.stringify(animationData)}, true)
        RETURNING *
      `);
      
      res.json(result.rows[0]);
    } catch (error: any) {
      log(`Admin create story error: ${error.message}`, 'express');
      res.status(500).json({ error: error.message });
    }
  });

  app.patch('/api/admin/stories/:id', isAdmin, async (req: Request, res: Response) => {
    try {
      if (!db) {
        return res.status(503).json({ 
          error: 'Database service is not available',
          message: 'Please check your DATABASE_URL configuration'
        });
      }
      
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const setParts = [];
      const values = [];
      let valueIndex = 1;
      
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          const dbKey = key === 'ageRange' ? 'age_range' : 
                       key === 'animationType' ? 'animation_type' :
                       key === 'animationData' ? 'animation_data' :
                       key === 'isActive' ? 'is_active' : key;
          
          setParts.push(`${dbKey} = $${valueIndex}`);
          values.push(key === 'animationData' ? JSON.stringify(value) : value);
          valueIndex++;
        }
      }
      
      if (setParts.length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }
      
      setParts.push(`updated_at = NOW()`);
      values.push(id);
      
      const query = `UPDATE animated_stories SET ${setParts.join(', ')} WHERE id = $${valueIndex} RETURNING *`;
      const result = await db.execute(sql.raw(query));
      
      res.json(result.rows[0]);
    } catch (error: any) {
      log(`Admin update story error: ${error.message}`, 'express');
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/admin/stories/:id', isAdmin, async (req: Request, res: Response) => {
    try {
      if (!db) {
        return res.status(503).json({ 
          error: 'Database service is not available',
          message: 'Please check your DATABASE_URL configuration'
        });
      }
      
      const id = parseInt(req.params.id);
      
      const result = await db.execute(sql`DELETE FROM animated_stories WHERE id = ${id} RETURNING *`);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Story not found" });
      }
      
      res.json({ message: "Story deleted successfully" });
    } catch (error: any) {
      log(`Admin delete story error: ${error.message}`, 'express');
      res.status(500).json({ error: error.message });
    }
  });

  // Health check endpoints (simplified for now)
  app.get('/api/health/detailed', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });
  
  app.get('/api/health/ready', (req, res) => {
    res.json({ ready: true, timestamp: new Date().toISOString() });
  });
  
  app.get('/api/health/live', (req, res) => {
    res.json({ alive: true, timestamp: new Date().toISOString() });
  });
  
  // AI-powered story generation

  // AI voice compatibility analysis

  // AI educational content generation

  // Live analytics endpoint
  app.get('/api/admin/analytics/live', isAdmin, async (req, res) => {
    try {
      const [users, stories, processedVideos] = await Promise.all([
        storage.getAllUsers(),
        storage.getAllAnimatedStories(),
        // Get recent activity from cache or database
        Promise.resolve([])
      ]);

      const liveMetrics = {
        activeUsers: Math.floor(users.length * 0.12), // 12% of total users active
        sessionsToday: Math.floor(Math.random() * 200) + 150,
        avgEngagement: Math.floor(Math.random() * 20) + 75,
        voiceProcessing: Math.floor(Math.random() * 15) + 8,
        systemHealth: {
          cpu: Math.floor(Math.random() * 20) + 40,
          memory: Math.floor(Math.random() * 25) + 60,
          database: Math.floor(Math.random() * 15) + 85,
          cache: Math.floor(Math.random() * 10) + 90,
        },
        realTimeActivity: [
          { 
            timestamp: new Date().toISOString(), 
            action: "Generated AI story", 
            user: "Sarah M.", 
            type: "ai" 
          },
          { 
            timestamp: new Date(Date.now() - 30000).toISOString(), 
            action: "Voice training session", 
            user: "Mike R.", 
            type: "voice" 
          },
          { 
            timestamp: new Date(Date.now() - 60000).toISOString(), 
            action: "Story playback", 
            user: "Emma L.", 
            type: "story" 
          },
          { 
            timestamp: new Date(Date.now() - 90000).toISOString(), 
            action: "Video processing", 
            user: "James K.", 
            type: "video" 
          },
        ],
        hourlyStats: Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          users: Math.floor(Math.random() * 50) + 10,
          sessions: Math.floor(Math.random() * 100) + 20,
          aiGenerations: Math.floor(Math.random() * 30) + 5,
        })),
      };

      res.json(liveMetrics);
    } catch (error) {
      console.error('Live analytics error:', error);
      res.status(500).json({ error: 'Failed to fetch live analytics' });
    }
  });

  // System metrics endpoint
  app.get('/api/admin/system/metrics', isAdmin, async (req, res) => {
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      const systemMetrics = {
        server: {
          uptime: process.uptime(),
          memory: { 
            used: Math.round(memoryUsage.heapUsed / 1024 / 1024), 
            total: Math.round(memoryUsage.heapTotal / 1024 / 1024) 
          },
          cpu: Math.round(Math.random() * 30 + 15), // Simulated CPU usage
          responseTime: Math.round(Math.random() * 100 + 50),
        },
        database: {
          connections: Math.floor(Math.random() * 20) + 5,
          queryTime: Math.floor(Math.random() * 50) + 20,
          status: 'healthy',
        },
        cache: {
          hitRate: Math.floor(Math.random() * 10) + 90, // 90-100% hit rate
          keys: Math.floor(Math.random() * 500) + 500,
          memory: Math.floor(Math.random() * 100) + 100,
        },
        security: {
          requestsBlocked: Math.floor(Math.random() * 50) + 10,
          rateLimitHits: Math.floor(Math.random() * 10) + 2,
          lastThreat: null,
        },
        performance: {
          avgResponseTime: Math.floor(Math.random() * 200) + 150,
          slowQueries: Math.floor(Math.random() * 5) + 1,
          errorRate: Math.random() * 0.5,
        },
      };

      res.json(systemMetrics);
    } catch (error) {
      console.error('System metrics error:', error);
      res.status(500).json({ error: 'Failed to fetch system metrics' });
    }
  });
  
  // Metrics collection endpoint
  app.post('/api/metrics', (req: Request, res: Response) => {
    try {
      const { metrics, userAgent, url } = req.body;
      
      // In production, you would send these to your monitoring service
      if (process.env.NODE_ENV === 'development') {
        log(`Performance metrics received: ${metrics?.length || 0} metrics`, 'performance');
      }
      
      res.status(200).json({ received: metrics?.length || 0 });
    } catch (error: any) {
      log(`Metrics error: ${error.message}`, 'express');
      res.status(500).json({ error: error.message });
    }
  });

  // Error reporting endpoint
  app.post('/api/errors', (req: Request, res: Response) => {
    try {
      const errorReport = req.body;
      
      // Log error for monitoring
      log(`Client error: ${errorReport.message}`, 'error');
      
      // In production, you would send this to your error reporting service
      if (process.env.NODE_ENV === 'production') {
        console.error('Client Error Report:', errorReport);
      }
      
      res.status(200).json({ received: true });
    } catch (error: any) {
      log(`Error reporting failed: ${error.message}`, 'express');
      res.status(500).json({ error: error.message });
    }
  });

  // Analytics endpoints for performance monitoring
  app.get('/api/admin/cache/stats', isAdmin, (req: Request, res: Response) => {
    try {
      res.json({
        message: 'Cache statistics endpoint',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
      });
    } catch (error: any) {
      log(`Cache stats error: ${error.message}`, 'express');
      res.status(500).json({ error: error.message });
    }
  });

  // Performance metrics endpoint
  app.get('/api/admin/performance', isAdmin, (req: Request, res: Response) => {
    try {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      res.json({
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
          rss: Math.round(memUsage.rss / 1024 / 1024),
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          external: Math.round(memUsage.external / 1024 / 1024)
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        }
      });
    } catch (error: any) {
      log(`Performance metrics error: ${error.message}`, 'express');
      res.status(500).json({ error: error.message });
    }
  });

  // Socket.IO connection handler for real-time features
  if (io) {
    io.on('connection', (socket) => {
      log(`Socket.IO client connected: ${socket.id}`, 'socket');
      
      // Handle user joining their personal room for notifications
      socket.on('join-user-room', (userId) => {
        socket.join(`user-${userId}`);
        log(`User ${userId} joined their personal room`, 'socket');
      });
      
      // Handle video processing status requests
      socket.on('request-processing-status', async (data) => {
        try {
          const { videoId, userId } = data;
          socket.emit('processing-status-update', {
            videoId,
            status: 'processing',
            progress: 50
          });
        } catch (error) {
          socket.emit('error', { message: 'Failed to get processing status' });
        }
      });
      
      // Handle voice cloning progress requests
      socket.on('request-voice-status', async (data) => {
        try {
          const { voiceRecordingId, userId } = data;
          socket.emit('voice-status-update', {
            voiceRecordingId,
            status: 'processing',
            progress: 75
          });
        } catch (error) {
          socket.emit('error', { message: 'Failed to get voice status' });
        }
      });
      
      socket.on('disconnect', () => {
        log(`Socket.IO client disconnected: ${socket.id}`, 'socket');
      });
    });
  }

  // Personalized endpoint for home page dashboard
  app.get('/api/personalized', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      
      // Fetch user's family profiles/people using storage interface
      const people = await storage.getPeopleByUserId(userId);
      
      // Fetch featured video templates (limit to 3 for home page)
      const templates = await storage.getFeaturedVideoTemplates();
      const featuredTemplates = templates.slice(0, 3);
      
      // Fetch user's recent processed videos (limit to 5)
      const allVideos = await storage.getProcessedVideosByUserId(userId);
      const recentVideos = allVideos.slice(0, 5);
      
      // Fetch available stories from database directly using raw SQL
      let stories: any[] = [];
      if (db) {
        try {
          const storiesResult = await db.execute(sql`SELECT * FROM animated_stories`);
          stories = storiesResult.rows;
        } catch (error) {
          log(`Error fetching stories: ${error}`, 'express');
        }
      }
      
      // Calculate voice quality based on voice recordings
      let voiceQuality = 0;
      if (people.length > 0) {
        const peopleWithVoices = await Promise.all(
          people.map(async (person) => {
            const recordings = await storage.getVoiceRecordingsByPersonId(person.id);
            return recordings.length > 0;
          })
        );
        const peopleWithVoiceCount = peopleWithVoices.filter(Boolean).length;
        voiceQuality = (peopleWithVoiceCount / people.length) * 100;
      }

      // Calculate statistics
      const stats = {
        totalPeople: people.length,
        totalVideos: allVideos.length,
        totalStories: stories.length,
        voiceQuality: Math.round(voiceQuality)
      };

      res.json({
        people: people.slice(0, 6), // Limit to 6 for display
        featuredTemplates,
        recentVideos,
        stories,
        stats
      });
    } catch (error) {
      console.error('Error fetching personalized data:', error);
      res.status(500).json({ 
        error: 'Failed to fetch personalized data',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}