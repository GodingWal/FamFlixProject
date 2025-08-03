import pkg from 'pg';
const { Pool } = pkg;
import type { Pool as PoolType } from 'pg';

// Database configuration with connection pooling
export function createDatabasePool() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  // Production-optimized pool configuration
  const config = {
    connectionString: databaseUrl,
    max: parseInt(process.env.DB_POOL_MAX || '10'), // Maximum pool size
    min: parseInt(process.env.DB_POOL_MIN || '2'),  // Minimum pool size
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
    
    // SSL configuration for production
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false // For managed databases like RDS
    } : false,
  };

  const pool = new Pool(config);

  // Handle pool errors
  pool.on('error', (err) => {
    console.error('Unexpected error on idle database client', err);
  });

  // Log pool events in development
  if (process.env.NODE_ENV === 'development') {
    pool.on('connect', () => {
      console.log('[db] Client connected to database');
    });

    pool.on('remove', () => {
      console.log('[db] Client removed from database pool');
    });
  }

  return pool;
}

// Database health check
export async function checkDatabaseHealth(pool: PoolType) {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as version');
    client.release();
    
    return {
      status: 'healthy',
      timestamp: result.rows[0].current_time,
      version: result.rows[0].version,
      totalConnections: pool.totalCount,
      idleConnections: pool.idleCount,
      waitingCount: pool.waitingCount,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      totalConnections: pool.totalCount,
      idleConnections: pool.idleCount,
      waitingCount: pool.waitingCount,
    };
  }
}

// Graceful shutdown
export async function closeDatabasePool(pool: PoolType) {
  try {
    await pool.end();
    console.log('[db] Database pool closed gracefully');
  } catch (error) {
    console.error('[db] Error closing database pool:', error);
  }
}