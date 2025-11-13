/**
 * Pixel Buddy Server
 * Immortal Tamagotchi with AI memory and multiplayer
 * Author: Christopher Junker
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const axios = require('axios');
const { pool, healthCheck } = require('./db/pool');

const app = express();
const PORT = process.env.PORT || 3000;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"]
    }
  }
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  optionsSuccessStatus: 200
}));

// Other middleware
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Rate limiting for actions
const actionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: 'Too many actions, please slow down!'
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================================
// API ROUTES
// ============================================================================

// Health check
app.get('/health', async (req, res) => {
  const dbHealth = await healthCheck();
  if (!dbHealth.healthy) {
    return res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: dbHealth.error
    });
  }
  res.json({
    status: 'healthy',
    database: 'connected',
    timestamp: dbHealth.timestamp,
    uptime: process.uptime()
  });
});

// Get or create pet by user_id
app.get('/api/pet/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if pet exists
    let result = await pool.query(
      'SELECT * FROM pets WHERE user_id = $1',
      [userId]
    );

    // Create new pet if doesn't exist
    if (result.rows.length === 0) {
      result = await pool.query(`
        INSERT INTO pets (user_id, name, hunger, happiness, energy, hygiene, sprite)
        VALUES ($1, $2, 50, 50, 50, 50, 0)
        RETURNING *
      `, [userId, 'Buddy']);

      // Add birth memory
      await pool.query(`
        INSERT INTO memories (pet_id, memory_type, content)
        VALUES ($1, 'action', 'Born into this world!')
      `, [result.rows[0].id]);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching pet:', error);
    res.status(500).json({ error: 'Failed to fetch pet' });
  }
});

// Update pet stats (feed, play, clean, sleep)
app.post('/api/pet/:id/action', actionLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'feed', 'play', 'clean', 'sleep'

    // Calculate stat changes based on action
    // Note: hunger = fullness (100 = full, 0 = starving)
    const updates = {
      feed: { hunger: 30, last_fed: true },
      play: { happiness: 20, energy: -10, last_played: true },
      clean: { hygiene: 40, last_cleaned: true },
      sleep: { energy: 30, last_slept: true }
    };

    const update = updates[action];
    if (!update) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    // Build UPDATE query
    const setParts = [];
    const values = [];
    let paramCount = 1;

    if (update.hunger !== undefined) {
      setParts.push(`hunger = GREATEST(0, LEAST(100, hunger + $${paramCount}))`);
      values.push(update.hunger);
      paramCount++;
    }
    if (update.happiness !== undefined) {
      setParts.push(`happiness = GREATEST(0, LEAST(100, happiness + $${paramCount}))`);
      values.push(update.happiness);
      paramCount++;
    }
    if (update.energy !== undefined) {
      setParts.push(`energy = GREATEST(0, LEAST(100, energy + $${paramCount}))`);
      values.push(update.energy);
      paramCount++;
    }
    if (update.hygiene !== undefined) {
      setParts.push(`hygiene = GREATEST(0, LEAST(100, hygiene + $${paramCount}))`);
      values.push(update.hygiene);
      paramCount++;
    }

    // Update timestamp columns
    if (update.last_fed) setParts.push('last_fed = NOW()');
    if (update.last_played) setParts.push('last_played = NOW()');
    if (update.last_cleaned) setParts.push('last_cleaned = NOW()');
    if (update.last_slept) setParts.push('last_slept = NOW()');

    values.push(id);
    const query = `UPDATE pets SET ${setParts.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, values);

    // Add memory
    await pool.query(
      'INSERT INTO memories (pet_id, memory_type, content) VALUES ($1, $2, $3)',
      [id, 'action', `Owner ${action === 'feed' ? 'fed' : action === 'play' ? 'played with' : action === 'clean' ? 'cleaned' : 'put to sleep'} me!`]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating pet:', error);
    res.status(500).json({ error: 'Failed to update pet' });
  }
});

// Rename pet
app.post('/api/pet/:id/rename', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || name.length > 20) {
      return res.status(400).json({ error: 'Name must be 1-20 characters' });
    }

    const result = await pool.query(
      'UPDATE pets SET name = $1 WHERE id = $2 RETURNING *',
      [name, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error renaming pet:', error);
    res.status(500).json({ error: 'Failed to rename pet' });
  }
});

// Sync pet stats (for periodic frontend updates)
app.post('/api/pet/:id/sync', async (req, res) => {
  try {
    const { id } = req.params;
    const { hunger, happiness, energy, hygiene } = req.body;

    // Validate stats are within bounds
    const clamp = (val) => Math.max(0, Math.min(100, val));

    const result = await pool.query(
      'UPDATE pets SET hunger = $1, happiness = $2, energy = $3, hygiene = $4 WHERE id = $5 RETURNING *',
      [clamp(hunger), clamp(happiness), clamp(energy), clamp(hygiene), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pet not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error syncing pet:', error);
    res.status(500).json({ error: 'Failed to sync pet' });
  }
});

// ============================================================================
// MULTIPLAYER ROUTES
// ============================================================================

// Open/close world and generate code
app.post('/api/pet/:id/world', async (req, res) => {
  try {
    const { id } = req.params;
    const { open } = req.body;

    let code = null;
    if (open) {
      // Generate unique 6-char code (XXXX-XX format)
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let attempts = 0;
      do {
        code = '';
        for (let i = 0; i < 6; i++) {
          if (i === 4) code += '-';
          code += chars[Math.floor(Math.random() * chars.length)];
        }
        attempts++;
        if (attempts > 100) throw new Error('Failed to generate unique code');

        const existing = await pool.query(
          'SELECT 1 FROM pets WHERE world_code = $1',
          [code]
        );
        if (existing.rows.length === 0) break;
      } while (true);
    }

    const result = await pool.query(
      'UPDATE pets SET world_open = $1, world_code = $2 WHERE id = $3 RETURNING world_code, world_open, visits_count',
      [open, code, id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error toggling world:', error);
    res.status(500).json({ error: 'Failed to toggle world' });
  }
});

// Visit world by code
app.get('/api/world/:code', async (req, res) => {
  try {
    const { code } = req.params;

    const result = await pool.query(`
      SELECT id, name, hunger, happiness, energy, hygiene, sprite, color, visits_count, age_seconds
      FROM pets
      WHERE world_code = $1 AND world_open = TRUE
    `, [code]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'World not found or closed' });
    }

    // Increment visit counter
    await pool.query(
      'UPDATE pets SET visits_count = visits_count + 1 WHERE id = $1',
      [result.rows[0].id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error visiting world:', error);
    res.status(500).json({ error: 'Failed to visit world' });
  }
});

// Browse open worlds
app.get('/api/worlds', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT name, world_code, visits_count, last_seen, sprite, color
      FROM pets
      WHERE world_open = TRUE
      ORDER BY visits_count DESC, last_seen DESC
      LIMIT 20
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching worlds:', error);
    res.status(500).json({ error: 'Failed to fetch worlds' });
  }
});

// ============================================================================
// AI ROUTES (Ollama integration)
// ============================================================================

// Talk to pet (AI response)
app.post('/api/pet/:id/talk', actionLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    // Get pet data
    const petResult = await pool.query('SELECT * FROM pets WHERE id = $1', [id]);
    const pet = petResult.rows[0];

    if (!pet) {
      return res.status(404).json({ error: 'Pet not found' });
    }

    // Get recent memories
    const memoryResult = await pool.query(
      'SELECT content FROM memories WHERE pet_id = $1 ORDER BY created_at DESC LIMIT 5',
      [id]
    );
    const memories = memoryResult.rows.map(r => r.content).join('. ');

    // Build AI prompt
    const prompt = `You are ${pet.name}, a virtual pet (like a Tamagotchi). Your stats: hunger=${pet.hunger}, happiness=${pet.happiness}, energy=${pet.energy}, hygiene=${pet.hygiene}. Recent memories: ${memories}. Owner says: "${message}". Respond in 1-2 sentences as ${pet.name}, showing personality based on your stats (low stats = grumpy, high stats = cheerful).`;

    // Call Ollama
    try {
      const ollamaResponse = await axios.post(`${OLLAMA_URL}/api/generate`, {
        model: 'llama3.2:1b',
        prompt,
        stream: false
      }, { timeout: 10000 });

      const aiResponse = ollamaResponse.data.response;

      // Save to AI brain
      await pool.query(
        'INSERT INTO ai_brain (prompt, response, context) VALUES ($1, $2, $3)',
        [message, aiResponse, JSON.stringify({ pet_id: id, stats: { hunger: pet.hunger, happiness: pet.happiness } })]
      );

      // Add memory
      await pool.query(
        'INSERT INTO memories (pet_id, memory_type, content) VALUES ($1, $2, $3)',
        [id, 'action', `Owner said: "${message}". I replied: "${aiResponse}"`]
      );

      res.json({ response: aiResponse });
    } catch (ollamaError) {
      console.warn('Ollama not available, using fallback response');
      const fallbackResponses = {
        low_stats: `*tired* I'm not feeling great... maybe some care would help?`,
        high_stats: `Yay! I'm so happy to see you! Everything is awesome!`,
        default: `Hi! I'm ${pet.name}! What would you like to do together?`
      };

      const avgStats = (pet.hunger + pet.happiness + pet.energy + pet.hygiene) / 4;
      const response = avgStats < 40 ? fallbackResponses.low_stats :
                      avgStats > 70 ? fallbackResponses.high_stats :
                      fallbackResponses.default;

      res.json({ response, fallback: true });
    }
  } catch (error) {
    console.error('Error talking to pet:', error);
    res.status(500).json({ error: 'Failed to talk to pet' });
  }
});

// Get pet memories
app.get('/api/pet/:id/memories', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT memory_type, content, created_at FROM memories WHERE pet_id = $1 ORDER BY created_at DESC LIMIT 50',
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching memories:', error);
    res.status(500).json({ error: 'Failed to fetch memories' });
  }
});

// ============================================================================
// CATCHALL & ERROR HANDLING
// ============================================================================

// Serve SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║   🐾 Pixel Buddy Server Started 🎮    ║
  ╠═══════════════════════════════════════╣
  ║  Port: ${PORT.toString().padEnd(30)} ║
  ║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(22)} ║
  ║  Health: http://localhost:${PORT}/health ║
  ╚═══════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  process.exit(0);
});

module.exports = app;
