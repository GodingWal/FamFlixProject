#!/usr/bin/env node

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pkg from 'pg';
const { Pool } = pkg;

console.log('🔍 Testing Login API Directly');
console.log('=============================');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

async function testLoginDirectly() {
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    console.log('✅ Database connection successful!');
    
    // Test user credentials
    const username = 'testuser';
    const password = 'test123';
    
    console.log(`\n🔐 Testing login for user: ${username}`);
    
    // Get user from database
    const userResult = await client.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ User not found in database');
      client.release();
      await pool.end();
      return;
    }
    
    const user = userResult.rows[0];
    console.log('✅ User found in database');
    console.log(`  - ID: ${user.id}`);
    console.log(`  - Username: ${user.username}`);
    console.log(`  - Email: ${user.email}`);
    console.log(`  - Role: ${user.role}`);
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (isPasswordValid) {
      console.log('✅ Password is valid!');
      console.log('\n🎉 Login would be successful!');
      console.log('User data that would be returned:');
      const { password: _, ...safeUser } = user;
      console.log(JSON.stringify(safeUser, null, 2));
    } else {
      console.log('❌ Password is invalid');
    }
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error testing login:', error.message);
    process.exit(1);
  }
}

testLoginDirectly(); 