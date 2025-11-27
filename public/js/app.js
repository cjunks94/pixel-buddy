/**
 * Pixel Buddy Core
 * Modernized ES6 Class Structure
 */

class PixelBuddy {
    constructor() {
        // Config
        this.apiBase = window.location.origin + '/api';
        this.userId = localStorage.getItem('pixelBuddyUserId') || `user-${Date.now().toString(36)}`;
        if (!localStorage.getItem('pixelBuddyUserId')) {
            localStorage.setItem('pixelBuddyUserId', this.userId);
        }

        // State
        this.pet = null;
        this.visitor = null;
        this.frame = 0;
        this.loops = {}; // interval holders

        // DOM Elements
        this.ui = {
            canvas: document.getElementById('petCanvas'),
            ctx: document.getElementById('petCanvas').getContext('2d'),
            name: document.getElementById('petName'),
            stats: {
                hunger: document.getElementById('hungerBar'),
                happiness: document.getElementById('happinessBar'),
                energy: document.getElementById('energyBar'),
                hygiene: document.getElementById('hygieneBar')
            },
            drawers: {
                world: document.getElementById('worldDrawer'),
                chat: document.getElementById('chatDrawer')
            }
        };

        // Initialize
        this.init();
    }

    async init() {
        this.loadTheme();
        this.bindEvents();

        try {
            await this.fetchPetData();
            this.startGameLoop();
            this.startSimulation();
            console.log('👾 Pixel Buddy Booted Successfully');
        } catch (e) {
            console.error('Boot failed', e);
            this.ui.name.innerText = "ERR_CONNECTION";
        }
    }

    // ==========================================
    // DATA LAYER
    // ==========================================
    async fetchPetData() {
        const res = await fetch(`${this.apiBase}/pet/${this.userId}`);
        this.pet = await res.json();
        this.updateUI();
    }

