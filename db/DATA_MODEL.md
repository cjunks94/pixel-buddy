# Pixel Buddy - Complete Data Model

## Core Entities

### 1. Users (Authentication & Profiles)
```sql
users {
  id SERIAL PRIMARY KEY
  username VARCHAR(50) UNIQUE NOT NULL
  email VARCHAR(255) UNIQUE NOT NULL
  password_hash VARCHAR(255) -- NULL for OAuth-only users

  -- Profile
  display_name VARCHAR(100)
  avatar_url TEXT

  -- OAuth
  google_id VARCHAR(255) UNIQUE
  apple_id VARCHAR(255) UNIQUE
  oauth_provider VARCHAR(20) -- 'google', 'apple', 'local'

  -- Account status
  email_verified BOOLEAN DEFAULT FALSE
  is_active BOOLEAN DEFAULT TRUE
  role VARCHAR(20) DEFAULT 'user' -- 'user', 'moderator', 'admin'

  -- Security
  last_login_at TIMESTAMP
  password_reset_token VARCHAR(255)
  password_reset_expires TIMESTAMP

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW()
  updated_at TIMESTAMP DEFAULT NOW()
}

INDEXES:
- idx_users_email ON users(email)
- idx_users_username ON users(username)
- idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL
- idx_users_apple_id ON users(apple_id) WHERE apple_id IS NOT NULL
```

### 2. Pets (Buddy Instances)
```sql
pets {
  id SERIAL PRIMARY KEY
  name VARCHAR(20) NOT NULL DEFAULT 'Buddy'

  -- Ownership (owner_id is the creator)
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE

  -- Stats (0-100 scale)
  hunger INTEGER NOT NULL DEFAULT 50 CHECK (hunger >= 0 AND hunger <= 100)
  happiness INTEGER NOT NULL DEFAULT 50 CHECK (happiness >= 0 AND happiness <= 100)
  energy INTEGER NOT NULL DEFAULT 50 CHECK (energy >= 0 AND energy <= 100)
  hygiene INTEGER NOT NULL DEFAULT 50 CHECK (hygiene >= 0 AND hygiene <= 100)
  health INTEGER NOT NULL DEFAULT 100 CHECK (health >= 0 AND health <= 100)

  -- Visual state
  sprite INTEGER NOT NULL DEFAULT 0 -- Row in sprite sheet (0-7)
  color VARCHAR(7) DEFAULT '#FF6B9D' -- Hex color

  -- Lifecycle
  age_seconds INTEGER NOT NULL DEFAULT 0
  generation INTEGER NOT NULL DEFAULT 1 -- Reincarnation counter
  is_alive BOOLEAN NOT NULL DEFAULT TRUE

  -- Multiplayer (legacy - keeping for backwards compat)
  world_code TEXT UNIQUE -- 6-char code (e.g., "POMO-42")
  world_open BOOLEAN DEFAULT FALSE
  visits_count INTEGER DEFAULT 0

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW()
  updated_at TIMESTAMP DEFAULT NOW()
  last_seen TIMESTAMP DEFAULT NOW()
  last_fed TIMESTAMP DEFAULT NOW()
  last_played TIMESTAMP DEFAULT NOW()
  last_cleaned TIMESTAMP DEFAULT NOW()
  last_slept TIMESTAMP DEFAULT NOW()
}

INDEXES:
- idx_pets_owner_id ON pets(owner_id, created_at DESC)
- idx_pets_world_open ON pets(world_open) WHERE world_open = TRUE
- idx_pets_is_alive ON pets(is_alive)
```

### 3. Caretakers (Shared Ownership)
```sql
caretakers {
  id SERIAL PRIMARY KEY
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE

  -- Role and permissions
  role VARCHAR(20) DEFAULT 'caretaker' -- 'owner', 'caretaker', 'viewer'

  -- Invitation tracking
  invited_by INTEGER REFERENCES users(id)
  invited_at TIMESTAMP DEFAULT NOW()
  accepted_at TIMESTAMP

  -- Status
  status VARCHAR(20) DEFAULT 'pending' -- 'pending', 'active', 'declined', 'left'

  -- Stats
  actions_count INTEGER DEFAULT 0 -- Number of events responded to

  created_at TIMESTAMP DEFAULT NOW()
  updated_at TIMESTAMP DEFAULT NOW()

  UNIQUE(pet_id, user_id)
}

INDEXES:
- idx_caretakers_pet_id ON caretakers(pet_id, status)
- idx_caretakers_user_id ON caretakers(user_id, status)
- idx_caretakers_status ON caretakers(status) WHERE status = 'pending'
```

