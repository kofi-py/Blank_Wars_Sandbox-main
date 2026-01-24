# Battle System Reference Manual

**Created:** 2025-11-28
**Purpose:** Comprehensive reference for future agents to quickly understand the battle system without re-researching
**Session Context:** This was created after extensive research into the codebase and multiple sessions refining the design

---

## CRITICAL: READ FIRST

Before doing ANY work on the battle system, read these documents IN ORDER:

1. **This file** - Reference manual with all research and sources
2. `docs/BATTLE_SYSTEM_BLUEPRINT.md` - The authoritative design document
3. `docs/BATTLE_SYSTEM_IMPLEMENTATION_CHECKLIST.md` - Step-by-step implementation guide with verification

---

## SESSION HISTORY

The battle system design was refined over multiple sessions. Key chat logs:

| Date | File | Key Decisions |
|------|------|---------------|
| 11/28/25 12:42am | `new_chat_logs/cc_11_28_25_12.42am_battle_refactor.md` | Initial refactor discussion |
| 11/28/25 1:41am | `new_chat_logs/cc_11_28_25_1.41am_battle_plans.md` | Core design decisions, corrected agent assumptions |
| 11/28/25 12:14pm | `new_chat_logs/cc_11_28_25_12.14pm_battle.md` | Blueprint creation, adherence architecture |

**Key corrections from user during sessions:**
- Turn order is per-CHARACTER by initiative (NOT team-based)
- Judge ONLY for rogue actions (NOT every action)
- AI only decides when adherence FAILS (NOT for all opponent actions)
- No Plan B weighting (an agent added this without permission)
- Hex grid exists but DOESN'T WORK RIGHT YET

---

## FILE INVENTORY

### Frontend Battle Files

| File | Path | Lines | Purpose | Status |
|------|------|-------|---------|--------|
| HexBattleArena.tsx | `frontend/src/components/battle/HexBattleArena.tsx` | 1867 | Main battle orchestrator | REPLACE - too monolithic |
| HexGrid.tsx | `frontend/src/components/battle/HexGrid.tsx` | 226 | Canvas hex rendering | FIX scaling |
| CharacterToken.tsx | `frontend/src/components/battle/CharacterToken.tsx` | ~120 | Character circles | FIX click handling |
| ActionOverlay.tsx | `frontend/src/components/battle/ActionOverlay.tsx` | 159 | Range visualization | KEEP |
| HexCoachingPanel.tsx | `frontend/src/components/battle/HexCoachingPanel.tsx` | 316 | Tactical planning UI | ADD timer |
| CharacterActionPlanner.tsx | `frontend/src/components/battle/CharacterActionPlanner.tsx` | ? | Action selection | KEEP/MODIFY |
| Lobby.tsx | `frontend/src/components/Lobby.tsx` | 200+ | PVP lobby | KEEP |

### Frontend Systems

| File | Path | Lines | Purpose | Status |
|------|------|-------|---------|--------|
| hexGridSystem.ts | `frontend/src/systems/hexGridSystem.ts` | 312 | Hex math, positions, neighbors | KEEP - solid |
| hexMovementEngine.ts | `frontend/src/systems/hexMovementEngine.ts` | 424 | Movement validation, A* pathfinding | KEEP - solid |
| hexLineOfSight.ts | `frontend/src/systems/hexLineOfSight.ts` | ~200 | LoS calculations | KEEP - solid |
| adherenceCheckSystem.ts | `frontend/src/systems/adherenceCheckSystem.ts` | 213 | d100 roll, factors | DELETE - duplicates DB |
| actionSurveyGenerator.ts | `frontend/src/systems/actionSurveyGenerator.ts` | 335 | Generates actions + Plan B weighting | REMOVE Plan B |
| physicalBattleEngine.ts | `frontend/src/systems/physicalBattleEngine.ts` | 1335 | Combat, adherence, judge | KEEP - good bones |

### Frontend Data/Hooks

