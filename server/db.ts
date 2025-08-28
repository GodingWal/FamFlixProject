import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@shared/schema';
import { log } from './vite';

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL is not set. Running in development mode without database connection.');
  console.warn('To enable database features, set the DATABASE_URL environment variable.');
}

// Create the database connection pool only if DATABASE_URL is available
function resolveSsl() {
  const url = process.env.DATABASE_URL || '';
  const force = String(process.env.DATABASE_SSL || '').toLowerCase();
  if (force === 'true' || force === '1' || url.includes('sslmode=require')) {
    return { rejectUnauthorized: false } as any;
  }
  try {
    const u = new URL(url);
    const host = (u.hostname || '').toLowerCase();
    // Do NOT use SSL for localhost / 127.0.0.1 unless forced
    if (host === 'localhost' || host === '127.0.0.1') {
      return false as any;
    }
    // In production connecting to remote hosts, enable SSL by default
    if (process.env.NODE_ENV === 'production') {
      return { rejectUnauthorized: false } as any;
    }
  } catch {}
  return false as any;
}

export const pool = process.env.DATABASE_URL 
  ? new Pool({ 
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: resolveSsl()
    })
  : null;

// Test database connection if pool exists
if (pool) {
  pool.query('SELECT NOW()')
    .then(() => {
      log('PostgreSQL database connection successful', 'db');
      log('🔍 DEBUG: Database connection test completed', 'db');
    })
    .catch(err => {
      log(`PostgreSQL database connection error: ${err.message}`, 'db');
      log('🔍 DEBUG: Database connection test failed', 'db');
    });
} else {
  log('Database connection not available - running in development mode', 'db');
  log('🔍 DEBUG: No database pool available', 'db');
}

// Initialize Drizzle with the schema (only if pool exists)
export const db = pool ? drizzle(pool, { schema }) : null;

// Initialize database for the application
export async function initDatabase() {
  if (!db) {
    log('Database not available - skipping initialization', 'db');
    return true;
  }
  
  log('Initializing database tables...', 'db');
  
  try {
    // With Drizzle ORM, tables can be managed via migrations or the db:push command
    // In the drizzle.config.ts file, the configuration for this is set up
    
    log('Database tables initialized successfully', 'db');
    return true;
  } catch (dbError) {
    log(`Error initializing database: ${(dbError as Error).message}`, 'db');
    return false;
  }
}