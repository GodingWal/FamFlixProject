import { db } from '../db';
import { users } from '@shared/schema';
import bcrypt from 'bcryptjs';

async function resetAdmin() {
  try {
    if (!db) {
      console.error('Database connection is not available. Set DATABASE_URL.');
      process.exit(1);
    }
    // Delete all users
    await db!.delete(users);
    console.log('All users deleted.');

    // Hash the new admin password
    const password = 'Wittymango520!';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new admin user
    const [admin] = await db!.insert(users).values({
      username: 'admin',
      password: hashedPassword,
      email: 'admin@fam-flix.com',
      displayName: 'Admin',
      role: 'admin',
      subscriptionStatus: 'premium',
    }).returning();

    console.log('New admin user created:', {
      username: admin.username,
      email: admin.email,
      role: admin.role
    });
    process.exit(0);
  } catch (err) {
    console.error('Error resetting admin:', err);
    process.exit(1);
  }
}

resetAdmin(); 