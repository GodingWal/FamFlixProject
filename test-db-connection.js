import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

console.log('🔍 Testing Database Connection');
console.log('=============================');

async function testConnection() {
  try {
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL not set');
      return;
    }

    console.log('\n📋 Creating connection pool...');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: false
    });

    console.log('📋 Testing connection...');
    const client = await pool.connect();
    console.log('✅ Connection successful!');
    
    console.log('📋 Testing query...');
    const result = await client.query('SELECT NOW() as current_time, version() as version');
    console.log('✅ Query successful!');
    console.log('Current time:', result.rows[0].current_time);
    console.log('PostgreSQL version:', result.rows[0].version.split(' ')[0]);
    
    client.release();
    await pool.end();
    
    console.log('\n🎉 Database connection test passed!');
    console.log('You can now run: npm run db:push');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Error code:', error.code);
    console.error('Error detail:', error.detail);
  }
}

testConnection(); 