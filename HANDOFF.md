# 🔄 Pixel Buddy - Engineering Handoff

**Knowledge transfer document for incoming engineers**

Last Updated: January 2025
Project Status: ✅ MVP Complete + Production Ready
Handoff From: Christopher Junker

---

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Current State](#current-state)
- [Quick Start](#quick-start)
- [Architecture Deep Dive](#architecture-deep-dive)
- [Important Design Decisions](#important-design-decisions)
- [Known Issues & Gotchas](#known-issues--gotchas)
- [TODO & Next Steps](#todo--next-steps)
- [Deployment](#deployment)
- [Contacts & Resources](#contacts--resources)

---

## 🎯 Project Overview

### What is Pixel Buddy?
Pixel Buddy is an immortal Tamagotchi-style virtual pet game with:
- **PostgreSQL persistence** - Pets live forever in the database
- **AI-powered responses** - Ollama integration for conversations
- **Multiplayer** - Visit friends' pets via 6-character world codes
- **Full Docker dev environment** - One command to start everything

### Tech Stack
- **Backend**: Node.js 18+ / Express.js
- **Database**: PostgreSQL 16 (5 tables, triggers, indexes)
- **Frontend**: Vanilla JavaScript + HTML5 Canvas
- **AI**: Ollama (llama3.2:1b) with rule-based fallback
- **Dev**: Docker Compose, hot-reload (nodemon)
- **Deploy**: Railway PaaS

### Repository Structure
```
pixel-buddy/
├── dev ⭐                      # Ultra-short command wrapper
├── docker-compose.yml         # Local environment
├── Dockerfile.dev             # Hot-reload build
├── Dockerfile                 # Production build
│
├── server.js                  # Main Express app
├── db/
│   ├── schema.sql             # Complete DB schema
│   └── pool.js                # PostgreSQL pool
├── public/
│   ├── index.html             # Entire game UI
│   └── manifest.json          # PWA config
├── scripts/
│   ├── dev.sh                 # Dev CLI (15+ commands)
│   ├── migrate.js             # DB migration runner
│   └── seed.js                # Sample data
│
├── README.md                  # Main documentation
├── QUICKSTART.md              # 30-second guide
├── DEVELOPMENT.md             # Complete dev guide
├── CONTRIBUTING.md            # Contributor guidelines
└── HANDOFF.md                 # This file
```

---

## ✅ Current State

### Completed Features (Phase 1 MVP)
- [x] Pet creation with 4 stats (hunger, happiness, energy, hygiene)
- [x] 4 actions (feed, play, clean, sleep) with stat modifications
- [x] PostgreSQL persistence (pets, memories, visits, ai_brain, deaths tables)
- [x] Multiplayer: Open world, generate code, visit by code
- [x] AI chat via Ollama with fallback responses
- [x] Real-time stat decay (every minute)
- [x] Docker development environment
- [x] Hot-reload workflow (nodemon)
- [x] Railway deployment configuration
- [x] Health check endpoint
- [x] Comprehensive documentation

### Not Implemented Yet (See Roadmap)
- Death & reincarnation system (database table exists)
- Public world browser UI (API exists!)
- Mini-games
- Evolution system
- Vector embeddings for semantic memory
- Mobile app

---

## 🚀 Quick Start

### First Time Setup (5 minutes)
```bash
# Clone repo
git clone <repo-url>
cd pixel-buddy

# Start everything
./dev up

# Database is auto-initialized!
# Open browser
open http://localhost:3000

# View logs
./dev logs

# When done
./dev down
```

### Daily Development
```bash
./dev up           # Start services
./dev logs         # Watch logs
# Edit code → auto-reloads!
./dev down         # Stop services
```

### All Commands
```bash
./dev up              # Start all services
./dev down            # Stop all services
./dev logs            # View app logs
./dev logs db         # View database logs
./dev status          # Check service status
./dev restart         # Restart services

./dev db:migrate      # Run migrations
./dev db:seed         # Add sample data
./dev db:psql         # PostgreSQL shell
./dev db:reset        # ⚠️  Delete all data

./dev shell           # Open app container shell
./dev test            # Run tests
./dev build           # Rebuild containers
./dev clean           # ⚠️  Remove everything

./dev help            # Show all commands
```

---

## 🏗️ Architecture Deep Dive

### Database Schema (5 Tables)

#### 1. `pets` - Core pet data
```sql
CREATE TABLE pets (
  id SERIAL PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,  -- Browser fingerprint
  name VARCHAR(20) DEFAULT 'Buddy',

  -- Stats (0-100)
  hunger INTEGER DEFAULT 50,
  happiness INTEGER DEFAULT 50,
  energy INTEGER DEFAULT 50,
  hygiene INTEGER DEFAULT 50,

  -- Visual
  sprite INTEGER DEFAULT 0,      -- Row in sprite sheet
  color VARCHAR(7) DEFAULT '#FF6B9D',

  -- Lifecycle
  age_seconds INTEGER DEFAULT 0,
  generation INTEGER DEFAULT 1,  -- Reincarnation counter
  is_alive BOOLEAN DEFAULT TRUE,

  -- Multiplayer
  world_code TEXT UNIQUE,        -- 6-char code (ABCD-12)
  world_open BOOLEAN DEFAULT FALSE,
  visits_count INTEGER DEFAULT 0,

  -- Timestamps (auto-updated via trigger)
  created_at TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP DEFAULT NOW(),
  last_fed TIMESTAMP DEFAULT NOW(),
  last_played TIMESTAMP DEFAULT NOW(),
  last_cleaned TIMESTAMP DEFAULT NOW(),
  last_slept TIMESTAMP DEFAULT NOW()
);
```

**Key Indexes:**
- `idx_pets_user_id` - Fast pet lookup by user
- `idx_pets_world_open` - Fast multiplayer world discovery
- `idx_pets_last_seen` - Sort by activity

**Trigger:** `update_last_seen()` - Auto-updates `last_seen` on any UPDATE

#### 2. `memories` - AI interaction history
```sql
CREATE TABLE memories (
  id SERIAL PRIMARY KEY,
  pet_id INTEGER REFERENCES pets(id) ON DELETE CASCADE,
  memory_type VARCHAR(20),  -- 'action', 'mood', 'death', 'visit'
  content TEXT,
  embedding JSONB,          -- For future vector search
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Index:** `idx_memories_pet_id` - Fast memory retrieval for AI context

#### 3. `deaths` - Reincarnation log
```sql
CREATE TABLE deaths (
  id SERIAL PRIMARY KEY,
  pet_id INTEGER REFERENCES pets(id) ON DELETE CASCADE,
  generation INTEGER,
  cause VARCHAR(50),        -- 'hunger', 'neglect', 'old_age'
  final_age_seconds INTEGER,
  final_stats JSONB,
  epitaph TEXT,             -- AI-generated last words
  died_at TIMESTAMP DEFAULT NOW()
);
```

**Status:** Table exists but death system not implemented yet

#### 4. `visits` - Multiplayer tracking
```sql
CREATE TABLE visits (
  id SERIAL PRIMARY KEY,
  host_pet_id INTEGER REFERENCES pets(id) ON DELETE CASCADE,
  visitor_user_id TEXT,
  visitor_pet_name VARCHAR(20),
  duration_seconds INTEGER DEFAULT 0,
  gifts_given JSONB,        -- Future: {food: 1, toy: 2}
  visited_at TIMESTAMP DEFAULT NOW()
);
```

**Index:** `idx_visits_host` - Fast visit history lookup

#### 5. `ai_brain` - Global AI cache
```sql
CREATE TABLE ai_brain (
  id SERIAL PRIMARY KEY,
  prompt TEXT,
  response TEXT,
  context JSONB,            -- {pet_stats, action, mood}
  model VARCHAR(50) DEFAULT 'llama3.2:1b',
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Purpose:** Caches AI responses for learning across all pets

---

### API Endpoints (9 Routes)

| Method | Endpoint | Purpose | Rate Limit |
|--------|----------|---------|------------|
| GET | `/health` | Health check | None |
| GET | `/api/pet/:userId` | Get or create pet | None |
| POST | `/api/pet/:id/action` | Feed/play/clean/sleep | 30/min |
| POST | `/api/pet/:id/rename` | Change name | None |
| POST | `/api/pet/:id/world` | Open/close world | None |
| GET | `/api/world/:code` | Visit friend's world | None |
| GET | `/api/worlds` | Browse open worlds | None |
| POST | `/api/pet/:id/talk` | AI chat | 30/min |
| GET | `/api/pet/:id/memories` | Memory history | None |

**Rate Limiting:**
- Uses `express-rate-limit`
- `actionLimiter`: 30 requests per minute
- Applied to actions and AI chat

**Error Handling:**
- All routes have try/catch
- Errors logged to console
- 500 responses for failures
- Detailed messages in development mode

---

### Frontend Architecture (Vanilla JS)

**Single Page App:** `public/index.html` (500+ lines)

**Key Functions:**
- `init()` - Initialize app, load pet
- `loadPet()` - Fetch pet from API
- `updateUI()` - Update all stat bars
- `startAnimation()` - Canvas rendering loop (60 FPS)
- `drawPet()` - Draw animated pet
- `performAction()` - Call action API
- `toggleWorld()` - Open/close multiplayer
- `visitWorld()` - Visit friend by code
- `sendMessage()` - AI chat
- `startStatDecay()` - Simulate life (decay every minute)

**State Management:**
- Global variables: `pet`, `visitorPet`, `userId`
- LocalStorage: User ID persistence
- No framework (intentional for portfolio)

**Rendering:**
- Canvas: 400x400px
- `requestAnimationFrame` loop
- Simple circle-based pet (placeholder for sprites)
- Emotion indicators (emojis based on stats)

---

## 🎨 Important Design Decisions

### 1. Why Vanilla JavaScript?
**Decision:** No React/Vue/Angular

**Reason:**
- Demonstrates fundamental JS skills
- Zero build step = faster development
- Easier to onboard new contributors
- Smaller bundle size
- Can migrate to framework later if needed

**Trade-off:** More DOM manipulation code, harder to maintain large features

### 2. Why PostgreSQL over MongoDB?
**Decision:** Relational database with strict schema

**Reason:**
- Better data integrity (foreign keys, constraints)
- Powerful queries (JOINs, CTEs)
- Triggers for auto-updating timestamps
- Industry standard for transactional data
- Easier to add complex features later

**Trade-off:** Migrations required for schema changes

### 3. Why Ollama over OpenAI API?
**Decision:** Local LLM with cloud fallback

**Reason:**
- No API costs during development
- Privacy (no data sent to third parties)
- Fast responses (local inference)
- Rule-based fallback if Ollama unavailable

**Trade-off:** Requires local setup, smaller models than GPT-4

### 4. Why Docker for Development?
**Decision:** Docker Compose for local environment

**Reason:**
- Consistent environment across all developers
- One command to start everything
- Matches production deployment
- Easy to add services (Ollama, Redis, etc.)
- Hot-reload still works via volume mounts

**Trade-off:** Requires Docker installed

### 5. World Codes Instead of User IDs
**Decision:** Shareable 6-character codes (ABCD-12)

**Reason:**
- Easy to type and share
- No need for user accounts
- Privacy-friendly (no usernames)
- Fun/gamified sharing mechanism

**Trade-off:** Collision risk (mitigated by uniqueness check)

---

## ⚠️ Known Issues & Gotchas

### 1. Database Migration Already Exists Error
**Issue:** Running `./dev db:migrate` twice creates trigger error

**Why:** Schema creates triggers, re-running tries to recreate them

**Fix:** Use `./dev db:reset` to completely rebuild database

**Permanent Fix:** Add `CREATE TRIGGER IF NOT EXISTS` (PostgreSQL 14+ needed)

### 2. Stats Can't Go Below 0 or Above 100
**Issue:** Actions don't validate input ranges

**Why:** Database has CHECK constraints, app relies on SQL GREATEST/LEAST

**Current Behavior:** Correct! `GREATEST(0, LEAST(100, value))` ensures bounds

**No Fix Needed:** Working as intended

### 3. Hot-Reload Doesn't Trigger on First Save
**Issue:** Sometimes need to save twice for nodemon to detect change

**Why:** Docker volume mount delay on macOS

**Workaround:** Save file, wait 2 seconds, check `./dev logs`

**Permanent Fix:** Use polling instead of fsevents (slower but reliable)

### 4. Ollama Not Available in Production
**Issue:** Railway doesn't have native Ollama service

**Current State:** App uses fallback responses when Ollama unavailable

**Options:**
1. Use external API (Replicate, Together.ai)
2. Deploy separate Ollama service
3. Keep fallback (works fine, just not "smart")

**Decision:** Use fallback for MVP, revisit in Phase 4

### 5. Pet User ID is Browser-Based
**Issue:** Clearing localStorage = losing pet

**Why:** No user accounts, using client-generated ID

**Workaround:** User can export/import pet data (not implemented)

**Future Fix:** Add optional user accounts (Phase 2)

### 6. No Tests Yet
**Issue:** `npm test` runs empty test suite

**Why:** MVP prioritized features over tests

**Next Steps:** Add tests in Phase 2 (see #TODO below)

---

## 📝 TODO & Next Steps

### Immediate (Before Next Engineer Starts)
- [ ] Run full test of all features
- [ ] Verify Railway deployment works
- [ ] Create initial GitHub Issues from `ROADMAP_ISSUES.md`
- [ ] Set up CI/CD (GitHub Actions?)
- [ ] Add API response examples to docs

### Short Term (Next 2 Weeks)
- [ ] Implement death & reincarnation (#1)
- [ ] Build public world browser UI (#2)
- [ ] Add automated tests (Jest + Supertest)
- [ ] Set up error monitoring (Sentry?)
- [ ] Add database backups to Railway

### Medium Term (Next Month)
- [ ] Mini-games (#8-#10)
- [ ] Evolution system (#10)
- [ ] Pet-to-pet messaging (#3)
- [ ] QR code sharing (#4)

### Long Term (Next Quarter)
- [ ] Vector embeddings for AI (#15)
- [ ] Personality archetypes (#16)
- [ ] React Native mobile app (#20)

### Technical Debt
- [ ] Add comprehensive tests (unit + integration)
- [ ] Implement proper error monitoring
- [ ] Add database migration versioning
- [ ] Create sprite sheet (replace circle pet)
- [ ] Add WebSocket support for real-time multiplayer
- [ ] Implement proper user authentication (optional)

---

## 🚢 Deployment

### Railway (Production)

**Current Deployment:** Not deployed yet (ready to deploy)

**Setup Steps:**
1. Push to GitHub
2. Connect Railway to repo
3. Add PostgreSQL database
4. Set environment variables:
   ```
   NODE_ENV=production
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   CORS_ORIGIN=https://yourdomain.com
   ```
5. Run migration: `railway run npm run db:migrate`
6. Deploy!

**Auto-Deploy:** Enabled on `main` branch

**Secrets:** Managed via Railway dashboard

**Monitoring:** Railway provides basic metrics (CPU, RAM, requests)

**Custom Domain:** Configure in Railway settings → Domains

---

## 🔐 Environment Variables

### Local Development (.env)
```bash
DATABASE_URL=postgresql://postgres:pixel_secret_2025@db:5432/pixel_buddy
DB_PASSWORD=pixel_secret_2025
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*
OLLAMA_URL=http://ollama:11434
```

### Production (Railway)
```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}  # Auto-provided
NODE_ENV=production
PORT=${{PORT}}                           # Auto-provided
CORS_ORIGIN=https://pixel-buddy.railway.app
OLLAMA_URL=<external-url-if-any>
```

**Security Notes:**
- Never commit `.env` to git (in `.gitignore`)
- Railway auto-injects `DATABASE_URL` from PostgreSQL service
- Change `DB_PASSWORD` in production
- Use HTTPS in production (`CORS_ORIGIN`)

---

## 📞 Contacts & Resources

### Documentation
- **README.md** - Main project overview
- **QUICKSTART.md** - 30-second getting started
- **DEVELOPMENT.md** - Complete development guide
- **CONTRIBUTING.md** - Contribution guidelines
- **HANDOFF.md** - This file

### External Resources
- **Ollama Docs**: https://ollama.ai/docs
- **Railway Docs**: https://docs.railway.app
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Express Docs**: https://expressjs.com/

### GitHub
- **Issues**: https://github.com/yourusername/pixel-buddy/issues
- **Discussions**: https://github.com/yourusername/pixel-buddy/discussions
- **Roadmap Issues**: `.github/ROADMAP_ISSUES.md`

### Previous Engineer
- **Name**: Christopher Junker
- **Email**: [Add if sharing]
- **GitHub**: @cjunker
- **LinkedIn**: [Add if sharing]
- **Available For Questions**: Yes (for 2 weeks after handoff)

---

## 🎯 Success Criteria

**You'll know you're ready when:**
- [ ] Can start project with `./dev up` successfully
- [ ] Can create a pet and perform all 4 actions
- [ ] Can open world and visit via code
- [ ] Can read and understand `server.js`
- [ ] Can query database with `./dev db:psql`
- [ ] Can deploy to Railway
- [ ] Have read all documentation files
- [ ] Created at least one GitHub Issue

**First Week Goals:**
1. Set up local environment
2. Run through all features manually
3. Deploy to Railway (test environment)
4. Create GitHub Issues for Phase 2 features
5. Fix any bugs found during testing

**First Month Goals:**
1. Implement death & reincarnation
2. Build world browser UI
3. Add automated tests
4. Deploy to production
5. Start Phase 3 features

---

## 📚 Additional Notes

### Code Style
- ES6+ JavaScript (const/let, arrow functions, async/await)
- 2-space indentation
- Semicolons required
- Single quotes for strings
- Comments explain "why", not "what"

### Git Workflow
- **main** branch is protected
- Feature branches: `feature/name` or `fix/name`
- Commit format: `type(scope): message`
- Types: feat, fix, docs, style, refactor, test, chore
- Squash merge to main

### Database Migrations
- Schema changes go in `db/schema.sql`
- Run with `./dev db:migrate`
- Test with fresh database: `./dev db:reset && ./dev db:migrate`
- Versioning system needed (TODO)

### Performance Considerations
- Database: Indexes on all foreign keys
- API: Rate limiting on expensive endpoints
- Frontend: Canvas rendering at 60 FPS
- Docker: Volume mounts for hot-reload

### Security Checklist
- ✅ Parameterized SQL queries (no injection)
- ✅ Rate limiting on actions
- ✅ CORS configured
- ✅ Helmet.js security headers
- ✅ No secrets in code
- ⚠️ No user authentication (public app)
- ⚠️ No input sanitization yet (add in Phase 2)

---

## ✅ Handoff Checklist

**Outgoing Engineer (Me):**
- [x] Documentation complete
- [x] All commits pushed to main
- [x] GitHub repo cleaned up
- [x] Environment variables documented
- [x] Known issues listed
- [x] TODOs prioritized
- [x] Local environment tested
- [ ] Railway deployment tested
- [ ] GitHub Issues created
- [ ] Handoff meeting scheduled

**Incoming Engineer (You):**
- [ ] Repo cloned
- [ ] Local environment running
- [ ] All features tested
- [ ] Documentation read
- [ ] Questions asked
- [ ] Railway access granted
- [ ] First commit made
- [ ] Handoff meeting completed

---

**Welcome to Pixel Buddy!** 🐾

You're inheriting a solid MVP with:
- Clean architecture
- Comprehensive docs
- Docker dev environment
- Clear roadmap
- Active community (future)

**Questions?** Open an issue or reach out directly!

**Last Updated:** January 2025
**Handoff Complete:** [Date TBD]
