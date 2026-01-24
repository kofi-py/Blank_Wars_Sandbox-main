# Hex Grid Battle System Migration Audit
**Date:** 2025-10-04
**Status:** Complete audit, ready for migration plan

---

## Executive Summary

The existing battle system (83KB ImprovedBattleArena.tsx + 12 hooks) is built for **abstract turn-based combat** with no spatial positioning. The hex grid introduces **spatial tactical combat** requiring fundamental architecture changes.

**Critical Finding:** Psychology/adherence system is PERFECT and ready for hex grid integration. Core combat execution needs complete replacement.

---

## 🟢 KEEP - Systems Ready for Hex Grid Integration

### 1. **Psychology/Adherence System** ✅ PRODUCTION READY
**File:** `frontend/src/hooks/usePsychologySystem.ts` (444 lines)

**Key Function:** `checkForChaos(attacker, defender, ability, isPlayerTeam)` (Line 72)

**Flow:**
1. Fetch character's current `PsychologyState`
2. Calculate `deviationRisk` using:
   - HP damage (wallet/debt effects)
   - Team chemistry
   - Morale
   - Coach bonuses (`gameplanAdherenceBonus`, `deviationRiskReduction`)
3. `rollForDeviation(deviationRisk)` → determines if character goes rogue
4. If adheres → execute coach's planned action
5. If deviates → `makeJudgeDecision()` rules on rogue action

**Integration Point for Hex Grid:**
```typescript
// Current: checkForChaos(attacker, defender, ability, isPlayerTeam)
// Hex Grid: checkForChaos(attacker, defender, hexAction, isPlayerTeam)
// Where hexAction = { type: 'move' | 'attack', targetHex, targetCharacter }
```

**NO CHANGES NEEDED** - Just pass hex actions instead of abstract abilities.

---

### 2. **Judge System** ✅ PRODUCTION READY
**File:** `frontend/src/data/aiJudgeSystem.ts`

**5 Judge Personalities:**
- Judge Executioner (strict, punishes chaos)
- Judge Chaos (rewards creativity)
- Judge Wisdom (logical)
- Judge Spectacle (theatrical)
- Judge Mercy (compassionate)

**Mechanical Effects:**
- `damage` (self/opponent/teammate)
- `skip_turn`
- `redirect_attack` (teammate/all)
- `environmental` (destroy broadcast tower)

**Integration:** Works perfectly with hex grid - judges rule on spatial chaos (fleeing to perimeter, attacking teammate hex position, throwing weapon at camera).

---

### 3. **Coach Bonuses System** ✅ PRODUCTION READY
**API:** `coachProgressionAPI.getProgression()`

**Bonuses Applied:**
- `gameplanAdherenceBonus` - Reduces deviation risk
- `deviationRiskReduction` - Direct risk reduction
- `teamChemistryBonus` - Improves team harmony
- `battleXPMultiplier` - XP rewards
- `characterDevelopmentMultiplier` - Character growth

**Integration:** Already fetched in usePsychologySystem (lines 50-69), automatically applies to hex grid adherence checks.

---

### 4. **Morale & Team Chemistry** ✅ PRODUCTION READY
**File:** `frontend/src/hooks/useBattleState.ts`

**State Tracking:**
- `playerMorale` / `opponentMorale` (0-100)
- `playerTeam.teamChemistry` (0-100)
- `playerTeam.teamCulture` ('military' | 'family' | 'divas' | 'chaos' | 'brotherhood' | 'balanced')

**Integration:** Morale affects deviation risk, already wired into psychology system.

---

### 5. **Weight Class & Matchmaking** ✅ PRODUCTION READY
**File:** `frontend/src/data/weightClassSystem.ts`

**7 Weight Classes:**
- Rookie (1-5) → Transcendent (101-200)
- Punch-up bonuses: +50%/+100%/+200% XP for 5+/8+/12+ levels above
- Aggressive matchmaking prevents punching down

**Integration:** Hex grid doesn't change weight class logic.

