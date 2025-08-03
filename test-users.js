#!/usr/bin/env node

import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

console.log('🔍 Testing User Database Functionality');
console.log('======================================');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

async function testUsers() {
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    console.log('✅ Database connection successful!');
    
    // Check if users table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ Users table does not exist!');
      client.release();
      await pool.end();
      return;
    }
    
    console.log('✅ Users table exists');
    
    // Get table structure
    const tableStructure = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Users table structure:');
    tableStructure.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Get user count
    const userCount = await client.query('SELECT COUNT(*) as count FROM users');
    console.log(`\n📊 Total users in database: ${userCount.rows[0].count}`);
    
    if (userCount.rows[0].count > 0) {
      // Get sample users (without passwords) - using correct column names
      const users = await client.query(`
        SELECT id, username, email, role, created_at
        FROM users 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      
      console.log('\n👥 Sample users:');
      users.rows.forEach(user => {
        console.log(`  - ID: ${user.id}, Username: ${user.username}, Email: ${user.email}, Role: ${user.role}`);
      });
      
      // Check if there are any admin users
      const adminUsers = await client.query("SELECT COUNT(*) as count FROM users WHERE role = 'admin'");
      console.log(`👑 Admin users: ${adminUsers.rows[0].count}`);
    } else {
      console.log('\n⚠️  No users found in database');
      console.log('💡 You may need to create a user or run database initialization');
    }
    
    client.release();
    await pool.end();
    
    console.log('\n✅ User database test completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ User database test failed:', error.message);
    process.exit(1);
  }
}

testUsers(); 