# Ollama AI Setup Guide for Pixel Buddy

## Table of Contents
- [What is Ollama?](#what-is-ollama)
- [Why llama3.2:1b?](#why-llama321b)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Testing](#testing)
- [Docker Deployment](#docker-deployment)
- [Troubleshooting](#troubleshooting)
- [Performance Tuning](#performance-tuning)

---

## What is Ollama?

Ollama is an open-source platform that runs large language models (LLMs) locally on your machine. For Pixel Buddy, this means:

✅ **Privacy**: All AI responses generated locally, no data sent to external servers
✅ **Speed**: No network latency, instant responses
✅ **Cost**: $0 per request, unlimited usage
✅ **Offline**: Works without internet after initial setup
✅ **Control**: Full control over model selection and behavior

**Architecture:**
```
User chats with pet → Express API → Ollama (localhost:11434) → llama3.2:1b → AI Response
```

---

## Why llama3.2:1b?

The `llama3.2:1b` model is perfect for Pixel Buddy's virtual pet chat:

| Feature | Value | Benefit |
|---------|-------|---------|
| **Size** | 1.3GB download | Small enough for any device |
| **RAM** | 2GB required | Runs without GPU |
| **Speed** | 2-5 sec/response | Fast enough for real-time chat |
| **Quality** | Good for dialogue | Natural pet personality |
| **Context** | 8K tokens | Remembers dozens of interactions |

**Example Responses:**
```
Stats: hunger=90, happiness=30, energy=10
User: "Let's play!"
Pet: "*yawns* I'm really tired and need food... can we rest first?"

Stats: hunger=80, happiness=90, energy=80
User: "How are you?"
Pet: "I'm feeling amazing! Want to play together? 🎮"
```

---

## Quick Start

### Prerequisites
- **macOS**: macOS 11+ (Big Sur or newer)
- **Linux**: Ubuntu 20.04+, Debian 11+, or any modern distro
- **Windows**: Windows 10/11 with WSL2 (or native Windows preview)
- **RAM**: 4GB minimum (8GB recommended)
- **Disk**: 2GB free space

### 1. Install Ollama

**macOS:**
```bash
# Option 1: Official installer (recommended)
curl -fsSL https://ollama.com/install.sh | sh

# Option 2: Homebrew
brew install ollama

# Launch the app
open -a Ollama
```

**Linux:**
```bash
# Official install script
curl -fsSL https://ollama.com/install.sh | sh

# Ollama runs as a systemd service automatically
sudo systemctl status ollama

# Start if not running
sudo systemctl start ollama
sudo systemctl enable ollama  # Auto-start on boot
```

**Windows (WSL2 - Recommended):**
```bash
# Inside WSL2 Ubuntu
curl -fsSL https://ollama.com/install.sh | sh
ollama serve
```

### 2. Download the Model

```bash
# Pull llama3.2:1b (1.3GB download)
ollama pull llama3.2:1b

# This downloads to:
# ~/.ollama/models/ (macOS/Linux)
# C:\Users\<username>\.ollama\models\ (Windows)
```

**Expected output:**
```
pulling manifest
pulling 8eeb52dfb3bb... 100% ▕████████████████▏ 1.3 GB
pulling 73b313b5552d... 100% ▕████████████████▏  11 KB
pulling 0ba8f0e314b4... 100% ▕████████████████▏  12 KB
pulling 56bb8bd477a5... 100% ▕████████████████▏   96 B
pulling 1a4c3c319823... 100% ▕████████████████▏  485 B
verifying sha256 digest
writing manifest
success
```

### 3. Verify Installation

```bash
# Check Ollama version
ollama --version
# Output: ollama version is 0.1.42

# List installed models
ollama list
# Output:
# NAME              ID              SIZE      MODIFIED
# llama3.2:1b       abc123def456    1.3 GB    2 minutes ago

# Check service is running
curl http://localhost:11434/
# Output: Ollama is running
```

### 4. Test the Model

```bash
# Interactive chat
ollama run llama3.2:1b

# You'll see:
>>> Hello! How are you?
I'm doing great, thanks for asking! How can I help you today?

>>> Exit
# Press Ctrl+D or type /bye to exit
```

---

## Installation

### Detailed Installation by Platform

#### macOS

**Method 1: Official Installer (Recommended)**

1. Download from [ollama.com/download](https://ollama.com/download)
2. Open the `.zip` file
3. Drag `Ollama.app` to Applications folder
4. Launch Ollama from Applications
5. Ollama icon appears in menu bar (means it's running)

**Method 2: Homebrew**

```bash
brew install ollama

# Note: Brew version may lag behind official releases
# Start manually
ollama serve
```

**Verify:**
```bash
ollama --version
ps aux | grep ollama  # Check process is running
curl http://localhost:11434/  # Test API
```

#### Linux

**Ubuntu/Debian:**

```bash
# Install
curl -fsSL https://ollama.com/install.sh | sh

# The script:
# 1. Downloads ollama binary to /usr/local/bin/
# 2. Creates ollama user
# 3. Installs systemd service
# 4. Starts the service

# Check status
sudo systemctl status ollama.service

# View logs
sudo journalctl -u ollama -f

# Restart service
sudo systemctl restart ollama
```

**Manual Installation:**

```bash
# Download binary
sudo curl -L https://ollama.com/download/ollama-linux-amd64 -o /usr/local/bin/ollama
sudo chmod +x /usr/local/bin/ollama

# Create user
sudo useradd -r -s /bin/false -m -d /usr/share/ollama ollama

# Create systemd service
sudo tee /etc/systemd/system/ollama.service > /dev/null <<EOF
[Unit]
Description=Ollama Service
After=network-online.target

[Service]
ExecStart=/usr/local/bin/ollama serve
User=ollama
Group=ollama
Restart=always
RestartSec=3
Environment="HOME=/usr/share/ollama"
Environment="OLLAMA_MODELS=/usr/share/ollama/.ollama/models"

[Install]
WantedBy=default.target
EOF

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable ollama
sudo systemctl start ollama
```

#### Windows

**Option 1: WSL2 (Recommended for Development)**

```bash
# Install WSL2 first
wsl --install

# Inside WSL2
wsl
curl -fsSL https://ollama.com/install.sh | sh
ollama serve
```

**Option 2: Native Windows (Preview)**

1. Download Windows installer from [ollama.com/download](https://ollama.com/download)
2. Run `OllamaSetup.exe`
3. Ollama runs as Windows service automatically
4. Test: `curl http://localhost:11434/`

---

## Testing

### Test Ollama Installation

```bash
# 1. Health check
curl http://localhost:11434/
# Expected: Ollama is running

# 2. API version
curl http://localhost:11434/api/version
# Expected: {"version":"0.1.42"}

# 3. List models
ollama list
# Expected: llama3.2:1b in the list

# 4. Model info
curl http://localhost:11434/api/show -d '{
  "name": "llama3.2:1b"
}'
```

### Test AI Generation

```bash
# Simple generation (non-streaming)
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.2:1b",
  "prompt": "Say hello in 3 words",
  "stream": false
}'

# Expected response:
{
  "model": "llama3.2:1b",
  "created_at": "2025-01-12T10:30:45Z",
  "response": "Hello there friend",
  "done": true,
  "total_duration": 2500000000,
  "eval_count": 3
}
```

### Test Pixel Buddy Integration

**Start Pixel Buddy:**
```bash
# Using Docker
docker-compose up -d

# Or manually
npm install
npm run dev
```

**Test AI chat endpoint:**
```bash
# 1. Create a test pet
curl http://localhost:3000/api/pet/test-user-ollama | jq

# Get the pet ID from response (e.g., "id": 7)

# 2. Test AI chat
curl -X POST http://localhost:3000/api/pet/7/talk \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello! How are you feeling?"}'

# Expected response:
{
  "response": "Hi! I'm feeling pretty good! Want to play together? 😊"
}

# 3. Test with different stats (feed/play/etc first, then chat)
curl -X POST http://localhost:3000/api/pet/7/action \
  -H "Content-Type: application/json" \
  -d '{"action": "feed"}'

curl -X POST http://localhost:3000/api/pet/7/talk \
  -H "Content-Type: application/json" \
  -d '{"message": "Feeling better now?"}'

# Expected: Response reflects better stats
```

### Performance Benchmarking

```bash
# Test response time
time curl -X POST http://localhost:3000/api/pet/7/talk \
  -H "Content-Type: application/json" \
  -d '{"message": "Hi!"}'

# Expected timing:
# First request: 5-15 seconds (model loading)
# Subsequent: 2-5 seconds (model in memory)
```

---

## Docker Deployment

### Development (Local)

The Pixel Buddy `docker-compose.yml` includes an Ollama service. To enable it:

**Step 1: Enable Ollama service**

Edit `docker-compose.yml` and uncomment the Ollama service (or it will be enabled automatically in the next step).

**Step 2: Start services**

```bash
# Start all services (db, ollama, app)
docker-compose up -d

# Check status
docker-compose ps

# Expected output:
NAME                  STATUS
pixel-buddy-db        Up (healthy)
pixel-buddy-ollama    Up (healthy)
pixel-buddy-app       Up

# View logs
docker-compose logs -f ollama
docker-compose logs -f app
```

**Step 3: Wait for model download**

The first time Ollama starts, it will download llama3.2:1b automatically. This takes 2-5 minutes.

```bash
# Watch the download progress
docker-compose logs -f ollama

# Expected output:
# Waiting for Ollama to start...
# ✅ Ollama server is ready!
# Checking model: llama3.2:1b
# 📥 Downloading model: llama3.2:1b
# pulling manifest
# pulling 8eeb52dfb3bb... 100% ▕████████████████▏ 1.3 GB
# ✅ Model llama3.2:1b downloaded successfully
```

**Step 4: Test integration**

```bash
# Test Ollama is running
curl http://localhost:11434/
# Output: Ollama is running

# Test Pixel Buddy AI chat
curl -X POST http://localhost:3000/api/pet/1/talk \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!"}'
```

### Production Deployment

For production, use the optimized Docker Compose configuration:

**docker-compose.production.yml** (optimized for Railway, Render, etc.):

```yaml
services:
  ollama:
    image: ollama/ollama:latest
    restart: unless-stopped
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:11434/"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 4G
        reservations:
          memory: 2G
    environment:
      - OLLAMA_MODELS=llama3.2:1b
      - OLLAMA_KEEP_ALIVE=5m
      - OLLAMA_MAX_QUEUE=128

volumes:
  ollama_data:
```

**Deploy:**
```bash
# Using production compose file
docker-compose -f docker-compose.production.yml up -d

# Or with Railway
# 1. Add Ollama service in Railway dashboard
# 2. Set OLLAMA_URL environment variable in app service
# 3. Deploy
```

---

## Troubleshooting

### Common Issues

#### 1. "Connection Refused" (ECONNREFUSED)

**Symptom:**
```
Error: connect ECONNREFUSED 127.0.0.1:11434
```

**Cause**: Ollama server not running

**Fix:**
```bash
# macOS: Launch Ollama.app
open -a Ollama

# Linux: Start systemd service
sudo systemctl start ollama

# Docker: Check container
docker ps | grep ollama
docker start pixel-buddy-ollama

# Manual start
ollama serve
```

#### 2. "Model Not Found" (404)

**Symptom:**
```json
{
  "error": "model 'llama3.2:1b' not found, try pulling it first"
}
```

**Cause**: Model not downloaded

**Fix:**
```bash
# Pull the model
ollama pull llama3.2:1b

# Verify
ollama list

# In Docker
docker exec pixel-buddy-ollama ollama pull llama3.2:1b
```

#### 3. "Timeout" (ETIMEDOUT)

**Symptom:**
```
Error: timeout of 10000ms exceeded
```

**Causes & Fixes:**

**First request (model loading):**
```bash
# This is normal - model loads into memory (5-15s)
# Just wait or increase timeout in server.js:
const timeout = 30000;  # 30 seconds for first request
```

**CPU too slow:**
```bash
# Use smaller model
ollama pull tinyllama

# Or use GPU (if available)
# Docker: Add GPU support
```

**Response too long:**
```javascript
// Limit response length in server.js
options: {
  num_predict: 50  // Max 50 tokens
}
```

#### 4. "Out of Memory"

**Symptom:**
```
error loading model: failed to allocate memory
```

**Cause**: Insufficient RAM

**Fix:**
```bash
# Check available memory
free -h

# Close other applications

# Use quantized model (smaller)
ollama pull llama3.2:1b-q4_0

# Increase Docker memory
docker update --memory 4g pixel-buddy-ollama
```

#### 5. "Queue Full" (503)

**Symptom:**
```json
{
  "error": "server is busy, queue is full"
}
```

**Cause**: Too many concurrent requests

**Fix:**
```bash
# Increase queue size
# Add to docker-compose.yml:
environment:
  - OLLAMA_MAX_QUEUE=256  # Default: 128

# Or add rate limiting in Express (already implemented)
```

#### 6. Slow Responses (>10 seconds)

**Cause**: CPU-only inference is slow

**Solutions:**

**Option 1: Use GPU**
```yaml
# docker-compose.yml
services:
  ollama:
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

**Option 2: Use smaller model**
```bash
ollama pull tinyllama  # Faster, lower quality
```

**Option 3: Optimize settings**
```javascript
// server.js
{
  model: 'llama3.2:1b',
  options: {
    num_predict: 50,     // Shorter responses
    temperature: 0.7     // Less random = faster
  },
  keep_alive: '10m'      // Keep model loaded longer
}
```

### Debugging Commands

```bash
# Check Ollama logs (Docker)
docker logs pixel-buddy-ollama --tail 50 -f

# Check Ollama logs (Linux systemd)
sudo journalctl -u ollama -f

# Check Ollama process (macOS/Linux)
ps aux | grep ollama

# Check Ollama port
lsof -i :11434
# or
netstat -an | grep 11434

# Test Ollama health
curl -v http://localhost:11434/

# Check model files
ls ~/.ollama/models/
# or (Docker)
docker exec pixel-buddy-ollama ls /root/.ollama/models/

# Monitor memory usage
docker stats pixel-buddy-ollama
```

### Getting Help

**Ollama Resources:**
- Documentation: https://docs.ollama.com
- GitHub Issues: https://github.com/ollama/ollama/issues
- Discord: https://discord.gg/ollama

**Pixel Buddy:**
- GitHub Issues: https://github.com/cjunks94/pixel-buddy/issues

---

## Performance Tuning

### Optimize Response Time

#### 1. Keep Model Loaded

```javascript
// server.js - Add keep_alive
const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
  model: 'llama3.2:1b',
  prompt: prompt,
  stream: false,
  keep_alive: '10m'  // Keep model in memory for 10 minutes
}, { timeout: 10000 });
```

**Options:**
- `'5m'` - Good for active usage (default)
- `'1h'` - For production with consistent traffic
- `'-1'` - Keep forever (uses RAM constantly)
- `'0'` - Unload immediately (saves RAM, slower next request)

#### 2. Reduce Token Generation

```javascript
// server.js
options: {
  num_predict: 50,  // Limit to ~40-50 words
  temperature: 0.8,
  top_p: 0.9
}
```

#### 3. Enable Response Caching

```javascript
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 }); // 10 min cache

async function getCachedResponse(pet, message) {
  const key = `${pet.id}:${message.toLowerCase()}`;
  const cached = cache.get(key);

  if (cached) {
    return { response: cached, cached: true };
  }

  const response = await generateAIResponse(pet, message);
  cache.set(key, response);
  return { response, cached: false };
}
```

### Memory Management

#### Docker Resource Limits

```yaml
# docker-compose.yml
services:
  ollama:
    deploy:
      resources:
        limits:
          memory: 4G      # Max 4GB
        reservations:
          memory: 2G      # Reserve 2GB
```

#### Ollama Server Settings

```yaml
services:
  ollama:
    environment:
      - OLLAMA_NUM_PARALLEL=2        # Max 2 concurrent requests
      - OLLAMA_MAX_QUEUE=128         # Queue up to 128 requests
      - OLLAMA_REQUEST_TIMEOUT=30s   # 30s timeout per request
      - OLLAMA_KEEP_ALIVE=5m         # Keep model 5 minutes
```

### Benchmarking

**Test response times:**

```bash
# Run 10 requests and measure
for i in {1..10}; do
  time curl -X POST http://localhost:3000/api/pet/1/talk \
    -H "Content-Type: application/json" \
    -d "{\"message\": \"Test $i\"}" \
    --silent --output /dev/null
done
```

**Expected results:**
```
Request 1: 8-15s  (model loading)
Request 2: 2-4s   (model loaded)
Request 3: 2-4s
Request 4: 2-4s
...
```

**Target performance:**
- **First request**: <15s (model loading)
- **Subsequent**: <5s (model in memory)
- **Success rate**: >95%

---

## Advanced Configuration

### Streaming Responses (Optional)

For better UX, implement streaming responses:

```javascript
// server.js
app.post('/api/pet/:id/talk/stream', async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const prompt = buildPrompt(pet, message);
    const response = await axios.post(
      `${OLLAMA_URL}/api/generate`,
      { model: 'llama3.2:1b', prompt, stream: true },
      { responseType: 'stream' }
    );

    let fullResponse = '';

    response.data.on('data', (chunk) => {
      const lines = chunk.toString().split('\n').filter(Boolean);

      for (const line of lines) {
        const json = JSON.parse(line);
        fullResponse += json.response;

        // Send chunk to client
        res.write(`data: ${JSON.stringify({ chunk: json.response })}\n\n`);

        if (json.done) {
          res.write('data: [DONE]\n\n');
          res.end();
        }
      }
    });
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});
```

### Custom Model (Optional)

Train a custom model for Pixel Buddy personality:

```bash
# Create a Modelfile
cat > Modelfile <<EOF
FROM llama3.2:1b

# Set custom system prompt
SYSTEM You are a cute virtual pet named Buddy. You are playful, affectionate, and respond based on your needs (hunger, happiness, energy, hygiene). Keep responses to 1-2 sentences.

# Set parameters
PARAMETER temperature 0.9
PARAMETER num_predict 100
PARAMETER stop "\n"
EOF

# Create custom model
ollama create pixel-buddy:1b -f Modelfile

# Use in server.js
model: 'pixel-buddy:1b'
```

---

## Summary

**Checklist for Ollama Setup:**

- [ ] Install Ollama on your platform
- [ ] Pull llama3.2:1b model
- [ ] Test model with `ollama run`
- [ ] Start Pixel Buddy app
- [ ] Test AI chat endpoint
- [ ] (Optional) Enable Docker Compose integration
- [ ] (Optional) Set up performance monitoring

**Expected Result:**

```bash
curl -X POST http://localhost:3000/api/pet/1/talk \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!"}'

# Response:
{
  "response": "Hi! I'm so happy to see you! Want to play together? 🎮"
}
```

**Performance Targets:**
- ✅ First request: <15s
- ✅ Subsequent: <5s
- ✅ Success rate: >95%
- ✅ Memory usage: <4GB

Your Pixel Buddy is now AI-powered! 🐾🤖
