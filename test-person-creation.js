#!/usr/bin/env node

import 'dotenv/config';
import { storage } from './server/storage.js';
import { log } from './server/vite.js';

console.log('🧪 Testing Person Creation');
console.log('===========================');

async function testPersonCreation() {
  try {
    console.log('📋 Step 1: Checking storage type...');

    // Check if we're using database or memory storage
    if (storage.constructor.name === 'DatabaseStorage') {
      console.log('✅ Using DatabaseStorage (good!)');
    } else if (storage.constructor.name === 'MemoryStorage') {
      console.log('⚠️  Using MemoryStorage - data will not persist!');
      console.log('🔧 Solution: Check database connection in diagnose-db.js');
      process.exit(1);
    } else {
      console.log('❓ Unknown storage type:', storage.constructor.name);
    }

    console.log('\n📋 Step 2: Creating test person...');

    const testPerson = {
      userId: 1,
      name: 'Test Person - API Test',
      relationship: 'test'
    };

    const created = await storage.createPerson(testPerson);
    console.log('✅ Person created successfully:', created);

    console.log('\n📋 Step 3: Verifying person exists...');

    const retrieved = await storage.getPerson(created.id);
    if (retrieved) {
      console.log('✅ Person retrieved successfully:', retrieved);
    } else {
      console.log('❌ Person not found after creation!');
    }

    console.log('\n📋 Step 4: Testing person list...');

    const allPeople = await storage.getAllPeople();
    console.log('✅ Total people in database:', allPeople.length);
    if (allPeople.length > 0) {
      console.log('Recent people:');
      allPeople.slice(-3).forEach(person => {
        console.log(`  - ${person.name} (ID: ${person.id})`);
      });
    }

    console.log('\n📋 Step 5: Cleaning up test person...');

    await storage.deletePerson(created.id);
    console.log('✅ Test person deleted');

    console.log('\n🎉 Person creation test completed successfully!');
    console.log('Your database is working correctly with the application.');

  } catch (error) {
    console.error('❌ Person creation test failed:', error.message);

    if (error.message.includes('connect') || error.message.includes('database')) {
      console.log('\n🔧 Solution: Run database diagnostic:');
      console.log('node diagnose-db.js');
    } else if (error.message.includes('relation') || error.message.includes('table')) {
      console.log('\n🔧 Solution: Database tables not created');
      console.log('npm run db:push');
    } else {
      console.log('\n🔧 Solution: Check application logs and database connection');
    }

    process.exit(1);
  }
}

testPersonCreation();

