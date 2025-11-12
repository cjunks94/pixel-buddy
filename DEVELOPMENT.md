# 🛠️ Pixel Buddy - Development Guide

Complete guide for local development and deployment to Railway.

---

## ⚡ Command Reference (Three Ways)

### Option 1: Ultra-Short (Recommended)
```bash
./dev up              # Start everything
./dev down            # Stop everything
./dev logs            # View logs
./dev status          # Check services
./dev db:migrate      # Run migrations
./dev db:psql         # Database shell
./dev help            # All commands
```

### Option 2: NPM Scripts
```bash
npm run up            # Start
npm run down          # Stop
npm run logs          # View logs
npm run docker:migrate   # Migrate database
npm run docker:seed      # Seed database
```

### Option 3: Full Script Path
```bash
./dev up
./dev down
```

**All examples below use `./dev` for brevity** - use whichever style you prefer!

---

## 🚀 Quick Start (Docker - Recommended)

### Prerequisites
- Docker & Docker Compose
- Git

### 1. Clone & Start (60 seconds)
```bash
git clone https://github.com/yourusername/pixel-buddy.git
cd pixel-buddy

# Start everything (creates .env automatically)
./dev up

# Run migrations
./dev db:migrate

# Open browser
open http://localhost:3000
```

**That's it!** 🎉 Your pet is alive at http://localhost:3000

---

## 📦 What's Running?

```bash
./dev status
```

**Services:**
- 🌐 **Web App** - `localhost:3000` (hot-reload enabled)
- 🗄️ **PostgreSQL** - `localhost:5432` (with persistent volume)
- 🤖 **Ollama** - `localhost:11434` (optional, uncomment in docker-compose.yml)

---

## 🎮 Development Workflow

### Start Development
```bash
./dev up
```

### View Logs
```bash
# All services
./dev logs

# Specific service
./dev logs app
./dev logs db
```

### Make Code Changes
- Edit files in `server.js`, `public/`, `db/`
- **Changes auto-reload** (nodemon watches for file changes)
- Refresh browser to see updates

### Stop Services
```bash
./dev down
```

### Restart Services
```bash
./dev restart
```

---

## 🗄️ Database Management

### Run Migrations
```bash
./dev db:migrate
```

### Seed Sample Data
```bash
./dev db:seed
```

### Open PostgreSQL Shell
```bash
./dev db:psql

# Then run SQL queries:
pixel_buddy=# SELECT * FROM pets;
pixel_buddy=# \dt    -- List tables
pixel_buddy=# \q     -- Quit
```

### Reset Database (⚠️ DESTRUCTIVE)
```bash
./dev db:reset
# This deletes ALL data and recreates tables
```

### Manual Database Access
```bash
# Connection string (from .env)
postgresql://postgres:pixel_secret_2025@localhost:5432/pixel_buddy

# Using psql directly
psql postgresql://postgres:pixel_secret_2025@localhost:5432/pixel_buddy
```

---

## 🤖 AI Features (Ollama Setup)

### Option 1: Docker (Easier)
```bash
# 1. Edit docker-compose.yml - uncomment the ollama service
# 2. Restart services
./dev down
./dev up

# 3. Pull AI model
docker-compose exec ollama ollama pull llama3.2:1b

# 4. Test
curl http://localhost:11434/api/tags
```

### Option 2: Native Installation
```bash
# 1. Install from https://ollama.ai
brew install ollama  # macOS
# or download from website

# 2. Start Ollama
ollama serve

# 3. Pull model
ollama pull llama3.2:1b

# 4. Update .env
OLLAMA_URL=http://localhost:11434
```

### Test AI Chat
1. Open http://localhost:3000
2. Scroll to "💬 Talk to your pet"
3. Type a message and click Send
4. Your pet responds using AI!

**Fallback Mode**: If Ollama isn't running, the app uses rule-based responses.

---

## 🔧 Advanced Commands

### Open App Shell
```bash
./dev shell

# Inside container:
/app $ npm run db:migrate
/app $ node -e "console.log('Hello from Node')"
/app $ exit
```

### Run Tests
```bash
./dev test
```

### Rebuild Containers
```bash
# Rebuild after changing Dockerfile or package.json
./dev build

# Force rebuild with no cache
docker-compose build --no-cache
```

### Clean Everything (⚠️ DESTRUCTIVE)
```bash
./dev clean
# Removes containers, volumes, images
```

---

## 🌐 Deploy to Railway

### Prerequisites
- Railway account (free tier available)
- GitHub account

### Method 1: One-Click Deploy (Fastest)

1. **Push to GitHub**
   ```bash
   git remote add origin https://github.com/yourusername/pixel-buddy.git
   git push -u origin main
   ```

