# 🦁 NEW MINI-GAME: Blank Beast Ball 🎾

Hey team! We just deployed a new mini-game to the Blank Wars site!

## What is Blank Beast Ball?

Beast characters navigate through beast obstacles in ball form! It's a chaotic 3D obstacle course game featuring:
- 🦸 14+ playable Blank Wars characters (Achilles, Dracula, Sherlock, etc.)
- 🐄 Random beast obstacles (falling cows, rolling boulders, and more)
- ⚽ Ball physics and bouncing mechanics
- 🌍 Multiple themed levels (Ocean, Volcano, Arctic)

## How to Play

1. Go to the Blank Wars site
2. Navigate to **Challenges** tab
3. Click **"Play Now"** on the Blank Beast Ball featured card
4. Game loads in full-screen
5. Use **WASD** to move, **SPACE** to jump, **Q/E** to rotate camera

**Direct URL:** `[YOUR_PRODUCTION_URL]/challenges/blank-beast-ball`

## For Developers

### 📚 Documentation

**Meshy API Guide (v2.0)** - Complete guide to our 3D model pipeline:
```
blank-wars-clean/blank-beast-ball/MESHY_API_GUIDE.md
```

Key discovery: We found Meshy's undocumented `/web/v2/tasks` endpoint that returns ALL workspace models (not just API-created ones). This was critical for extracting UI-created character models.

### 🤖 Automation Scripts

**Download All Models:**
```bash
node scripts/download-all-meshy-models.js
```

Downloads all Meshy workspace models with metadata and GLB files.

### 📁 Game Files Location

- **Source:** `blank-wars-clean/blank-beast-ball/`
- **Deployed:** `frontend/public/blank-beast-ball/`
- **Route:** `frontend/src/app/challenges/blank-beast-ball/page.tsx`

### 🎮 Game Architecture

- Built with **Three.js** for 3D rendering
- Character models from **Meshy AI** (rigged & animated)
- Physics simulation with custom ball mechanics
- Vanilla JavaScript for game logic

## Test & Give Feedback!

Please test the game and let us know:
- ✅ Does it load properly?
- ✅ Are the controls smooth?
- ✅ Any bugs or visual issues?
- ✅ Performance on your device?

Drop feedback in the team chat!

---

**Deployed:** October 22, 2025
**GitHub Repo:** https://github.com/CPAIOS/blank-wars-clean
