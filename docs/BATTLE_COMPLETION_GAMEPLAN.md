# Battle System Completion Gameplan

## Current State Summary

**What's Done:**
- Phase 0 (DB Adherence) - 100% complete
- Phase 1 (State Machine) - 90% complete, UI works
- Damage calculation service exists (`battleMechanicsService.ts`)
- Movement engine exists (`hexMovementEngine.ts`)
- Power/spell execution service exists (`battleActionsService.ts`)
- Judge system exists (`aiJudgeSystem.ts`)
- HexGrid component exists and is mature

**What's Missing:**
1. Action execution endpoint to tie it all together
2. Hex grid wired into BattleArenaV2
3. Situation Analyst for rebellion flow
4. Judge wired into rebellion flow

---

## Phase A: Action Execution Endpoint

**Goal:** Create `POST /api/battle/:battle_id/action` that executes any action

**Why first:** This is the missing glue that connects all existing services. Without it, nothing can actually happen in battle.

### Tasks:

1. **Create `battleActionExecutor.ts`** (backend/src/services/)
   - Import: `battleMechanicsService`, `battleActionsService`, `hexMovementEngine`
   - Function: `executeAction(battle_id, character_id, action)`
   - Handles: attack, move, power, spell, defend
   - Returns: `{ success, damage_dealt, effects_applied, new_position, events }`

2. **Add route to `battleRoutes.ts`**
   ```
   POST /api/battle/:battle_id/action
   Body: {
     character_id: string
     action_type: 'attack' | 'move' | 'power' | 'spell' | 'defend'
     target_id?: string
     target_hex?: HexPosition
     ability_id?: string
   }
   ```

3. **Wire into `useBattleState.ts`**
   - Replace `executeCoachOrders()` placeholder with API call
   - Call `POST /api/battle/:battle_id/action`
   - Update local state with result

### Validation:
- Attack: Range check, AP cost, target is enemy
- Move: Path valid, AP cost, hex not blocked
- Power/Spell: Cooldown, mana, range, AP cost
- Defend: Always valid if AP > 0

---

## Phase B: Hex Grid Integration

**Goal:** Replace `HexGridPlaceholder` with real `HexGrid` component

**Why second:** Once actions can execute, we need to see and interact with the grid.

### Tasks:

1. **Update `BattleArenaV2.tsx`**
   - Import `HexGrid` from `@/components/battle/HexGrid`
   - Add state: `selectedHex`, `hoveredHex`, `actionMode`
   - Implement `handleHexClick(pos)` based on action mode

2. **Add action mode UI**
   - Buttons: Attack, Move, Power, Spell (in CoachingPanel)
   - When mode selected, highlight valid targets/hexes
   - Click to confirm action

3. **Add character tokens overlay**
   - Render characters on top of hex grid canvas
   - Show HP bars, status indicators
   - Current turn indicator

4. **Wire movement into action execution**
   - When move mode + hex clicked → call action API
   - Update `state.grid.character_positions`

---

## Phase C: Situation Analyst (Rebellion Flow)

**Goal:** When adherence fails, generate options and let AI character choose

**Why third:** Core battle loop works without this (just deterministic). This adds character agency.

### Tasks:

