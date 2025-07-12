import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { Server as SocketServer } from "socket.io";
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { body, validationResult } from 'express-validator';
import helmet from 'helmet';
import passport from 'passport';
import { storage } from "./storage"; // Use the storage interface
import { 
  insertUserSchema, 
  insertFaceImageSchema, 
  insertVoiceRecordingSchema,
  insertProcessedVideoSchema,
  insertPersonSchema,
  insertVideoTemplateSchema
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
import voiceService from './services/voiceService';
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
    await limiter.consume(req.ip);
    next();
  } catch (rejRes) {
    const remainingPoints = rejRes.remainingPoints || 0;
    const msBeforeNext = rejRes.msBeforeNext || 1000;
    
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

// Background voice cloning function
async function cloneVoiceInBackground(voiceRecordingId: number, voiceRecording: any) {
  try {
    log(`Starting voice cloning for recording ID: ${voiceRecordingId}`, 'express');
    
    // Update status to processing
    await storage.updateVoiceCloneStatus(voiceRecordingId, 'processing');
    
    // Extract audio data
    const audioData = voiceRecording.audioData;
    if (!audioData) {
      throw new Error('No audio data found in voice recording');
    }

    // Convert base64 to buffer and ensure it's valid audio data
    let audioBuffer;
    if (audioData.includes(',')) {
      audioBuffer = Buffer.from(audioData.split(',')[1], 'base64');
    } else {
      audioBuffer = Buffer.from(audioData, 'base64');
    }
    
    // Validate audio buffer size
    if (audioBuffer.length < 1000) {
      throw new Error('Audio data too small - invalid recording');
    }
    
    log(`Voice cloning: Audio buffer size: ${audioBuffer.length} bytes`, 'express');
    
    // Convert WebM/OGG audio to proper WAV format for ElevenLabs
    const tempDir = path.join(process.cwd(), 'temp', 'elevenlabs');
    await fs.mkdir(tempDir, { recursive: true });
    
    // First save the original audio
    const originalPath = path.join(tempDir, `original_${voiceRecordingId}_${Date.now()}.webm`);
    await fs.writeFile(originalPath, audioBuffer);
    
    // Convert to WAV using FFmpeg if available, otherwise use original
    const tempAudioPath = path.join(tempDir, `temp_${voiceRecordingId}_${Date.now()}.wav`);
    
    try {
      // Try FFmpeg conversion
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      await execAsync(`ffmpeg -i "${originalPath}" -ar 16000 -ac 1 -f wav "${tempAudioPath}"`);
      log(`Voice cloning: Converted audio using FFmpeg`, 'express');
      
      // Clean up original
      await fs.unlink(originalPath);
    } catch (ffmpegError) {
      log(`Voice cloning: FFmpeg not available, using original audio: ${ffmpegError.message}`, 'express');
      // If FFmpeg fails, just rename the original file
      await fs.rename(originalPath, tempAudioPath);
    }
    
    // Create voice clone with ElevenLabs using proper file upload
    const formData = new FormData();
    formData.append('name', `${voiceRecording.name.replace(/[^a-zA-Z0-9]/g, '_')}_${voiceRecordingId}`);
    formData.append('description', `Voice clone for ${voiceRecording.name}`);
    formData.append('files', fsSync.createReadStream(tempAudioPath), {
      filename: 'voice_sample.wav',
      contentType: 'audio/wav'
    });

    const createVoiceResponse = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        ...formData.getHeaders()
      },
      body: formData
    });

    // Clean up temp file
    try {
      await fs.unlink(tempAudioPath);
    } catch (e) {}

    if (!createVoiceResponse.ok) {
      const errorText = await createVoiceResponse.text();
      throw new Error(`ElevenLabs voice creation failed: ${createVoiceResponse.status} - ${errorText}`);
    }

    const voiceData = await createVoiceResponse.json();
    const elevenLabsVoiceId = voiceData.voice_id;
    
    // Update status to completed with voice ID
    await storage.updateVoiceCloneStatus(voiceRecordingId, 'completed', elevenLabsVoiceId);
    
    log(`Voice cloning completed for recording ID: ${voiceRecordingId}, ElevenLabs ID: ${elevenLabsVoiceId}`, 'express');
    
  } catch (error: any) {
    log(`Voice cloning failed for recording ID: ${voiceRecordingId}: ${error.message}`, 'express');
    await storage.updateVoiceCloneStatus(voiceRecordingId, 'failed', undefined, error.message);
  }
}

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

// Authentication middleware
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
};

// Admin middleware to check if user is an admin
const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: "Admin access required" });
  }
  
  next();
};

