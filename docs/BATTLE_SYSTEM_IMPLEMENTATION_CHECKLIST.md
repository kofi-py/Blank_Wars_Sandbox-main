# Battle System Implementation Checklist

**Created:** 2025-11-28
**Purpose:** Detailed step-by-step implementation guide with testing, verification, and success criteria
**Source:** BATTLE_SYSTEM_BLUEPRINT.md

---

## CRITICAL PROJECT RULES

**READ THIS BEFORE EVERY TASK. THESE ARE NON-NEGOTIABLE.**

### Rule 1: Data Integrity
- **ALL data MUST flow from proper database sources**
- No hardcoded values that should come from DB
- No mock data in production code
- No fallback values that mask missing data
- If data is missing, STOP and investigate why

### Rule 2: No Fallbacks or Placeholders
- Never use placeholder text like "TODO", "FIXME", "placeholder"
- Never use fallback values that hide errors (e.g., `value ?? 'default'` when value should exist)
- If something is undefined that shouldn't be, that's a BUG - fix it, don't mask it
- Every field must have a known, valid source

### Rule 3: Stop and Discuss
- If you're unsure about ANY design decision, STOP and discuss with user
- If you encounter unexpected code or patterns, STOP and discuss
- If existing code contradicts the blueprint, STOP and discuss
- If you're tempted to "just make it work", STOP and discuss
- Never assume the user wants a particular approach

### Rule 4: No Assumptions or Autonomous Decisions
- Do NOT decide on architectural patterns without approval
- Do NOT add features not specified in the blueprint
- Do NOT refactor code outside the current task scope
- Do NOT delete code without explicit approval
- Do NOT change database schemas without migration plan approval

### Rule 5: No Rushing or Shortcuts
- Complete each step fully before moving to next
- Run all tests after each change
- Verify data flows correctly at each integration point
- Document any deviations from plan BEFORE implementing
- Quality over speed - always

### Rule 6: Verification Before Proceeding
- Each step has specific verification criteria
- ALL verification criteria must pass before proceeding
- If verification fails, fix it before moving on
- Never skip verification "to save time"

---

## PRE-IMPLEMENTATION CHECKLIST

Before starting ANY implementation work:

### Environment Verification
- [ ] **Database accessible**: Can connect to live database
- [ ] **Schema current**: All migrations up to date (`npm run migrate`)
- [ ] **Backend running**: Server starts without errors
- [ ] **Frontend running**: Dev server starts without errors
- [ ] **Tests passing**: Existing test suite passes

### Codebase Understanding
- [ ] **Read blueprint**: BATTLE_SYSTEM_BLUEPRINT.md fully read and understood
- [ ] **Read this checklist**: All rules and steps understood
- [ ] **Identified dependencies**: Know which existing files will be touched
- [ ] **Identified conflicts**: Know what existing code contradicts the design

### User Confirmation
- [ ] **Scope confirmed**: User agrees with what will be built/changed
- [ ] **Approach confirmed**: User agrees with implementation approach
- [ ] **Questions answered**: All unclear points discussed with user

---

## PHASE 0: Database Adherence Updates

**Goal:** Make database the single source of truth for adherence calculation

### Step 0.1: Verify Existing Adherence Column

**Task:** Confirm `gameplan_adherence` generated column exists and works correctly

**Actions:**
1. Query database to verify column exists
2. Check formula matches blueprint (training*0.4 + mental_health*0.3 + team_player*0.2 + (100-ego)*0.1)
3. Test with sample data to verify calculation

**Verification:**
```sql
-- Run this query and verify results
SELECT
  character_id,
  current_training,
  current_mental_health,
  current_team_player,
  current_ego,
  gameplan_adherence,
  -- Manual calculation to verify
  GREATEST(0, ROUND(
    current_training * 0.4 +
    current_mental_health * 0.3 +
    current_team_player * 0.2 +
    (100 - current_ego) * 0.1
  )) as calculated_adherence
FROM user_characters
LIMIT 10;
```

**Success Criteria:**
- [ ] Column exists in `user_characters` table
- [ ] Formula matches blueprint exactly
- [ ] `gameplan_adherence` equals `calculated_adherence` for all rows
- [ ] No NULL values in required source columns

**If verification fails:** STOP. Discuss with user before creating any migrations.

---

### Step 0.2: Verify Stat Columns Exist

**Task:** Confirm `stress_level`, `confidence_level`, and `archetype` columns exist

**Actions:**
1. Query database schema for these columns
2. Verify data types and defaults
3. Check for existing data

**Verification:**
```sql
-- Check columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'user_characters'
  AND column_name IN ('stress_level', 'confidence_level');

-- Check characters table for archetype
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'characters'
  AND column_name = 'archetype';

-- Sample data
SELECT stress_level, confidence_level FROM user_characters LIMIT 5;
SELECT id, archetype FROM characters LIMIT 5;
```

**Success Criteria:**
- [ ] `stress_level` INTEGER exists in `user_characters`
- [ ] `confidence_level` INTEGER exists in `user_characters`
- [ ] `archetype` exists in `characters` table
- [ ] Columns have reasonable data (not all NULL/0)

