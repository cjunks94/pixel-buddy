# 🐾 Pixel Buddy - Immortal Tamagotchi

**Your AI-powered virtual pet that lives forever in PostgreSQL with multiplayer support**

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)

---

## 🎯 Project Overview

Pixel Buddy is a modern Tamagotchi-style virtual pet game with unique features:

- **🧠 AI-Powered Personality**: Pets respond intelligently using Ollama (local LLM)
- **💾 Persistent Memory**: All interactions stored in PostgreSQL - your pet never forgets
- **🌍 Multiplayer**: Visit friends' pets with 6-character world codes
- **♾️ Immortal**: Pets reincarnate on death with memories intact (coming soon)
- **📱 PWA Support**: Install as mobile app with offline capabilities

**Tech Stack**: Node.js, Express, PostgreSQL, Ollama AI, HTML5 Canvas, Railway PaaS

**Live Demo**: [Coming Soon]

---

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** and npm
- **PostgreSQL 14+** (or use Docker)
- **Ollama** (optional, for AI features) - [Install from ollama.ai](https://ollama.ai)

### 1. Clone & Install
```bash
git clone https://github.com/yourusername/pixel-buddy.git
cd pixel-buddy
npm install
```

### 2. Setup Database
```bash
# Start PostgreSQL (via Docker)
docker run --name pixel-postgres \
  -e POSTGRES_PASSWORD=mysecret \
  -e POSTGRES_DB=pixel_buddy \
  -p 5432:5432 -d postgres:16

# Run migrations
npm run db:migrate

# (Optional) Seed sample data
npm run db:seed
```

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env with your DATABASE_URL
```

### 4. Start Server
```bash
npm run dev
# Open http://localhost:3000
```

### 5. (Optional) Setup Ollama AI
```bash
# Install Ollama from https://ollama.ai
ollama pull llama3.2:1b
ollama serve
```

---

## 🎮 Features

### Core Gameplay
- **4 Stats System**: Hunger, Happiness, Energy, Hygiene
- **Interactive Actions**: Feed, Play, Clean, Sleep
- **Real-time Decay**: Stats decrease over time (every minute)
- **Visual Feedback**: Animated pixel pet with emotion indicators
- **Persistent State**: All data saved to PostgreSQL

### AI Memory System
- **Contextual Responses**: Pet remembers past interactions
- **Personality**: Responses vary based on current stats
- **Global AI Brain**: Shared learning across all pets
- **Fallback Mode**: Works without Ollama using rule-based responses

### Multiplayer
- **World Codes**: Generate unique 6-character codes (e.g., `POMO-42`)
- **Visit Friends**: Enter code to see friend's pet live
- **Auto-Refresh**: Visitor pets update every 10 seconds
- **Public Browser**: Discover popular open worlds
- **Visit Counter**: Track how many friends visited

### Coming Soon
- ☐ Death & Reincarnation system
- ☐ Evolution/leveling based on care
- ☐ Mini-games for stat bonuses
- ☐ Co-op multiplayer actions
- ☐ Pet-to-pet messaging
- ☐ Sprite customization
- ☐ Achievement system

---

## 🏗️ Architecture

```
pixel-buddy/
├── db/
│   ├── schema.sql          # Database schema (5 tables)
│   └── pool.js             # PostgreSQL connection pool
├── scripts/
│   ├── migrate.js          # Database migration runner
│   └── seed.js             # Sample data seeder
├── public/
│   ├── index.html          # Single-page app UI
│   └── manifest.json       # PWA manifest
├── server.js               # Express API server
├── package.json
├── Dockerfile              # Production container
└── railway.json            # Railway deployment config
```

### Database Schema

**Tables:**
- `pets` - Pet stats, lifecycle, multiplayer settings
- `memories` - AI interaction history
- `deaths` - Reincarnation log (planned)
- `visits` - Multiplayer visit tracking
- `ai_brain` - Global AI response cache

**Key Indexes:**
- `idx_pets_world_open` - Fast multiplayer world lookup
- `idx_memories_pet_id` - Quick memory retrieval for AI context

---

## 🔌 API Endpoints

| Method | Endpoint               | Description                    | Rate Limit |
|--------|------------------------|--------------------------------|------------|
| GET    | `/api/pet/:userId`     | Get or create pet              | -          |
| POST   | `/api/pet/:id/action`  | Perform action (feed/play/etc) | 30/min     |
| POST   | `/api/pet/:id/rename`  | Change pet name                | -          |
| POST   | `/api/pet/:id/world`   | Open/close world + get code    | -          |
| GET    | `/api/world/:code`     | Visit friend's world           | -          |
| GET    | `/api/worlds`          | Browse open worlds             | -          |
| POST   | `/api/pet/:id/talk`    | AI chat with pet               | 30/min     |
| GET    | `/api/pet/:id/memories`| Get pet memory history         | -          |
| GET    | `/health`              | Health check                   | -          |

---

## 🚢 Railway Deployment

### One-Click Deploy (Recommended)

1. Click the Railway button at the top
2. Connect your GitHub repo
3. Add **PostgreSQL** database service
4. (Optional) Add **Ollama** service for AI
5. Deploy! 🎉

### Manual Deployment

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add PostgreSQL
# (Do this in Railway dashboard: "+ New" → "Database" → "PostgreSQL")

# Set environment variables
railway variables set NODE_ENV=production
railway variables set OLLAMA_URL=http://ollama:11434

# Deploy
git push origin main
# Railway auto-deploys
```

### Environment Variables (Railway)

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}  # Auto-provided
OLLAMA_URL=${{Ollama.OLLAMA_URL}}        # If using Ollama service
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://yourdomain.com
```

---

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Manual testing checklist
- [ ] Pet creation works for new users
- [ ] All 4 actions (feed/play/clean/sleep) update stats
- [ ] Stats decay over time
- [ ] World code generation works
- [ ] Visiting friend's world displays their pet
- [ ] AI chat responds (or fallback works)
- [ ] Pet renaming persists
- [ ] Database migrations run successfully
```

