#!/usr/bin/env node

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pkg from 'pg';
const { Pool } = pkg;

console.log('🔧 Creating Test User');
console.log('=====================');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

async function createTestUser() {
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    console.log('✅ Database connection successful!');
    
    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id, username FROM users WHERE username = $1',
      ['testuser']
    );
    
    if (existingUser.rows.length > 0) {
      console.log('⚠️  User "testuser" already exists with ID:', existingUser.rows[0].id);
      client.release();
      await pool.end();
      return;
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash('test123', 10);
    console.log('🔐 Password hashed successfully');
    
    // Create user
    const result = await client.query(`
      INSERT INTO users (username, password, email, display_name, role, subscription_status) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING id, username, email, role
    `, ['testuser', hashedPassword, 'test@example.com', 'Test User', 'user', 'free']);
    
    console.log('✅ Test user created successfully!');
    console.log('User details:', result.rows[0]);
    
    client.release();
    await pool.end();
    
    console.log('\n📝 Login credentials:');
    console.log('Username: testuser');
    console.log('Password: test123');
    console.log('Email: test@example.com');
    
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
    process.exit(1);
  }
}

createTestUser(); 