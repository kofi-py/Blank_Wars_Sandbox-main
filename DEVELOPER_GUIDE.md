# Blank Wars 2026 Developer Guide

## 1. Introduction
**Blank Wars** is a "Reality Show" style turn-based battler where historical and mythological characters (e.g., Achilles, Einstein, Dracula) live together, train, and fight in a high-stakes league.

**Core Pillars:**
*   **Psychological Depth:** Characters have persistent memories, relationships, and mental states (Stress, Ego, Morale) that affect gameplay.
*   **Reality Show Presentation:** Battles and interactions are framed as a TV show, with "Confessional" interviews and "Hostmaster" commentary.
*   **Hybrid Gameplay:** Tactical Hex-Grid combat meets 3D social simulation.

---

## 2. Getting Started

### Prerequisites
*   **Node.js:** v18+
*   **PostgreSQL:** v14+
*   **Redis:** (Required for matchmaking queues)
*   **OpenAI API Key:** (Required for character AI)

### Installation
1.  **Clone the repository:**
    ```bash
    git clone <repo-url>
    cd Blank_Wars_2026
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    # This runs 'pnpm install' in the root, installing for all workspaces
    ```

### Environment Setup
Create `.env` files in both `backend/` and `frontend/` based on their `.env.example` files.
**Critical Keys:**
*   `OPENAI_API_KEY`: For AI generation.
*   `DATABASE_URL`: PostgreSQL connection string.
*   `REDIS_URL`: Redis connection string.

### Database Setup
The backend includes scripts to set up your local database.
```bash
cd backend
npm run setup-db
# This runs ./setup-database.sh, which creates the DB and applies the schema.
```
*Note: If you encounter ownership errors, try `npm run fix-db-ownership`.*

### Running the App
You typically need two terminal windows:

**Terminal 1 (Backend):**
```bash
cd backend
npm start
# Runs migrations, then starts server on port 3001 (default)
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
# Starts Next.js dev server on port 3000
```

---

## 3. Architecture Overview

The project is structured as a monorepo with workspaces:

*   **`backend/`**: Node.js/Express API & Socket.io server. Handles game logic, AI generation, and DB interactions.
*   **`frontend/`**: Next.js (React) application. Handles UI, Three.js (R3F) rendering, and client-side logic.
*   **`packages/events`**: *Warning: Source code for this package appears to be missing/compiled-only (`dist/`).* Handles the event bus.
*   **`shared/`**: Shared Types and Hex Engine logic.

### Key Backend Concepts
*   **Service-Oriented:** Logic is split into services (e.g., `BattleService`, `ChatService`, `PromptAssembler`).
*   **Event-Driven:** The `GameEventBus` routes events (Battle actions, Chat messages) to appropriate listeners.

### Key Frontend Concepts
*   **Zustand:** Used for global state management.
*   **Socket.io-client:** Real-time communication for Battles and Chat.
*   **Three.js / R3F:** All 3D rendering (Battles, Kitchen Table, Confessionals).

---

## 4. Key Systems Deep Dive

### A. The Prompt System (Universal Assembler)
Blank Wars uses a sophisticated "Universal Template" approach for AI characters. Instead of hardcoded prompts, the system:
1.  **Fetches Data Packages:** Retrieves raw JSON for a character's **Identity**, **Combat Stats**, and **Psychological State**.
2.  **Universal Template:** `backend/src/services/promptAssembler.ts` wraps this data in a standard "Reality Show Contestant" instruction set.
3.  **Domain Handlers:** Specific logic (e.g., `domains/therapy`, `domains/battle`) adds context-specific instructions (e.g., "You are in a therapy session," "You are fighting for your life").
4.  **Role Context:** Adds instructions based on the character's role (e.g., "Patient" vs. "Therapist").

**Why?** This ensures characters *always* know who they are and their current stats, regardless of the context.

### B. Real-Time Gameplay & AI Transport
Blank Wars uses a specific transport strategy for different game modes:

*   **Battle System (Pure Socket Authority):** The combat engine uses **Socket.io** exclusively. All actions (`hex_execute_turn`), matchmaking, and state updates happen over persistent WebSocket connections to ensure real-time synchronization.
*   **Chat Systems (REST API):** Interactive domains like **Kitchen Table**, **Training**, and **Therapy** use standard HTTP POST endpoints (e.g., `/api/ai/chat`) to generate AI responses. This ensures better logging, reliability, and error handling.
    *   *Warning:* You may find legacy files like `kitchenChatService.ts` (socket-based). These are deprecated. The active service is `kitchenTableService.ts` (REST-based).
*   **AI Backend:** All AI requests are processed by **OpenAI** (via `aiChatService`), utilizing the "Universal Template" for prompt assembly. LocalAGI has been discontinued.

### C. Chat & Word Bubbles
The chat isn't just text; it's a visual experience.
*   **Comic Book Style:** The `WordBubbleSystem` (`frontend/src/components/WordBubbleSystem.tsx`) renders comic-book style bubbles.
*   **Smart Positioning:** `SmartWordBubble.tsx` and `utils/bubbleLayout.ts` calculate bubble positions to ensure they originate from the character's mouth but don't obscure their face or other bubbles.
*   **3D Integration:** Bubbles are rendered as 2D overlays or 3D meshes within the `ChatTheater3D`.

### D. Battle System
*   **Logic (Hex):** The authoritative battle state is calculated on a Hex Grid (server-side).
*   **View (3D):** The frontend receives state updates and visualizes them using 3D models and physics (Rapier) for visual feedback, but the *logic* is grid-based.

---

## 5. Common Workflows

### Adding a New Character
1.  **Database:** Insert character data into `characters` table (base stats, personality).
2.  **Assets:**
    *   Use `scripts/autonomous-meshy-extract.js` to download the 3D model from Meshy.ai.
    *   Place assets in `frontend/public/models/<character_id>/`.
3.  **Config:** Ensure the character ID matches in both DB and filename.

### Creating a New Chat Domain
1.  Create a folder: `backend/src/services/prompts/domains/<new_domain>/`.
2.  Implement `index.ts`: Export an `assemble<Domain>Prompt` function.
3.  Implement Context Builders: Create helper functions to format the specific data needed for this domain.
4.  Register: Update `promptAssembler.ts` to route to your new domain.

---

## 6. Historical Context & "The Literature"
The project has a rich history of architectural evolution recorded in the `new_chat_logs/` directory. When debugging or understanding "why" something is the way it is, consult these logs:
*   **Keywords:** Search for "socket", "refactor", "migration", "LocalAGI" to find relevant discussions.
*   **Key Pivots:**
    *   **LocalAGI -> OpenAI:** The shift from local inference to OpenAI API.
    *   **Hybrid -> Pure Socket (Battle):** The move to server-authoritative sockets for combat.
    *   **Socket -> REST (Chat):** The migration of Kitchen, Training, and Therapy to REST for stability. Note the filename shift from `*ChatService` (legacy socket) to `*TableService` or similar (modern REST).

## 7. Troubleshooting

*   **"Source not found for @blank-wars/events":** The source code for this package is currently missing from the repo. Use the built `dist/` files or check with the team for the source repo.
*   **Database Permission Errors:** Run `npm run fix-db-ownership` in the backend folder.
*   **Missing Images/Models:** Check `scripts/MESHY_EXTRACTION_README.md` to run the asset downloader.