**If verification fails:** STOP. Document what's missing and discuss with user.

---

### Step 0.3: Create effective_adherence Migration

**Task:** Create new generated column that applies stat-based modifiers

**STOP POINT:** Before writing migration, confirm with user:
- Exact formula to use
- Column name (`effective_adherence` or other)
- How to handle archetype join (subquery vs trigger)

**Actions:**
1. Write migration file with new generated column
2. Test migration on local database first
3. Verify calculation is correct

**Migration Template (get user approval before using):**
```sql
-- Migration: XXX_add_effective_adherence_column.sql

-- Add effective_adherence generated column
ALTER TABLE user_characters
ADD COLUMN effective_adherence INTEGER GENERATED ALWAYS AS (
  GREATEST(0, LEAST(100,
    gameplan_adherence
    - CASE WHEN stress_level > 70 THEN 20 ELSE 0 END
    - CASE WHEN confidence_level < 30 THEN 15 ELSE 0 END
    -- Note: archetype modifier requires discussion - can't reference other table in generated column
  ))
) STORED;

-- Add comment explaining the column
COMMENT ON COLUMN user_characters.effective_adherence IS
  'Adherence with stat modifiers applied. Base gameplan_adherence minus stress/confidence penalties.';
```

**Verification:**
```sql
-- After migration, verify calculation
SELECT
  character_id,
  gameplan_adherence,
  stress_level,
  confidence_level,
  effective_adherence,
  -- Manual verification
  GREATEST(0, LEAST(100,
    gameplan_adherence
    - CASE WHEN stress_level > 70 THEN 20 ELSE 0 END
    - CASE WHEN confidence_level < 30 THEN 15 ELSE 0 END
  )) as expected
FROM user_characters
WHERE stress_level > 70 OR confidence_level < 30
LIMIT 10;
```

**Success Criteria:**
- [ ] Migration runs without errors
- [ ] `effective_adherence` column exists
- [ ] Values match expected calculation for all test cases
- [ ] Rollback migration works if needed

**DISCUSSION NEEDED:** How to handle archetype modifier since generated columns can't reference other tables. Options:
1. Move archetype to user_characters
2. Use a database function instead
3. Apply archetype modifier in backend only

---

### Step 0.4: Update Backend adherenceCalculationService.ts

**Task:** Refactor to only apply battle-state modifiers, get base from DB

**Actions:**
1. Read current `adherenceCalculationService.ts`
2. Remove stat-based modifiers (now in DB)
3. Keep only ephemeral battle-state modifiers
4. Update function to query `effective_adherence` from DB

**Code Changes:**
```typescript
// BEFORE: Calculating everything
function calculateAdherenceModifiers(params: {...}): number {
  let adherence_score = params.base_adherence;
  // Stat modifiers (REMOVE THESE - now in DB)
  if (params.stress > 70) adherence_score -= 20;
  if (params.confidence < 30) adherence_score -= 15;
  // Battle-state modifiers (KEEP THESE)
  if (hp_percentage <= 0.5) adherence_score -= 15;
  // ...
}

// AFTER: Only battle-state modifiers
async function getEffectiveAdherence(character_id: string, battle_state: BattleState): Promise<number> {
  // Get DB value (includes stat modifiers)
  const result = await query(
    'SELECT effective_adherence FROM user_characters WHERE character_id = $1',
    [character_id]
  );

  if (!result.rows[0]) {
    throw new Error(`Character not found: ${character_id}`);
  }

  let adherence = result.rows[0].effective_adherence;

  // Apply ephemeral battle-state modifiers only
  adherence = applyBattleStateModifiers(adherence, battle_state);

  return adherence;
}

function applyBattleStateModifiers(effective_adherence: number, battle_state: BattleState): number {
  let modified = effective_adherence;

  const hp_percent = battle_state.current_hp / battle_state.max_hp;
  if (hp_percent <= 0.1) modified -= 50;
  else if (hp_percent <= 0.25) modified -= 30;
  else if (hp_percent <= 0.5) modified -= 15;

  if (!battle_state.team_winning) modified -= 10;

  const teammate_loss = (battle_state.teammates_total - battle_state.teammates_alive) / battle_state.teammates_total;
  modified -= Math.floor(teammate_loss * 20);

  return Math.max(0, Math.min(100, modified));
}
```

**Verification:**
1. Unit test the new function with mock battle states
2. Integration test: call function with real character ID
3. Verify DB query returns expected value
4. Verify battle-state modifiers apply correctly

**Test Cases:**
```typescript
// Test 1: DB value retrieved correctly
const adherence = await getEffectiveAdherence('test_char_id', normalBattleState);
// Should match SELECT effective_adherence FROM user_characters WHERE character_id = 'test_char_id'

// Test 2: HP modifiers apply
const lowHpState = { current_hp: 25, max_hp: 100, team_winning: true, teammates_alive: 3, teammates_total: 3 };
const result = applyBattleStateModifiers(80, lowHpState);
// Expected: 80 - 30 (25% HP) = 50

// Test 3: Team losing modifier
const losingState = { current_hp: 100, max_hp: 100, team_winning: false, teammates_alive: 3, teammates_total: 3 };
const result = applyBattleStateModifiers(80, losingState);
// Expected: 80 - 10 = 70

// Test 4: Teammates dead modifier
const teammateLossState = { current_hp: 100, max_hp: 100, team_winning: true, teammates_alive: 1, teammates_total: 3 };
const result = applyBattleStateModifiers(80, teammateLossState);
// Expected: 80 - floor((2/3) * 20) = 80 - 13 = 67
```