| File | Path | Lines | Purpose | Status |
|------|------|-------|---------|--------|
| aiJudge.ts | `frontend/src/data/aiJudge.ts` | ~400 | AIJudge class for rogue actions | KEEP |
| aiJudgeSystem.ts | `frontend/src/data/aiJudgeSystem.ts` | 838 | Judge personalities | KEEP |
| battleFlow.ts | `frontend/src/data/battleFlow.ts` | ~300 | Battle state types | KEEP/REFERENCE |
| coachingSystem.ts | `frontend/src/data/coachingSystem.ts` | ~500 | CoachingEngine, points | KEEP |
| useBattleEngineLogic.ts | `frontend/src/hooks/useBattleEngineLogic.ts` | 385 | Battle flow hook | REPLACE |

### Backend Battle Files

| File | Path | Purpose | Status |
|------|------|---------|--------|
| battleService.ts | `backend/src/services/battleService.ts` | Socket.IO, matchmaking queue, main battle logic | KEEP - mostly complete |
| battleMechanicsService.ts | `backend/src/services/battleMechanicsService.ts` | Damage calc, status effects, resistances | KEEP - complete |
| battleActionsService.ts | `backend/src/services/battleActionsService.ts` | Power/spell execution, AP costs | KEEP - complete |
| battleCharacterLoader.ts | `backend/src/services/battleCharacterLoader.ts` | Character loading for battle | KEEP - complete |
| adherenceCalculationService.ts | `backend/src/services/adherenceCalculationService.ts` | Dynamic adherence modifiers | REFACTOR - move stat modifiers to DB |
| temporaryBuffService.ts | `backend/src/services/temporaryBuffService.ts` | Buff/debuff management | KEEP - complete |
| hostmasterService.ts | `backend/src/services/hostmasterService.ts` | Battle commentary AI | KEEP - complete |
| battleRoutes.ts | `backend/src/routes/battleRoutes.ts` | Battle API endpoints | KEEP/EXTEND |

### Backend Related Services

| File | Path | Purpose | Relevance |
|------|------|---------|-----------|
| promptAssemblyService.ts | `backend/src/services/promptAssemblyService.ts` | Character AI prompts (3895 lines) | Use for character rebellion AI |
| autonomousDecisionService.ts | `backend/src/services/autonomousDecisionService.ts` | Equipment rebellion pattern | Pattern to reuse |
| loadoutAdherenceService.ts | `backend/src/services/loadoutAdherenceService.ts` | Loadout rebellion | Pattern to reuse |
| powerRebellionService.ts | `backend/src/services/powerRebellionService.ts` | Power auto-spend | Reference |

---

## DATABASE SCHEMA

### Key Tables for Battle

**user_characters** - Character instances owned by users
```sql
-- Adherence-related columns
gameplan_adherence INTEGER GENERATED  -- Base adherence (generated column)
stress_level INTEGER DEFAULT 0
confidence_level INTEGER DEFAULT 50
current_mental_health INTEGER DEFAULT 85
current_training INTEGER
current_team_player INTEGER
current_ego INTEGER

-- Battle stats
total_wins INTEGER
total_losses INTEGER
```

**characters** - Base character templates
```sql
archetype VARCHAR  -- Used for adherence modifier
```

**judge_rulings** - Battle judge rulings storage
```sql
-- Migration 090_add_judge_ruling_history.sql
battle_id, ruling_round, situation, ruling, reasoning,
gameplay_effect, narrative_impact,
character_benefited_id, character_penalized_id
```

**character_relationships** - Trust/respect/affection/rivalry
```sql
current_trust (0-100)
current_respect (0-100)
current_affection (0-100)
current_rivalry (0-100)
```

### Key Migrations

| Number | File | Purpose |
|--------|------|---------|
| 090 | `090_add_judge_ruling_history.sql` | Judge rulings table |
| 092 | (verify number) | gameplan_adherence generated column |
| 114 | `114_make_gameplan_adherence_generated_column.sql` | Adherence formula |
| 145 | `145_update_initiative_formula.sql` | Initiative formula fix |