---

### 6. **Battle Rewards & Progression** ✅ PRODUCTION READY
**File:** `frontend/src/hooks/useBattleRewards.ts`

**Integration:** Hex grid results feed into existing reward calculation.

---

### 7. **Audio Announcer (Hostmaster v8.72)** ✅ PRODUCTION READY
**File:** `frontend/src/hooks/useBattleAnnouncer.ts`

**Functions:**
- `announceBattleStart()`, `announceRoundStart()`, `announceAction()`, `announceVictory()`

**Integration:** Call on hex grid events (character moves, attacks, deviates).

---

### 8. **WebSocket PVP Infrastructure** ✅ PRODUCTION READY
**File:** `frontend/src/hooks/useBattleWebSocket.ts`

**Integration:** Hex grid state syncs via WebSocket for PVP.

---

## 🔴 REMOVE - Abstract Combat Logic (No Spatial Awareness)

### 1. **executeTeamRound()** - Lines 131-227 in `useBattleEngineLogic.ts`
**Why Remove:**
- No positioning logic
- Random damage calculation: `baseAttack - defense + random(10)`
- No range checks, no LoS checks
- Abilities selected randomly

**Replace With:** Hex-based turn execution with spatial logic.

---

### 2. **executePhysicalAction()** - Lines 57-192 in `physicalBattleEngine.ts`
**Why Remove:**
- Abstract damage calculation (no spatial modifiers)
- No concept of flanking, high ground, range

**Keep:** Psychology deviation monitoring (lines 365-420), judge decision processing (lines 194-266)

**Replace With:** Hex grid damage calculation with spatial bonuses:
- Flanking bonus (+20% damage if 2+ teammates adjacent to target)
- High ground (if implemented)
- Range penalties (beyond optimal weapon range)

---

### 3. **BattleEngine.executeCombatRound()** - Abstract turn loop
**File:** `frontend/src/systems/battleEngine.ts`

**Why Remove:** No spatial state tracking.

**Replace With:** Hex grid turn loop:
1. Initialize hex grid with character positions
2. Speed-based turn order
3. For each character's turn:
   - Coach recommends move + attack (between rounds)
   - `checkForChaos()` → adherence check
   - If adheres → execute coach's hex action
   - If deviates → AI chooses rogue hex action (flee, attack teammate, etc.)
   - Judge rules if severe
4. Repeat until victory condition

---

## ⚠️ MODIFY - Coaching System (Spatial Planning Required)

### **CoachingEngine** - `frontend/src/data/coachingSystem.ts`
**Current:** Coach recommends abstract strategies ("aggressive", "defensive")

**Hex Grid Needs:**
- Coach marks hex grid positions (movement targets)
- Coach selects attack targets with range consideration
- Coach plans combos (move to flank → attack)

**Modification Needed:** Add spatial coaching UI:
```typescript
interface CoachPlannedAction {
  characterId: string;
  moveToHex?: HexPosition;  // NEW: spatial movement
  attackTargetId?: string;
  attackTargetHex?: HexPosition; // NEW: spatial targeting
  ability?: string;
}
```

---

## 📋 Migration Plan - Execution Order

### Phase 1: Turn Execution Replacement
**Replace:** `useBattleEngineLogic.ts` → `useHexBattleEngine.ts`

**New Turn Flow:**
```typescript
1. startHexBattle()
   - Initialize HexBattleGrid
   - Place teams at start positions (rows 1-3 vs 10-12)
   - Initialize psychology states (KEEP existing logic)
   - Select judge (KEEP existing logic)

2. executeHexTurn(characterId)
   - Get character's hex position
   - Coach's planned action = { moveToHex, attackTarget }

   - Call checkForChaos(character, target, hexAction, isPlayerTeam)
     ↓
   - If adheres → execute planned hex action
     * Validate movement (AP, range, LoS) via HexMovementEngine
     * Validate attack (AP, range, LoS) via HexLineOfSight
     * Execute deterministically

   - If deviates → AI generates rogue hex action
     * Options: flee to perimeter, attack teammate hex, throw weapon at camera
     * Judge rules on action
     * Execute based on ruling

   - Update hex grid state
   - Deduct AP
   - Check victory condition
```