**Success Criteria:**
- [ ] Function queries DB for `effective_adherence`
- [ ] NO stat-based modifiers in backend code (stress, confidence, archetype)
- [ ] Battle-state modifiers apply correctly
- [ ] All test cases pass
- [ ] No fallback values used

---

### Step 0.5: Delete Frontend adherenceCheckSystem.ts

**Task:** Remove frontend duplicate of adherence calculation

**STOP POINT:** Before deleting, verify:
- What files import this module
- What functionality will break
- How callers will get adherence data instead

**Actions:**
1. Search for all imports of `adherenceCheckSystem`
2. List all calling code
3. Update callers to use backend API instead
4. Delete the file

**Verification:**
```bash
# Find all imports
grep -r "adherenceCheckSystem" frontend/src/

# Find all usages
grep -r "calculateAdherence\|performAdherenceCheck" frontend/src/
```

**Update Pattern:**
```typescript
// BEFORE: Frontend calculation
import { calculateAdherenceFactors } from '../systems/adherenceCheckSystem';
const adherence = calculateAdherenceFactors(character);

// AFTER: Backend API call
const response = await fetch(`/api/battle/adherence-check/${character.id}`, {
  method: 'POST',
  body: JSON.stringify({ battle_state: currentBattleState })
});
const { adherence, roll, passed } = await response.json();
```

**Success Criteria:**
- [ ] All callers updated to use backend API
- [ ] `adherenceCheckSystem.ts` deleted
- [ ] No TypeScript errors
- [ ] No runtime errors
- [ ] Adherence checks still work via backend

---

## PHASE 1: State Machine Foundation

**Goal:** Replace HexBattleArena's 27 useState with clean state machine

### Step 1.1: Define Battle Types

**Task:** Create type definitions for battle state machine

**File:** `frontend/src/features/battle-v2/state/battleTypes.ts`

**Actions:**
1. Create new directory structure
2. Define all type interfaces
3. Export types for use by other modules

**Types to Define:**
```typescript
// Get user approval on these types before implementing

export type BattlePhase =
  | 'INITIALIZING'
  | 'COACHING_WINDOW'
  | 'ADHERENCE_CHECK'
  | 'EXECUTING_DETERMINISTIC'
  | 'REBELLION_SURVEY'
  | 'REBELLION_AI_DECIDING'
  | 'REBELLION_EXECUTING'
  | 'JUDGE_EVALUATING'
  | 'TURN_COMPLETE'
  | 'ROUND_END'
  | 'BATTLE_END';

export interface TurnState {
  turn_order: string[];           // All 6 character IDs by initiative
  current_turn_index: number;     // 0-5
  round: number;                  // 1-3
}

export interface CoachOrders {
  action_type: 'attack' | 'defend' | 'move' | 'power' | 'spell';
  target_id?: string;
  target_hex?: HexPosition;
  ability_id?: string;
}

export interface AdherenceResult {
  roll: number;                   // d100 result
  threshold: number;              // Target to beat
  passed: boolean;
  modifiers_applied: string[];    // For display
}

export interface SituationSurvey {
  character_id: string;
  context_summary: string;
  options: SurveyOption[];
}

export interface SurveyOption {
  id: 'A' | 'B' | 'C' | 'D';
  label: string;
  action_mapping: {
    type: 'attack' | 'defend' | 'move' | 'power' | 'spell' | 'flee' | 'friendly_fire';
    target_id?: string;
    target_hex?: HexPosition;
    ability_id?: string;
  };
  contextual_reasoning: string;
}

export interface JudgeRuling {
  judge_name: string;
  verdict: string;
  points_change: number;
  buffs: string[];
  debuffs: string[];
  commentary: string;
}

export interface BattleState {
  phase: BattlePhase;
  turn: TurnState;

  // Coaching
  coaching_time_remaining: number;
  coach_orders: CoachOrders | null;

  // Adherence
  adherence_result: AdherenceResult | null;

  // Rebellion
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

**Verification:**
- [ ] Types compile without errors
- [ ] Types match blueprint definitions
- [ ] All fields have explicit types (no `any`)
- [ ] Types are exported correctly

**Success Criteria:**
- [ ] `battleTypes.ts` created with all types
- [ ] No TypeScript errors
- [ ] Types are comprehensive (no missing fields for any phase)

---

### Step 1.2: Create State Machine Logic

**Task:** Implement pure state machine with phase transitions

**File:** `frontend/src/features/battle-v2/state/battleStateMachine.ts`

**STOP POINT:** Before implementing, confirm:
- Valid transitions between phases
- What triggers each transition
- What data is required for each phase

**Actions:**
1. Define transition functions for each phase
2. Implement phase validation
3. Add initiative calculation with tiebreaker

**Transition Rules (from blueprint):**
```
INITIALIZING → COACHING_WINDOW (when teams loaded)
COACHING_WINDOW → ADHERENCE_CHECK (when coach locks in OR timeout)
ADHERENCE_CHECK → EXECUTING_DETERMINISTIC (if roll <= threshold)
ADHERENCE_CHECK → REBELLION_SURVEY (if roll > threshold)
REBELLION_SURVEY → REBELLION_AI_DECIDING (when survey received)
REBELLION_AI_DECIDING → REBELLION_EXECUTING (when character picks)
REBELLION_EXECUTING → JUDGE_EVALUATING (when action executed)
JUDGE_EVALUATING → TURN_COMPLETE (when judge rules)
EXECUTING_DETERMINISTIC → TURN_COMPLETE (when action executed)
TURN_COMPLETE → COACHING_WINDOW (if more characters in round)
TURN_COMPLETE → ROUND_END (if all 6 have acted)
ROUND_END → COACHING_WINDOW (if round < 3 and no knockout)
ROUND_END → BATTLE_END (if round >= 3 OR knockout)
```

**Code Structure:**
```typescript
// Pure functions - no side effects
export function canTransition(from: BattlePhase, to: BattlePhase): boolean {
  const validTransitions: Record<BattlePhase, BattlePhase[]> = {
    'INITIALIZING': ['COACHING_WINDOW'],
    'COACHING_WINDOW': ['ADHERENCE_CHECK'],
    'ADHERENCE_CHECK': ['EXECUTING_DETERMINISTIC', 'REBELLION_SURVEY'],
    // ... etc
  };
  return validTransitions[from]?.includes(to) ?? false;
}

