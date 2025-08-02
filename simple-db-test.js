import pg from 'pg';

const { Pool } = pg;

console.log('🔍 Simple Database Connection Test');
console.log('==================================');

const DATABASE_URL = 'postgresql://postgres:HBOcKqT8pd7LaKzKYfDH@database-1.c9oguyo08qck.us-east-2.rds.amazonaws.com:5432/famflix?sslmode=require';

async function testConnection() {
  try {
    console.log('Testing connection with SSL...');
    
    const pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });

    const client = await pool.connect();
    console.log('✅ Connection successful!');
    
    const result = await client.query('SELECT NOW() as current_time, version() as version');
    console.log('✅ Query successful!');
    console.log('Current time:', result.rows[0].current_time);
    console.log('PostgreSQL version:', result.rows[0].version.split(' ')[0]);
    
    client.release();
    await pool.end();
    
    console.log('\n🎉 Database connection test passed!');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Error code:', error.code);
  }
}

testConnection(); 