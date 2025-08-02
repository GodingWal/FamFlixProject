import 'dotenv/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import pg from 'pg';

const { Pool } = pg;
const execAsync = promisify(exec);

console.log('🗄️ Database Initialization Script');
console.log('==================================');

async function initDatabase() {
  try {
    console.log('\n📋 Step 1: Check environment variables');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : '❌ Not set');
    console.log('NODE_ENV:', process.env.NODE_ENV || 'development');

    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL not set - cannot initialize database');
      process.exit(1);
    }

    console.log('\n📋 Step 2: Test database connection');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });

    try {
      const client = await pool.connect();
      console.log('✅ Database connection successful');
      
      // Check if tables exist
      const { rows: tables } = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      `);
      
      console.log('📊 Existing tables:', tables.map(t => t.table_name));
      client.release();
      await pool.end();
      
      if (tables.length > 0) {
        console.log('✅ Database tables already exist');
        return true;
      }
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      await pool.end();
      return false;
    }

    console.log('\n📋 Step 3: Initialize database schema with Drizzle');
    console.log('Running: npm run db:push');
    
    try {
      const { stdout, stderr } = await execAsync('npm run db:push');
      console.log('✅ Database schema initialized successfully');
      console.log('Output:', stdout);
      if (stderr) console.log('Warnings:', stderr);
      
      console.log('\n📋 Step 4: Verify tables were created');
      const pool2 = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false
        }
      });
      
      const client2 = await pool2.connect();
      const { rows: newTables } = await client2.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);
      
      console.log('📊 Created tables:');
      newTables.forEach(table => {
        console.log(`  - ${table.table_name}`);
      });
      
      client2.release();
      await pool2.end();
      
      console.log('\n🎉 Database initialization completed successfully!');
      return true;
      
    } catch (error) {
      console.error('❌ Database schema initialization failed:', error.message);
      return false;
    }

  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    return false;
  }
}

// Run the initialization
initDatabase().then(success => {
  if (success) {
    console.log('\n✅ Database is ready for the application!');
    process.exit(0);
  } else {
    console.log('\n❌ Database initialization failed');
    process.exit(1);
  }
}); 