export function calculateTurnOrder(characters: BattleCharacter[]): string[] {
  // Sort by initiative
  // Handle ties with coin flip
  // Return array of character IDs
}

export function resolveTiebreaker(char_a: string, char_b: string, battle_seed: string): string {
  // Deterministic based on battle_seed for reproducibility
  // Same inputs = same output
}

export function getNextPhase(state: BattleState, event: BattleEvent): BattlePhase {
  // Pure function: given current state and event, return next phase
}
```

**Verification Tests:**
```typescript
// Test valid transitions
expect(canTransition('COACHING_WINDOW', 'ADHERENCE_CHECK')).toBe(true);
expect(canTransition('COACHING_WINDOW', 'BATTLE_END')).toBe(false);

// Test turn order calculation
const chars = [
  { id: 'a', initiative: 50 },
  { id: 'b', initiative: 75 },
  { id: 'c', initiative: 50 }, // Tie with 'a'
];
const order = calculateTurnOrder(chars);
expect(order[0]).toBe('b'); // Highest initiative first
// 'a' and 'c' order determined by tiebreaker

// Test tiebreaker is deterministic
const result1 = resolveTiebreaker('a', 'c', 'seed123');
const result2 = resolveTiebreaker('a', 'c', 'seed123');
expect(result1).toBe(result2); // Same seed = same result
```

**Success Criteria:**
- [ ] All phase transitions defined
- [ ] Invalid transitions rejected
- [ ] Turn order calculation works
- [ ] Tiebreaker is deterministic
- [ ] All test cases pass
- [ ] No side effects in functions

---

### Step 1.3: Create Battle State Hook

**Task:** Create React hook that wraps state machine

**File:** `frontend/src/features/battle-v2/hooks/useBattleState.ts`

**Actions:**
1. Create hook that manages battle state
2. Expose transition functions
3. Handle side effects (API calls, socket events)

**Hook Interface:**
```typescript
interface UseBattleStateReturn {
  state: BattleState;

  // Actions
  initializeBattle: (battle_id: string) => Promise<void>;
  lockInCoachOrders: (orders: CoachOrders) => void;
  onCoachingTimeout: () => void;
  selectSurveyOption: (option: 'A' | 'B' | 'C' | 'D') => void;

  // Computed values
  currentCharacter: BattleCharacter | null;
  isPlayerTurn: boolean;
  canSubmitOrders: boolean;
}

