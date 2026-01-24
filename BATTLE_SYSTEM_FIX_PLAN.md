# Battle System Fix Plan - Technical TODO List

## Critical Bugs (P0 - Fix Immediately)

### 1. Fix Financial Event Data Loss
**Problem:** Financial events use fire-and-forget pattern, data gets lost if API fails
**File:** `useBattleRewards.ts` lines 134-161

**Solution:**
- [ ] Create IndexedDB queue for financial events
- [ ] Add retry logic with exponential backoff (3 retries)
- [ ] Persist failed events to queue
- [ ] Process queue on app startup
- [ ] Add monitoring for queue depth

**Files to create/modify:**
- Create: `src/services/financialEventQueue.ts`
- Modify: `src/hooks/battle/useBattleRewards.ts`

---

### 2. Fix WebSocket Resource Leak
**Problem:** New WebSocket created on every render, connections never cleaned up
**File:** `useBattleWebSocket.ts`

**Solution:**
- [ ] Create singleton WebSocket manager
- [ ] Use React ref to persist connection
- [ ] Add heartbeat every 30 seconds
- [ ] Add reconnection logic
- [ ] Add connection status indicator in UI

**Files to create/modify:**
- Create: `src/services/battleWebSocket.ts`
- Modify: `src/hooks/battle/useBattleWebSocket.ts`

---

### 3. Add Input Validation
**Problem:** No validation on state values, can set negative HP, morale >100, etc.

**Solution:**
- [ ] Create validation utility functions
- [ ] Add clamp function for numeric ranges
- [ ] Validate character HP (0 to maxHp)
- [ ] Validate morale (0 to 100)
- [ ] Validate all psychology stats (0 to 100)
- [ ] Add validation to all state setters

**Files to create/modify:**
- Create: `src/utils/battleValidation.ts`
- Modify: `src/hooks/battle/useBattleState.ts` (all setters)

---

### 4. Add Error Boundaries
**Problem:** Battle errors crash entire app

**Solution:**
- [ ] Create BattleErrorBoundary component
- [ ] Wrap ImprovedBattleArena with boundary
- [ ] Add user-friendly error UI
- [ ] Add "Return to Lobby" button
- [ ] Log errors to monitoring service

**Files to create:**
- Create: `src/components/battle/BattleErrorBoundary.tsx`

---

## Testing Infrastructure (P0 - Enable Safe Refactoring)

### 5. Setup Testing Framework
- [ ] Install Jest + React Testing Library
- [ ] Create jest.config.js
- [ ] Create jest.setup.js with mocks
- [ ] Add test scripts to package.json
- [ ] Configure coverage thresholds (30%)

---

### 6. Write Critical Path Tests
- [ ] Test psychology deviation risk calculation (10 test cases)
- [ ] Test rewards XP calculation (8 test cases)
- [ ] Test judge decision making (8 test cases)
- [ ] Test level-up logic (5 test cases)
- [ ] Test team chemistry calculation (5 test cases)

**Files to create:**
- `src/data/__tests__/characterPsychology.test.ts`
- `src/data/__tests__/combatRewards.test.ts`
- `src/data/__tests__/aiJudgeSystem.test.ts`
- `src/data/__tests__/teamBattleSystem.test.ts`

---

### 7. Write Integration Tests
- [ ] Test full battle flow (start to finish)
- [ ] Test deviation handling flow
- [ ] Test rewards distribution flow

**Files to create:**
- `src/hooks/battle/__tests__/battleFlow.integration.test.tsx`

---

### 8. Create Test Utilities
- [ ] Create mock character factory
- [ ] Create mock team factory
- [ ] Create mock battle state factory

**Files to create:**
- `src/__tests__/utils/battleTestUtils.ts`

---

## Architecture Refactor (P1 - Enable Sustainable Growth)

### 9. Implement State Management (Zustand)
**Problem:** 50+ useState hooks make state hard to manage

**Solution:**
- [ ] Install Zustand
- [ ] Create battle store with all state
- [ ] Add Immer middleware for immutable updates
- [ ] Add DevTools middleware
- [ ] Migrate useBattleState to use Zustand
- [ ] Migrate all other hooks to use Zustand
- [ ] Remove old useState hooks
- [ ] Add selectors for performance

**Files to create/modify:**
- Create: `src/stores/battleStore.ts`
- Modify: All 13 battle hooks

---

### 10. Decompose ImprovedBattleArena
**Problem:** 2,228-line component is unmaintainable

