-- Pixel Buddy Database Schema
-- Supports: Pet persistence, AI memory, multiplayer worlds, death/reincarnation

-- Main pets table
CREATE TABLE IF NOT EXISTS pets (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE, -- Browser fingerprint or user ID
  name VARCHAR(20) NOT NULL DEFAULT 'Buddy',

  -- Stats (0-100 scale)
  hunger INTEGER NOT NULL DEFAULT 50 CHECK (hunger >= 0 AND hunger <= 100),
  happiness INTEGER NOT NULL DEFAULT 50 CHECK (happiness >= 0 AND happiness <= 100),
  energy INTEGER NOT NULL DEFAULT 50 CHECK (energy >= 0 AND energy <= 100),
  hygiene INTEGER NOT NULL DEFAULT 50 CHECK (hygiene >= 0 AND hygiene <= 100),

  -- Visual state
  sprite INTEGER NOT NULL DEFAULT 0, -- Row in sprite sheet (0-7)
  color VARCHAR(7) DEFAULT '#FF6B9D', -- Hex color

  -- Lifecycle
  age_seconds INTEGER NOT NULL DEFAULT 0,
  generation INTEGER NOT NULL DEFAULT 1, -- Reincarnation counter
  is_alive BOOLEAN NOT NULL DEFAULT TRUE,

  -- Multiplayer
  world_code TEXT UNIQUE, -- 6-char code (e.g., "POMO-42")
  world_open BOOLEAN DEFAULT FALSE,
  visits_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP DEFAULT NOW(),
  last_fed TIMESTAMP DEFAULT NOW(),
  last_played TIMESTAMP DEFAULT NOW(),
  last_cleaned TIMESTAMP DEFAULT NOW(),
  last_slept TIMESTAMP DEFAULT NOW()
);

-- AI memory/personality system
CREATE TABLE IF NOT EXISTS memories (
  id SERIAL PRIMARY KEY,
  pet_id INTEGER REFERENCES pets(id) ON DELETE CASCADE,
  memory_type VARCHAR(20) NOT NULL, -- 'action', 'mood', 'death', 'visit'
  content TEXT NOT NULL,
  embedding JSONB, -- For vector search (future)
  created_at TIMESTAMP DEFAULT NOW()
);

-- Death/reincarnation log
CREATE TABLE IF NOT EXISTS deaths (
  id SERIAL PRIMARY KEY,
  pet_id INTEGER REFERENCES pets(id) ON DELETE CASCADE,
  generation INTEGER NOT NULL,
  cause VARCHAR(50) NOT NULL, -- 'hunger', 'neglect', 'old_age'
  final_age_seconds INTEGER NOT NULL,
  final_stats JSONB NOT NULL, -- {hunger, happiness, energy, hygiene}
  epitaph TEXT, -- Last words from AI
  died_at TIMESTAMP DEFAULT NOW()
);

-- Visitor log (who visited whose world)
CREATE TABLE IF NOT EXISTS visits (
  id SERIAL PRIMARY KEY,
  host_pet_id INTEGER REFERENCES pets(id) ON DELETE CASCADE,
  visitor_user_id TEXT NOT NULL,
  visitor_pet_name VARCHAR(20),
  duration_seconds INTEGER DEFAULT 0,
  gifts_given JSONB, -- Future: {food: 1, toy: 2}
  visited_at TIMESTAMP DEFAULT NOW()
);

-- Global AI brain (shared across all pets)
CREATE TABLE IF NOT EXISTS ai_brain (
  id SERIAL PRIMARY KEY,
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  context JSONB, -- {pet_stats, action, mood}
  model VARCHAR(50) DEFAULT 'llama3.2:1b',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets(user_id);
CREATE INDEX IF NOT EXISTS idx_pets_world_open ON pets(world_open) WHERE world_open = TRUE;
CREATE INDEX IF NOT EXISTS idx_pets_last_seen ON pets(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_memories_pet_id ON memories(pet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visits_host ON visits(host_pet_id, visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_brain_created ON ai_brain(created_at DESC);

-- Auto-update last_seen on any update
CREATE OR REPLACE FUNCTION update_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_seen = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_last_seen ON pets;
CREATE TRIGGER trigger_update_last_seen
  BEFORE UPDATE ON pets
  FOR EACH ROW
  EXECUTE FUNCTION update_last_seen();

-- Sample data function
CREATE OR REPLACE FUNCTION seed_sample_pet(p_user_id TEXT)
RETURNS INTEGER AS $$
DECLARE
  new_pet_id INTEGER;
BEGIN
  INSERT INTO pets (user_id, name, hunger, happiness, energy, hygiene, sprite)
  VALUES (p_user_id, 'Demo Buddy', 75, 80, 60, 70, 0)
  RETURNING id INTO new_pet_id;

  INSERT INTO memories (pet_id, memory_type, content)
  VALUES
    (new_pet_id, 'action', 'Born into this world with curiosity'),
    (new_pet_id, 'mood', 'Feeling playful and excited to meet you!');

  RETURN new_pet_id;
END;
$$ LANGUAGE plpgsql;