export function useBattleState(battle_id: string): UseBattleStateReturn {
  // Implementation
}
```

**Verification:**
1. Hook initializes with correct default state
2. State transitions work correctly
3. API calls made at appropriate times
4. Socket events handled properly

**Success Criteria:**
- [ ] Hook compiles without errors
- [ ] State transitions work
- [ ] Side effects trigger correctly
- [ ] No memory leaks (cleanup on unmount)

---

### Step 1.4: Create Thin Battle Arena Component

**Task:** Create new orchestrator component using the hook

**File:** `frontend/src/features/battle-v2/components/BattleArenaV2.tsx`

**Target:** < 300 lines (vs 1867 in original)

**Actions:**
1. Create component that uses `useBattleState`
2. Render appropriate UI for each phase
3. Pass data to child components

**Component Structure:**
```typescript
export function BattleArenaV2({ battle_id }: { battle_id: string }) {
  const { state, ...actions } = useBattleState(battle_id);

  // Render based on phase
  return (
    <div className="battle-arena">
      <TurnOrderBar
        turn_order={state.turn.turn_order}
        current_index={state.turn.current_turn_index}
      />

      <HexGridContainer
        grid={state.grid}
        characters={state.characters}
        // ... interaction props
      />

      {state.phase === 'COACHING_WINDOW' && (
        <CoachingPanel
          character={currentCharacter}
          time_remaining={state.coaching_time_remaining}
          onSubmit={actions.lockInCoachOrders}
        />
      )}

      {state.phase === 'ADHERENCE_CHECK' && (
        <AdherenceCheckDisplay result={state.adherence_result} />
      )}

      {/* ... other phase-specific UI */}
    </div>
  );
}
```

**Verification:**
- [ ] Component renders without errors
- [ ] Phase-specific UI shows correctly
- [ ] Data flows to child components
- [ ] Actions trigger state changes

**Success Criteria:**
- [ ] Component is < 300 lines
- [ ] All phases have corresponding UI
- [ ] No direct state management (uses hook)
- [ ] No business logic (delegated to hook/state machine)

---

### Step 1.5: Integrate with Existing Primitives

**Task:** Connect new state machine to existing hex grid and judge systems

**Actions:**
1. Copy hex primitives to new location
2. Update imports
3. Verify primitives work with new state structure

**Files to integrate:**
- `hexGridSystem.ts` - Keep as-is
- `hexMovementEngine.ts` - Keep as-is
- `hexLineOfSight.ts` - Keep as-is
- `aiJudge.ts` - Wire to rebellion flow
- `aiJudgeSystem.ts` - Wire to rebellion flow

**Verification:**
```typescript
// Test hex system integration
const grid = createHexGrid(5); // radius 5
const validMoves = getValidMoves(grid, characterPosition, movementRange);
expect(validMoves.length).toBeGreaterThan(0);

// Test judge integration
const ruling = await evaluateRogueAction(action, context);
expect(ruling.judge_name).toBeDefined();
expect(ruling.points_change).toBeNumber();
```

**Success Criteria:**
- [ ] Hex primitives work with new state structure
- [ ] Judge system called for rebellions
- [ ] No breaking changes to primitives
- [ ] All integration tests pass

---

## PHASE 2: Coaching Window

**Goal:** Timer-based coaching window per character turn

### Step 2.1: Create Coaching Timer Hook

**Task:** Implement countdown timer logic

**File:** `frontend/src/features/battle-v2/hooks/useCoachingTimer.ts`

**Actions:**
1. Create hook with countdown logic
2. Handle PVP (30s) vs PVE (5s) modes
3. Trigger callback on timeout

**Interface:**
```typescript
interface UseCoachingTimerProps {
  duration_seconds: number;
  onTimeout: () => void;
  isPaused?: boolean;
}

interface UseCoachingTimerReturn {
  time_remaining: number;
  is_running: boolean;
  pause: () => void;
  resume: () => void;
  reset: () => void;
}
```

**Verification:**
- [ ] Timer counts down correctly
- [ ] Timeout callback fires at 0
- [ ] Pause/resume works
- [ ] Reset works
- [ ] Cleanup on unmount (no memory leaks)

**Test Cases:**
```typescript
// Timer counts down
render(<TestComponent duration={5} />);
expect(screen.getByText('5')).toBeInTheDocument();
await waitFor(() => expect(screen.getByText('4')).toBeInTheDocument(), { timeout: 1100 });

// Timeout fires
const onTimeout = jest.fn();
render(<TestComponent duration={1} onTimeout={onTimeout} />);
await waitFor(() => expect(onTimeout).toHaveBeenCalled(), { timeout: 1100 });
```

**Success Criteria:**
- [ ] Timer accurate to within 100ms
- [ ] No drift over 30 seconds
- [ ] Cleanup works (no setInterval leaks)

---

### Step 2.2: Create Coaching Panel Component

**Task:** UI for coach to select actions during their window

**File:** `frontend/src/features/battle-v2/components/CoachingPanel.tsx`

**Actions:**
1. Create panel with timer display
2. Add action selection UI (attack/defend/move/power/spell)
3. Add target selection UI
4. Add "Lock In" button
5. Handle auto-submit on timeout

**Component Props:**
```typescript
interface CoachingPanelProps {
  character: BattleCharacter;
  time_remaining: number;
  valid_actions: ActionOption[];
  valid_targets: TargetOption[];
  onSubmit: (orders: CoachOrders) => void;
  mode: 'pvp' | 'pve';
}
```

**Verification:**
- [ ] Timer displays correctly
- [ ] Action buttons work
- [ ] Target selection works
- [ ] Lock In button submits orders
- [ ] Auto-submit on timeout works

**Success Criteria:**
- [ ] Clear visual timer (user knows how much time left)
- [ ] All action types selectable
- [ ] Invalid actions disabled
- [ ] Orders structure matches `CoachOrders` type

---

### Step 2.3: Wire Coaching to State Machine

**Task:** Connect coaching panel to battle state

**Actions:**
1. Start timer when phase is `COACHING_WINDOW`
2. Transition to `ADHERENCE_CHECK` on lock-in or timeout
3. Store coach orders in state

**State Machine Updates:**
```typescript
// When entering COACHING_WINDOW
- Start timer (30s or 5s based on mode)
- Enable coaching panel