2. **Deploy to Railway**
   - Go to [railway.app](https://railway.app)
   - Click "New Project" → "Deploy from GitHub"
   - Select `pixel-buddy` repository
   - Railway auto-detects Dockerfile ✅

3. **Add PostgreSQL Database**
   - In Railway project: Click "+ New"
   - Select "Database" → "PostgreSQL"
   - Railway auto-creates `DATABASE_URL` variable ✅

4. **Run Migrations**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli

   # Login
   railway login

   # Link project
   railway link

   # Run migration
   railway run npm run db:migrate
   ```

5. **Set Environment Variables**
   - In Railway dashboard → Variables:
   ```
   NODE_ENV=production
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   CORS_ORIGIN=https://yourdomain.com
   ```

6. **Done!** 🎉
   - Your app is live at `https://yourproject.railway.app`

### Method 2: Railway CLI

```bash
# Install CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway up

# Add PostgreSQL
# (Do this in Railway dashboard)

# Run migrations
railway run npm run db:migrate

# Open in browser
railway open
```

### Railway + Ollama (Optional)

Railway doesn't have a native Ollama service yet. Options:

**Option A: External Ollama** (Recommended)
- Use [Replicate](https://replicate.com) or [Together.ai](https://together.ai)
- Update `server.js` to use their API instead

**Option B: Separate Ollama Server**
- Deploy Ollama on a separate Railway service
- Set `OLLAMA_URL` to that service's URL

**Option C: Disable AI**
- App works without Ollama using fallback responses

---

## 🧪 Testing

### Manual Testing Checklist
```bash
# Start app
./dev up
./dev db:migrate

# Test in browser (http://localhost:3000)
- [ ] Pet appears and animates
- [ ] Clicking "Feed" increases hunger stat
- [ ] Clicking "Play" increases happiness
- [ ] Stats decay over time (wait 1 minute)
- [ ] Renaming pet works and persists
- [ ] Opening world generates code
- [ ] Visiting friend's world shows their pet
- [ ] AI chat responds (or shows fallback)
- [ ] Page refresh keeps pet alive

# Test database
./dev db:psql
SELECT * FROM pets;
SELECT * FROM memories;
```

### Automated Tests (Coming Soon)
```bash
npm test
```

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Check what's using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or change port in .env
APP_PORT=3001
```

### Database Connection Failed
```bash
# Check if PostgreSQL is running
./dev status

# Restart database
docker-compose restart db

# Check logs
./dev logs db
```

### Hot-Reload Not Working
```bash
# Restart app service
docker-compose restart app

# Check logs for errors
./dev logs app
```

### Ollama Not Responding
```bash
# Check if running
curl http://localhost:11434/api/tags

# Restart Ollama
docker-compose restart ollama

# Pull model again
docker-compose exec ollama ollama pull llama3.2:1b
```

### Docker Disk Space Issues
```bash
# Clean up unused resources
docker system prune -a

# Or use our clean command (removes project volumes)
./dev clean
```

---

## 📁 Project Structure

```
pixel-buddy/
├── server.js               # Express API server
├── Dockerfile              # Production build
├── Dockerfile.dev          # Development build (hot-reload)
├── docker-compose.yml      # Local dev environment
├── package.json            # Dependencies & scripts
│
├── db/
│   ├── schema.sql          # Database schema
│   └── pool.js             # PostgreSQL connection
│
├── scripts/
│   ├── dev.sh              # Development helper (⭐ USE THIS)
│   ├── migrate.js          # Migration runner
│   └── seed.js             # Sample data seeder
│
├── public/
│   ├── index.html          # Full game UI
│   └── manifest.json       # PWA manifest
│
└── .env                    # Your local config (not in git)
```

---

## 🔐 Environment Variables Reference

### Local Development (.env)
```bash
DATABASE_URL=postgresql://postgres:pixel_secret_2025@db:5432/pixel_buddy
DB_PASSWORD=pixel_secret_2025
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*
OLLAMA_URL=http://ollama:11434
```

### Railway Production
```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}  # Auto-provided
NODE_ENV=production
PORT=${{PORT}}                           # Auto-provided
CORS_ORIGIN=https://yourdomain.com
OLLAMA_URL=<external-ollama-url>         # If using
```

---

## 🎨 Customization

### Change Database Password
```bash
# Edit .env
DB_PASSWORD=your_new_password

# Update DATABASE_URL
DATABASE_URL=postgresql://postgres:your_new_password@db:5432/pixel_buddy

# Restart
./dev down
./dev up
```

### Add New API Endpoint
1. Edit `server.js`
2. Add route (e.g., `app.get('/api/my-endpoint', ...)`)
3. Save (auto-reloads)
4. Test: `curl http://localhost:3000/api/my-endpoint`

### Modify Database Schema
1. Edit `db/schema.sql`
2. Run migration: `./dev db:migrate`
3. Or reset: `./dev db:reset`

---

## 📊 Monitoring

### View Service Status
```bash
./dev status
```

### Check Health Endpoint
```bash
curl http://localhost:3000/health
```

### Watch Logs in Real-Time
```bash
./dev logs app
```

### Database Metrics
```bash
./dev db:psql

# Inside psql:
SELECT COUNT(*) FROM pets;
SELECT COUNT(*) FROM memories;
SELECT pg_size_pretty(pg_database_size('pixel_buddy'));
```

---

## 🚢 Production Deployment Checklist

- [ ] Update `CORS_ORIGIN` to your domain
- [ ] Set `NODE_ENV=production`
- [ ] Use Railway-provided `DATABASE_URL`
- [ ] Run `railway run npm run db:migrate`
- [ ] Test health endpoint: `/health`
- [ ] Verify SSL certificate (Railway auto-provides)
- [ ] Configure custom domain (optional)
- [ ] Set up monitoring/alerts

---

## 🎯 Next Steps

**Local Development:**
```bash
./dev up        # Start developing
./dev db:seed   # Add sample data
./dev logs      # Debug issues
```

**Ready to Deploy:**
```bash
git push origin main       # Push to GitHub
# Then deploy via Railway dashboard
```

**Need Help?**
- Check troubleshooting section above
- Open an issue on GitHub
- View logs: `./dev logs`

---

**Happy Coding!** 🐾
