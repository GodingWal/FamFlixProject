#!/usr/bin/env node

import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

console.log('🔍 FamFlix Database Diagnostic Tool');
console.log('=====================================');

// Check environment
console.log('\n📋 Step 1: Environment Check');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : '❌ NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('DATABASE_SSL:', process.env.DATABASE_SSL || 'false');

// Test database connection
async function testConnection() {
  console.log('\n📋 Step 2: Database Connection Test');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set in .env file');
    console.log('\n🔧 Solution: Create .env file with:');
    console.log('DATABASE_URL=postgresql://famflix_user:famflix_password@localhost:5432/famflix_db');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    console.log('✅ Database connection successful!');

    // Test basic query
    const result = await client.query('SELECT NOW() as current_time');
    console.log('Current time:', result.rows[0].current_time);

    // Check if tables exist
    console.log('\n📋 Step 3: Checking Database Tables');
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    if (tablesResult.rows.length === 0) {
      console.log('❌ No tables found in database');
      console.log('\n🔧 Solution: Run database schema setup:');
      console.log('npm run db:push');
    } else {
      console.log('✅ Found tables:', tablesResult.rows.length);
      tablesResult.rows.forEach(row => {
        console.log(`  - ${row.table_name}`);
      });
    }

    // Test people table specifically
    console.log('\n📋 Step 4: Testing People Table');
    try {
      const peopleCount = await client.query('SELECT COUNT(*) as count FROM people');
      console.log('✅ People table exists with', peopleCount.rows[0].count, 'records');

      // Try inserting a test person
      console.log('\n📋 Step 5: Testing Person Creation');
      const testPerson = await client.query(`
        INSERT INTO people (user_id, name, relationship, created_at)
        VALUES (1, 'Test Person - Diagnostic', 'test', NOW())
        RETURNING id, name, relationship
      `);
      console.log('✅ Successfully created test person:', testPerson.rows[0]);

      // Clean up test person
      await client.query('DELETE FROM people WHERE name = $1', ['Test Person - Diagnostic']);
      console.log('✅ Test person cleaned up');

    } catch (tableError) {
      console.error('❌ People table issue:', tableError.message);
      console.log('\n🔧 Solution: Run database schema setup:');
      console.log('npm run db:push');
    }

    client.release();
    await pool.end();

    console.log('\n🎉 Database diagnostic completed successfully!');
    console.log('Your database is working correctly.');

  } catch (error) {
    console.error('❌ Database connection failed:', error.message);

    // Provide specific solutions based on error type
    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      console.log('\n🔧 Solution: PostgreSQL is not running or not accessible');
      console.log('1. Start PostgreSQL: sudo systemctl start postgresql');
      console.log('2. Check status: sudo systemctl status postgresql');
    } else if (error.message.includes('password authentication failed')) {
      console.log('\n🔧 Solution: Database credentials are incorrect');
      console.log('1. Check .env file DATABASE_URL');
      console.log('2. Verify PostgreSQL user exists: sudo -u postgres psql -c "\\du"');
    } else if (error.message.includes('does not exist')) {
      console.log('\n🔧 Solution: Database does not exist');
      console.log('1. Create database: sudo -u postgres createdb famflix_db');
      console.log('2. Grant permissions: sudo -u postgres psql -c "GRANT ALL ON DATABASE famflix_db TO famflix_user;"');
    }

    process.exit(1);
  }
}

testConnection();
