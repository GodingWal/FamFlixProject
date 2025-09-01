import express, { type Express, Request, Response, NextFunction } from "express";
import { log } from "./vite";
import { setupAuth } from "./auth";
import encryptionRouter from "./routes/encryption";
import appRouter from "./routes/app";
import { createProxyMiddleware } from 'http-proxy-middleware';
import faceCaptureRouter from "./routes/faceCapture";

export async function registerRoutes(app: Express, io?: any): Promise<void> {
  log('registerRoutes: Starting...', 'routes');
  
  // Note: Authentication routes are already set up in index.ts
  // setupAuth(app) is called there, so we don't need to call it here
  
  // Simple test route to verify server is working
  app.get('/api/test-server', (req: Request, res: Response) => {
    res.json({
      status: 'Server is working!',
      timestamp: new Date().toISOString(),
      message: 'Full application routes loaded successfully'
    });
  });

  // Simple health check endpoint
  app.get('/api/health-check', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      message: 'Server is running with full application routes'
    });
  });

  // User profile endpoint
  app.get('/api/profile', (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    res.json({
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        displayName: req.user.displayName,
        role: req.user.role
      }
    });
  });

  // Protected route example
  app.get('/api/protected/test', (req: Request, res: Response) => {
    res.json({
      message: 'This is a protected route',
      user: req.user ? {
        id: req.user.id,
        username: req.user.username,
        role: req.user.role
      } : null
    });
  });

  // Mount encryption router
  app.use('/api/encryption', encryptionRouter);
  // Mount application API router used by client
  app.use('/api', appRouter);
  // Face capture pipeline
  app.use('/api', faceCaptureRouter);

  // VoiceAgents proxy (if running)
  const voiceAgentsUrl = process.env.VOICE_AGENTS_URL || 'http://127.0.0.1:8001';
  app.use('/api/tts', createProxyMiddleware({ target: voiceAgentsUrl, changeOrigin: true }));
  app.use('/api/voices', createProxyMiddleware({ target: voiceAgentsUrl, changeOrigin: true }));
  app.use('/api/agents', createProxyMiddleware({ target: voiceAgentsUrl, changeOrigin: true }));
  app.use('/api/jobs', createProxyMiddleware({ target: voiceAgentsUrl, changeOrigin: true }));
  
  // Back-compat aliases for voice routes mounted by appRouter
  // Only enable proxying these in production or when explicitly requested.
  // In development we want our local Express handlers in appRouter to run so we can persist to DB and use fallbacks.
  if (process.env.NODE_ENV === 'production' || process.env.PROXY_VOICE_ROUTES === 'true') {
    app.use('/api/voice/voices', createProxyMiddleware({ target: voiceAgentsUrl, changeOrigin: true }));
    app.use('/api/voice/clone/start', createProxyMiddleware({ target: voiceAgentsUrl, changeOrigin: true }));
    app.use('/api/voice/jobs', createProxyMiddleware({ target: voiceAgentsUrl, changeOrigin: true }));
  }
  
  // Final handler for unknown API routes
  app.all('/api/*', (req: Request, res: Response) => {
    res.status(404).json({ 
      error: 'API endpoint not found',
      path: req.path,
      method: req.method,
      message: 'The requested API endpoint does not exist'
    });
  });

  log('registerRoutes: Completed successfully', 'routes');
}