import bcrypt from 'bcryptjs';
import pg from 'pg';
const { Pool } = pg;

// Database connection
const pool = new Pool({
  connectionString: 'postgresql://postgres:HBOcKqT8pd7LaKzKYfDH@database-1.c9oguyo08qck.us-east-2.rds.amazonaws.com:5432/famflix?sslmode=require',
  ssl: {
    rejectUnauthorized: false
  }
});

async function createAdmin() {
  try {
    console.log('Connecting to database...');
    
    // Hash the password
    const password = 'Wittymango520@';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log('Password hashed successfully');
    
    // Check if admin user already exists
    const checkResult = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      ['admin@fam-flix.com', 'admin']
    );
    
    if (checkResult.rows.length > 0) {
      console.log('Admin user already exists. Updating password...');
      
      // Update existing admin user
      await pool.query(
        'UPDATE users SET password = $1, role = $2, subscription_status = $3 WHERE email = $4',
        [hashedPassword, 'admin', 'premium', 'admin@fam-flix.com']
      );
      
      console.log('Admin user updated successfully!');
    } else {
      console.log('Creating new admin user...');
      
      // Create new admin user
      const result = await pool.query(
        `INSERT INTO users (username, password, email, display_name, role, subscription_status, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id, username, email, role`,
        ['admin', hashedPassword, 'admin@fam-flix.com', 'Admin', 'admin', 'premium']
      );
      
      console.log('Admin user created successfully!');
      console.log('User details:', result.rows[0]);
    }
    
    console.log('\n✅ Admin account created/updated successfully!');
    console.log('Email: admin@fam-flix.com');
    console.log('Password: Wittymango520@');
    console.log('Role: admin');
    
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await pool.end();
  }
}

createAdmin(); 