### Adherence Formula (Current - Migration 114)
```sql
gameplan_adherence = GREATEST(0, ROUND(
    current_training * 0.4 +
    current_mental_health * 0.3 +
    current_team_player * 0.2 +
    (100 - current_ego) * 0.1
))
```

### Initiative Formula (Migration 145)
```sql
initiative = speed + (dexterity * 0.5) + (intelligence * 0.2) + (wisdom * 0.2) + (spirit * 0.1)
```

---

## ARCHITECTURE DECISIONS

### Data Flow: Single Source of Truth

```
DATABASE (PostgreSQL)
    │
    ├─ gameplan_adherence (generated column)
    │   └─ training, mental_health, team_player, ego
    │
    ├─ effective_adherence (TO BE ADDED)
    │   └─ gameplan_adherence - stress/confidence/archetype modifiers
    │
    └─ All character stats, relationships, abilities
          │
          ▼
BACKEND (Node.js/Express)
    │
    ├─ Queries effective_adherence from DB
    ├─ Applies ONLY ephemeral battle-state modifiers:
    │   - Current HP mid-battle
    │   - Team winning/losing
    │   - Teammates alive/dead
    ├─ Rolls d100 vs final threshold
    └─ Returns result to frontend
          │
          ▼
FRONTEND (React/Next.js)
    │
    └─ DISPLAY ONLY - no calculation
```

### Turn Flow Architecture

```
TURN ORDER: Initiative-based, all 6 characters mixed (NOT team-based)
            Ties resolved by COIN FLIP

EACH CHARACTER'S TURN:
  │
  ├─ COACHING WINDOW (30s PVP / 5s PVE)
  │     Coach selects: Strategy + Action + Target
  │
  ├─ ADHERENCE CHECK (backend queries DB, applies battle modifiers)
  │     │
  │     ├─ PASS → DETERMINISTIC EXECUTION
  │     │         - Coach's order executes EXACTLY
  │     │         - NO AI
  │     │         - NO Judge
  │     │
  │     └─ FAIL → REBELLION FLOW
  │           1. Situation Analyst (AI) reads battlefield
  │           2. Generates 3-4 CONTEXTUAL survey options
  │           3. Fresh AI instance (character prompt + survey)
  │           4. Character picks A/B/C/D
  │           5. System maps choice → game action
  │           6. Execute action
  │           7. JUDGE evaluates (points, buffs/debuffs, commentary)
  │
  └─ NEXT CHARACTER
```

---

## KNOWN PROBLEMS

### HexBattleArena.tsx (1867 lines)
1. **Click handlers silently fail** - If state not initialized, clicks ignored silently
2. **Movement handler is empty** - Just logs, doesn't actually move
3. **Team-based turn logic** - Uses `currentTurn: 'user' | 'opponent'` but design is per-character
4. **Token/Grid click conflict** - Overlapping elements, unpredictable click handling
5. **No visual target feedback** - `attackable_characters` calculated but never displayed
6. **Canvas scaling mismatch** - Fixed 1200x900 with CSS 100% width causes click miscalculation
7. **Plan B weighting embedded** - Calls `applyPlanBWeighting()` which is not the intended design

### adherenceCheckSystem.ts (213 lines)
- Duplicates DB logic
- Should be DELETED entirely
- Frontend should only DISPLAY adherence results from backend

### actionSurveyGenerator.ts (335 lines)
- Contains `applyPlanBWeighting()` which was added without user approval
- Contains `selectFromSurvey()` (random weighted) instead of AI selection
- Need to REMOVE Plan B logic

---

## EXISTING PATTERNS TO REUSE

### Loadout Rebellion Pattern (autonomousDecisionService.ts)

This pattern already exists for equipment decisions and should be adapted for battle:

