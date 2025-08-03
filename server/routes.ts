import express, { type Express, Request, Response, NextFunction } from "express";

export async function registerRoutes(app: Express, io?: any): Promise<void> {
  console.log('registerRoutes: Starting...');
  
  // Simple test route to verify server is working
  app.get('/api/test-server', (req: Request, res: Response) => {
    res.json({
      status: 'Server is working!',
      timestamp: new Date().toISOString(),
      message: 'Minimal routes loaded successfully'
    });
  });

  // Simple health check endpoint
  app.get('/api/health-check', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      message: 'Server is running with minimal routes'
    });
  });

  console.log('registerRoutes: Completed successfully');
}