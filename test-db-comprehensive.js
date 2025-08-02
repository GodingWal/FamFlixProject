import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

console.log('🔍 Comprehensive Database Connection Test');
console.log('==========================================');

// Test 1: Check environment variables
console.log('\n📋 Test 1: Environment Variables');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : '❌ Not set');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not set - cannot proceed');
  process.exit(1);
}

// Test 2: Parse connection string
console.log('\n🔗 Test 2: Connection String Analysis');
try {
  const url = new URL(process.env.DATABASE_URL);
  console.log('✅ Connection string format: Valid');
  console.log('Host:', url.hostname);
  console.log('Port:', url.port);
  console.log('Database:', url.pathname.slice(1));
  console.log('Username:', url.username);
  console.log('SSL:', url.searchParams.get('sslmode') || 'not specified');
} catch (error) {
  console.error('❌ Invalid connection string format:', error.message);
  process.exit(1);
}

// Test 3: Test basic connectivity
console.log('\n🌐 Test 3: Basic Connectivity');
async function testBasicConnectivity() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000
  });

  try {
    console.log('Attempting to connect...');
    const client = await pool.connect();
    console.log('✅ Basic connection successful!');
    
    // Test 4: Simple query
    console.log('\n📊 Test 4: Simple Query');
    const result = await client.query('SELECT NOW() as current_time, version() as version');
    console.log('✅ Query successful!');
    console.log('Current time from DB:', result.rows[0].current_time);
    console.log('PostgreSQL version:', result.rows[0].version.split(' ')[0]);
    
    client.release();
    await pool.end();
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    
    // Provide specific error guidance
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Possible solutions:');
      console.log('1. Check if RDS instance is running');
      console.log('2. Verify security group allows connections from EC2');
      console.log('3. Check if the database endpoint is correct');
    } else if (error.code === 'ENOTFOUND') {
      console.log('\n💡 Possible solutions:');
      console.log('1. Check if the database hostname is correct');
      console.log('2. Verify DNS resolution');
    } else if (error.message.includes('authentication')) {
      console.log('\n💡 Possible solutions:');
      console.log('1. Check username and password in DATABASE_URL');
      console.log('2. Verify the user has proper permissions');
    } else if (error.message.includes('database')) {
      console.log('\n💡 Possible solutions:');
      console.log('1. Check if the database name exists');
      console.log('2. Verify the user has access to the database');
    }
    
    await pool.end();
    return false;
  }
}

// Test 5: Test with different SSL configurations
console.log('\n🔒 Test 5: SSL Configuration Test');
async function testSSLConfigurations() {
  const configs = [
    { name: 'SSL with rejectUnauthorized: false', ssl: { rejectUnauthorized: false } },
    { name: 'SSL with rejectUnauthorized: true', ssl: { rejectUnauthorized: true } },
    { name: 'No SSL', ssl: false }
  ];

  for (const config of configs) {
    console.log(`\nTesting: ${config.name}`);
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ...config,
      connectionTimeoutMillis: 5000
    });

    try {
      const client = await pool.connect();
      console.log(`✅ ${config.name}: Success`);
      client.release();
      await pool.end();
      return config; // Return the working configuration
    } catch (error) {
      console.log(`❌ ${config.name}: ${error.message}`);
      await pool.end();
    }
  }
  
  return null;
}

// Test 6: Test connection pooling
console.log('\n🔄 Test 6: Connection Pooling');
async function testConnectionPooling() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5,
    min: 1,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000
  });

  try {
    console.log('Testing connection pool...');
    const promises = [];
    
    // Test multiple concurrent connections
    for (let i = 0; i < 3; i++) {
      promises.push(
        pool.query(`SELECT ${i} as test_number, NOW() as timestamp`)
      );
    }
    
    const results = await Promise.all(promises);
    console.log('✅ Connection pooling successful!');
    console.log('Concurrent queries executed:', results.length);
    
    await pool.end();
    return true;
  } catch (error) {
    console.error('❌ Connection pooling failed:', error.message);
    await pool.end();
    return false;
  }
}

// Main test execution
async function runAllTests() {
  console.log('\n🚀 Starting comprehensive database tests...\n');
  
  const basicConnectivity = await testBasicConnectivity();
  if (!basicConnectivity) {
    console.log('\n❌ Basic connectivity failed - stopping tests');
    process.exit(1);
  }
  
  const sslConfig = await testSSLConfigurations();
  if (sslConfig) {
    console.log(`\n✅ Recommended SSL configuration: ${sslConfig.name}`);
  }
  
  const pooling = await testConnectionPooling();
  
  console.log('\n📋 Test Summary');
  console.log('===============');
  console.log('Basic Connectivity:', basicConnectivity ? '✅ PASS' : '❌ FAIL');
  console.log('SSL Configuration:', sslConfig ? '✅ PASS' : '❌ FAIL');
  console.log('Connection Pooling:', pooling ? '✅ PASS' : '❌ FAIL');
  
  if (basicConnectivity && sslConfig && pooling) {
    console.log('\n🎉 All database tests passed!');
    console.log('The database connection is working correctly.');
    console.log('\nRecommended configuration for production:');
    console.log('```javascript');
    console.log('const pool = new Pool({');
    console.log('  connectionString: process.env.DATABASE_URL,');
    console.log(`  ssl: ${JSON.stringify(sslConfig.ssl)}`);
    console.log('});');
    console.log('```');
  } else {
    console.log('\n⚠️ Some tests failed. Check the error messages above.');
    process.exit(1);
  }
}

// Run the tests
runAllTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
}); 