**Solution:**
- [ ] Create BattleOrchestrator component (phase coordinator)
- [ ] Extract PreBattleHuddle component
- [ ] Extract StrategySelection component
- [ ] Extract CombatPhase component
- [ ] Extract CoachingTimeout component
- [ ] Extract BattleComplete component
- [ ] Extract BattleHUD component
- [ ] Extract sub-components (HealthBar, TeamDisplay, etc.)
- [ ] Delete old ImprovedBattleArena.tsx

**Files to create:**
- `src/components/battle/BattleOrchestrator.tsx`
- `src/components/battle/phases/PreBattleHuddle.tsx`
- `src/components/battle/phases/StrategySelection.tsx`
- `src/components/battle/phases/CombatPhase.tsx`
- `src/components/battle/phases/CoachingTimeout.tsx`
- `src/components/battle/phases/BattleComplete.tsx`
- `src/components/battle/hud/BattleHUD.tsx`
- `src/components/battle/hud/HealthBar.tsx`
- `src/components/battle/hud/TeamDisplay.tsx`

---

### 11. Unify Judge Systems
**Problem:** Two competing systems (aiJudge.ts vs aiJudgeSystem.ts)

**Solution:**
- [ ] Create unified JudgeSystem service
- [ ] Migrate all 8 judge personalities
- [ ] Implement single makeDecision function
- [ ] Update all references to use new system
- [ ] Delete aiJudge.ts
- [ ] Delete aiJudgeSystem.ts

**Files to create/modify:**
- Create: `src/services/judgeSystem.ts`
- Modify: `src/hooks/battle/usePsychologySystem.ts`
- Delete: `src/data/aiJudge.ts`
- Delete: `src/data/aiJudgeSystem.ts`

---

## Performance Optimization (P1 - Improve UX)

### 12. Fix Psychology Map Cloning
**Problem:** Map cloned 100+ times per battle causing 300KB memory churn

**Solution:**
- [ ] Install Immer
- [ ] Use Immer produce() for Map updates
- [ ] Measure performance improvement

**Files to modify:**
- `src/hooks/battle/usePsychologySystem.ts`

---

### 13. Add Memoization
**Problem:** Expensive calculations repeated every render

**Solution:**
- [ ] Memoize deviation risk calculation
- [ ] Memoize team chemistry calculation
- [ ] Memoize reward calculations
- [ ] Add React.memo to HealthBar component
- [ ] Add React.memo to StatusEffects component
- [ ] Add React.memo to PsychologyIndicator component

**Files to modify:**
- `src/hooks/battle/usePsychologySystem.ts`
- `src/data/teamBattleSystem.ts`
- `src/components/battle/hud/HealthBar.tsx`
- `src/components/battle/hud/StatusEffects.tsx`

---

### 14. Optimize Bundle Size
**Problem:** 640KB battle bundle

**Solution:**
- [ ] Configure code splitting in next.config.js
- [ ] Lazy load HexBattleArena
- [ ] Lazy load BattleRewards modal
- [ ] Lazy load heavy components
- [ ] Run webpack-bundle-analyzer
- [ ] Verify bundle size reduction

**Files to modify:**
- `next.config.js`
- `src/components/battle/BattleOrchestrator.tsx`

---

### 15. Add Zustand Selectors
**Problem:** Components subscribe to entire store causing unnecessary re-renders

**Solution:**
- [ ] Replace `useBattleStore()` with specific selectors
- [ ] Use `useBattleStore(state => state.player1)` pattern
- [ ] Measure re-render reduction with React Profiler

**Files to modify:**
- All components using useBattleStore

---

## Code Quality (P2)

### 16. Extract Magic Numbers to Constants
**Problem:** Hardcoded values throughout codebase

**Solution:**
- [ ] Create BATTLE_CONSTANTS object
- [ ] Move all timers (15s, 60s, 45s, etc.)
- [ ] Move psychology constants (baseline 70, stress decay 5, etc.)
- [ ] Move combat constants (crit chance 5%, evasion cap 75%, etc.)
- [ ] Replace all hardcoded values with constants

**Files to create/modify:**
- Create: `src/data/battleConstants.ts`
- Modify: All battle files (replace magic numbers)

---

### 17. Complete TODO Items
**Problem:** 15+ TODO comments for incomplete features

**Solution:**
- [ ] Convert all TODOs to GitHub issues
- [ ] Prioritize by user impact
- [ ] Fix "Track actual strategy success" (usePsychologySystem.ts:84)
- [ ] Fix "Track arena damage" (usePsychologySystem.ts:158)
- [ ] Fix "Implement judge training/progression" (aiJudgeSystem.ts:456)
- [ ] Fix "Implement injury system" (battleEngine.ts:567)

