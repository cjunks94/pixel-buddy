/**
 * PostgreSQL Connection Pool
 * Manages database connections with health checks
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
  max: 10, // Max concurrent connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Connection error handling
pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

// Health check function
async function healthCheck() {
  try {
    const result = await pool.query('SELECT NOW() as timestamp');
    return {
      healthy: true,
      timestamp: result.rows[0].timestamp
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message
    };
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Closing database pool...');
  await pool.end();
});

module.exports = { pool, healthCheck };
