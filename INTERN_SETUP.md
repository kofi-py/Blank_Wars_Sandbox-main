# Blank Wars - Intern Setup Guide

Welcome to the Blank Wars team! This guide will walk you through setting up your local development environment.

---

## Prerequisites

Before starting, ensure you have the following installed:

| Tool | Version | Installation |
|------|---------|--------------|
| **Node.js** | v18+ | [nodejs.org](https://nodejs.org) or `brew install node` |
| **PostgreSQL** | v14+ | `brew install postgresql` (macOS) or [postgresql.org](https://www.postgresql.org/download/) |
| **Redis** | Latest | `brew install redis` (macOS) or [redis.io](https://redis.io/download) |
| **pnpm** | Latest | `npm install -g pnpm` |
| **Git** | Latest | `brew install git` (macOS) |

### API Keys Required
- **OpenAI API Key** - Required for character AI (get from [platform.openai.com](https://platform.openai.com))

---

## Step 1: Clone the Repository

```bash
git clone https://github.com/CPAIOS/Blank_Wars_Sandbox.git
cd Blank_Wars_Sandbox
```

---

## Step 2: Install Dependencies

From the project root:

```bash
pnpm install
```

This installs dependencies for all workspaces (frontend, backend, shared packages).

---

## Step 3: Database Setup

### 3.1 Start PostgreSQL

```bash
# macOS
brew services start postgresql

# Linux
sudo service postgresql start
```

### 3.2 Create the Database

Run the database setup script:

```bash
cd backend
./setup-database.sh
```

This creates:
- **Database**: `blankwars_dev`
- **User**: `blankwars`
- **Password**: `devpass123`

### 3.3 Run Migrations

Apply all database migrations:

```bash
cd backend
npm run migrate
```

This runs 240+ migration scripts that create all tables, seed data, and set up the game's data structures.

**Troubleshooting:**
- If you get permission errors: `npm run fix-db-ownership`
- To reset and recreate: `npm run db:reset`

---

## Step 4: Environment Configuration

### 4.1 Backend Environment

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and set these critical values:

```env
# Database (should be set automatically by setup script)
DATABASE_URL=postgresql://blankwars:devpass123@localhost:5432/blankwars_dev

# OpenAI API Key (REQUIRED for AI features)
OPENAI_API_KEY=sk-your-openai-api-key-here

# JWT Secrets (generate with: openssl rand -base64 32)
JWT_ACCESS_SECRET=your-32-char-minimum-secret-here
JWT_REFRESH_SECRET=your-32-char-minimum-secret-here

# CSRF Protection
CSRF_SECRET=your-32-char-minimum-secret-here

# Redis (optional for local dev)
REDIS_URL=redis://localhost:6379

# Frontend URL
FRONTEND_URL=http://localhost:3007
```

### 4.2 Frontend Environment (Optional)

The frontend typically doesn't need its own `.env` for local development, but if needed:

```bash
cd frontend
cp .env.example .env  # If exists
```

---

## Step 5: Start the Development Servers

You need **two terminal windows**:

### Terminal 1: Backend

```bash
cd backend
npm run dev
```

Backend runs on **http://localhost:4000** (or port 3001 depending on config)

### Terminal 2: Frontend

```bash
cd frontend
npm run dev
```

Frontend runs on **http://localhost:3007**

---

## Step 6: Verify Setup

1. Open **http://localhost:3007** in your browser
2. You should see the Blank Wars homepage
3. Try registering a new account to test the full stack

---

## Asset Configuration

### Images

Images are served directly from GitHub (no local download needed):

| Repository | URL | Contents |
|------------|-----|----------|
| **Blank-Wars_Images-3** | `https://raw.githubusercontent.com/CPAIOS/Blank-Wars_Images-3/main` | Character portraits, UI elements, backgrounds |

The frontend automatically fetches images from these URLs. See `frontend/src/utils/characterImageUtils.ts` for the full mapping.

**Image Categories:**
- `Progression/` - Character progression screens
- `Training/` - Training scene images
- `Therapy/` - Therapy session images
- `Battle/` - Battle scene images
- `Confessional/` - Confessional room images
- `Equipment/` - Equipment screen images
- `Finance/` - Finance screen images

### 3D Models

3D character models are served from GitHub:

| Repository | URL |
|------------|-----|
| **blank-wars-models** | `https://raw.githubusercontent.com/Green003-CPAIOS/blank-wars-models/main/Metal_Foldout_Chair_Models` |

Models are in GLB format. See `frontend/src/utils/characterImageUtils.ts` → `getCharacter3DModelPath()` for the character-to-model mapping.

---

## Project Structure

```
Blank_Wars_Sandbox/
├── backend/                 # Node.js/Express API server
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic
│   │   └── database/       # Database connections
│   └── migrations/         # SQL migration files
├── frontend/               # Next.js React application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Next.js pages (if using pages router)
│   │   ├── app/            # Next.js app router
│   │   └── utils/          # Utility functions
│   └── public/             # Static assets
├── shared/                 # Shared packages
│   ├── types/              # TypeScript type definitions
│   └── hex-engine/         # Hex grid battle engine
└── packages/
    └── events/             # Event bus package
```

---

## Key Documentation

| Document | Location | Description |
|----------|----------|-------------|
| Developer Guide | `DEVELOPER_GUIDE.md` | Architecture overview and key systems |
| Battle System | `BATTLE_SYSTEM_DOCUMENTATION.md` | How battles work |
| Agent Coding Guide | `AGENT_CODING_GUIDE.md` | AI agent development |
| Onboarding Files | `ONBOARDING_FILE_LIST.md` | Important files for new developers |

---

## Common Commands

### Backend

```bash
cd backend

npm run dev          # Start dev server with hot reload
npm run build        # Build for production
npm run migrate      # Run database migrations
npm run setup-db     # Create/reset database
npm run typecheck    # Check TypeScript types
npm test             # Run tests
```

### Frontend

```bash
cd frontend

npm run dev          # Start dev server (port 3007)
npm run build        # Build for production
npm run lint         # Run ESLint
npm test             # Run tests
```

### Root

```bash
pnpm install         # Install all dependencies
npm run build        # Build frontend
```

---

## Troubleshooting

### Database Connection Errors

1. Ensure PostgreSQL is running: `brew services list` (macOS)
2. Check DATABASE_URL in `.env`
3. Try resetting: `npm run db:reset`

### "Module not found" Errors

```bash
# Rebuild shared packages
cd shared/hex-engine && npm install && npm run build
cd ../types && npm install
cd ../..
pnpm install
```

### Port Already in Use

```bash
# Find and kill process on port 3007
lsof -i :3007
kill -9 <PID>

# Or use a different port
PORT=3008 npm run dev
```

### Redis Connection Errors

Redis is optional for local development. If you don't have Redis running, some features (matchmaking queues) won't work, but the core app will function.

```bash
# Start Redis
brew services start redis

# Or run without Redis (limited functionality)
# Comment out REDIS_URL in .env
```

---

## Getting Help

1. Check the documentation files in the repo root
2. Search `new_chat_logs/` for historical context on features
3. Ask your mentor/supervisor

---

## Sandbox Safety Notes

This is a **sandbox environment** - feel free to experiment! Your changes here won't affect the production codebase.

- Make feature branches for your work
- Test thoroughly before suggesting changes for the main repo
- Ask questions when unsure

Welcome to the team!