---

### 18. Add JSDoc Comments
**Problem:** Minimal documentation

**Solution:**
- [ ] Add JSDoc to all exported functions
- [ ] Document all interfaces
- [ ] Document complex internal functions
- [ ] Generate API documentation

---

## Integration (P2)

### 19. Integrate Hex Mode with Main System
**Problem:** Hex mode completely separate, duplicate code

**Solution:**
- [ ] Share psychology system with hex mode
- [ ] Share judge system with hex mode
- [ ] Share coaching system with hex mode
- [ ] Add toggle to switch between modes mid-battle
- [ ] Implement damage calculation in hex mode
- [ ] Add win conditions to hex mode

**Files to modify:**
- `src/components/battle/HexBattleArena.tsx`

---

### 20. Add Battle State Persistence
**Problem:** Refresh loses battle progress

**Solution:**
- [ ] Auto-save battle state to localStorage every round
- [ ] Add "Resume Battle?" prompt on mount
- [ ] Clear saved state on battle completion
- [ ] Add battle state versioning

**Files to modify:**
- `src/stores/battleStore.ts` (add persistence middleware)

---

## Monitoring & Observability (P2)

### 21. Add Performance Monitoring
- [ ] Add React Profiler to track re-renders
- [ ] Add performance.now() tracking for deviation calc
- [ ] Add Web Vitals tracking
- [ ] Add custom metrics (battles completed, deviations occurred, etc.)

---

### 22. Add Error Monitoring
- [ ] Integrate Sentry or similar
- [ ] Track validation errors
- [ ] Track API failures
- [ ] Track WebSocket disconnects
- [ ] Track financial event failures

---

## Rollout Strategy

### Phase 1: Critical Bugs (Week 1-2)
- [ ] Complete items 1-4
- [ ] Deploy to staging
- [ ] Test thoroughly
- [ ] Deploy to production
- [ ] Monitor for 1 week

### Phase 2: Testing (Week 3-4)
- [ ] Complete items 5-8
- [ ] Reach 30% test coverage
- [ ] Run tests in CI

### Phase 3: Architecture (Week 5-9)
- [ ] Complete items 9-11
- [ ] Deploy incrementally with feature flags
- [ ] Monitor performance and errors

### Phase 4: Performance (Week 10-12)
- [ ] Complete items 12-15
- [ ] Measure improvements
- [ ] Optimize based on profiling

### Phase 5: Polish (Week 13+)
- [ ] Complete items 16-22
- [ ] Continuous improvement

---

## Success Metrics

### After Phase 1:
- ✅ 0 financial events lost over 30 days
- ✅ Max 1 WebSocket connection per user
- ✅ 0 invalid state errors
- ✅ 0 full app crashes from battle

### After Phase 2:
- ✅ 30% test coverage
- ✅ 30+ unit tests passing
- ✅ 3+ integration tests passing

### After Phase 3:
- ✅ Largest component <500 lines
- ✅ 0 useState hooks (all in Zustand)
- ✅ 1 judge system (unified)

### After Phase 4:
- ✅ 40% reduction in re-renders
- ✅ 50% faster deviation calculation
- ✅ 30% smaller bundle size
- ✅ 60fps during combat

---

## Priority Summary

**Do First (P0):**
1. Fix financial event data loss
2. Fix WebSocket leak
3. Add input validation
4. Add error boundaries
5. Setup testing

**Do Next (P1):**
6. Implement Zustand
7. Decompose ImprovedBattleArena
8. Unify judge systems
9. Optimize performance

**Do Later (P2):**
10. Extract constants
11. Complete TODOs
12. Add documentation
13. Integrate hex mode
14. Add persistence

---

## Files to Create (Summary)

**New Services:**
- `src/services/financialEventQueue.ts`
- `src/services/battleWebSocket.ts`
- `src/services/judgeSystem.ts`

**New Utilities:**
- `src/utils/battleValidation.ts`
- `src/__tests__/utils/battleTestUtils.ts`

**New Components:**
- `src/components/battle/BattleErrorBoundary.tsx`
- `src/components/battle/BattleOrchestrator.tsx`
- `src/components/battle/phases/*.tsx` (5 components)
- `src/components/battle/hud/*.tsx` (3+ components)

**New State:**
- `src/stores/battleStore.ts`

**New Tests:**
- `src/data/__tests__/*.test.ts` (4 test files)
- `src/hooks/battle/__tests__/*.test.tsx` (1 test file)

**New Constants:**
- `src/data/battleConstants.ts`

---

**Total Items: 22 major tasks, 100+ sub-tasks**
