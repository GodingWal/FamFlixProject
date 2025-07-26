import { type Request, Response } from "express";
import { db } from "./db";
import { checkCacheHealth } from "./encryption";

/**
 * Simple health check endpoint that returns basic server status
 */
export const simpleHealthCheck = async (req: Request, res: Response) => {
  try {
    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      server: "famflix",
      version: "1.0.0"
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: "Health check failed"
    });
  }
};

/**
 * Detailed health check that includes database and cache status
 */
export const detailedHealthCheck = async (req: Request, res: Response) => {
  const healthStatus = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    server: "famflix",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    services: {
      database: "unknown",
      cache: "unknown"
    }
  };

  let isHealthy = true;

  try {
    // Check database connectivity
    try {
      if (db) {
        await db.execute("SELECT 1");
        healthStatus.services.database = "healthy";
      } else {
        healthStatus.services.database = "unavailable";
        // Database being unavailable is not critical in development mode
      }
    } catch (dbError) {
      console.error("Database health check failed:", dbError);
      healthStatus.services.database = "unhealthy";
      isHealthy = false;
    }

    // Check cache/Redis connectivity
    try {
      const cacheHealth = await checkCacheHealth();
      if (cacheHealth.redis) {
        healthStatus.services.cache = `healthy (${cacheHealth.latency}ms)`;
      } else {
        healthStatus.services.cache = "unavailable";
        // Cache being unavailable is not critical, so don't mark as unhealthy
      }
    } catch (cacheError) {
      console.error("Cache health check failed:", cacheError);
      healthStatus.services.cache = "error";
      // Cache errors are not critical for core functionality
    }

    healthStatus.status = isHealthy ? "healthy" : "degraded";
    const statusCode = isHealthy ? 200 : 503;

    res.status(statusCode).json(healthStatus);
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: "Health check failed",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
};