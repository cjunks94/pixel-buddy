# ⚡ Pixel Buddy - Quick Start

**Get up and running in 30 seconds!**

---

## 🚀 Three Ways to Run Commands

### Option 1: Super Short (Recommended)
```bash
./dev up              # Start everything
./dev down            # Stop everything
./dev logs            # View logs
./dev status          # Check status
./dev db:migrate      # Run migrations
./dev db:psql         # Database shell
```

### Option 2: NPM Scripts
```bash
npm run up            # Start everything
npm run down          # Stop everything
npm run logs          # View logs
npm run restart       # Restart services

npm run docker:migrate   # Run migrations
npm run docker:seed      # Seed database
npm run docker:psql      # Database shell
npm run docker:shell     # App shell
```

### Option 3: Full Script
```bash
./scripts/dev.sh up
./scripts/dev.sh down
./scripts/dev.sh help
```

---

## 🎮 First Time Setup

```bash
# 1. Start everything (creates .env automatically)
./dev up

# 2. Database is auto-initialized! Just wait 10 seconds

# 3. Open browser
open http://localhost:3000

# Done! Your pet is alive! 🐾
```

---

## 📝 Common Commands

```bash
# Start development
./dev up

# View live logs
./dev logs

# Stop everything
./dev down

# Restart after code changes (or just save - auto-reloads!)
./dev restart

# Database shell
./dev db:psql

# Reset database (DESTRUCTIVE!)
./dev db:reset

# Check what's running
./dev status

# See all commands
./dev help
```

---

## 🔥 Hot Reload

**Just save your code - changes reload automatically!**

```bash
# Start once
./dev up

# Edit server.js or public/index.html
# → nodemon auto-restarts

# View logs to see reload
./dev logs
```

---

## 🧪 Test Your Pet

```bash
# Start services
./dev up

# Create a pet (in another terminal)
curl http://localhost:3000/api/pet/my-user-id

# Feed your pet
curl -X POST http://localhost:3000/api/pet/1/action \
  -H "Content-Type: application/json" \
  -d '{"action":"feed"}'

# Check health
curl http://localhost:3000/health

# Open in browser
open http://localhost:3000
```

---

## 🗄️ Database

```bash
# Open PostgreSQL shell
./dev db:psql

# Inside psql:
SELECT * FROM pets;
SELECT * FROM memories;
\dt                    # List tables
\q                     # Quit

# Seed sample data
./dev db:seed

# Reset everything (CAREFUL!)
./dev db:reset
```

---

## 🐛 Troubleshooting

### Port 3000 already in use?
```bash
# Find what's using it
lsof -i :3000

# Kill it
kill -9 <PID>

# Or change port in .env
echo "APP_PORT=3001" >> .env
./dev restart
```

### Services won't start?
```bash
# Check status
./dev status

# View logs
./dev logs

# Nuclear option - full rebuild
./dev down
./dev clean
./dev up
```

### Database not working?
```bash
# Check db logs
./dev logs db

# Restart database
docker-compose restart db

# Reset database
./dev db:reset
```

---

## 🎨 Customize

```bash
# Edit pet appearance
vim public/index.html         # Line 340: drawPet()

# Change database password
vim .env                       # Edit DB_PASSWORD
./dev restart

# Add new API endpoint
vim server.js                  # Add route
# Auto-reloads!
```

---

## 📊 What's Running?

```bash
./dev status

# You'll see:
# - PostgreSQL  → localhost:5432
# - Web App     → localhost:3000
# - Health      → localhost:3000/health
```

---

## 🚀 Deploy to Railway

```bash
# Push to GitHub
git push origin main

# Go to railway.app
# → New Project → Deploy from GitHub → pixel-buddy
# → Add PostgreSQL database
# → Deploy!

# Run migrations
railway run npm run db:migrate
```

---

## 🎯 Daily Workflow

```bash
# Morning
./dev up

# Code all day
# (auto-reload on every save)

# Check logs occasionally
./dev logs

# Evening
./dev down
```

---

## 💡 Pro Tips

1. **Keep logs open in a split terminal**
   ```bash
   # Terminal 1
   ./dev up
   ./dev logs

   # Terminal 2
   # Your code editor / testing
   ```

2. **Use aliases** (add to ~/.zshrc or ~/.bashrc)
   ```bash
   alias pup='cd ~/pixel-buddy && ./dev up'
   alias pdown='cd ~/pixel-buddy && ./dev down'
   alias plogs='cd ~/pixel-buddy && ./dev logs'
   ```

3. **Database snapshots before experiments**
   ```bash
   # Export data
   ./dev db:psql -c "COPY pets TO '/tmp/pets_backup.csv' CSV HEADER;"

   # Experiment...

   # Restore if needed
   ./dev db:reset
   ```

---

## ⚡ Speed Commands Reference

| Command | What it does |
|---------|-------------|
| `./dev up` | Start everything |
| `./dev down` | Stop everything |
| `./dev logs` | View app logs |
| `./dev status` | Service status |
| `./dev restart` | Restart all |
| `./dev db:psql` | Database shell |
| `./dev db:migrate` | Run migrations |
| `./dev db:seed` | Add sample data |
| `./dev db:reset` | ⚠️  Delete everything |
| `./dev shell` | App container shell |
| `./dev help` | All commands |

---

**That's it! Now go play with your immortal pet! 🐾**

Questions? Check [DEVELOPMENT.md](DEVELOPMENT.md) for the full guide.
