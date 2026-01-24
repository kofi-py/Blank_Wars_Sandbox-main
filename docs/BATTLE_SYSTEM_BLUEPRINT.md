# Battle System Blueprint

**Created:** 2025-11-28
**Purpose:** Comprehensive plan for fixing and completing the battle system

---

## Table of Contents

1. [Core Design Requirements](#core-design-requirements)
2. [What EXISTS (Keep/Reuse)](#what-exists-keepreuse)
3. [What's BROKEN (Fix)](#whats-broken-fix)
4. [What's MISSING (Build)](#whats-missing-build)
5. [The Correct Battle Flow](#the-correct-battle-flow)
6. [Hex Grid Fixes](#hex-grid-fixes)
7. [Situation Analyst Service](#situation-analyst-service)
8. [Implementation Phases](#implementation-phases)
9. [File Structure](#file-structure)
10. [Code to DELETE](#code-to-delete)

---

## Core Design Requirements

### Turn Order
- **Per-CHARACTER by initiative**, all 6 characters mixed (NOT team-based)
- Example: Enemy1 → Your1 → Your2 → Enemy2 → Enemy3 → Your3
- **Initiative ties resolved by COIN FLIP**

### Per-Character Turn Flow
```
COACHING WINDOW (30s PVP / 5s PVE)
    │
    ▼
ADHERENCE CHECK (d100 vs gameplan_adherence)
    │
    ├── PASS → DETERMINISTIC SCRIPT
    │          - NO AI
    │          - NO Judge
    │          - Coach's order executes EXACTLY
    │          - Pure game mechanics
    │
    └── FAIL → REBELLION FLOW
               1. Situation Analyst reads battlefield
               2. Generates 3-4 CONTEXTUAL survey options
               3. Fresh AI instance (character prompt + live DB + survey)
               4. Character picks A/B/C/D with reasoning
               5. System maps choice → game action
               6. JUDGE evaluates:
                  - Points +/-
                  - BUFFS
                  - DEBUFFS
                  - Commentary
    │
    ▼
NEXT CHARACTER IN INITIATIVE ORDER
```

### Critical Design Points
- **Judge ONLY for rogue actions** - deterministic path has no AI, no judge
- **Fresh AI instance per rebellion** - not reusing context
- **Survey responses are trackable** - A/B/C/D maps to specific game actions
- **No Plan B weighting** - character is rebelling, they don't follow coach's backup plan

---

## Adherence Calculation Architecture

### Single Source of Truth: DATABASE

The adherence system has two layers:

**Layer 1: Base Adherence (DB Generated Column)**
```sql
-- Already exists in migration 092
gameplan_adherence = GREATEST(0, ROUND(
    current_training * 0.4 +
    current_mental_health * 0.3 +
    current_team_player * 0.2 +
    (100 - current_ego) * 0.1
))
```

**Layer 2: Stat-Based Modifiers (DB - TO BE ADDED)**

These columns ARE stored in `user_characters`:
- `stress_level` INTEGER
- `confidence_level` INTEGER

These modifiers SHOULD be calculated in DB (new generated column or function):
```sql
-- Example: effective_adherence generated column
effective_adherence = GREATEST(0, LEAST(100,
    gameplan_adherence
    - CASE WHEN stress_level > 70 THEN 20 ELSE 0 END
    - CASE WHEN confidence_level < 30 THEN 15 ELSE 0 END
    - CASE WHEN archetype IN ('beast', 'monster') THEN 10 ELSE 0 END
))
```

**Layer 3: Battle-State Modifiers (BACKEND ONLY)**

These are EPHEMERAL - only exist during battle, not stored:
- Current HP mid-battle (character at 30% HP)
- Team winning/losing status
- Teammates alive count

Backend applies these at check time:
```typescript
// backend/src/services/adherenceCalculationService.ts
function applyBattleStateModifiers(effective_adherence: number, battle_state: BattleState): number {
  let modified = effective_adherence;

  const hp_percent = battle_state.current_hp / battle_state.max_hp;
  if (hp_percent <= 0.1) modified -= 50;      // Near death
  else if (hp_percent <= 0.25) modified -= 30; // Critical
  else if (hp_percent <= 0.5) modified -= 15;  // Wounded

  if (!battle_state.team_winning) modified -= 10;

  const teammate_loss = (battle_state.teammates_total - battle_state.teammates_alive) / battle_state.teammates_total;
  modified -= Math.floor(teammate_loss * 20);

  return Math.max(0, Math.min(100, modified));
}
```

### Flow
```
Frontend requests adherence check
    ↓
Backend:
    1. Queries effective_adherence from DB (generated column with stat modifiers)
    2. Applies battle-state modifiers (HP%, team status)
    3. Rolls d100 vs final threshold
    4. Returns result to frontend
    ↓
Frontend displays result (NO calculation)
```

### What to DELETE
- `frontend/src/systems/adherenceCheckSystem.ts` (213 lines) - duplicates DB logic

### What to ADD
- Migration: `effective_adherence` generated column with stress/confidence/archetype modifiers
- Backend: Keep `applyBattleStateModifiers()` for ephemeral battle state only

---

## What EXISTS (Keep/Reuse)

### Frontend - KEEP

| File | Lines | Purpose | Status |
|------|-------|---------|--------|
| `hexGridSystem.ts` | 312 | Hex math, positions, neighbors | ✅ Solid |
| `hexMovementEngine.ts` | 424 | Movement validation, A* pathfinding | ✅ Solid |
| `hexLineOfSight.ts` | ~200 | LoS calculations | ✅ Solid |
| `aiJudge.ts` | ~400 | AIJudge class for rogue actions | ✅ Use for rebellion |
| `aiJudgeSystem.ts` | 838 | Judge personalities (Anubis, Eleanor, Solomon) | ✅ Use for rebellion |
| `adherenceCheckSystem.ts` | 213 | d100 roll, factors, reasoning | ❌ DELETE - duplicates DB |
| `coachingSystem.ts` | ~500 | CoachingEngine, coaching points | ✅ Complete |
| `battleFlow.ts` | ~300 | Battle state types | ✅ Reference |
| `HexGrid.tsx` | 226 | Canvas hex rendering | ⚠️ Keep but fix scaling |
| `CharacterToken.tsx` | 120 | Character circles with HP | ⚠️ Keep but fix click handling |
| `ActionOverlay.tsx` | 159 | Movement/attack range viz | ✅ Keep |
| `Lobby.tsx` | 200+ | PVP lobby system | ✅ Complete |

### Backend - KEEP

| File | Purpose | Status |
|------|---------|--------|
| `battleService.ts` | Socket.IO, matchmaking queue | ✅ Mostly complete |
| `battleMechanicsService.ts` | Damage calc, status effects | ✅ Complete |
| `battleActionsService.ts` | Power/spell execution | ✅ Complete |
| `battleCharacterLoader.ts` | Character loading | ✅ Complete |
| `adherenceCalculationService.ts` | Battle-state modifiers only | ⚠️ Refactor - stat modifiers move to DB |
| `temporaryBuffService.ts` | Buff/debuff management | ✅ Complete |
| `hostmasterService.ts` | Battle commentary AI | ✅ Complete |
| `judge_rulings` table | Battle judge rulings storage | ✅ Schema exists |

---

## What's BROKEN (Fix)

### 1. HexBattleArena.tsx - Orchestration Chaos

**Problems:**
- 1867 lines, 27+ useState calls
- Team-based turn logic (`currentTurn: 'user' | 'opponent'`) incompatible with per-character initiative
- Click handlers silently fail if state not initialized
- Movement handler is empty (just logs)
- No coaching window timer
- Plan B weighting embedded in rebellion flow

**Fix:** Rewrite orchestration layer (see [Implementation Phases](#implementation-phases))

### 2. Hex Grid Click Handling

**Problems:**
- Canvas click coordinates don't account for CSS scaling
- CharacterTokens overlap canvas, causing click conflicts
- No visual feedback for valid targets
- `attackable_characters` calculated but never displayed

**Fix:**
- Switch to SVG or fix canvas scaling math
- Unified click handler with z-index coordination
- Pass `attackable_characters` to grid for red highlighting
- Pass `reachable_hexes` to grid for green highlighting

### 3. Turn System Mismatch

**Problem:** Code uses `currentTurn: 'user' | 'opponent'` but design requires per-character initiative order.

**Fix:** Replace with:
```typescript
interface TurnState {
  turn_order: string[];           // All 6 character IDs by initiative
  current_turn_index: number;     // Which character is acting (0-5)
  current_character_id: string;   // Convenience accessor
}
```

### 4. Action Survey / Plan B

**Problem:** `actionSurveyGenerator.ts` generates ALL possible actions then applies Plan B weighting - not your design.

**Fix:**
- Remove `applyPlanBWeighting()` calls
- Replace `selectFromSurvey()` (random weighted) with Situation Analyst → Character AI flow
- Keep `generateActionSurvey()` as fallback for edge cases only

---

## What's MISSING (Build)

### 1. Coaching Window Timer

**What:** UI component with countdown (30s PVP / 5s PVE) that appears before each character's turn.

**Files to create:**
- `CoachingTimer.tsx` - Visual countdown component
- `useCoachingTimer.ts` - Timer logic hook

**Behavior:**
- Timer starts when character's turn begins
- Coach selects: Strategy + Action + Target
- "Lock In" button or timeout → proceed to adherence check
- Auto-submit defaults if timeout

### 2. Situation Analyst Service

**What:** AI agent that reads battlefield context and generates 3-4 contextual survey options for rebelling characters.

**Files to create:**
- `backend/src/services/situationAnalystService.ts`

**Input:**
- Current battle state (all positions, HP, status effects)
- Rebelling character's info (psychology, relationships, equipped abilities)
- Recent events (who attacked whom, deaths, etc.)

**Output:**
```typescript
interface SituationSurvey {
  character_id: string;
  context_summary: string;
  options: Array<{
    id: 'A' | 'B' | 'C' | 'D';
    label: string;           // "Attack Achilles (30% HP, killed your ally)"
    action_mapping: {        // What this choice triggers
      type: 'attack' | 'defend' | 'move' | 'power' | 'spell' | 'flee' | 'friendly_fire';
      target_id?: string;
      target_hex?: HexPosition;
      ability_id?: string;
    };
    contextual_reasoning: string;  // Why this option makes sense given situation
  }>;
}
```

### 3. Character AI Survey Response

**What:** Fresh AI instance that receives character prompt + live stats + survey, returns choice with reasoning.

**Integration point:** Reuse pattern from `loadoutAdherenceService.ts` which already does:
- Build character prompt
- Append survey options
- Parse A/B/C/D response
- Extract in-character dialogue

### 4. Initiative Tiebreaker

**What:** When two characters have equal initiative, coin flip determines order.

**Location:** `battleStateMachine.ts` or `turnOrderService.ts`

```typescript
function resolveTiebreaker(char_a: string, char_b: string): string {
  return Math.random() < 0.5 ? char_a : char_b;
}

function calculateTurnOrder(characters: BattleCharacter[]): string[] {
  return characters
    .sort((a, b) => {
      const diff = b.initiative - a.initiative;
      if (diff !== 0) return diff;
      // Tiebreaker: coin flip (deterministic per battle via seed if needed)
      return resolveTiebreaker(a.id, b.id) === a.id ? -1 : 1;
    })
    .map(c => c.id);
}
```

### 5. PVE Opponent AI

**What:** AI coach for opponent team in PVE battles.

**Current state:** Queue has `mode: 'pvp' | 'pve'` but no AI logic.

**Approach:**
- For PVE, opponent characters also go through coaching window (instant, hidden from player)
- AI coach uses same Situation Analyst to generate options
- AI coach picks based on difficulty level / character personality

### 6. Battle Start Flow

**What:** Unified flow from lobby → team selection → matchmaking → battle.

**Current gap:** No smooth transition between screens.

---

## The Correct Battle Flow

### State Machine

```typescript
type BattlePhase =
  | 'INITIALIZING'           // Loading teams, calculating turn order
  | 'COACHING_WINDOW'        // Current character's coach has 30s/5s
  | 'ADHERENCE_CHECK'        // Rolling d100 vs gameplan_adherence
  | 'EXECUTING_DETERMINISTIC'// Pass: executing coach's orders (no AI)
  | 'REBELLION_SURVEY'       // Fail: Situation Analyst generating options
  | 'REBELLION_AI_DECIDING'  // Fail: Character AI picking from survey
  | 'REBELLION_EXECUTING'    // Fail: Executing character's choice
  | 'JUDGE_EVALUATING'       // Fail: Judge scoring rogue action
  | 'TURN_COMPLETE'          // Cleanup, advance to next character
  | 'ROUND_END'              // All 6 acted, chat break (45s)
  | 'BATTLE_END';            // Victory/defeat/3 round limit

interface BattleState {
  phase: BattlePhase;

  // Turn tracking
  turn_order: string[];              // All 6 character IDs by initiative
  current_turn_index: number;        // 0-5
  round: number;                     // 1-3

  // Coaching
  coaching_time_remaining: number;   // Seconds
  coach_orders: CoachOrders | null;  // What coach selected

  // Adherence
  adherence_roll: number | null;     // d100 result
  adherence_threshold: number | null;// Target to beat
  adherence_passed: boolean | null;

  // Rebellion (only if adherence failed)
  situation_survey: SituationSurvey | null;
  character_choice: 'A' | 'B' | 'C' | 'D' | null;
  character_reasoning: string | null;
  judge_ruling: JudgeRuling | null;

  // Battle data
  characters: Map<string, BattleCharacterState>;
  grid: HexBattleGrid;
  combat_log: CombatLogEntry[];
}
```

### Phase Transitions

```
INITIALIZING
    │
    ▼
COACHING_WINDOW ←──────────────────────────────────┐
    │                                               │
    │ (coach locks in or timeout)                   │
    ▼                                               │
ADHERENCE_CHECK                                     │
    │                                               │
    ├── roll <= threshold ──► EXECUTING_DETERMINISTIC
    │                              │                │
    │                              │ (action done)  │
    │                              ▼                │
    │                         TURN_COMPLETE ────────┤
    │                                               │
    └── roll > threshold ──► REBELLION_SURVEY       │
                                  │                 │
                                  ▼                 │
                          REBELLION_AI_DECIDING     │
                                  │                 │
                                  ▼                 │
                          REBELLION_EXECUTING       │
                                  │                 │
                                  ▼                 │
                          JUDGE_EVALUATING          │
                                  │                 │
                                  ▼                 │
                            TURN_COMPLETE ──────────┘
                                  │
                                  │ (if all 6 acted)
                                  ▼
                              ROUND_END
                                  │
                                  │ (if round < 3 and no knockout)
                                  ▼
                          Back to COACHING_WINDOW
                                  │
                                  │ (if round >= 3 or knockout)
                                  ▼
                              BATTLE_END
```

---

## Hex Grid Fixes

### Problem 1: Canvas Scaling

**Current:**
```typescript
const [canvasSize] = React.useState({ width: 1200, height: 900 });
// ...
style={{ width: '100%', height: 'auto' }}
```

**Fix Option A - Account for scaling:**
```typescript
const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
  const canvas = canvasRef.current;
  const rect = canvas.getBoundingClientRect();

  // Account for CSS scaling
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;

  const hexPos = pixelToHex(x, y);
  // ...
};
```

**Fix Option B - Switch to SVG:**
- No scaling issues
- Native DOM events on each hex element
- Easier click handling

### Problem 2: Token/Grid Click Conflict

**Fix:** Single click handler at container level that determines target:

```typescript
const handleBattleAreaClick = (e: React.MouseEvent) => {
  // Check if clicked on a character token first
  const clickedCharacter = findCharacterAtPosition(e.clientX, e.clientY);

  if (clickedCharacter && actionMode === 'attack') {
    handleAttackTarget(clickedCharacter.id);
    return;
  }

  // Otherwise, treat as hex click
  const hexPos = screenToHex(e.clientX, e.clientY);
  if (hexPos) {
    handleHexClick(hexPos);
  }
};
```

### Problem 3: No Visual Feedback

**Fix:** Pass targeting state to grid and tokens:

```typescript
<HexGrid
  grid={grid}
  reachable_hexes={reachable_hexes}      // Green highlight
  attackable_hexes={attackable_hexes}    // Red highlight
  selected_hex={selectedHex}
  // ...
/>

{characters.map(char => (
  <CharacterToken
    key={char.id}
    is_targetable={attackable_characters.includes(char.id)}  // Red glow
    is_active={char.id === activeCharacterId}                // Yellow border
    // ...
  />
))}
```

---

## Situation Analyst Service

### Purpose

Reads battlefield context and generates 3-4 **contextual** options for rebelling characters. NOT a programmatic list of all possible actions.

### Implementation

**File:** `backend/src/services/situationAnalystService.ts`

```typescript
interface SituationAnalystInput {
  battle_id: string;
  rebelling_character_id: string;
  battle_state: {
    all_characters: Array<{
      id: string;
      name: string;
      team: 'player' | 'opponent';
      position: HexPosition;
      current_hp: number;
      max_hp: number;
      status_effects: string[];
      is_knocked_out: boolean;
    }>;
    round: number;
    recent_events: string[];  // Last 3-5 combat log entries
  };
  rebelling_character: {
    psychology: {
      stress: number;
      ego: number;
      team_trust: number;
      mental_health: number;
    };
    relationships: Array<{
      target_id: string;
      type: 'rival' | 'ally' | 'neutral';
      intensity: number;
    }>;
    equipped_powers: PowerDefinition[];
    equipped_spells: SpellDefinition[];
  };
}

async function generateSituationSurvey(input: SituationAnalystInput): Promise<SituationSurvey> {
  const prompt = buildSituationAnalystPrompt(input);

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
  });

  return parseSurveyResponse(response.choices[0].message.content);
}
```

### Prompt Template

```
You are the Situation Analyst for Blank Wars, a reality TV battle show.

A character has REBELLED against their coach and will make their own decision.

BATTLEFIELD STATE:
- Round: {round}
- Recent events: {recent_events}

ALL CHARACTERS:
{for each character: name, team, position, HP%, status, knocked_out}

REBELLING CHARACTER: {name}
- HP: {current_hp}/{max_hp}
- Stress: {stress}/100
- Ego: {ego}/100
- Team Trust: {team_trust}/100
- Relationships: {rivalries, alliances}
- Available Powers: {powers with cooldowns}
- Available Spells: {spells with mana cost}

Generate exactly 4 contextual options this character might choose.
Each option should:
1. Make sense given the character's psychology and relationships
2. Reference specific targets by name
3. Include a tactical or emotional reason

Return JSON:
{
  "options": [
    {
      "id": "A",
      "label": "Attack [Enemy Name] ([reason])",
      "action_type": "attack|defend|move|power|spell|flee|friendly_fire",
      "target_id": "character_id or null",
      "target_hex": {q, r, s} or null,
      "ability_id": "power_id or spell_id or null",
      "reasoning": "Why this makes sense for this character"
    },
    // ... B, C, D
  ]
}
```

---

## Implementation Phases

### Phase 1: State Machine Foundation (3-4 days)

**Goal:** Replace HexBattleArena's 27 useState with clean state machine

**Tasks:**
1. Create `battleStateMachine.ts` with phases and transitions
2. Create `useBattleState.ts` hook that wraps state machine
3. Create thin `BattleArenaV2.tsx` that uses hook (< 300 lines)
4. Implement per-character turn order with initiative tiebreaker

**Keep:** All hex primitives, judge system, adherence check

### Phase 2: Coaching Window (2-3 days)

**Goal:** Timer-based coaching window per character turn

**Tasks:**
1. Create `CoachingPanel.tsx` with timer display
2. Create `useCoachingTimer.ts` hook
3. Wire panel to state machine phases
4. Implement auto-submit on timeout

### Phase 3: Hex Grid Interaction Fix (3-4 days)

**Goal:** Make clicks actually work

**Tasks:**
1. Fix canvas scaling OR switch to SVG
2. Unified click handler for grid + tokens
3. Visual feedback (green = movable, red = attackable)
4. Test targeting with powers/spells

### Phase 4: Situation Analyst + Rebellion Flow (3-4 days)

**Goal:** Replace programmatic survey with contextual AI

**Tasks:**
1. Create `situationAnalystService.ts` (backend)
2. Create API endpoint `/api/battle/situation-survey`
3. Wire rebellion flow: fail adherence → get survey → character AI picks → execute → judge
4. Remove Plan B weighting code

### Phase 5: PVE Opponent AI (2-3 days)

**Goal:** AI coach for opponent team in PVE

**Tasks:**
1. Create `pveCoachService.ts`
2. Integrate with coaching window (instant, hidden)
3. Difficulty-based decision making

### Phase 6: Polish & Integration (2-3 days)

**Goal:** Smooth experience end-to-end

**Tasks:**
1. Battle start flow (lobby → battle transition)
2. Turn indicator showing all 6 characters in initiative order
3. Adherence check animation (roll reveal)
4. Judge ruling display
5. Battle end screen

---

## File Structure

### New Files to Create

```
frontend/src/features/battle-v2/
├── state/
│   ├── battleStateMachine.ts      # Phase transitions
│   ├── battleActions.ts           # Action creators
│   └── battleTypes.ts             # All type definitions
├── components/
│   ├── BattleArenaV2.tsx          # Thin orchestrator (< 300 lines)
│   ├── CoachingPanel.tsx          # Timer + action selection
│   ├── TurnOrderBar.tsx           # Shows all 6 chars in initiative order
│   ├── AdherenceCheckDisplay.tsx  # Roll animation
│   ├── JudgeRulingDisplay.tsx     # Judge verdict + effects
│   └── InteractiveHexGrid.tsx     # Fixed grid with click handling
├── hooks/
│   ├── useBattleState.ts          # Main state hook
│   ├── useCoachingTimer.ts        # Countdown logic
│   └── useGridInteraction.ts      # Click handling
└── services/
    └── battleAPI.ts               # API calls

backend/src/services/
├── situationAnalystService.ts     # NEW: AI survey generation
└── pveCoachService.ts             # NEW: AI opponent coaching
```

### Files to Keep (copy to primitives/)

```
frontend/src/features/battle-v2/primitives/
├── HexGrid.tsx                    # (fix scaling)
├── CharacterToken.tsx             # (fix click handling)
├── ActionOverlay.tsx              # Keep as-is
├── hexGridSystem.ts               # Keep as-is
├── hexMovementEngine.ts           # Keep as-is
└── hexLineOfSight.ts              # Keep as-is
```

---

## Code to DELETE

### Remove Entirely

| File | Reason |
|------|--------|
| `HexBattleArena.tsx` (1867 lines) | Replaced by BattleArenaV2.tsx |
| `useBattleEngineLogic.ts` | Replaced by useBattleState.ts |
| `adherenceCheckSystem.ts` (213 lines) | Duplicates DB logic - adherence calculated in DB/backend |

### Remove from Existing Files

| File | Code to Remove |
|------|----------------|
| `actionSurveyGenerator.ts` | `applyPlanBWeighting()` function and calls |
| `actionSurveyGenerator.ts` | Consider removing `selectFromSurvey()` (random weighted) |
| `HexBattleArena.tsx` | All `currentTurn: 'user' | 'opponent'` logic |
| `adherenceCalculationService.ts` | Stat-based modifiers (stress, confidence, archetype) - move to DB generated column |

---

## Success Criteria

1. ✅ Turn order is by initiative, all 6 characters mixed
2. ✅ Initiative ties resolved by coin flip
3. ✅ Coaching window appears per character (30s PVP / 5s PVE)
4. ✅ Timer counts down, auto-submits on timeout
5. ✅ Adherence check visible (roll vs threshold)
6. ✅ Pass → deterministic execution, NO AI, NO judge
7. ✅ Fail → Situation Analyst survey → Character AI picks → Execute → Judge
8. ✅ Hex grid clicks work reliably
9. ✅ Valid targets highlighted (green = move, red = attack)
10. ✅ Opponent AI takes actions in PVE
11. ✅ Battle ends correctly (knockout or 3 rounds)

---

## Notes

- Backend is mostly solid - minimal changes needed
- Judge system exists and works - just needs to be called ONLY for rogue actions
- **Adherence: DB is single source of truth**
  - Base adherence: existing generated column (training, mental_health, team_player, ego)
  - Stat modifiers: NEW generated column `effective_adherence` (stress, confidence, archetype)
  - Battle-state modifiers: backend only (HP%, team winning, teammates alive)
  - Frontend: display only, NO calculation
- Don't reinvent hex math - hexGridSystem.ts is solid
- Focus is on ORCHESTRATION - the primitives work, the wiring is broken
