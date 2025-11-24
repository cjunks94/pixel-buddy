-- ============================================================================
-- Pixel Buddy Database Schema v2.0
-- Infrastructure-first: Auth, Multi-pet, Events, Audit Log
-- ============================================================================

-- ============================================================================
-- 1. USERS TABLE (Authentication & Profiles)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,

  -- Authentication
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255), -- NULL for OAuth-only users

  -- Profile
  display_name VARCHAR(100),
  avatar_url TEXT,

  -- OAuth providers
  google_id VARCHAR(255) UNIQUE,
  apple_id VARCHAR(255) UNIQUE,
  oauth_provider VARCHAR(20), -- 'google', 'apple', 'local'

  -- Account status
  email_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  role VARCHAR(20) DEFAULT 'user', -- 'user', 'moderator', 'admin'

  -- Security
  last_login_at TIMESTAMP,
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 2. PETS TABLE (Buddy Instances - Multi-pet support)
-- ============================================================================
CREATE TABLE IF NOT EXISTS pets (
  id SERIAL PRIMARY KEY,
  name VARCHAR(20) NOT NULL DEFAULT 'Buddy',

  -- Ownership (no longer UNIQUE - allows multiple pets per user)
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Stats (0-100 scale)
  hunger INTEGER NOT NULL DEFAULT 50 CHECK (hunger >= 0 AND hunger <= 100),
  happiness INTEGER NOT NULL DEFAULT 50 CHECK (happiness >= 0 AND happiness <= 100),
  energy INTEGER NOT NULL DEFAULT 50 CHECK (energy >= 0 AND energy <= 100),
  hygiene INTEGER NOT NULL DEFAULT 50 CHECK (hygiene >= 0 AND hygiene <= 100),
  health INTEGER NOT NULL DEFAULT 100 CHECK (health >= 0 AND health <= 100),

  -- Visual state
  sprite INTEGER NOT NULL DEFAULT 0,
  color VARCHAR(7) DEFAULT '#FF6B9D',

  -- Lifecycle
  age_seconds INTEGER NOT NULL DEFAULT 0,
  generation INTEGER NOT NULL DEFAULT 1,
  is_alive BOOLEAN NOT NULL DEFAULT TRUE,

  -- Multiplayer (legacy - keeping for backwards compat)
  world_code TEXT UNIQUE,
  world_open BOOLEAN DEFAULT FALSE,
  visits_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP DEFAULT NOW(),
  last_fed TIMESTAMP DEFAULT NOW(),
  last_played TIMESTAMP DEFAULT NOW(),
  last_cleaned TIMESTAMP DEFAULT NOW(),
  last_slept TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 3. CARETAKERS TABLE (Shared Ownership)
-- ============================================================================
CREATE TABLE IF NOT EXISTS caretakers (
  id SERIAL PRIMARY KEY,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Role and permissions
  role VARCHAR(20) DEFAULT 'caretaker', -- 'owner', 'caretaker', 'viewer'

  -- Invitation tracking
  invited_by INTEGER REFERENCES users(id),
  invited_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP,

  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'active', 'declined', 'left'

  -- Stats
  actions_count INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(pet_id, user_id)
);

-- ============================================================================
-- 4. GAME EVENTS TABLE (Event-Driven System)
-- ============================================================================
CREATE TABLE IF NOT EXISTS game_events (
  id SERIAL PRIMARY KEY,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,

  -- Event definition
  event_type VARCHAR(50) NOT NULL, -- 'crying', 'hungry', 'poop', 'sick', 'sleepy', 'playful'
  severity VARCHAR(20) DEFAULT 'standard', -- 'critical', 'standard', 'low'

  -- Lifecycle
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'resolved', 'expired', 'ignored'

  -- Resolution tracking
  resolved_by INTEGER REFERENCES users(id),
  resolution_action VARCHAR(50), -- 'comfort', 'feed', 'cleanup', 'medicine', 'tuck_in', 'play'

  -- Event metadata
  data JSONB, -- Event-specific data

  -- Timing
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  resolved_at TIMESTAMP
);

-- ============================================================================
-- 5. AUDIT LOG TABLE (PaperTrail-style system events)
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,

  -- Who did it
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  whodunnit TEXT NOT NULL, -- "User:{id}:{email}:controller#action" or "System:{context}"

  -- What was affected
  item_type VARCHAR(100) NOT NULL, -- 'User', 'Pet', 'Caretaker', 'GameEvent', etc.
  item_id INTEGER NOT NULL,

  -- What changed
  event_type VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'login', etc.
  action VARCHAR(100), -- Specific action: 'register', 'oauth_login', 'pet_created', etc.

  -- Change tracking
  object JSONB, -- Snapshot of object after change
  object_changes JSONB, -- {"field": [old_value, new_value]}

  -- Metadata
  ip_address INET,
  user_agent TEXT,
  request_id VARCHAR(100),

  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 6. MEMORIES TABLE (AI Interactions & History)
-- ============================================================================
CREATE TABLE IF NOT EXISTS memories (
  id SERIAL PRIMARY KEY,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  memory_type VARCHAR(20) NOT NULL, -- 'action', 'mood', 'death', 'visit', 'conversation'
  content TEXT NOT NULL,
  embedding JSONB, -- Future: vector embeddings
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 7. DEATHS TABLE (Reincarnation Log)
-- ============================================================================
CREATE TABLE IF NOT EXISTS deaths (
  id SERIAL PRIMARY KEY,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  generation INTEGER NOT NULL,
  cause VARCHAR(50) NOT NULL, -- 'hunger', 'neglect', 'sickness', 'old_age'
  final_age_seconds INTEGER NOT NULL,
  final_stats JSONB NOT NULL,
  epitaph TEXT,
  died_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 8. VISITS TABLE (Multiplayer/Legacy)
-- ============================================================================
CREATE TABLE IF NOT EXISTS visits (
  id SERIAL PRIMARY KEY,
  host_pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  visitor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  visitor_pet_name VARCHAR(20),
  duration_seconds INTEGER DEFAULT 0,
  gifts_given JSONB,
  visited_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 9. AI BRAIN TABLE (Shared LLM Context)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_brain (
  id SERIAL PRIMARY KEY,
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  context JSONB,
  model VARCHAR(50) DEFAULT 'llama3.2:1b',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 10. PUSH SUBSCRIPTIONS TABLE (Notifications)
-- ============================================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_data JSONB NOT NULL,
  device_type VARCHAR(20), -- 'ios', 'android', 'desktop'
  device_name VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  last_used TIMESTAMP
);

-- ============================================================================
-- 11. NOTIFICATION PREFERENCES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  critical_events BOOLEAN DEFAULT TRUE,
  standard_events BOOLEAN DEFAULT TRUE,
  summaries BOOLEAN DEFAULT TRUE,
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  muted_pets JSONB DEFAULT '[]',
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 12. INVITE CODES TABLE (Caretaker Invitations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS invite_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  max_uses INTEGER DEFAULT 1,
  uses_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_apple_id ON users(apple_id) WHERE apple_id IS NOT NULL;

-- Pets
CREATE INDEX IF NOT EXISTS idx_pets_owner_id ON pets(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pets_world_open ON pets(world_open) WHERE world_open = TRUE;
CREATE INDEX IF NOT EXISTS idx_pets_is_alive ON pets(is_alive);

-- Caretakers
CREATE INDEX IF NOT EXISTS idx_caretakers_pet_id ON caretakers(pet_id, status);
CREATE INDEX IF NOT EXISTS idx_caretakers_user_id ON caretakers(user_id, status);
CREATE INDEX IF NOT EXISTS idx_caretakers_status ON caretakers(status) WHERE status = 'pending';

-- Game Events
CREATE INDEX IF NOT EXISTS idx_game_events_pet_id ON game_events(pet_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_events_status ON game_events(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_game_events_expires ON game_events(expires_at) WHERE status = 'active';

-- Audit Log
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_item ON audit_log(item_type, item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_event_type ON audit_log(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_whodunnit ON audit_log(whodunnit);

-- Memories
CREATE INDEX IF NOT EXISTS idx_memories_pet_id ON memories(pet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(memory_type, created_at DESC);

-- Deaths
CREATE INDEX IF NOT EXISTS idx_deaths_pet_id ON deaths(pet_id, generation DESC);

-- Visits
CREATE INDEX IF NOT EXISTS idx_visits_host ON visits(host_pet_id, visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_visits_visitor ON visits(visitor_user_id, visited_at DESC);

-- AI Brain
CREATE INDEX IF NOT EXISTS idx_ai_brain_created ON ai_brain(created_at DESC);

-- Push Subscriptions
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id, is_active);

-- Invite Codes
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_invite_codes_pet ON invite_codes(pet_id, is_active);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_seen = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to mutable tables
DROP TRIGGER IF EXISTS trigger_users_updated_at ON users;
CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_pets_updated_at ON pets;
CREATE TRIGGER trigger_pets_updated_at
  BEFORE UPDATE ON pets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_caretakers_updated_at ON caretakers;
CREATE TRIGGER trigger_caretakers_updated_at
  BEFORE UPDATE ON caretakers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Auto-update last_seen on any pet update
DROP TRIGGER IF EXISTS trigger_pets_last_seen ON pets;
CREATE TRIGGER trigger_pets_last_seen
  BEFORE UPDATE ON pets
  FOR EACH ROW
  EXECUTE FUNCTION update_last_seen();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get user's accessible pets (owned + caretaker)
CREATE OR REPLACE FUNCTION get_user_pets(p_user_id INTEGER)
RETURNS TABLE (
  pet_id INTEGER,
  pet_name VARCHAR(20),
  owner_id INTEGER,
  caretaker_role VARCHAR(20),
  is_owner BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.owner_id,
    COALESCE(c.role, 'owner') as caretaker_role,
    (p.owner_id = p_user_id) as is_owner
  FROM pets p
  LEFT JOIN caretakers c ON c.pet_id = p.id AND c.user_id = p_user_id AND c.status = 'active'
  WHERE p.owner_id = p_user_id OR c.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Check if user can access pet
CREATE OR REPLACE FUNCTION can_access_pet(p_user_id INTEGER, p_pet_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM pets p
    LEFT JOIN caretakers c ON c.pet_id = p.id AND c.user_id = p_user_id AND c.status = 'active'
    WHERE p.id = p_pet_id AND (p.owner_id = p_user_id OR c.user_id = p_user_id)
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MIGRATION HELPERS
-- ============================================================================

-- Migrate existing pets to new schema (run after deployment)
-- This assumes existing pets.user_id is a TEXT fingerprint
-- We'll need to map those to actual user IDs later
COMMENT ON TABLE pets IS 'Migration note: Existing user_id TEXT values need mapping to users.id after auth implemented';