// On lock-in or timeout
- Store coach orders (or defaults if timeout)
- Transition to ADHERENCE_CHECK
```

**Verification:**
- [ ] Timer starts when coaching window opens
- [ ] Lock-in transitions to adherence check
- [ ] Timeout transitions to adherence check
- [ ] Coach orders stored correctly

---

## PHASE 3: Hex Grid Interaction Fix

**Goal:** Make clicks actually work reliably

### Step 3.1: Fix Canvas Scaling

**Task:** Fix click coordinate calculation for CSS-scaled canvas

**File:** `frontend/src/components/battle/HexGrid.tsx` (or new `InteractiveHexGrid.tsx`)

**STOP POINT:** Discuss with user - fix existing or create new?

**Option A - Fix existing:**
```typescript
const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
  const canvas = canvasRef.current;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();

  // Account for CSS scaling
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;

  const hexPos = pixelToHex(x, y, hexSize, gridCenter);
  onHexClick(hexPos);
};
```

**Option B - Switch to SVG:**
- Each hex is a `<polygon>` element
- Native click events
- No scaling issues

**Verification:**
```typescript
// Click at various screen positions
// Verify correct hex is identified each time
const testPositions = [
  { screen: { x: 100, y: 100 }, expected_hex: { q: 0, r: 0, s: 0 } },
  { screen: { x: 200, y: 150 }, expected_hex: { q: 1, r: 0, s: -1 } },
  // ... more test cases
];

testPositions.forEach(({ screen, expected_hex }) => {
  const result = getHexFromClick(screen.x, screen.y);
  expect(result).toEqual(expected_hex);
});
```

**Success Criteria:**
- [ ] Clicks register on correct hex regardless of window size
- [ ] Works on mobile/touch
- [ ] No off-by-one errors at hex boundaries

---

### Step 3.2: Unified Click Handler

**Task:** Single click handler for grid + tokens

**Actions:**
1. Create container-level click handler
2. Determine if click is on character token or hex
3. Route to appropriate handler

**Implementation:**
```typescript
const handleBattleAreaClick = (e: React.MouseEvent) => {
  // Check if clicked on a character token first
  const clickedElement = e.target as HTMLElement;
  const characterId = clickedElement.dataset.characterId;

  if (characterId && actionMode === 'attack') {
    handleAttackTarget(characterId);
    return;
  }

  // Otherwise, treat as hex click
  const hexPos = screenToHex(e.clientX, e.clientY);
  if (hexPos && isValidHex(hexPos)) {
    handleHexClick(hexPos);
  }
};
```

**Verification:**
- [ ] Clicking character token triggers attack (if in attack mode)
- [ ] Clicking empty hex triggers move (if in move mode)
- [ ] No click conflicts between layers
- [ ] Clear which click handler wins

---

### Step 3.3: Visual Feedback for Valid Targets

**Task:** Highlight valid targets (green for movement, red for attack)

**Actions:**
1. Calculate valid movement hexes
2. Calculate attackable characters
3. Pass to grid/token components for highlighting
4. Add visual styles

**Props to Add:**
```typescript
// To HexGrid
reachable_hexes: HexPosition[];  // Green highlight
attackable_hexes: HexPosition[]; // Red highlight

// To CharacterToken
is_targetable: boolean;  // Red glow
is_active: boolean;      // Yellow border
```

**Verification:**
- [ ] Valid movement hexes highlighted green
- [ ] Attackable hexes highlighted red
- [ ] Attackable characters have red glow
- [ ] Active character has yellow border
- [ ] Highlights update when action mode changes

---

### Step 3.4: Movement Implementation

**Task:** Make movement actually work

**Current Problem:** `handleMoveCharacter` is empty (just logs)

**Actions:**
1. Implement actual movement logic
2. Update character position in state
3. Trigger appropriate state transition

**Implementation:**
```typescript
const handleMoveCharacter = (character_id: string, to: HexPosition) => {
  // Validate move is legal
  const isValid = isValidMove(character_id, to);
  if (!isValid) {
    console.error('Invalid move attempted');
    return;
  }

  // Update state
  updateCharacterPosition(character_id, to);

  // Deduct action points if applicable
  deductActionPoints(character_id, 'move');

  // Log to combat log
  addCombatLogEntry({
    type: 'movement',
    character_id,
    from: currentPosition,
    to,
  });
};
```

**Verification:**
- [ ] Movement updates character position
- [ ] Invalid moves rejected
- [ ] Combat log updated
- [ ] Visual updates immediately

---

## PHASE 4: Situation Analyst + Rebellion Flow

**Goal:** Replace programmatic survey with contextual AI

### Step 4.1: Create Situation Analyst Service (Backend)

**Task:** AI agent that generates contextual survey options

**File:** `backend/src/services/situationAnalystService.ts`

**STOP POINT:** Get user approval on:
- AI model to use (gpt-4o-mini, etc.)
- Prompt template
- Response format

**Interface:**
```typescript
interface SituationAnalystInput {
  battle_id: string;
  rebelling_character_id: string;
  battle_state: BattleStateSnapshot;
  character_psychology: CharacterPsychology;
  character_relationships: Relationship[];
  equipped_abilities: AbilityInfo[];
  recent_events: string[];
}