    async performAction(action) {
        // Optimistic UI update (makes it feel snappy)
        this.animateAction(action);

        const res = await fetch(`${this.apiBase}/pet/${this.pet.id}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action })
        });
        this.pet = await res.json();
        this.updateUI();
    }

    // ==========================================
    // RENDER ENGINE (The "Pixel" Look)
    // ==========================================
    startGameLoop() {
        const loop = () => {
            this.frame++;
            this.draw();
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    draw() {
        const { ctx, canvas } = this.ui;
        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);

        if (this.pet) {
            this.drawPixelPet(w/2, h/2 + Math.sin(this.frame * 0.05) * 5, this.pet.color);
        }

        if (this.visitor) {
            this.drawPixelPet(w - 30, h - 30, '#999', 0.6);
        }
    }

    /**
     * Draws a procedural "Pixel Art" blob using rects instead of arcs
     */
    drawPixelPet(x, y, color, scale = 1) {
        const ctx = this.ui.ctx;
        const s = 6 * scale; // Pixel size unit

        ctx.fillStyle = color || '#FF6B9D';

        // Draw Body (Pixelated Circle approximation)
        // Main block
        ctx.fillRect(x - 4*s, y - 4*s, 8*s, 8*s);
        // Rounded corners (removing corners)
        // This is a manual drawing of a pixel sprite shape
        ctx.fillRect(x - 2*s, y - 5*s, 4*s, s); // Top hat
        ctx.fillRect(x - 5*s, y - 2*s, s, 4*s); // Left bulge
        ctx.fillRect(x + 4*s, y - 2*s, s, 4*s); // Right bulge
        ctx.fillRect(x - 3*s, y + 4*s, 6*s, s); // Bottom

        // Eyes (Blinking logic)
        if (this.frame % 150 < 10) {
            // Blink (draw line)
            ctx.fillStyle = '#000';
            ctx.fillRect(x - 3*s, y - s, 2*s, s);
            ctx.fillRect(x + s, y - s, 2*s, s);
        } else {
            // Open Eyes
            ctx.fillStyle = '#fff';
            ctx.fillRect(x - 3*s, y - 2*s, 2*s, 3*s); // Left Sclera
            ctx.fillRect(x + s, y - 2*s, 2*s, 3*s);   // Right Sclera

            // Pupils (Move with sin wave)
            const lookX = Math.round(Math.sin(this.frame * 0.02) * 2);
            ctx.fillStyle = '#000';
            ctx.fillRect(x - 2*s + lookX, y - s, s, s);
            ctx.fillRect(x + 2*s + lookX, y - s, s, s);
        }

        // Mouth (changes with happiness)
        ctx.fillStyle = '#000';
        if (this.pet && this.pet.happiness > 50) {
            // Smile
            ctx.fillRect(x - 2*s, y + 2*s, s, s);
            ctx.fillRect(x + s, y + 2*s, s, s);
            ctx.fillRect(x - s, y + 3*s, 2*s, s);
        } else {
            // Flat
            ctx.fillRect(x - s, y + 3*s, 2*s, s);
        }
    }

    animateAction(action) {
        // Simple particle effect or bounce could go here
        this.frame += 20; // Skip frames to make it "jump"
    }

    // ==========================================
    // UI MANAGER
    // ==========================================
    updateUI() {
        if (!this.pet) return;

        this.ui.name.innerText = this.pet.name.toUpperCase();

        // Update bars
        this.setBar('hunger', this.pet.hunger);
        this.setBar('happiness', this.pet.happiness);
        this.setBar('energy', this.pet.energy);
        this.setBar('hygiene', this.pet.hygiene);

        // World Code
        if (this.pet.world_open) {
            document.getElementById('worldCode').innerText = this.pet.world_code;
            document.getElementById('btnConnect').innerText = "DISCONNECT";
        } else {
            document.getElementById('worldCode').innerText = "OFFLINE";
            document.getElementById('btnConnect').innerText = "CONNECT";
        }
    }

    setBar(type, val) {
        const el = this.ui.stats[type];
        if (!el) return;
        el.style.width = `${val}%`;
        // Color changes based on low stats
        if (val < 30) el.style.backgroundColor = '#ff4444';
        else el.style.backgroundColor = ''; // Reset to CSS default
    }

    toggleDrawer(name) {
        const el = this.ui.drawers[name];
        if (el) el.classList.toggle('hidden');
    }

    // ==========================================
    // SYSTEM
    // ==========================================
    setTheme(theme) {
        if (theme === 'pastel') {
            document.documentElement.removeAttribute('data-theme');
        } else {
            document.documentElement.setAttribute('data-theme', theme);
        }
        localStorage.setItem('pixelBuddyTheme', theme);

        // Update active dot
        document.querySelectorAll('.theme-dot').forEach(dot => {
            dot.classList.toggle('active', dot.classList.contains(theme) ||
                (theme === 'pastel' && dot.classList.contains('pastel')));
        });
    }

    loadTheme() {
        const saved = localStorage.getItem('pixelBuddyTheme');
        if (saved) this.setTheme(saved);
    }

    bindEvents() {
        // Theme Dots
        document.querySelectorAll('[data-theme]').forEach(btn => {
            btn.addEventListener('click', (e) => this.setTheme(e.target.dataset.theme));
        });

        // Action Buttons
        document.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => this.performAction(e.target.dataset.action));
        });

        // Toggles
        const worldToggle = document.getElementById('worldToggle');
        const chatToggle = document.getElementById('chatToggle');
        if (worldToggle) worldToggle.onclick = () => this.toggleDrawer('world');
        if (chatToggle) chatToggle.onclick = () => this.toggleDrawer('chat');

        // Chat
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.sendChat(e.target.value);
            });
        }

        // World Logic
        const btnConnect = document.getElementById('btnConnect');
        const btnVisit = document.getElementById('btnVisit');
        if (btnConnect) btnConnect.onclick = () => this.toggleWorldConnection();
        if (btnVisit) btnVisit.onclick = () => this.visitWorld();

        // Rename
        const renameBtn = document.getElementById('renameBtn');
        if (renameBtn) renameBtn.onclick = () => this.renamePet();
    }

    async renamePet() {
        const newName = prompt('Enter new name (max 20 chars):', this.pet?.name || 'Buddy');
        if (!newName || newName === this.pet?.name) return;

        try {
            const res = await fetch(`${this.apiBase}/pet/${this.pet.id}/rename`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName })
            });
            this.pet = await res.json();
            this.updateUI();
        } catch (e) {
            console.error('Rename error:', e);
        }
    }

    async sendChat(msg) {
        const input = document.getElementById('chatInput');
        if (input) input.value = '';
        this.toggleDrawer('chat'); // Close drawer

        // Show bubble
        const bubble = document.getElementById('chatOverlay');
        const txt = document.getElementById('chatText');

        if (bubble && txt) {
            bubble.classList.remove('hidden');
            txt.innerText = "...";

            try {
                const res = await fetch(`${this.apiBase}/pet/${this.pet.id}/talk`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ message: msg })
                });
                const data = await res.json();

                // Show response
                txt.innerText = data.response;
                setTimeout(() => bubble.classList.add('hidden'), 5000);
            } catch (e) {
                txt.innerText = "Error...";
                setTimeout(() => bubble.classList.add('hidden'), 3000);
            }
        }
    }

    async toggleWorldConnection() {
        const open = !this.pet.world_open;
        const res = await fetch(`${this.apiBase}/pet/${this.pet.id}/world`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ open })
        });
        const data = await res.json();
        this.pet.world_open = data.world_open;
        this.pet.world_code = data.world_code;
        this.updateUI();
    }

    async visitWorld() {
        const code = prompt('Enter friend\'s world code (XXXX-XX):');
        if (!code) return;

        try {
            const res = await fetch(`${this.apiBase}/world/${code}`);
            if (!res.ok) throw new Error('World not found');
            this.visitor = await res.json();
            console.log('Visiting:', this.visitor.name);
        } catch (e) {
            alert('World not found or closed!');
        }
    }

    startSimulation() {
        // Decay stats every minute
        setInterval(() => {
            if (this.pet) {
                this.pet.hunger = Math.max(0, this.pet.hunger - 1);
                this.pet.happiness = Math.max(0, this.pet.happiness - 0.5);
                this.pet.energy = Math.max(0, this.pet.energy - 0.5);
                this.pet.hygiene = Math.max(0, this.pet.hygiene - 0.5);
                this.updateUI();
            }
        }, 60000);

        // Sync to server every 5 seconds
        setInterval(() => this.syncStats(), 5000);

        // Sync on page unload
        window.addEventListener('beforeunload', () => {
            if (this.pet && this.pet.id) {
                const data = new Blob([JSON.stringify({
                    hunger: Math.round(this.pet.hunger),
                    happiness: Math.round(this.pet.happiness),
                    energy: Math.round(this.pet.energy),
                    hygiene: Math.round(this.pet.hygiene)
                })], { type: 'application/json' });
                navigator.sendBeacon(`${this.apiBase}/pet/${this.pet.id}/sync`, data);
            }
        });
    }

    async syncStats() {
        if (!this.pet || !this.pet.id) return;

        try {
            await fetch(`${this.apiBase}/pet/${this.pet.id}/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    hunger: Math.round(this.pet.hunger),
                    happiness: Math.round(this.pet.happiness),
                    energy: Math.round(this.pet.energy),
                    hygiene: Math.round(this.pet.hygiene)
                })
            });
        } catch (e) {
            console.error('Sync error:', e);
        }
    }
}

// Boot
window.app = new PixelBuddy();
