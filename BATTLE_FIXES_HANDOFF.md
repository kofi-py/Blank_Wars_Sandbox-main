# Battle System Fixes Handoff

## Context
This document describes the current state of the battle system and the fixes needed. The battle system is in `frontend/src/components/battle/HexBattleArena.tsx` and related files.

## Current Session Accomplishments (Dec 18, 2025 - Session 2)

### Fixed Issues
1. **"Save Plan" renamed to "Execute Turn"** - Button text changed in CharacterActionPlanner.tsx:569
2. **AI now controls opponent team** - Added useEffect in HexBattleArena.tsx:1356-1414 that:
   - Detects when it's an opponent character's turn
   - Finds lowest HP user character as target
   - Auto-generates a basic attack action
   - Executes the attack and ends turn automatically
   - Includes small delays (800ms + 500ms) for visual feedback

### Previous Session Fixes (Dec 18 - Session 1)
1. **Opponent team loads from backend** - Uses matchData.opponent_team instead of mirroring user team
2. **Timer disabled by default** - timer_enabled prop defaults to false, time doubled to 60s when enabled
3. **Skip Battle button** - Yellow button in Battle Monitor that auto-simulates entire battle
4. **Localhost fallbacks** - ~10 service files now fallback to http://localhost:4000 on localhost
5. **Registration coach_name** - Added to INSERT statement in auth.ts

---

## REMAINING FIX NEEDED

### Remove Pre-Battle Planning Phase
**Current behavior:** Before battle starts, there may still be a planning phase where you plan actions upfront.

**Desired behavior:** Battle should START FIRST. Planning happens at the START OF EACH CHARACTER'S TURN, not before the battle begins.

**Files to check:**
- `frontend/src/components/battle/HexBattleArena.tsx`
- `frontend/src/components/MainTabSystem.tsx` - where battle is initiated

**What to look for:**
- Any pre-battle modal or planning screen
- The flow from clicking "Arena Champions" to battle starting
- Whether CharacterActionPlanner opens before the battle grid is visible

---

## Architecture Overview

### Battle Flow (Current)
1. User clicks "Arena Champions" -> WebSocket finds AI opponent
2. Battle loads with both teams on hex grid
3. Turn order determined by character stats (all 6 characters sorted)
4. For each character's turn:
   - If USER character: Show CharacterActionPlanner, wait for "Execute Turn"
   - If OPPONENT character: AI auto-selects action (attack lowest HP enemy), executes, ends turn
5. After all 6 characters act, round ends
6. Check win conditions after 3 rounds or when a team is eliminated

### Key Components
- `HexBattleArena.tsx` - Main battle component, hex grid, turn management, AI logic
- `CharacterActionPlanner.tsx` - UI for selecting character actions (user only)
- `HexGrid.tsx` - The hex-based battlefield visualization
- `MainTabSystem.tsx` - Contains battle initiation and mode selection

### Key State Variables in HexBattleArena
- `turnOrder: string[]` - Array of character IDs in speed order
- `activeCharacterId: string` - Current character taking action
- `currentTurn: 'user' | 'opponent'` - Which team is acting (may be outdated concept)
- `battleCharacterStates: Map` - HP, status effects, position for each character
- `showActionPlanner: boolean` - Whether the planner modal is open
- `battleEnded: boolean` - Whether battle has concluded

### AI Opponent Logic (New)
Location: `HexBattleArena.tsx:1356-1414`

```typescript
// AI Opponent Turn Handler - runs when it's an opponent character's turn
useEffect(() => {
  if (!activeCharacterId || battleEnded) return;
  const is_user_character = user_characters.some(c => c.id === activeCharacterId);
  if (is_user_character) return; // Only handle opponent turns

  // ... finds lowest HP target, creates attack plan, executes, ends turn
}, [activeCharacterId, battleEnded, ...]);
```

---

## Backend Context

### AI Opponent Teams
Stored in `ai_teams` and `ai_characters` tables. Three teams:
- The Mythic Beasts (Fenrir, Sun Wukong, Unicorn) - Rating 1000
- The Legends of Old (Merlin, Joan of Arc, Cleopatra VII) - Rating 1100
- The Ancient Warriors (Achilles, Genghis Khan, Shaka Zulu) - Rating 1200

### Battle Service
`backend/src/services/battleService.ts` handles:
- `find_pve_opponent()` - Finds random AI team
- Match result emission via WebSocket with opponent_team data
- Battle creation/completion in database

---

## Testing
1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Open http://localhost:3007
4. Login or create account
5. Click "Arena Champions" to start battle
6. Verify:
   - Battle grid appears with both teams
   - Your turn: Planner opens, you pick action, click "Execute Turn"
   - AI turn: AI automatically attacks and advances (watch console for 🤖 logs)

---

## Files Modified This Session
- `frontend/src/components/battle/CharacterActionPlanner.tsx` - "Execute Turn" button
- `frontend/src/components/battle/HexBattleArena.tsx` - AI opponent useEffect

## Previous Logs
- `/Users/stevengreenstein/Downloads/claudelogdec18` - Dec 18 session 1
- `/Users/stevengreenstein/Downloads/claudelogdec16` - Dec 16 session
- Earlier logs in Downloads folder (dec14, dec15)

## Notes
- User prefers simple solutions, no over-engineering
- "No Fallbacks" philosophy for production - but localhost fallbacks OK for dev
- User dislikes placeholder names like "AI Coach"