### 4. Game Events (Event-Driven System)
```sql
game_events {
  id SERIAL PRIMARY KEY
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE

  -- Event definition
  event_type VARCHAR(50) NOT NULL -- 'crying', 'hungry', 'poop', 'sick', 'sleepy', 'playful'
  severity VARCHAR(20) DEFAULT 'standard' -- 'critical', 'standard', 'low'

  -- Lifecycle
  status VARCHAR(20) DEFAULT 'active' -- 'active', 'resolved', 'expired', 'ignored'

  -- Resolution tracking
  resolved_by INTEGER REFERENCES users(id)
  resolution_action VARCHAR(50) -- 'comfort', 'feed', 'cleanup', 'medicine', 'tuck_in', 'play'

  -- Event metadata
  data JSONB -- Event-specific data (e.g., {"food_item": "apple", "strokes": 5})

  -- Timing
  created_at TIMESTAMP DEFAULT NOW()
  expires_at TIMESTAMP -- Timeout deadline
  resolved_at TIMESTAMP
}

INDEXES:
- idx_game_events_pet_id ON game_events(pet_id, status, created_at DESC)
- idx_game_events_status ON game_events(status) WHERE status = 'active'
- idx_game_events_expires ON game_events(expires_at) WHERE status = 'active'
```

### 5. Audit Log (System Events - PaperTrail Style)
```sql
audit_log {
  id SERIAL PRIMARY KEY

  -- Who did it
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
  whodunnit TEXT NOT NULL -- Format: "User:{id}:{email}:controller#action" or "System:{context}"

  -- What was affected
  item_type VARCHAR(100) NOT NULL -- 'User', 'Pet', 'Caretaker', 'GameEvent', etc.
  item_id INTEGER NOT NULL

  -- What changed
  event_type VARCHAR(50) NOT NULL -- 'create', 'update', 'delete', 'login', 'logout', 'invite_sent', etc.
  action VARCHAR(100) -- Specific action: 'register', 'oauth_login', 'pet_created', 'event_resolved'

  -- Change tracking
  object JSONB -- Snapshot of object after change
  object_changes JSONB -- {"field": [old_value, new_value]}

  -- Metadata
  ip_address INET
  user_agent TEXT
  request_id VARCHAR(100) -- For tracing requests across logs

  created_at TIMESTAMP DEFAULT NOW()
}

INDEXES:
- idx_audit_log_user_id ON audit_log(user_id, created_at DESC)
- idx_audit_log_item ON audit_log(item_type, item_id, created_at DESC)
- idx_audit_log_event_type ON audit_log(event_type, created_at DESC)
- idx_audit_log_created ON audit_log(created_at DESC)
- idx_audit_log_whodunnit ON audit_log(whodunnit)
```

### 6. Memories (AI Interactions & History)
```sql
memories {
  id SERIAL PRIMARY KEY
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE

  memory_type VARCHAR(20) NOT NULL -- 'action', 'mood', 'death', 'visit', 'conversation'
  content TEXT NOT NULL

  -- Optional: Vector embeddings for semantic search (future)
  embedding JSONB

  created_at TIMESTAMP DEFAULT NOW()
}

INDEXES:
- idx_memories_pet_id ON memories(pet_id, created_at DESC)
- idx_memories_type ON memories(memory_type, created_at DESC)
```

### 7. Deaths (Reincarnation Log)
```sql
deaths {
  id SERIAL PRIMARY KEY
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE
  generation INTEGER NOT NULL

  cause VARCHAR(50) NOT NULL -- 'hunger', 'neglect', 'sickness', 'old_age'
  final_age_seconds INTEGER NOT NULL
  final_stats JSONB NOT NULL -- {hunger, happiness, energy, hygiene, health}

  epitaph TEXT -- Last words from AI or caretaker

  died_at TIMESTAMP DEFAULT NOW()
}

INDEXES:
- idx_deaths_pet_id ON deaths(pet_id, generation DESC)
```

### 8. Visits (Multiplayer/Legacy)
```sql
visits {
  id SERIAL PRIMARY KEY
  host_pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE
  visitor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
  visitor_pet_name VARCHAR(20)

  duration_seconds INTEGER DEFAULT 0
  gifts_given JSONB -- Future: {food: 1, toy: 2}

  visited_at TIMESTAMP DEFAULT NOW()
}

INDEXES:
- idx_visits_host ON visits(host_pet_id, visited_at DESC)
- idx_visits_visitor ON visits(visitor_user_id, visited_at DESC)
```

### 9. AI Brain (Shared LLM Context)
```sql
ai_brain {
  id SERIAL PRIMARY KEY

  prompt TEXT NOT NULL
  response TEXT NOT NULL
  context JSONB -- {pet_id, pet_stats, action, mood}
  model VARCHAR(50) DEFAULT 'llama3.2:1b'

  created_at TIMESTAMP DEFAULT NOW()
}

INDEXES:
- idx_ai_brain_created ON ai_brain(created_at DESC)
```