---

## 🎨 Customization

### Change Pet Appearance
Edit the `drawPet()` function in `public/index.html:253`

### Adjust Stat Decay Rate
Modify interval in `startStatDecay()` at `public/index.html:493`

### Customize AI Personality
Edit the prompt template in `server.js:243`

### Add More Actions
1. Add button in `index.html` actions grid
2. Add case in `server.js` `/api/pet/:id/action` route
3. Define stat changes in `updates` object

---

## 🎯 Portfolio Highlights

**This project demonstrates:**

✅ **Full-Stack Development** - Express API + Canvas frontend + PostgreSQL
✅ **Real-Time Systems** - Live stat decay, visitor auto-refresh
✅ **AI Integration** - Ollama LLM with contextual memory
✅ **Multiplayer Architecture** - Code-based world system
✅ **Database Design** - Normalized schema, indexes, triggers
✅ **API Design** - RESTful endpoints, rate limiting, error handling
✅ **DevOps** - Docker, Railway deployment, migrations
✅ **PWA** - Installable mobile app with offline support

**Skills Showcased:**
- JavaScript (ES6+, Canvas API, async/await)
- Node.js/Express middleware pipeline
- PostgreSQL (schema design, triggers, indexes)
- AI/LLM integration (Ollama)
- Real-time multiplayer mechanics
- Production deployment (Railway PaaS)
- Technical documentation

---

## 🗺️ Roadmap

### Phase 1: MVP ✅
- [x] Basic pet with 4 stats
- [x] CRUD actions (feed/play/clean/sleep)
- [x] PostgreSQL persistence
- [x] Simple multiplayer (visit by code)
- [x] AI chat integration

### Phase 2: Social Features
- [ ] Death → Reincarnation with memory transfer
- [ ] Public world browser with search
- [ ] Pet-to-pet messaging system
- [ ] QR codes for mobile sharing
- [ ] Visit history & friend list

### Phase 3: Gameplay Depth
- [ ] Mini-games (reflex, memory, etc.)
- [ ] Evolution system (baby → adult → elder)
- [ ] Achievements & rewards
- [ ] Rare pet variants
- [ ] Co-op multiplayer actions

### Phase 4: Advanced AI
- [ ] Vector embeddings for memory search
- [ ] Personality archetypes (cheerful, grumpy, etc.)
- [ ] Dream generation (AI-created stories)
- [ ] Pet learns from all multiplayer visits

### Phase 5: Mobile Native
- [ ] React Native app
- [ ] Push notifications for low stats
- [ ] AR mode (pet in real world)
- [ ] Voice commands

---

## 🐛 Troubleshooting

### Database Connection Fails
```bash
# Check DATABASE_URL
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# Verify migrations ran
psql $DATABASE_URL -c "\dt"
```

### Ollama Not Responding
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Pull model
ollama pull llama3.2:1b

# Restart Ollama service
```

### Stats Not Decaying
- Check browser console for errors
- Ensure `startStatDecay()` is called in `init()`
- Verify tab is not suspended (browser throttling)

---

## 📄 License

MIT License - See LICENSE file for details.

---

## 🙏 Acknowledgments

- Inspired by classic Tamagotchi (1996)
- Ollama for local LLM inference
- Railway for seamless deployment
- Built as a portfolio project for senior engineering roles

---

## 📞 Contact

**Christopher Junker**
Senior Software Engineer
[GitHub](https://github.com/cjunker) • [LinkedIn](https://linkedin.com/in/yourprofile)

---

**Questions?** Open an issue in the repository.
**Deploy it?** Click the Railway button at the top!

**Status**: 🟢 MVP Complete
**Last Updated**: January 2025