1. **Create `battleSituationAnalystService.ts`** (backend)
   - Reuse pattern from `loadoutAdherenceService.ts`
   - Function: `generateBattleSurvey(character_id, battle_context)`
   - Returns: 4 options (A, B, C, D) based on:
     - Current coach order (what they're rebelling against)
     - Character personality/archetype
     - Battle situation (enemies, teammates, HP states)
     - Deviation type from psychology

2. **Survey option structure:**
   ```typescript
   interface SurveyOption {
     id: 'A' | 'B' | 'C' | 'D'
     action_type: 'attack' | 'defend' | 'move' | 'power' | 'spell' | 'item' | 'flee' | 'friendly_fire'
     target_id?: string
     target_hex?: HexPosition      // For move actions
     power_id?: string             // WHICH power from their loadout
     spell_id?: string             // WHICH spell from their loadout
     item_id?: string              // WHICH item from their inventory
     label: string                 // e.g., "Cast Fireball on Achilles (he killed your ally)"
     reasoning: string             // Why this makes sense given the situation
   }
   ```

   The Situation Analyst must query the character's ACTUAL equipped loadout (powers, spells, items) and generate options from what they have available - not generic action types.

3. **Create AI decision function**
   - Reuse JSON prompt pattern from loadout service
   - Input: character personality + survey options
   - Output: `{ choice: 'A', dialogue: "In-character explanation" }`

4. **Add route:**
   ```
   POST /api/battle/rebellion-decision
   Body: { character_id, battle_id, coach_orders }
   Response: { survey, character_choice, dialogue }
   ```

5. **Wire into `useBattleState.ts`**
   - When `adherence_result.passed === false`:
     - Call rebellion-decision API
     - Dispatch `SURVEY_GENERATED` event
     - Dispatch `CHARACTER_CHOSE` event
     - Execute the character's choice (not coach's order)

---

## Phase D: Judge Integration

**Goal:** When character rebels, judge evaluates the rogue action

**Why fourth:** Judge system exists, just needs wiring into the flow.

### Tasks:

1. **Add judge route:**
   ```
   POST /api/battle/judge-ruling
   Body: {
     battle_id: string
     character_id: string
     action_taken: SurveyOption
     battle_context: object
   }
   Response: JudgeRuling
   ```

2. **Use existing `aiJudgeSystem.ts`**
   - `makeJudgeDecision()` already handles deviation types
   - `getRandomJudge()` picks from Anubis, Eleanor, Solomon

3. **Wire into `useBattleState.ts`**
   - After rebellion action executes:
     - Call judge-ruling API
     - Dispatch `JUDGE_RULED` event
     - Apply mechanical effects (buffs/debuffs/penalties)

4. **Store ruling in DB**
   - Table `judge_rulings` already exists (migration 090)
   - Save for memory/precedent system

---

## Phase E: End-to-End Testing

**Goal:** Full battle from start to finish

### Test Scenarios:

1. **Deterministic path (adherence passes)**
   - Coach gives order → character follows → action executes → turn ends

2. **Rebellion path (adherence fails)**
   - Coach gives order → adherence fails → survey generated → AI picks → action executes → judge rules → turn ends

3. **Battle end conditions**
   - All enemies KO'd → victory
   - All allies KO'd → defeat
   - 3 rounds complete → judge winner by HP/points

4. **Edge cases**
   - Character at 0 HP skipped in turn order
   - Power on cooldown → can't select
   - Out of mana → can't cast spell
   - Out of AP → turn ends automatically

---

## File Changes Summary

### New Files:
- `backend/src/services/battleActionExecutor.ts`
- `backend/src/services/battleSituationAnalystService.ts`

### Modified Files:
- `backend/src/routes/battleRoutes.ts` (add 3 endpoints)
- `frontend/src/features/battle-v2/components/BattleArenaV2.tsx` (hex grid integration)
- `frontend/src/features/battle-v2/hooks/useBattleState.ts` (wire APIs)

### Unchanged (just used):
- `backend/src/services/battleMechanicsService.ts`
- `backend/src/services/battleActionsService.ts`
- `frontend/src/systems/hexMovementEngine.ts`
- `frontend/src/components/battle/HexGrid.tsx`
- `frontend/src/data/aiJudgeSystem.ts`

---

## Order of Operations

```
Phase A: Action Execution (foundation)
   ↓
Phase B: Hex Grid (see actions happen)
   ↓
Phase C: Situation Analyst (rebellion works)
   ↓
Phase D: Judge (rebellion has consequences)
   ↓
Phase E: Testing (validate full loop)
```

Each phase is independently testable and builds on the previous.