### 10. Push Subscriptions (Notifications)
```sql
push_subscriptions {
  id SERIAL PRIMARY KEY
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE

  -- Push API subscription object
  subscription_data JSONB NOT NULL

  -- Device info
  device_type VARCHAR(20) -- 'ios', 'android', 'desktop'
  device_name VARCHAR(100) -- User-friendly name

  -- Status
  is_active BOOLEAN DEFAULT TRUE

  created_at TIMESTAMP DEFAULT NOW()
  last_used TIMESTAMP

  UNIQUE(user_id, subscription_data->>'endpoint')
}

INDEXES:
- idx_push_subscriptions_user ON push_subscriptions(user_id, is_active)
```

### 11. Notification Preferences
```sql
notification_preferences {
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE

  -- Event type preferences
  critical_events BOOLEAN DEFAULT TRUE
  standard_events BOOLEAN DEFAULT TRUE
  summaries BOOLEAN DEFAULT TRUE

  -- Quiet hours
  quiet_hours_enabled BOOLEAN DEFAULT FALSE
  quiet_hours_start TIME
  quiet_hours_end TIME

  -- Per-pet muting
  muted_pets JSONB DEFAULT '[]' -- Array of pet IDs

  updated_at TIMESTAMP DEFAULT NOW()
}
```

### 12. Invite Codes (Caretaker Invitations)
```sql
invite_codes {
  id SERIAL PRIMARY KEY
  code VARCHAR(20) UNIQUE NOT NULL

  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE

  -- Limits
  max_uses INTEGER DEFAULT 1 -- NULL = unlimited
  uses_count INTEGER DEFAULT 0
  expires_at TIMESTAMP

  -- Status
  is_active BOOLEAN DEFAULT TRUE

  created_at TIMESTAMP DEFAULT NOW()
}

INDEXES:
- idx_invite_codes_code ON invite_codes(code) WHERE is_active = TRUE
- idx_invite_codes_pet ON invite_codes(pet_id, is_active)
```

---

## Relationships

```
users (1) ----< (many) pets [owner_id]
users (1) ----< (many) caretakers [user_id]
users (1) ----< (many) audit_log [user_id]
users (1) ----< (many) push_subscriptions [user_id]
users (1) ----o (one) notification_preferences [user_id]

pets (1) ----< (many) caretakers [pet_id]
pets (1) ----< (many) game_events [pet_id]
pets (1) ----< (many) memories [pet_id]
pets (1) ----< (many) deaths [pet_id]
pets (1) ----< (many) visits [host_pet_id]
pets (1) ----< (many) invite_codes [pet_id]

game_events (many) ----o (one) users [resolved_by]

caretakers (many) ----o (one) users [invited_by]
```

---

## Audit Log Whodunnit Patterns

### User Actions (Web/Mobile)
```
Format: "User:{user_id}:{email}:{controller}#{action}"
Example: "User:42:alice@example.com:pets#create"
```

### OAuth Login
```
Format: "User:{user_id}:{email}:auth#oauth_{provider}"
Example: "User:42:alice@example.com:auth#oauth_google"
```

### System Actions
```
Format: "System:{context}"
Examples:
- "System:event_generator" (auto-generated game events)
- "System:stat_decay" (background stat updates)
- "System:event_expiration" (auto-expire old events)
```

### Background Jobs
```
Format: "Job:{job_class}:User:{user_id}"
Example: "Job:EventGeneratorJob:System"
```

---

## Event Types Reference

### Audit Log Events
- `create` - New record created
- `update` - Record modified
- `delete` - Record deleted
- `login` - User logged in
- `logout` - User logged out
- `oauth_login` - OAuth login
- `register` - New user registered
- `password_reset` - Password reset requested
- `invite_sent` - Caretaker invitation sent
- `invite_accepted` - Caretaker invitation accepted
- `event_resolved` - Game event resolved by caretaker
- `pet_created` - New pet created
- `pet_deleted` - Pet deleted
- `caretaker_added` - Caretaker joined
- `caretaker_left` - Caretaker left

### Game Event Types
- `crying` - Buddy needs comfort (back rub)
- `hungry` - Buddy needs food
- `poop` - Needs cleanup
- `sick` - Needs medicine
- `sleepy` - Needs to sleep
- `playful` - Wants to play

---

## Notes

1. **Multi-tenant isolation**: Each user can only access their owned pets + pets they're caretakers for
2. **Cascading deletes**: Deleting a user cascades to their owned pets, which cascade to caretakers, events, memories
3. **Soft deletes**: Consider adding `deleted_at` to users/pets for recovery period (not implemented yet)
4. **Indexing strategy**: Optimized for common queries (user's pets, active events, audit trail)
5. **JSON columns**: Used for flexible data (event metadata, audit changes, subscriptions)
6. **Timestamps**: All tables have created_at; mutable entities have updated_at
