/**
 * Database Migration Script
 * Run with: npm run db:migrate
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../db/pool');

async function migrate() {
  console.log('🔄 Running database migrations...');

  try {
    // Read schema file
    const schemaPath = path.join(__dirname, '../db/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Execute schema
    await pool.query(schema);

    console.log('✅ Database migration completed successfully!');

    // Verify tables
    const { rows } = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('\n📊 Created tables:');
    rows.forEach(row => console.log(`  - ${row.table_name}`));

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

migrate();
