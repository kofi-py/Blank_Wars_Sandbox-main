# Battle System - Issues That Need Fixing

## CRITICAL BUGS (P0) - Fix Immediately

### 1. Financial Event Data Loss
**File:** `src/hooks/battle/useBattleRewards.ts` (lines 134-161)
**Problem:** Fire-and-forget async pattern - if API fails, earnings data is lost forever
**Fix:**
- Create queue system with retry logic
- Persist failed events to IndexedDB
- Process queue on next app launch

### 2. WebSocket Resource Leak
**File:** `src/hooks/battle/useBattleWebSocket.ts` (line 78 has TODO comment)
**Problem:** New WebSocket created on every render, connections never cleaned up
**Fix:**
- Implement singleton WebSocket manager
- Add connection cleanup in useEffect return
- Add heartbeat to detect dead connections

### 3. No Input Validation
**Problem:** Character HP, morale, psychology stats have no bounds checking
**Fix:**
- Add validation utility functions
- Clamp all numeric values to valid ranges (HP: 0-maxHP, morale: 0-100, etc.)
- Apply validation to all state setters

### 4. No Error Boundaries
**Problem:** Battle errors crash entire app
**Fix:**
- Create React ErrorBoundary component
- Wrap battle components
- Show user-friendly error message with "Return to Lobby" option

---

## TESTING (P0) - Currently 0% Coverage

### 5. No Test Infrastructure
**Problem:** Zero tests exist, can't refactor safely
**Fix:**
- Install Jest + React Testing Library
- Create test config files
- Write 30+ unit tests for:
  - Psychology deviation calculation
  - Rewards XP calculation
  - Judge decision logic
  - Team chemistry calculation
- Write 3+ integration tests for full battle flows

---

## ARCHITECTURE ISSUES (P1) - Maintenance Problems

### 6. Monolithic Component
**File:** `ImprovedBattleArena.tsx` (2,228 lines)
**Problem:** Unmaintainable single massive component
**Fix:**
- Extract phase-specific components (PreBattleHuddle, StrategySelection, CombatPhase, etc.)
- Extract UI components (BattleHUD, HealthBar, StatusEffects, etc.)
- Create BattleOrchestrator to coordinate phases
- Target: No component >500 lines

### 7. No State Management
**File:** `useBattleState.ts` (50+ useState hooks)
**Problem:** Flat state structure causes re-render cascades
**Fix:**
- Implement Zustand store
- Migrate all useState to centralized store
- Add selectors to minimize re-renders
- Use Immer for immutable updates

### 8. Duplicate Judge Systems
**Files:** `aiJudge.ts` (364 lines) AND `aiJudgeSystem.ts` (868 lines)
**Problem:** Two competing implementations, unclear which to use
**Fix:**
- Merge into single unified JudgeSystem
- Update all references
- Delete one of the old files

---

## PERFORMANCE ISSUES (P1)

### 9. Psychology Map Cloning
**File:** `usePsychologySystem.ts` (lines 98-100)
**Problem:** Full Map cloned 100+ times per battle = 300KB memory churn
**Fix:**
- Use Immer's produce() for structural sharing
- Stop cloning entire Map on every update

### 10. No Memoization
**Problem:** Expensive calculations (deviation risk, team chemistry) run every render
**Fix:**
- Add useMemo to deviation risk calculation
- Add useMemo to team chemistry calculation
- Add React.memo to expensive components (HealthBar, StatusEffects, etc.)

### 11. Large Bundle Size
**Problem:** Estimated 640KB battle bundle
**Fix:**
- Configure code splitting in next.config.js
- Lazy load HexBattleArena (413 lines, not always used)
- Lazy load heavy modals/components

---

## CODE QUALITY (P2)

### 12. Magic Numbers Everywhere
**Problem:** Hardcoded values throughout (timeout: 45000, baseline: 70, etc.)
**Fix:**
- Create BATTLE_CONSTANTS object
- Extract all magic numbers
- Use constants everywhere