---

### Phase 2: Coaching UI Extension
**Modify:** `frontend/src/components/CoachingPanel.tsx`

**Add:**
- Hex grid overlay during coaching phase
- Coach clicks character → clicks target hex → selects action
- Show reachable hexes (based on 3 AP)
- Show attack range circles
- Strategy stored as `{ moveToHex, attackTarget }`

---

### Phase 3: Battle UI Replacement
**Replace:** `ImprovedBattleArena.tsx` sections

**Keep:**
- Psychology panel
- Judge ruling modal
- Morale indicators
- Team roster display
- Audio announcer integration

**Replace:**
- Combat viewport → Hex grid canvas (HexGrid.tsx)
- Turn indicators → Show active character on hex
- Action buttons → Move/Attack with hex selection

---

### Phase 4: Backend Integration
**Modify:** `backend/src/services/battleService.ts`

**Add:**
- Hex grid state to battle record
- Character positions per turn
- Movement/attack logs with hex coordinates
- Deterministic replay from logs

---

## 🎯 Critical Integration Points

### **checkForChaos() Call Site**
**Current Call (Abstract):**
```typescript
checkForChaos(attacker, defender, ability, isPlayerTeam)
```

**Hex Grid Call:**
```typescript
const hexAction = {
  type: 'move_and_attack',
  moveToHex: coachPlannedMove,
  attackTargetHex: coachPlannedTarget,
  attackTargetId: targetCharacter.id
};

const result = checkForChaos(character, targetCharacter, hexAction, isPlayerTeam);

// If result.adhered:
//   HexMovementEngine.executeMove()
//   HexLineOfSight.validateAttack()
//   Deal damage with spatial modifiers

// If result.deviated:
//   AIJudge.generateRogueHexAction() → flee/friendly-fire/environmental
//   Judge rules
//   Execute based on ruling
```

---

## Timeline Estimate

**Phase 1:** Turn Execution Replacement - **2-3 days**
**Phase 2:** Coaching UI Extension - **1-2 days**
**Phase 3:** Battle UI Replacement - **2-3 days**
**Phase 4:** Backend Integration - **1 day**
**Testing & Polish:** **2 days**

**Total:** **8-11 days** for full hex grid battle system

---

## Risk Mitigation

**Risk:** Breaking existing psychology/adherence system
**Mitigation:** Psychology system requires ZERO changes - just pass hex actions instead of abilities

**Risk:** PVP WebSocket sync issues with hex state
**Mitigation:** Hex state is deterministic - sync character positions + AP state each turn

**Risk:** UI performance with canvas rendering
**Mitigation:** HexGrid.tsx uses Canvas API - can handle 144 hexes + 6 characters easily

---

## Files to Delete After Migration

```
❌ frontend/src/components/ImprovedBattleArena.tsx (keep as backup)
❌ frontend/src/hooks/useBattleEngineLogic.ts
❌ frontend/src/systems/battleEngine.ts (abstract turn logic)
❌ frontend/src/systems/physicalBattleEngine.ts (keep psychology/judge functions, delete combat calc)
```

---

## Files to Create

```
✅ frontend/src/hooks/useHexBattleEngine.ts (new turn execution)
✅ frontend/src/components/HexBattleArena.tsx (new main component)
✅ frontend/src/components/battle/HexCoachingPanel.tsx (spatial coaching)
✅ frontend/src/components/battle/ActionOverlay.tsx (movement/attack highlights)
```

---

## Conclusion

The existing battle system's **psychology, judge, coaching, and progression systems are production-ready** and require no changes. Only the **combat execution logic** needs replacement with hex grid spatial mechanics.

The adherence system's `checkForChaos()` function is the perfect integration point - it just needs hex actions instead of abstract abilities passed to it.
