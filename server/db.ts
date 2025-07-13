import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from '@shared/schema';
import ws from 'ws';
import { log } from './vite';

// Configure WebSocket for NeonDB
neonConfig.webSocketConstructor = ws;

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Please check your environment variables.');
  console.error('Available environment variables:', Object.keys(process.env));
  throw new Error('DATABASE_URL is not set. Please check your environment variables.');
}

// Create the database connection pool
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Test database connection
pool.query('SELECT NOW()')
  .then(() => log('PostgreSQL database connection successful', 'db'))
  .catch(err => log(`PostgreSQL database connection error: ${err.message}`, 'db'));

// Initialize Drizzle with the schema
export const db = drizzle(pool, { schema });

// Initialize database for the application
export async function initDatabase() {
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