### 13. 15+ TODO Comments
**Problem:** Incomplete features flagged with TODOs
**Examples:**
- "TODO: Track actual strategy success" (usePsychologySystem.ts:84)
- "TODO: Track arena damage" (usePsychologySystem.ts:158)
- "TODO: Implement judge training/progression" (aiJudgeSystem.ts:456)
**Fix:**
- Complete or remove each TODO
- Convert to GitHub issues if not addressing now

### 14. Minimal Documentation
**Problem:** <10% of functions have JSDoc comments
**Fix:**
- Add JSDoc to all exported functions
- Document complex internal logic
- Add inline comments for non-obvious code

---

## INTEGRATION (P2)

### 15. Hex Mode Separate
**File:** `HexBattleArena.tsx` (413 lines, incomplete)
**Problem:** Completely separate from main battle system, duplicates code
**Issues in file:**
- TODO line 65: "Attack logic with psychology integration would go here"
- TODO line 145: "use character's weapon range" (hardcoded to 5)
- No damage calculation
- No win conditions
- No rewards

**Fix:**
- Share psychology system with hex mode
- Share judge system with hex mode
- Implement missing features or remove hex mode entirely

### 16. No Battle Persistence
**Problem:** Refresh page = lose all battle progress
**Fix:**
- Auto-save battle state to localStorage each round
- Prompt "Resume battle?" on page load
- Clear saved state on battle completion

---

## FILES WITH SPECIFIC ISSUES

### battleCharacterUtils.ts (62 lines)
**Issues:**
- Uses `any` type (line 10) to bypass type safety
- Default values hardcoded (confidence: 50, stress: 0) instead of reading from character.psychStats
- Equipment bonuses always 0, should read from character.equipment
- Relationship modifiers empty array, should populate from character.relationships

### useCoachingSystem.ts (591 lines)
**Issues:**
- Coach skill hardcoded to 75 (line 283), should come from coach progression system
- API URL hardcoded to localhost:3006 (lines 360-385), won't work in production
- 2 second timeout too aggressive for AI responses
- Berserk message displayed but status not actually applied to character

### useBattleSimulation.ts (367 lines)
**Issues:**
- Random ability selection (no strategy consideration)
- No ability cooldowns tracked
- Speed calculation adds random 0-20 (20% variance is very high)
- Fast battle mode too simplistic (just power comparison, ignores psychology/strategy)

### physicalBattleEngine.ts (1,231 lines)
**Issues:**
- Damage formula needs balancing (current values feel arbitrary)
- Critical hit multiplier (2x) may be too high
- No diminishing returns on defense stacking

### battleEngine.ts (1,628 lines)
**Issues:**
- TODO line 567: "Implement injury system"
- TODO line 892: "Add battle replay recording"
- Phase transition logic scattered, should be centralized

---

## SUMMARY OF WORK NEEDED

**Critical (Must Fix):**
1. Financial event data loss (P0)
2. WebSocket leak (P0)
3. Input validation (P0)
4. Error boundaries (P0)
5. Testing infrastructure (P0)

**Important (Should Fix):**
6. Component decomposition (P1)
7. State management (P1)
8. Unify judge systems (P1)
9. Psychology Map performance (P1)
10. Memoization (P1)

**Nice to Have (Can Wait):**
11. Bundle optimization (P2)
12. Extract constants (P2)
13. Complete TODOs (P2)
14. Documentation (P2)
15. Hex mode integration (P2)
16. Battle persistence (P2)

---

## WHAT IS ALREADY WORKING

The battle system EXISTS and is FUNCTIONAL:
- ✅ 4-phase battle flow works
- ✅ 2-out-of-3 system works
- ✅ Psychology system calculates deviation risk
- ✅ Judge system makes rulings
- ✅ Coaching system allows strategy selection
- ✅ Rewards system calculates XP and earnings
- ✅ Team chemistry system works
- ✅ Multiplayer WebSocket integration works (just has leak)
- ✅ All 24 files compile and run

The system is FRAGILE but COMPLETE. It needs FIXES not FEATURES.