interface SituationSurvey {
  character_id: string;
  context_summary: string;
  options: SurveyOption[];
}

async function generateSituationSurvey(input: SituationAnalystInput): Promise<SituationSurvey>;
```

**Verification:**
- [ ] Input validation (all required fields present)
- [ ] AI call succeeds
- [ ] Response parses correctly
- [ ] Options are valid actions (can be executed)
- [ ] Options reference real characters/abilities

**Test Cases:**
```typescript
// Test with mocked AI response
const mockResponse = {
  options: [
    { id: 'A', label: 'Attack Achilles', action_type: 'attack', target_id: 'achilles_id' },
    // ...
  ]
};

// Verify parsing
const survey = parseSurveyResponse(mockResponse);
expect(survey.options).toHaveLength(4);
expect(survey.options[0].action_mapping.type).toBe('attack');
```

**Success Criteria:**
- [ ] Generates 4 contextual options
- [ ] Options reference actual battlefield entities
- [ ] Each option has valid action_mapping
- [ ] No hallucinated character names or abilities

---

### Step 4.2: Create API Endpoint

**Task:** Expose situation analyst via API

**File:** `backend/src/routes/battleRoutes.ts`

**Endpoint:** `POST /api/battle/situation-survey`

**Request:**
```typescript
{
  battle_id: string;
  character_id: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  survey: SituationSurvey;
}
```

**Verification:**
- [ ] Endpoint returns 200 on success
- [ ] Endpoint returns 400 on invalid input
- [ ] Endpoint returns 500 on AI failure
- [ ] Response matches expected format

---

### Step 4.3: Wire Rebellion Flow

**Task:** Connect adherence failure to situation analyst to character AI to judge

**Flow:**
```
1. Adherence check fails
2. Transition to REBELLION_SURVEY
3. Call situation analyst API
4. Display survey to... wait, who sees it?
```

**STOP POINT:** Clarify with user:
- Does the player see the survey options?
- Or does the character AI pick invisibly?
- How is the character's choice displayed to the player?

**Actions (after clarification):**
1. Call situation analyst when entering REBELLION_SURVEY
2. Transition to REBELLION_AI_DECIDING
3. Call character AI to pick from survey
4. Transition to REBELLION_EXECUTING
5. Execute the chosen action
6. Transition to JUDGE_EVALUATING
7. Call judge to evaluate
8. Display ruling
9. Transition to TURN_COMPLETE

**Verification:**
- [ ] Each step transitions correctly
- [ ] Data flows between steps
- [ ] Errors handled gracefully
- [ ] User sees appropriate feedback at each stage

---

### Step 4.4: Remove Plan B Weighting

**Task:** Delete unauthorized code

**File:** `frontend/src/systems/actionSurveyGenerator.ts`

**Actions:**
1. Find all calls to `applyPlanBWeighting()`
2. Remove the function and calls
3. Consider if `selectFromSurvey()` should also be removed
4. Update any code that depended on these

**Verification:**
- [ ] No calls to `applyPlanBWeighting` remain
- [ ] No Plan B logic anywhere in codebase
- [ ] Rebellion flow uses Situation Analyst instead
- [ ] No runtime errors

---

## PHASE 5: PVE Opponent AI

**Goal:** AI coach for opponent team in PVE battles

### Step 5.1: Create PVE Coach Service

**Task:** AI that makes coaching decisions for opponent team

**File:** `backend/src/services/pveCoachService.ts`

**STOP POINT:** Discuss with user:
- How smart should AI be?
- Should it use same Situation Analyst?
- Difficulty levels?

**Interface:**
```typescript
interface PVECoachDecision {
  character_id: string;
  orders: CoachOrders;
  reasoning?: string; // For debugging
}

