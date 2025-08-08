import pg from 'pg';
import bcrypt from 'bcryptjs';
const { Pool } = pg;

async function fixPassword() {
  const pool = new Pool({
    connectionString: 'postgresql://postgres:HBOcKqT8pd7LaKzKYfDH@database-1.c9oguyo08qck.us-east-2.rds.amazonaws.com:5432/famflix?sslmode=require',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Connecting to database...');
    
    // Hash the password
    const password = 'Wittymango520@';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log('Password hashed successfully');
    console.log('Hash:', hashedPassword);
    
    // Update admin user password
    const result = await pool.query(
      'UPDATE users SET password = $1 WHERE username = $2 RETURNING id, username, email, role',
      [hashedPassword, 'admin']
    );
    
    if (result.rowCount > 0) {
      console.log('Admin password updated successfully!');
      console.log('Updated user:', result.rows[0]);
      
      // Verify the password was stored correctly
      const verifyResult = await pool.query(
        'SELECT username, password FROM users WHERE username = $1',
        ['admin']
      );
      
      console.log('Stored password:', verifyResult.rows[0].password);
      
      // Test the password
      const isValid = await bcrypt.compare(password, verifyResult.rows[0].password);
      console.log('Password verification:', isValid);
    } else {
      console.log('No admin user found to update');
    }
    
  } catch (error) {
    console.error('Error updating admin password:', error);
  } finally {
    await pool.end();
  }
}

fixPassword(); 