```typescript
// Equipment rebellion scenario structure
EQUIPMENT REBELLION SCENARIO:
Your coach wants you to equip: ${coach_choice.name}
However, you don't fully trust their judgment right now.

You're REJECTING the coach's choice and picking something DIFFERENT.

ALTERNATIVE EQUIPMENT OPTIONS:
A) Item 1 - Description
B) Item 2 - Description
C) Item 3 - Description

RESPOND IN JSON:
{
  "choice": "A",
  "dialogue": "Your in-character explanation"
}
```

### Judge System (aiJudgeSystem.ts)

Three judges available:
- **Eleanor Roosevelt** - Generous (100-400 XP, min 20 mental health)
- **King Solomon** - Wisdom-focused (0-500 XP, 0-80 mental health)
- **Anubis** - Strict (0-300 XP, 0-60 mental health)

Judge output format:
```
SCORES: emotional_progress=X, insight=Y, defensiveness=Z
CRITIQUE: [Evaluation in judge's voice]
AWARDS: xp=X, mental_health=Y, bond_level=Z
```

### Prompt Assembly (promptAssemblyService.ts)

Universal template builds 9 sections:
1. Character Core (name, era, comedy style)
2. HQ Tier Context
3. Roommate Context
4. Teammate Context
5. Time Context
6. Sleeping Context
7. Scene Type Context
8. Current State
9. Relationship Dynamics

Use `assembleBattlePromptUniversal()` for battle context.

---

## API ENDPOINTS

### Existing Battle Endpoints (battleRoutes.ts)

```
POST /api/battle/queue          - Join matchmaking queue
POST /api/battle/leave-queue    - Leave queue
GET  /api/battle/status/:id     - Get battle status
GET  /api/battle/judge-rulings  - Get judge rulings

Socket.IO events:
- battle_start
- battle_end
- round_start
- round_end
- adherence_results
- combat_log
```

### Endpoints to Add

```
POST /api/battle/adherence-check
  - Input: character_id, battle_state
  - Output: { roll, threshold, passed, modifiers_applied }

POST /api/battle/situation-survey
  - Input: battle_id, character_id
  - Output: { survey: SituationSurvey }
```

---

## TESTING APPROACH

### Unit Tests Needed
- State machine transitions
- Initiative calculation with tiebreaker
- Adherence check flow
- Coaching timer

### Integration Tests Needed
- Full turn flow (coaching → adherence → execution/rebellion → next)
- PVE opponent AI
- Battle start to end flow

### Manual Testing Checklist
- [ ] Start PVP battle
- [ ] Start PVE battle
- [ ] Coaching window timer works
- [ ] Click on hex works
- [ ] Click on character works
- [ ] Movement works
- [ ] Attack works
- [ ] Adherence check displays
- [ ] Rebellion flow triggers
- [ ] Judge ruling displays
- [ ] Battle ends correctly

---

## QUICK START FOR FUTURE AGENTS

1. **Read the docs first:**
   - `docs/BATTLE_SYSTEM_BLUEPRINT.md`
   - `docs/BATTLE_SYSTEM_IMPLEMENTATION_CHECKLIST.md`
   - This file

2. **Verify environment:**
   - Database accessible
   - Backend running
   - Frontend running
   - Tests passing

3. **Check current progress:**
   - Which phases are complete?
   - Which steps are in progress?
   - Any blockers?

4. **Follow the checklist:**
   - Each step has verification criteria
   - Don't skip verification
   - Stop and ask if unsure

5. **Critical rules:**
   - All data from DB (no hardcoded values)
   - No fallbacks or placeholders
   - Stop and discuss if unsure
   - No autonomous decisions
   - No rushing or shortcuts

---

## CONTACT POINTS

If something in the codebase doesn't match this documentation:
1. STOP
2. Re-read the session logs to understand history
3. Ask user before making changes
4. Document any new findings

**Chat logs location:** `new_chat_logs/`
**Key session:** `cc_11_28_25_1.41am_battle_plans.md`