async function getPVECoachDecision(
  battle_state: BattleState,
  character_id: string,
  difficulty: 'easy' | 'medium' | 'hard'
): Promise<PVECoachDecision>;
```

**Verification:**
- [ ] Returns valid orders
- [ ] Orders are executable
- [ ] Difficulty affects decision quality
- [ ] Doesn't take too long (< 2s)

---

### Step 5.2: Integrate PVE Coach with Battle Flow

**Task:** Use PVE coach during opponent coaching windows

**Actions:**
1. Detect when it's opponent's turn in PVE mode
2. Call PVE coach instead of showing coaching panel
3. Apply coach decision immediately (or with brief delay)
4. Proceed to adherence check

**Verification:**
- [ ] PVE turns don't show coaching panel
- [ ] AI decision made within timeout
- [ ] Adherence check still applies to AI-coached characters
- [ ] Battle flow continues normally

---

## PHASE 6: Polish & Integration

**Goal:** Smooth experience end-to-end

### Step 6.1: Battle Start Flow

**Task:** Unified flow from lobby to battle

**Actions:**
1. Create `BattleStartFlow` component
2. Handle team validation
3. Handle matchmaking/queue
4. Transition to battle arena

**Screens:**
1. Team Selection (validate 3 characters)
2. Mode Selection (PVP/PVE)
3. Matchmaking (if PVP) or Opponent Preview (if PVE)
4. Battle Loading
5. Battle Arena

**Verification:**
- [ ] Can start PVP battle
- [ ] Can start PVE battle
- [ ] Invalid teams rejected
- [ ] Smooth transitions between screens

---

### Step 6.2: Turn Order Indicator

**Task:** Show all 6 characters in initiative order

**Component:** `TurnOrderBar.tsx`

**Features:**
- Shows all 6 characters
- Highlights current character
- Shows knocked out characters differently
- Updates as battle progresses

**Verification:**
- [ ] All 6 characters displayed
- [ ] Correct initiative order
- [ ] Current turn highlighted
- [ ] KO'd characters shown differently

---

### Step 6.3: Adherence Check Animation

**Task:** Visual reveal of adherence roll

**Component:** `AdherenceCheckDisplay.tsx`

**Features:**
- Show roll (d100 animation?)
- Show threshold
- Show result (PASS/FAIL)
- Show modifiers applied

**Verification:**
- [ ] Roll visible
- [ ] Threshold visible
- [ ] Result clear (PASS = green, FAIL = red)
- [ ] Modifiers listed

---

### Step 6.4: Judge Ruling Display

**Task:** Show judge verdict for rebellions

**Component:** `JudgeRulingDisplay.tsx`

**Features:**
- Show judge name/icon
- Show verdict text
- Show points change (+/-)
- Show buffs/debuffs applied
- Show commentary

**Verification:**
- [ ] Judge identified
- [ ] Verdict clear
- [ ] Points change visible
- [ ] Effects listed
- [ ] Commentary displayed

---

### Step 6.5: Battle End Screen

**Task:** Show battle result and rewards

**Features:**
- Victory/Defeat display
- XP gained
- Currency gained
- Character status (injuries?)
- Continue button

**Verification:**
- [ ] Correct winner shown
- [ ] Rewards accurate
- [ ] Can navigate away

---

## FINAL VERIFICATION

Before considering battle system complete:

### Functional Tests
- [ ] Can start PVP battle
- [ ] Can start PVE battle
- [ ] Turn order is by initiative (mixed teams)
- [ ] Initiative ties use coin flip
- [ ] Coaching window works (timer, selection, lock-in)
- [ ] Timeout auto-submits
- [ ] Adherence check displays correctly
- [ ] PASS → deterministic execution (no AI, no judge)
- [ ] FAIL → situation analyst → character AI → action → judge
- [ ] Hex grid clicks work reliably
- [ ] Movement works
- [ ] Attack works
- [ ] Powers/spells work
- [ ] Battle ends correctly (knockout or 3 rounds)
- [ ] Battle end screen shows

### Data Integrity Tests
- [ ] All character data from DB (no hardcoded stats)
- [ ] Adherence calculated from DB + backend (no frontend calc)
- [ ] All abilities from DB (no hardcoded powers)
- [ ] Combat log accurately reflects actions
- [ ] Battle results saved to DB

### Edge Cases
- [ ] What if player disconnects mid-battle?
- [ ] What if AI call fails?
- [ ] What if character is knocked out before their turn?
- [ ] What if all characters on one team knocked out?
- [ ] What if timeout during rebellion flow?

### Performance
- [ ] Battle loads in < 3 seconds
- [ ] No lag during turns
- [ ] AI calls complete in < 5 seconds
- [ ] No memory leaks over long battle

---

## APPENDIX: Quick Reference

### Files to Create
```
frontend/src/features/battle-v2/
├── state/
│   ├── battleStateMachine.ts
│   ├── battleActions.ts
│   └── battleTypes.ts
├── components/
│   ├── BattleArenaV2.tsx
│   ├── CoachingPanel.tsx
│   ├── TurnOrderBar.tsx
│   ├── AdherenceCheckDisplay.tsx
│   ├── JudgeRulingDisplay.tsx
│   └── InteractiveHexGrid.tsx
├── hooks/
│   ├── useBattleState.ts
│   ├── useCoachingTimer.ts
│   └── useGridInteraction.ts
└── services/
    └── battleAPI.ts

backend/src/services/
├── situationAnalystService.ts
└── pveCoachService.ts
```

### Files to Delete
- `frontend/src/systems/adherenceCheckSystem.ts`
- `frontend/src/components/battle/HexBattleArena.tsx` (after V2 complete)
- `frontend/src/hooks/useBattleEngineLogic.ts` (after V2 complete)

### Files to Modify
- `backend/src/services/adherenceCalculationService.ts` (remove stat modifiers)
- `frontend/src/systems/actionSurveyGenerator.ts` (remove Plan B weighting)
- `frontend/src/components/battle/HexGrid.tsx` (fix scaling)

### Database Changes
- Add `effective_adherence` generated column to `user_characters`
