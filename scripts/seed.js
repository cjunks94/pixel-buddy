/**
 * Database Seed Script
 * Creates sample data for testing
 * Run with: npm run db:seed
 */

require('dotenv').config();
const { pool } = require('../db/pool');

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // Create sample pet
    const petId = await pool.query(
      "SELECT seed_sample_pet('demo-user-001')"
    );

    console.log('✅ Sample pet created!');
    console.log('   User ID: demo-user-001');
    console.log('   Pet name: Demo Buddy');
    console.log('\n💡 Try visiting: http://localhost:3000');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    process.exit(1);
  }
}

seed();
