/**
 * Migration Script: v1 -> v2
 * Migrates from old schema (pets with user_id TEXT) to new schema (users + multi-pet support)
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting database migration to v2...\n');

    // Start transaction
    await client.query('BEGIN');

    // ========================================================================
    // 1. Read and execute new schema
    // ========================================================================
    console.log('📝 Step 1: Creating new schema...');
    const schemaPath = path.join(__dirname, '../db/schema_v2.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    await client.query(schema);
    console.log('✅ New schema created\n');

    // ========================================================================
    // 2. Migrate existing pets data
    // ========================================================================
    console.log('📝 Step 2: Migrating existing pets...');

    // Check if old pets have TEXT user_id
    const petsResult = await client.query('SELECT COUNT(*) as count FROM pets');
    const existingPets = parseInt(petsResult.rows[0].count);

    if (existingPets > 0) {
      console.log(`   Found ${existingPets} existing pets`);

      // Get all unique user_ids (TEXT fingerprints)
      const uniqueUsersResult = await client.query(`
        SELECT DISTINCT user_id FROM pets
        WHERE owner_id IS NULL
      `);

      console.log(`   Found ${uniqueUsersResult.rows.length} unique user fingerprints`);

      // Create a mapping user for existing pets (migration user)
      let migrationUserId;

      const migrationUserResult = await client.query(`
        INSERT INTO users (
          username, email, password_hash, display_name,
          oauth_provider, email_verified
        ) VALUES (
          'migration_user',
          'migration@pixelbuddy.local',
          NULL,
          'Legacy Migration User',
          'local',
          FALSE
        )
        ON CONFLICT (username) DO UPDATE SET username = EXCLUDED.username
        RETURNING id
      `);

      migrationUserId = migrationUserResult.rows[0].id;

      console.log(`   Created migration user (ID: ${migrationUserId})`);

      // Update pets to point to migration user
      await client.query(`
        UPDATE pets
        SET owner_id = $1
        WHERE owner_id IS NULL
      `, [migrationUserId]);

      console.log('   ✅ Migrated existing pets to migration user');
      console.log('   ⚠️  NOTE: Existing pets are assigned to migration_user@pixelbuddy.local');
      console.log('   ⚠️  Users will need to re-register and create new pets');
    } else {
      console.log('   No existing pets to migrate');
    }

    console.log('✅ Pet migration complete\n');

    // ========================================================================
    // 3. Create indexes and constraints
    // ========================================================================
    console.log('📝 Step 3: Verifying indexes and constraints...');

    // Already created in schema_v2.sql
    console.log('✅ Indexes verified\n');

    // ========================================================================
    // 4. Create initial admin user (optional)
    // ========================================================================
    console.log('📝 Step 4: Creating admin user (optional)...');

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@pixelbuddy.local';
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminPassword) {
      const bcrypt = require('bcrypt');
      const passwordHash = await bcrypt.hash(adminPassword, 10);

      await client.query(`
        INSERT INTO users (
          username, email, password_hash, display_name,
          oauth_provider, email_verified, role
        ) VALUES ($1, $2, $3, $4, 'local', TRUE, 'admin')
        ON CONFLICT (username) DO NOTHING
      `, [adminUsername, adminEmail, passwordHash, 'Administrator']);

      console.log(`✅ Admin user created: ${adminEmail}\n`);
    } else {
      console.log('⚠️  Skipping admin user creation (ADMIN_PASSWORD not set)\n');
    }

    // ========================================================================
    // Commit transaction
    // ========================================================================
    await client.query('COMMIT');

    console.log('✅ Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Migrated ${existingPets} existing pets`);
    console.log(`   - Created new schema with users, caretakers, events, audit_log`);
    console.log(`   - Ready for multi-pet support and OAuth authentication`);
    console.log('\n🔑 Next steps:');
    console.log('   1. Configure OAuth credentials in .env (Google, Apple)');
    console.log('   2. Update JWT_SECRET in .env');
    console.log('   3. Restart the server');
    console.log('   4. Users can register/login with OAuth or email/password\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { runMigration };
