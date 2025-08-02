import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

console.log('🗄️ Manual Database Initialization');
console.log('==================================');

// Set environment variable to ignore SSL certificate issues
// Using per-connection SSL configuration instead of global bypass

async function initDatabase() {
  try {
    console.log('📋 Connecting to database...');
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });

    const client = await pool.connect();
    console.log('✅ Connected to database');

    // Create tables based on the schema
    console.log('📋 Creating database tables...');
    
    const tables = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        role TEXT DEFAULT 'user' NOT NULL,
        subscription_status TEXT DEFAULT 'free' NOT NULL,
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      
      // Password reset tokens table
      `CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      
      // People profiles table
      `CREATE TABLE IF NOT EXISTS people (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        name TEXT NOT NULL,
        relationship TEXT,
        avatar_url TEXT,
        elevenlabs_voice_id TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      
      // Face images table
      `CREATE TABLE IF NOT EXISTS face_images (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        person_id INTEGER REFERENCES people(id) ON DELETE CASCADE NOT NULL,
        image_url TEXT NOT NULL,
        image_data TEXT NOT NULL,
        name TEXT NOT NULL,
        is_default BOOLEAN DEFAULT FALSE,
        ml_processed BOOLEAN DEFAULT FALSE,
        face_embedding JSONB,
        source_video_id INTEGER,
        expression_type TEXT DEFAULT 'neutral',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      
      // Face videos table
      `CREATE TABLE IF NOT EXISTS face_videos (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        person_id INTEGER REFERENCES people(id) ON DELETE CASCADE NOT NULL,
        video_url TEXT NOT NULL,
        video_data TEXT,
        name TEXT NOT NULL,
        duration INTEGER,
        expression_type TEXT DEFAULT 'neutral',
        extracted_faces_count INTEGER DEFAULT 0,
        is_processed BOOLEAN DEFAULT FALSE,
        processing_status TEXT DEFAULT 'pending',
        error_message TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      
      // Voice recordings table
      `CREATE TABLE IF NOT EXISTS voice_recordings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        person_id INTEGER REFERENCES people(id) ON DELETE CASCADE NOT NULL,
        audio_url TEXT NOT NULL,
        audio_data TEXT,
        name TEXT NOT NULL,
        duration INTEGER,
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      
      // Video templates table
      `CREATE TABLE IF NOT EXISTS video_templates (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        thumbnail_url TEXT NOT NULL,
        video_url TEXT NOT NULL,
        duration INTEGER NOT NULL,
        category TEXT NOT NULL,
        age_range TEXT NOT NULL,
        featured BOOLEAN DEFAULT FALSE,
        is_premium BOOLEAN DEFAULT FALSE
      )`,
      
      // Processed videos table
      `CREATE TABLE IF NOT EXISTS processed_videos (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        template_id INTEGER REFERENCES video_templates(id),
        title TEXT NOT NULL,
        description TEXT,
        video_url TEXT NOT NULL,
        thumbnail_url TEXT,
        duration INTEGER,
        status TEXT DEFAULT 'processing' NOT NULL,
        processing_progress INTEGER DEFAULT 0,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      
      // Processed video people table
      `CREATE TABLE IF NOT EXISTS processed_video_people (
        id SERIAL PRIMARY KEY,
        processed_video_id INTEGER REFERENCES processed_videos(id) ON DELETE CASCADE NOT NULL,
        person_id INTEGER REFERENCES people(id) ON DELETE CASCADE NOT NULL,
        face_image_id INTEGER REFERENCES face_images(id),
        voice_recording_id INTEGER REFERENCES voice_recordings(id),
        replacement_type TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`
    ];

    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      const tableName = table.match(/CREATE TABLE IF NOT EXISTS (\w+)/)[1];
      console.log(`Creating table: ${tableName}`);
      await client.query(table);
    }

    console.log('✅ All tables created successfully!');
    
    // Verify tables were created
    const { rows } = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log('\n📊 Created tables:');
    rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    client.release();
    await pool.end();
    
    console.log('\n🎉 Database initialization completed successfully!');
    console.log('The FamFlix application is now ready to run!');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    process.exit(1);
  }
}

initDatabase(); 