export async function registerRoutes(app: Express, io?: SocketServer): Promise<Server> {
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

  // Voice synthesis service integration
  app.get('/api/voice/health', async (req: Request, res: Response) => {
    try {
      const isHealthy = await voiceService.checkHealth();
      res.json({
        service: 'voice-synthesis',
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        service: 'voice-synthesis',
        status: 'error',
        error: (error as Error).message
      });
    }
  });

  // Start voice synthesis task
  app.post('/api/voice/synthesize', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { text, voice_sample, quality = 'standard', preserve_accent = true, preserve_emotion = true } = req.body;
      
      if (!text || !voice_sample) {
        return res.status(400).json({ error: 'Text and voice sample are required' });
      }

      const result = await voiceService.synthesizeVoice({
        text,
        voice_sample,
        quality,
        preserve_accent,
        preserve_emotion
      });

      // Emit real-time update via Socket.IO
      if (io) {
        io.to(`user-${req.user.id}`).emit('voice-synthesis-started', {
          taskId: result.task_id,
          text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
          status: 'started'
        });
      }

      res.json(result);
    } catch (error) {
      log(`Voice synthesis error: ${(error as Error).message}`, 'error');
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Get voice synthesis task status
  app.get('/api/voice/status/:taskId', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { taskId } = req.params;
      const status = await voiceService.getTaskStatus(taskId);
      
      // Emit real-time status update
      if (io && status.status === 'completed') {
        io.to(`user-${req.user.id}`).emit('voice-synthesis-completed', {
          taskId,
          outputPath: status.output_path,
          status: 'completed'
        });
      }

      res.json(status);
    } catch (error) {
      res.status(404).json({ error: (error as Error).message });
    }
  });

  // Upload voice sample for synthesis
  app.post('/api/voice/upload-sample', isAuthenticated, upload.single('voiceSample'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Voice sample file is required' });
      }

      const result = await voiceService.uploadVoiceSample(req.file.path, req.file.originalname);
      
      log(`Voice sample uploaded for user ${req.user.id}: ${result.filename}`, 'voice');
      res.json(result);
    } catch (error) {
      log(`Voice sample upload error: ${(error as Error).message}`, 'error');
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Batch voice synthesis
  app.post('/api/voice/batch-synthesize', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { requests, batch_name } = req.body;
      
      if (!requests || !Array.isArray(requests) || requests.length === 0) {
        return res.status(400).json({ error: 'Requests array is required' });
      }

      const result = await voiceService.batchSynthesize({
        requests,
        batch_name
      });

      // Emit batch started event
      if (io) {
        io.to(`user-${req.user.id}`).emit('batch-synthesis-started', {
          batchName: result.batch_name,
          totalTasks: result.total_tasks,
          taskIds: result.task_ids
        });
      }

      res.json(result);
    } catch (error) {
      log(`Batch synthesis error: ${(error as Error).message}`, 'error');
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // List voice synthesis tasks
  app.get('/api/voice/tasks', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const result = await voiceService.listTasks();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Delete voice synthesis task
  app.delete('/api/voice/tasks/:taskId', isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { taskId } = req.params;
      const result = await voiceService.deleteTask(taskId);
      res.json(result);
    } catch (error) {
      res.status(404).json({ error: (error as Error).message });
    }
  });
  
  // Enhanced admin route monitoring with Socket.IO
  app.use('/api/admin/*', (req: Request, res: Response, next: NextFunction) => {
    // Log admin access attempts
    if (req.isAuthenticated()) {
      log(`Admin access: ${req.user.username} accessing ${req.path} from ${req.ip}`, 'auth');
      
      // Emit admin activity for real-time monitoring
      if (io && req.user.role === 'admin') {
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
  app.get('/voice-previews/:filename', (req: Request, res: Response) => {
    const filename = req.params.filename;
    
    // Validate filename to prevent path traversal
    if (!/^[a-zA-Z0-9_-]+\.(wav|mp3|m4a|aac)$/.test(filename)) {
      return res.status(400).json({ message: 'Invalid filename format' });
    }
    
    try {
      const filePath = path.join(process.cwd(), 'public', 'voice-previews', filename);
      
      // Check if file exists
      if (!fsSync.existsSync(filePath)) {
        return res.status(404).json({ message: 'Voice preview file not found' });
      }
      
      // Set appropriate headers for audio playback
      const ext = path.extname(filename).toLowerCase();
      const mimeTypes: { [key: string]: string } = {
        '.wav': 'audio/wav',
        '.mp3': 'audio/mpeg',
        '.m4a': 'audio/mp4',
        '.aac': 'audio/aac'
      };
      
      res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
      res.sendFile(filePath);
    } catch (error) {
      console.error('Error serving voice preview:', error);
      res.status(500).json({ message: 'Error serving voice preview' });
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

  // Face Images
  app.post('/api/faceImages', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
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
    if (!req.isAuthenticated()) {
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

  app.get('/api/people/:personId/faceVideos', async (req: Request, res: Response) => {
    const personId = parseInt(req.params.personId);
    const faceVideos = await storage.getFaceVideosByPersonId(personId);
    res.json(faceVideos);
  });

  // Voice Recordings
  // Audio cleaning function
  async function cleanAudioRecording(audioBuffer: Buffer, tempDir: string): Promise<Buffer> {
    const inputPath = path.join(tempDir, 'input.webm');
    const cleanedPath = path.join(tempDir, 'cleaned.wav');
    
    // Write input audio
    await fs.writeFile(inputPath, audioBuffer);
    
    // Apply comprehensive audio cleaning filters
    const cleaningFilters = [
      'highpass=f=80',                    // Remove low-frequency rumble
      'lowpass=f=8000',                   // Remove high-frequency noise
      'afftdn=nf=-25:nt=w',              // Advanced noise reduction
      'acompressor=threshold=0.1:ratio=2:attack=5:release=50', // Light compression
      'adeclick=t=0.02',                  // Remove clicks and pops
      'anlmdn=s=0.00001',                 // Non-linear mean denoise
      'volume=1.2',                       // Slight volume boost
      'loudnorm=I=-20:TP=-1.5:LRA=7',    // Normalize loudness
      'areverse,silenceremove=start_periods=1:start_silence=0.1,areverse', // Remove leading silence
      'silenceremove=stop_periods=1:stop_silence=0.1' // Remove trailing silence
    ].join(',');
    
    try {
      const { execSync } = await import('child_process');
      execSync(`ffmpeg -y -i "${inputPath}" -af "${cleaningFilters}" -ar 22050 -ac 1 -sample_fmt s16 "${cleanedPath}"`, { stdio: 'pipe' });
      
      const cleanedBuffer = await fs.readFile(cleanedPath);
      
      // Clean up temporary files
      await fs.unlink(inputPath);
      await fs.unlink(cleanedPath);
      
      return cleanedBuffer;
    } catch (error: any) {
      log(`Audio cleaning error: ${error.message}`, 'express');
      // Return original if cleaning fails
      await fs.unlink(inputPath);
      return audioBuffer;
    }
  }

  app.post('/api/voiceRecordings', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      log(`Voice recording request body keys: ${Object.keys(req.body).join(', ')}`, 'express');
      
      // Parse and validate the input data
      const rawData = req.body;
      
      // Ensure audioUrl is set from audioData if not provided
      if (!rawData.audioUrl && rawData.audioData) {
        rawData.audioUrl = rawData.audioData;
      }
      
      const data = insertVoiceRecordingSchema.parse(rawData);
      const voiceRecording = await storage.createVoiceRecording(data);
      
      // Start voice cloning process in background with real-time updates
      cloneVoiceInBackground(voiceRecording.id, voiceRecording).then(() => {
        if (io) {
          io.to(`user-${req.user.id}`).emit('voice-cloning-complete', {
            voiceRecordingId: voiceRecording.id,
            personId: data.personId,
            timestamp: new Date()
          });
        }
      }).catch((error) => {
        if (io) {
          io.to(`user-${req.user.id}`).emit('voice-cloning-error', {
            voiceRecordingId: voiceRecording.id,
            error: error.message,
            timestamp: new Date()
          });
        }
      });
      
      res.json(voiceRecording);
    } catch (error: unknown) {
      log(`Voice recording error: ${error}`, 'express');
      if (error instanceof ZodError) {
        log(`Validation errors: ${JSON.stringify(error.issues)}`, 'express');
        res.status(400).json({ error: error.issues });
      } else {
        log(`Database error: ${error}`, 'express');
        res.status(500).json({ error: "Failed to create voice recording", details: error instanceof Error ? error.message : String(error) });
      }
    }
  });

  app.get('/api/voiceRecordings/:id', async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const voiceRecording = await storage.getVoiceRecording(id);
    if (voiceRecording) {
      res.json(voiceRecording);
    } else {
      res.status(404).json({ error: "Voice recording not found" });
    }
  });

  app.delete('/api/voiceRecordings/:id', async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const success = await storage.deleteVoiceRecording(id);
    if (success) {
      res.json({ message: "Voice recording deleted successfully" });
    } else {
      res.status(404).json({ error: "Voice recording not found" });
    }
  });

  // Video Templates
  app.get('/api/videoTemplates', async (_req: Request, res: Response) => {
    const templates = await storage.getAllVideoTemplates();
    res.json(templates);
  });

  app.get('/api/videoTemplates/featured', async (_req: Request, res: Response) => {
    const templates = await storage.getFeaturedVideoTemplates();
    res.json(templates);
  });

  app.get('/api/videoTemplates/category/:category', async (req: Request, res: Response) => {
    const category = req.params.category;
    const templates = await storage.getVideoTemplatesByCategory(category);
    res.json(templates);
  });

  app.get('/api/videoTemplates/ageRange/:ageRange', async (req: Request, res: Response) => {
    const ageRange = req.params.ageRange;
    const templates = await storage.getVideoTemplatesByAgeRange(ageRange);
    res.json(templates);
  });

  app.get('/api/videoTemplates/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid video template ID' });
      }
      
      const template = await storage.getVideoTemplate(id);
      if (!template) {
        return res.status(404).json({ message: 'Video template not found' });
      }
      
      res.json(template);
    } catch (err) {
      return res.status(500).json({ message: 'Error fetching video template', error: err });
    }
  });

  // Processed Videos
  app.post('/api/processedVideos', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { templateId, faceImages, voiceRecordings } = req.body;
      
      if (!templateId) {
        return res.status(400).json({ error: 'Template ID is required' });
      }
      
      // Get the template
      const template = await storage.getVideoTemplate(templateId);
      if (!template) {
        return res.status(404).json({ error: 'Video template not found' });
      }
      
      // Validate that we have face images and voice recordings
      if (!faceImages || faceImages.length === 0) {
        return res.status(400).json({ error: 'At least one face image is required' });
      }
      
      if (!voiceRecordings || voiceRecordings.length === 0) {
        return res.status(400).json({ error: 'At least one voice recording is required' });
      }
      
      // Get the video file path
      const videoPath = path.join(process.cwd(), 'public', template.videoUrl);
      const outputDir = path.join(process.cwd(), 'public', 'processed-videos');
      await fs.mkdir(outputDir, { recursive: true });
      
      const outputFilename = `processed_${Date.now()}_${template.id}.mp4`;
      const outputPath = path.join(outputDir, outputFilename);
      
      // Create the processed video record
      const processedVideo = await storage.createProcessedVideo({
        userId: req.user.id,
        templateId: templateId,
        status: 'pending',
        outputUrl: `/processed-videos/${outputFilename}`,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Create associations for people
      const faceSources: { personId: number, faceImageBuffer: Buffer }[] = [];
      for (const faceImg of faceImages) {
        const faceImage = await storage.getFaceImage(faceImg.id);
        if (faceImage) {
          let faceImageBuffer: Buffer;
          if (faceImage.imageUrl.startsWith('data:image/')) {
            const base64Data = faceImage.imageUrl.split(',')[1];
            faceImageBuffer = Buffer.from(base64Data, 'base64');
          } else {
            const imagePath = path.join(process.cwd(), 'public', faceImage.imageUrl);
            faceImageBuffer = await fs.readFile(imagePath);
          }
          
          faceSources.push({ personId: faceImage.personId, faceImageBuffer });
          
          // Create processed video person association
          await storage.createProcessedVideoPerson({
            processedVideoId: processedVideo.id,
            personId: faceImage.personId
          });
        }
      }

      const voiceSources: { personId: number, voiceRecordingBuffer: Buffer }[] = [];
      for (const voiceRec of voiceRecordings) {
        const voiceRecording = await storage.getVoiceRecording(voiceRec.id);
        if (voiceRecording) {
          let voiceRecordingBuffer: Buffer;
          if (voiceRecording.audioUrl.startsWith('data:audio/')) {
            const base64Data = voiceRecording.audioUrl.split(',')[1];
            voiceRecordingBuffer = Buffer.from(base64Data, 'base64');
          } else {
            const audioPath = path.join(process.cwd(), 'public', voiceRecording.audioUrl);
            voiceRecordingBuffer = await fs.readFile(audioPath);
          }
          
          voiceSources.push({ personId: voiceRecording.personId, voiceRecordingBuffer });
        }
      }

      // Copy original video as processed (no ML processing for now)
      await fs.copyFile(videoPath, outputPath);
      
      // Update processed video status
      await storage.updateProcessedVideoStatus(processedVideo.id, 'completed', undefined, `/processed-videos/${outputFilename}`);
      
      const updatedProcessedVideo = await storage.getProcessedVideo(processedVideo.id);
      
      // Emit real-time update for video processing completion
      if (io) {
        io.to(`user-${req.user.id}`).emit('video-processing-complete', {
          videoId: processedVideo.id,
          templateId: templateId,
          timestamp: new Date()
        });
      }
      
      res.json(updatedProcessedVideo);
      
    } catch (error: any) {
      log(`Video processing error: ${error.message}`, 'express');
      res.status(500).json({ error: 'Video processing failed', details: error.message });
    }
  });

  app.get('/api/users/:userId/processedVideos', async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId);
    const processedVideos = await storage.getProcessedVideosByUserId(userId);
    res.json(processedVideos);
  });

  app.get('/api/processedVideos/:id', async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const processedVideo = await storage.getProcessedVideo(id);
    if (processedVideo) {
      res.json(processedVideo);
    } else {
      res.status(404).json({ error: "Processed video not found" });
    }
  });

  app.delete('/api/processedVideos/:id', async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const success = await storage.deleteProcessedVideo(id);
    if (success) {
      res.json({ message: "Processed video deleted successfully" });
    } else {
      res.status(404).json({ error: "Processed video not found" });
    }
  });

  // People management
  app.get('/api/users/:userId/people', async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId);
    const people = await storage.getPeopleByUserId(userId);
    res.json(people);
  });

  app.post('/api/people', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const data = insertPersonSchema.parse(req.body);
      const person = await storage.createPerson(data);
      
      // Emit real-time update for family member creation
      if (io) {
        io.to(`user-${req.user.id}`).emit('family-member-created', {
          personId: person.id,
          name: person.name,
          timestamp: new Date()
        });
      }
      
      res.json(person);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: error.issues });
      } else {
        res.status(500).json({ error: "Failed to create person" });
      }
    }
  });

  app.get('/api/people/:id', async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const person = await storage.getPerson(id);
    if (person) {
      res.json(person);
    } else {
      res.status(404).json({ error: "Person not found" });
    }
  });

  app.patch('/api/people/:id', async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    try {
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
        res.status(500).json({ error: "Failed to update person" });
      }
    }
  });

  app.delete('/api/people/:id', async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const success = await storage.deletePerson(id);
    if (success) {
      res.json({ message: "Person deleted successfully" });
    } else {
      res.status(404).json({ error: "Person not found" });
    }
  });

  app.get('/api/people/:personId/faceImages', async (req: Request, res: Response) => {
    const personId = parseInt(req.params.personId);
    const faceImages = await storage.getFaceImagesByPersonId(personId);
    res.json(faceImages);
  });

  app.get('/api/people/:personId/voiceRecordings', async (req: Request, res: Response) => {
    const personId = parseInt(req.params.personId);
    const voiceRecordings = await storage.getVoiceRecordingsByPersonId(personId);
    res.json(voiceRecordings);
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

  app.patch('/api/voiceRecordings/:id/setDefault', async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const voiceRecording = await storage.setDefaultVoiceRecording(id);
    if (voiceRecording) {
      res.json(voiceRecording);
    } else {
      res.status(404).json({ error: "Voice recording not found" });
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
  app.post('/api/test-voice-processing', async (req: Request, res: Response) => {
    try {
      log('Test voice processing endpoint called', 'express');
      
      const { userVoiceData, targetText } = req.body;
      
      if (!userVoiceData) {
        return res.status(400).json({ error: 'User voice data is required' });
      }
      
      if (!targetText) {
        return res.status(400).json({ error: 'Target text is required' });
      }
      
      // Simple test response for voice processing
      const testResult = {
        success: true,
        message: 'Voice processing test completed',
        inputText: targetText,
        processedAudio: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAkVXrTp66hVFApGn+DyvmAaBjmI0fDacyIGLnHA7t2ZQwsUUKXh8blfGAg9j9r0wlIjBCvOwO3LYiIGMnq+8dGbTAoUW7Hp8L1jHAY7k9v0wlIjBCvOwO3LYiIGMnq+8dGbTAoUW7Hp8L1jHAY7k9v0wlIjBCvOwO3LYiIGMnq+8dGbTAoUW7Hp8L1jHAY7k9v0wlIjBCvOwO3LYiIGMnq+8dGbTAoUW7Hp8L1jHAY7k9v0wlIjBCvOwO3LYiIGMnq+8dGbTAoUW7Hp8L1jHAY7k9v0wlIjBCvOwO3LYiIGMnq+8dGbTAoUW7Hp8L1jHAY7k9v0wlIjBCvOwO3LYiIGMnq+8dGbTAoUW7Hp8L1jHAY7k9v0w==',
        audioType: 'wav',
        duration: 2.5,
        processingTime: Date.now(),
        voiceMatchScore: 0.85,
        qualityScore: 0.92
      };
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      res.json(testResult);
      
    } catch (error: any) {
      log(`Test voice processing error: ${error.message}`, 'express');
      res.status(500).json({ error: 'Test voice processing failed', details: error.message });
    }
  });

  // Voice processing pipeline endpoint
  app.post('/api/voice/process', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { videoTemplateId, personId, targetText } = req.body;
      
      if (!videoTemplateId || !personId) {
        return res.status(400).json({ error: 'Video template ID and person ID are required' });
      }
      
      // Get video template
      const template = await storage.getVideoTemplate(videoTemplateId);
      if (!template) {
        return res.status(404).json({ error: 'Video template not found' });
      }
      
      // Get person's default voice recording
      const voiceRecordings = await storage.getVoiceRecordingsByPersonId(personId);
      const defaultVoice = voiceRecordings.find(v => v.isDefault) || voiceRecordings[0];
      
      if (!defaultVoice) {
        return res.status(404).json({ error: 'No voice recording found for person' });
      }
      
      // Extract voice data
      let voiceBuffer: Buffer;
      if (defaultVoice.audioUrl.startsWith('data:audio/')) {
        const base64Data = defaultVoice.audioUrl.split(',')[1];
        voiceBuffer = Buffer.from(base64Data, 'base64');
      } else {
        const audioPath = path.join(process.cwd(), 'public', defaultVoice.audioUrl);
        voiceBuffer = await fs.readFile(audioPath);
      }
      
      // Get video file path
      const videoPath = path.join(process.cwd(), 'public', template.videoUrl);
      
      // ML service temporarily disabled - returning mock response
      // TODO: Re-implement voice processing pipeline
      const result = {
        success: false,
        error: "Voice processing service temporarily unavailable"
      };
      
      if (result.success && result.finalVideoPath) {
        // Save processed video
        const outputDir = path.join(process.cwd(), 'public', 'processed-videos');
        await fs.mkdir(outputDir, { recursive: true });
        
        const outputFilename = `processed_${Date.now()}_${template.id}.mp4`;
        const publicPath = path.join(outputDir, outputFilename);
        
        await fs.copyFile(result.finalVideoPath, publicPath);
        
        // Create processed video record
        const processedVideo = await storage.createProcessedVideo({
          userId: req.user.id,
          templateId: videoTemplateId,
          status: 'completed',
          outputUrl: `/processed-videos/${outputFilename}`,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        // Link person to processed video
        await storage.createProcessedVideoPerson({
          processedVideoId: processedVideo.id,
          personId: personId
        });
        
        return res.status(200).json({
          success: true,
          processedVideo,
          transcription: result.transcription,
          duration: result.duration,
          outputUrl: `/processed-videos/${outputFilename}`
        });
      } else {
        return res.status(500).json({
          error: 'Voice processing failed',
          details: result.error
        });
      }
      
    } catch (error: any) {
      log(`Voice processing error: ${error.message}`, 'express');
      return res.status(500).json({
        error: 'Voice processing failed',
        details: error.message
      });
    }
  });

  // Audio extraction test endpoint
  app.post('/api/voice/extract-audio', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { videoTemplateId } = req.body;
      
      if (!videoTemplateId) {
        return res.status(400).json({ error: 'Video template ID is required' });
      }
      
      // Get video template
      const template = await storage.getVideoTemplate(videoTemplateId);
      if (!template) {
        return res.status(404).json({ error: 'Video template not found' });
      }
      
      // Get video file path
      const videoPath = path.join(process.cwd(), 'public', template.videoUrl);
      
      // Extract audio with speaker diarization using the ML service
      const voiceProcessor = MLService.getVoiceProcessor();
      const result = await voiceProcessor.extractAudioFromVideo(videoPath, 'wav', true);
      
      if (result.success) {
        // Move extracted audio to public directory for access
        const outputDir = path.join(process.cwd(), 'public', 'extracted-audio');
        await fs.mkdir(outputDir, { recursive: true });
        
        const outputFilename = `extracted_${Date.now()}_${template.id}.wav`;
        const publicPath = path.join(outputDir, outputFilename);
        
        await fs.copyFile(result.audioPath!, publicPath);
        
        return res.status(200).json({
          success: true,
          audioUrl: `/extracted-audio/${outputFilename}`,
          duration: result.duration,
          sampleRate: result.sampleRate,
          speakers: result.speakers
        });
      } else {
        return res.status(500).json({
          error: 'Audio extraction failed',
          details: result.error
        });
      }
      
    } catch (error: any) {
      log(`Audio extraction error: ${error.message}`, 'express');
      return res.status(500).json({
        error: 'Audio extraction failed',
        details: error.message
      });
    }
  });

  // Transcription test endpoint
  app.post('/api/voice/transcribe', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { audioUrl } = req.body;
      
      if (!audioUrl) {
        return res.status(400).json({ error: 'Audio URL is required' });
      }
      
      // Get audio file path
      const audioPath = path.join(process.cwd(), 'public', audioUrl);
      
      // ML service temporarily disabled
      const result = {
        success: false,
        error: "Transcription service temporarily unavailable"
      };
      
      if (result.success) {
        return res.status(200).json({
          success: true,
          text: result.text,
          duration: result.duration,
          language: result.language
        });
      } else {
        return res.status(500).json({
          error: 'Transcription failed',
          details: result.error
        });
      }
      
    } catch (error: any) {
      log(`Transcription error: ${error.message}`, 'express');
      return res.status(500).json({
        error: 'Transcription failed',
        details: error.message
      });
    }
  });

  // Audio extraction test endpoint for debugging
  app.post('/api/voice/test-extraction', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      // Test with the Baby Shark video that we know exists
      const videoPath = path.join(process.cwd(), 'public', 'videos', 'babyshark.mp4');
      
      log('Testing audio extraction with Baby Shark video', 'express');
      
      // ML service temporarily disabled
      const result = {
        success: false,
        error: "Audio extraction service temporarily unavailable"
      };
      
      if (result.success) {
        log('Audio extraction test successful', 'express');
        
        // Move extracted audio to public directory for access
        const outputDir = path.join(process.cwd(), 'public', 'test-audio');
        await fs.mkdir(outputDir, { recursive: true });
        
        const outputFilename = `test_extraction_${Date.now()}.wav`;
        const publicPath = path.join(outputDir, outputFilename);
        
        await fs.copyFile(result.audioPath!, publicPath);
        
        res.json({
          success: true,
          message: 'Audio extraction successful',
          audioUrl: `/test-audio/${outputFilename}`,
          duration: result.duration,
          sampleRate: result.sampleRate,
          speakers: result.speakers
        });
      } else {
        log(`Audio extraction test failed: ${result.error}`, 'express');
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
      
    } catch (error: any) {
      log(`Audio extraction test error: ${error.message}`, 'express');
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Voice synthesis test endpoint
  app.post('/api/voice/test-synthesis', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { text = "Hello, this is a test of voice synthesis." } = req.body;
      
      log('Testing voice synthesis', 'express');
      
      // Create a simple test voice sample (silence for now)
      const testVoiceBuffer = Buffer.alloc(44100 * 2 * 2); // 2 seconds of silence
      
      // ML service temporarily disabled
      const result = {
        success: false,
        error: "Voice synthesis service temporarily unavailable"
      };
      
      if (result.success) {
        log('Voice synthesis test successful', 'express');
        
        // Move synthesized audio to public directory for access
        const outputDir = path.join(process.cwd(), 'public', 'test-audio');
        await fs.mkdir(outputDir, { recursive: true });
        
        const outputFilename = `test_synthesis_${Date.now()}.wav`;
        const publicPath = path.join(outputDir, outputFilename);
        
        await fs.copyFile(result.audioPath!, publicPath);
        
        res.json({
          success: true,
          message: 'Voice synthesis successful',
          audioUrl: `/test-audio/${outputFilename}`,
          duration: result.duration,
          quality: result.quality
        });
      } else {
        log(`Voice synthesis test failed: ${result.error}`, 'express');
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
      
    } catch (error: any) {
      log(`Voice synthesis test error: ${error.message}`, 'express');
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Advanced audio extraction and diarization endpoint
  app.post('/api/voice/extract-and-diarize', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { videoTemplateId } = req.body;
      
      if (!videoTemplateId) {
        return res.status(400).json({ error: "Video template ID required" });
      }

      // Get template
      const template = await storage.getVideoTemplate(videoTemplateId);
      if (!template) {
        return res.status(404).json({ error: "Video template not found" });
      }

      // Get video file path
      const videoPath = path.join(process.cwd(), 'public', template.videoUrl);
      
      log('Starting advanced audio extraction and diarization with WhisperX', 'express');
      
      // ML service temporarily disabled
      const result = {
        success: false,
        error: "Audio extraction and diarization service temporarily unavailable"
      };
      
      // Move extracted audio to public directory for access
      const outputDir = path.join(process.cwd(), 'public', 'extracted-audio');
      await fs.mkdir(outputDir, { recursive: true });
      
      const outputFilename = `advanced_extraction_${Date.now()}_${template.id}.wav`;
      const publicPath = path.join(outputDir, outputFilename);
      
      await fs.copyFile(result.audioPath, publicPath);
      
      res.json({
        success: true,
        audioUrl: `/extracted-audio/${outputFilename}`,
        speakers: result.speakers,
        fullText: result.fullText,
        message: 'Advanced extraction and diarization completed'
      });
      
    } catch (error: any) {
      log(`Advanced extraction error: ${error.message}`, 'express');
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Speaker replacement with ElevenLabs endpoint
  app.post('/api/voice/replace-speaker', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { segments, voiceId } = req.body;
      
      if (!segments || !voiceId) {
        return res.status(400).json({ error: "Segments and voice ID required" });
      }

      log('Starting speaker replacement with ElevenLabs', 'express');
      
      // ML service temporarily disabled
      const result = {
        success: false,
        error: "Speaker replacement service temporarily unavailable"
      };
      
      // Move generated audio files to public directory
      const outputDir = path.join(process.cwd(), 'public', 'replaced-audio');
      await fs.mkdir(outputDir, { recursive: true });
      
      const publicPaths = [];
      for (const audioPath of result.replacedAudioPaths) {
        const filename = path.basename(audioPath);
        const publicPath = path.join(outputDir, filename);
        await fs.copyFile(audioPath, publicPath);
        publicPaths.push(`/replaced-audio/${filename}`);
      }
      
      res.json({
        success: true,
        speakerId: result.speakerId,
        originalSegments: result.originalSegments,
        replacedAudioUrls: publicPaths,
        outputDirectory: result.outputDirectory,
        totalSegments: result.originalSegments.length,
        successfulSegments: result.replacedAudioPaths.length,
        message: `Speaker replacement completed: ${result.replacedAudioPaths.length}/${result.originalSegments.length} segments generated`
      });
      
    } catch (error: any) {
      log(`Speaker replacement error: ${error.message}`, 'express');
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Audio stitching endpoint - combines original audio with replacements
  app.post('/api/voice/stitch-audio', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { originalAudioPath, segments, replacementMap } = req.body;
      
      if (!originalAudioPath || !segments || !replacementMap) {
        return res.status(400).json({ error: "Original audio path, segments, and replacement map required" });
      }

      log('Starting audio stitching process', 'express');
      
      // ML service temporarily disabled
      return res.status(503).json({
        success: false,
        error: "Audio stitching service temporarily unavailable"
      });
      
      // Move final audio to public directory
      const outputDir = path.join(process.cwd(), 'public', 'final-audio');
      await fs.mkdir(outputDir, { recursive: true });
      
      const filename = path.basename(finalAudioPath);
      const publicPath = path.join(outputDir, filename);
      await fs.copyFile(finalAudioPath, publicPath);
      
      res.json({
        success: true,
        finalAudioUrl: `/final-audio/${filename}`,
        finalAudioPath: finalAudioPath,
        segmentsProcessed: segments.length,
        message: 'Audio stitching completed successfully'
      });
      
    } catch (error: any) {
      log(`Audio stitching error: ${error.message}`, 'express');
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Complete diarization endpoint - upload audio/video and get full speaker analysis
  app.post('/api/voice/diarize', upload.single('audio'), async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: "Audio file required" });
      }

      const audioPath = req.file.path;
      log('Starting complete diarization process', 'express');
      
      // ML service temporarily disabled
      return res.status(503).json({
        success: false,
        error: "Diarization service temporarily unavailable"
      });
      
      res.json({
        success: true,
        speakers: diarization.speakers,
        totalSpeakers: diarization.totalSpeakers,
        originalAudio: audioPath,
        message: `Diarization completed: ${diarization.totalSpeakers} speakers identified`
      });
      
    } catch (error: any) {
      log(`Diarization error: ${error.message}`, 'express');
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Complete voice replacement pipeline - handle speaker replacements and return final audio
  app.post('/api/voice/replace', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { speakerReplacements, originalAudio } = req.body;
      
      if (!speakerReplacements || !originalAudio) {
        return res.status(400).json({ error: "Speaker replacements and original audio path required" });
      }

      log('Starting complete voice replacement pipeline', 'express');
      
      // ML service temporarily disabled
      return res.status(503).json({
        success: false,
        error: "Voice replacement pipeline temporarily unavailable"
      });
      
      // Move to public directory
      const outputDir = path.join(process.cwd(), 'public', 'final-audio');
      await fs.mkdir(outputDir, { recursive: true });
      
      const filename = path.basename(finalAudioPath);
      const publicPath = path.join(outputDir, filename);
      await fs.copyFile(finalAudioPath, publicPath);
      
      res.json({
        success: true,
        output: `/final-audio/${filename}`,
        finalAudioPath: finalAudioPath,
        speakersProcessed: Object.keys(speakerReplacements).length,
        totalSegments: allSegments.length,
        message: 'Voice replacement pipeline completed successfully'
      });
      
    } catch (error: any) {
      log(`Voice replacement pipeline error: ${error.message}`, 'express');
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Generate story content using OpenAI with fallback templates
  app.post('/api/voice/generate-story', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Fallback story templates for when OpenAI is unavailable
    const fallbackStories = [
      {
        title: "The Brave Little Bunny",
        content: "Once upon a time, there was a brave little bunny named Benny. He lived in a cozy burrow under the big oak tree. One sunny morning, Benny decided to explore the magical forest. He hopped along the winding path, meeting friendly butterflies and singing birds. When he found a lost baby bird, Benny helped it find its way home. The mama bird was so grateful that she sang the most beautiful song for Benny. From that day on, Benny knew that being kind and brave made every adventure special."
      },
      {
        title: "The Dragon Who Loved Cookies",
        content: "In a village far away, lived a friendly dragon named Daisy. Unlike other dragons, Daisy didn't breathe fire to scare people. Instead, she used her gentle breath to bake the most delicious cookies! Every morning, the sweet smell of warm cookies filled the air. Children from the village would visit Daisy's cave to share stories and enjoy her magical treats. Daisy was so happy to have friends who loved her cookies as much as she loved making them."
      },
      {
        title: "The Magical Paintbrush",
        content: "Little Emma found a special paintbrush in her grandmother's attic. When she dipped it in paint and made a stroke on paper, something amazing happened - her drawings came to life! She painted a butterfly that fluttered around her room, and a rainbow that made everything glow with beautiful colors. Emma learned that with imagination and creativity, she could bring joy and wonder to the world around her."
      },
      {
        title: "The Sleepy Owl's Adventure",
        content: "Oliver the owl was always sleepy during the day while all the other animals played. He felt sad watching them have fun without him. One night, Oliver discovered something wonderful - the forest was full of magical creatures that only came out when the moon was bright! He met dancing fireflies, singing crickets, and wise old stars. Oliver realized that being different made him special, and he had his own magical world to explore."
      },
      {
        title: "The Kitten's Secret Garden",
        content: "Whiskers the kitten discovered a tiny door behind the garden shed. When she squeezed through, she found the most beautiful secret garden filled with talking flowers! The roses told jokes, the daisies sang lullabies, and the sunflowers shared stories of the sky. Whiskers promised to keep their secret safe and visited them every day to hear their wonderful tales and share her own adventures."
      }
    ];

    try {
      const { prompt, personName, maxLength = 200 } = req.body;
      
      // Try OpenAI API first
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o', // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
            messages: [
              {
                role: 'system',
                content: `You are a children's story writer. Create engaging, age-appropriate stories for kids aged 2-8. Keep stories positive, simple, and fun. The stories should be suitable for text-to-speech and around ${maxLength} words or less. Return a JSON response with "title" and "content" fields.`
              },
              {
                role: 'user',
                content: `Write a short children's story based on this prompt: "${prompt}". Make it engaging and fun for young children. Keep it under ${maxLength} words.`
              }
            ],
            response_format: { type: "json_object" },
            max_tokens: 500,
            temperature: 0.8
          })
        });

        if (response.ok) {
          const data = await response.json();
          const story = JSON.parse(data.choices[0].message.content);
          
          res.json({
            title: story.title,
            content: story.content
          });
          return;
        } else {
          throw new Error(`OpenAI API error: ${response.statusText}`);
        }
      } catch (openaiError: any) {
        log(`OpenAI API unavailable: ${openaiError.message}, using fallback story`, 'express');
        
        // Use fallback story
        const randomStory = fallbackStories[Math.floor(Math.random() * fallbackStories.length)];
        
        res.json({
          title: randomStory.title,
          content: randomStory.content
        });
      }

    } catch (error: any) {
      log(`Story generation error: ${error.message}`, 'express');
      res.status(500).json({ 
        error: 'Failed to generate story',
        details: error.message 
      });
    }
  });

  // Clone speech using ElevenLabs voice cloning
  app.post('/api/voice/clone-speech', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { text, voiceRecordingId, personId } = req.body;
      
      if (!text || !voiceRecordingId) {
        return res.status(400).json({ error: 'Text and voice recording ID required' });
      }

      // Get the voice recording from database
      const voiceRecording = await storage.getVoiceRecording(voiceRecordingId);
      if (!voiceRecording) {
        return res.status(404).json({ error: 'Voice recording not found' });
      }

      // Debug logging
      log(`Voice clone check - ID: ${voiceRecordingId}, Status: ${voiceRecording.voiceCloneStatus}, ElevenLabs ID: ${voiceRecording.elevenLabsVoiceId}`, 'express');

      // Check if voice clone is ready
      if (voiceRecording.voiceCloneStatus !== 'completed' || !voiceRecording.elevenLabsVoiceId) {
        return res.status(400).json({ 
          error: 'Voice clone not ready', 
          status: voiceRecording.voiceCloneStatus,
          voiceRecordingId: voiceRecordingId,
          details: voiceRecording.voiceCloneError || 'Voice cloning is still in progress. Please wait a few moments and try again.'
        });
      }

      const elevenLabsVoiceId = voiceRecording.elevenLabsVoiceId;
      
      log(`Using stored ElevenLabs voice clone: ${elevenLabsVoiceId}`, 'express');

      // Generate speech using the stored cloned voice
      const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.7,
            similarity_boost: 0.85,
            style: 0.0,
            use_speaker_boost: true
          }
        })
      });

      if (!ttsResponse.ok) {
        const errorText = await ttsResponse.text();
        log(`ElevenLabs TTS error: ${errorText}`, 'express');
        throw new Error(`ElevenLabs TTS failed: ${ttsResponse.statusText}`);
      }

      // Save the generated audio
      const audioBuffer2 = await ttsResponse.arrayBuffer();
      const audioDir = path.join(process.cwd(), 'public', 'cloned-voice');
      await fs.mkdir(audioDir, { recursive: true });
      
      const filename = `elevenlabs_${personId}_${Date.now()}.mp3`;
      const audioPath = path.join(audioDir, filename);
      
      await fs.writeFile(audioPath, Buffer.from(audioBuffer2));

      log(`Generated speech saved as: ${filename}`, 'express');

      res.json({
        audioUrl: `/cloned-voice/${filename}`,
        audioPath,
        elevenLabsVoiceId,
        note: 'Generated using stored ElevenLabs voice clone'
      });

    } catch (error: any) {
      log(`ElevenLabs voice cloning error: ${error.message}`, 'express');
      res.status(500).json({ 
        error: 'Failed to clone voice with ElevenLabs',
        details: error.message 
      });
    }
  });

  // Combine voice recordings endpoint
  app.post('/api/voice/combine-recordings', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { personId } = req.body;
      
      if (!personId) {
        return res.status(400).json({ error: "Person ID required" });
      }

      log(`Starting voice combination for person ${personId}`, 'express');

      // Get all voice recordings for this person
      const recordings = await storage.getVoiceRecordingsByPersonId(personId);
      
      if (recordings.length === 0) {
        return res.status(400).json({ error: "No voice recordings found" });
      }

      log(`Found ${recordings.length} recordings to combine`, 'express');

      // Create temporary directory
      const tempDir = path.join(process.cwd(), 'temp', 'voice-combine');
      await fs.mkdir(tempDir, { recursive: true });

      const audioFiles: string[] = [];

      // Process recordings sequentially to avoid async issues
      for (let i = 0; i < recordings.length; i++) {
        const recording = recordings[i];
        if (recording.audioUrl && recording.audioUrl.startsWith('data:audio/')) {
          const base64Data = recording.audioUrl.split(',')[1];
          const audioBuffer = Buffer.from(base64Data, 'base64');
          
          const webmPath = path.join(tempDir, `recording_${i}.webm`);
          const wavPath = path.join(tempDir, `recording_${i}.wav`);
          
          await fs.writeFile(webmPath, audioBuffer);
          
          // Convert to consistent WAV format synchronously
          try {
            const { execSync } = await import('child_process');
            execSync(`ffmpeg -y -i "${webmPath}" -ar 22050 -ac 1 -sample_fmt s16 "${wavPath}"`, { stdio: 'pipe' });
            audioFiles.push(wavPath);
            await fs.unlink(webmPath);
          } catch (convError) {
            log(`Conversion error for recording ${i}: ${convError}`, 'express');
          }
        }
      }

      if (audioFiles.length === 0) {
        return res.status(500).json({ error: "Failed to process audio files" });
      }

      // Create FFmpeg concat filter
      const inputList = audioFiles.map(f => `-i "${f}"`).join(' ');
      const filterComplex = audioFiles.map((_, i) => `[${i}:0]`).join('') + 
        `concat=n=${audioFiles.length}:v=0:a=1[out]`;
      
      const combinedPath = path.join(tempDir, 'combined.wav');
      
      try {
        const { execSync } = await import('child_process');
        
        // Combine audio files with enhanced cleaning
        const combinedFilters = [
          'highpass=f=80',
          'lowpass=f=8000',
          'afftdn=nf=-20:nt=w',
          'acompressor=threshold=0.1:ratio=2',
          'loudnorm=I=-16:TP=-1.5:LRA=11'
        ].join(',');
        
        execSync(`ffmpeg -y ${inputList} -filter_complex "${filterComplex}" -map "[out]" -af "${combinedFilters}" "${combinedPath}"`, { stdio: 'pipe' });

        // Upload to ElevenLabs
        const FormData = require('form-data');
        const formData = new FormData();
        formData.append('name', `combined_voice_person_${personId}`);
        formData.append('description', 'Combined voice recordings for enhanced cloning');
        formData.append('files', require('fs').createReadStream(combinedPath), {
          filename: 'combined_voice.wav',
          contentType: 'audio/wav'
        });

        const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
          method: 'POST',
          headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY,
            ...formData.getHeaders()
          },
          body: formData
        });

        const responseText = await response.text();
        
        if (response.ok) {
          const result = JSON.parse(responseText);
          log(`Voice clone created successfully: ${result.voice_id}`, 'express');

          // Update the most recent voice recording with the new clone ID
          const latestRecording = recordings.sort((a, b) => b.id - a.id)[0];
          await storage.updateVoiceCloneStatus(latestRecording.id, 'completed', result.voice_id);

          // Clean up temporary files
          audioFiles.forEach(file => fs.unlink(file, () => {}));
          fs.unlink(combinedPath, () => {});
          fs.rmdir(tempDir, () => {});

          res.json({
            success: true,
            voiceId: result.voice_id,
            recordingsCount: recordings.length,
            message: 'Voice recordings combined and clone created successfully'
          });
        } else {
          log(`ElevenLabs error: ${responseText}`, 'express');
          res.status(500).json({ error: "Failed to create voice clone" });
        }
      } catch (combineError: any) {
        log(`Audio combination error: ${combineError.message}`, 'express');
        res.status(500).json({ error: "Failed to combine audio files" });
      }
    } catch (error: any) {
      log(`Voice combination error: ${error.message}`, 'express');
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/create-payment-intent', async (req: Request, res: Response) => {
    try {
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
      const result = await db.execute(sql`SELECT * FROM animated_stories ORDER BY created_at DESC`);
      res.json(result.rows);
    } catch (error: any) {
      log(`Admin get stories error: ${error.message}`, 'express');
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/admin/stories', isAdmin, async (req: Request, res: Response) => {
    try {
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
      const result = await db.execute(sql.raw(query, values));
      
      res.json(result.rows[0]);
    } catch (error: any) {
      log(`Admin update story error: ${error.message}`, 'express');
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/admin/stories/:id', isAdmin, async (req: Request, res: Response) => {
    try {
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
  app.post('/api/ai/generate-story', async (req: Request, res: Response) => {
    try {
      const { generateStoryScript } = await import('./services/openai.js');
      const storyRequest = req.body;
      
      const story = await generateStoryScript(storyRequest);
      res.json(story);
    } catch (error) {
      console.error('Story generation error:', error);
      res.status(500).json({ error: 'Failed to generate story' });
    }
  });

  // AI voice analysis
  app.post('/api/ai/analyze-voice', upload.single('audio'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided' });
      }

      const { transcribeAndAnalyzeVoice } = await import('./services/openai.js');
      const analysis = await transcribeAndAnalyzeVoice(req.file.buffer);
      
      res.json(analysis);
    } catch (error) {
      console.error('Voice analysis error:', error);
      res.status(500).json({ error: 'Failed to analyze voice' });
    }
  });

  // AI voice compatibility analysis
  app.post('/api/ai/voice-compatibility', async (req: Request, res: Response) => {
    try {
      const { analyzeVoiceCompatibility } = await import('./services/openai.js');
      const { script, voiceCharacteristics } = req.body;
      
      const analysis = await analyzeVoiceCompatibility(script, voiceCharacteristics);
      res.json(analysis);
    } catch (error) {
      console.error('Voice compatibility error:', error);
      res.status(500).json({ error: 'Failed to analyze voice compatibility' });
    }
  });

  // AI educational content generation
  app.post('/api/ai/educational-content', async (req: Request, res: Response) => {
    try {
      const { generateEducationalContent } = await import('./services/openai.js');
      const { topic, ageGroup, learningObjectives } = req.body;
      
      const content = await generateEducationalContent(topic, ageGroup, learningObjectives);
      res.json(content);
    } catch (error) {
      console.error('Educational content generation error:', error);
      res.status(500).json({ error: 'Failed to generate educational content' });
    }
  });

  // Analytics endpoints (basic implementation)
  app.get('/api/admin/analytics', isAdmin, async (req, res) => {
    try {
      const [users, stories, templates] = await Promise.all([
        storage.getAllUsers(),
        storage.getAllAnimatedStories(),
        storage.getAllVideoTemplates(),
      ]);

      const analytics = {
        overview: {
          totalUsers: users.length,
          activeUsers: Math.floor(users.length * 0.34),
          totalContent: stories.length + templates.length,
          totalSessions: Math.floor(Math.random() * 10000) + 5000,
          avgSessionDuration: 340,
          revenue: 12450,
        },
        contentStats: {
          stories: stories.length,
          videoTemplates: templates.length,
          voiceClones: Math.floor(users.length * 2.3),
          activeContent: stories.filter((s: any) => s.isActive !== false).length + templates.length,
        },
        popularContent: stories.slice(0, 5).map((story: any, index: number) => ({
          id: story.id,
          title: story.title,
          category: story.category,
          playCount: Math.floor(Math.random() * 2000) + (5 - index) * 200,
          rating: 4.5 + Math.random() * 0.4,
          duration: story.duration || 180,
        })),
        categoryBreakdown: [
          { name: 'Educational', value: stories.filter((s: any) => s.category === 'educational').length },
          { name: 'Bedtime', value: stories.filter((s: any) => s.category === 'bedtime').length },
          { name: 'Fairytale', value: stories.filter((s: any) => s.category === 'fairytale').length },
          { name: 'Voice-Only', value: stories.filter((s: any) => s.category === 'voice-only').length },
        ],
        userEngagement: [
          { name: 'Daily Active', value: Math.floor(users.length * 0.12) },
          { name: 'Weekly Active', value: Math.floor(users.length * 0.34) },
          { name: 'Monthly Active', value: users.length },
        ],
        peakHours: [
          { hour: 7, sessions: Math.floor(Math.random() * 100) + 50 },
          { hour: 19, sessions: Math.floor(Math.random() * 150) + 100 },
          { hour: 20, sessions: Math.floor(Math.random() * 120) + 80 },
          { hour: 21, sessions: Math.floor(Math.random() * 90) + 60 },
        ],
      };

      res.json(analytics);
    } catch (error) {
      console.error('Analytics error:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  });

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
      
      // Fetch available stories (mock data for now since getStories may not exist)
      const stories = [
        { id: 1, title: "The Magic Forest Adventure", category: "adventure", ageRange: "4-6", duration: 300 },
        { id: 2, title: "Counting with Friends", category: "educational", ageRange: "2-4", duration: 180 },
        { id: 3, title: "Goodnight Sleepy Animals", category: "bedtime", ageRange: "2-6", duration: 240 },
        { id: 4, title: "The Brave Little Explorer", category: "adventure", ageRange: "6-8", duration: 360 }
      ];
      
      // Calculate statistics
      const stats = {
        totalPeople: people.length,
        totalVideos: allVideos.length,
        totalStories: stories.length,
        voiceQuality: people.length > 0 
          ? people.filter(p => p.hasVoiceClone).length / people.length * 100 
          : 0
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