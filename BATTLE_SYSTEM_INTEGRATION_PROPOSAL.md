# Battle System Integration Proposal
**Date:** October 30, 2025
**Backup Location:** `backup_battle_20251030_174026/`
**Status:** Ready for Implementation

---

## Executive Summary

The battle system has **95% of backend logic complete** and **70% of frontend implementation done**, but it's using demo/mock data instead of real database characters and not properly integrated with the game's event/stat/consequence systems. This proposal outlines the exact changes needed to make battles work end-to-end with real data.

---

## Current State Analysis

### What Works ✅
- **Backend BattleService** (1,800+ lines): Full matchmaking, lifecycle, WebSocket communication
- **Backend BattleMechanicsService** (750+ lines): Combat calculations, status effects, abilities
- **Database Integration**: Battles table, participants, rewards all ready
- **Socket.IO Server**: Running on port 4000, ready for real-time battles
- **Frontend Battle Logic**: `ImprovedBattleArena` with 1,600+ lines of state management
- **Event System**: GameEventBus ready with battle event types defined
- **EventPublisher**: Has `publishBattleStart()` and `publishBattleEnd()` methods ready

### What's Broken ❌
1. **Uses Demo Data**: Calls `createDemoPlayerTeam()` and `createDemoOpponentTeam()` instead of loading real characters
2. **No Real Event Publishing**: Battle events not actually sent to GameEventBus
3. **No Character Progression**: Wins/losses don't update character stats in database
4. **No Financial Consequences**: Battle rewards don't update character wallets
5. **Incomplete WebSocket Flow**: Frontend connects but doesn't properly sync with backend BattleManager

---

## Global Framework Standards (From Working Systems)

### Pattern from Therapy & Kitchen Table

**1. Real Character Loading:**
```typescript
// ✅ CORRECT (Therapy does this)
const characters = await characterAPI.getUserCharacters();

// ❌ WRONG (Battle currently does this)
const playerTeam = createDemoPlayerTeam();
```

**2. Socket.IO Connection:**
```typescript
// ✅ CORRECT Pattern (Kitchen Table)
const socket = io('http://localhost:4000', {
  transports: ['websocket', 'polling'],
  timeout: 20000,
  forceNew: true
});
```

**3. Event Publishing:**
```typescript
// ✅ CORRECT (Therapy publishes events)
await EventPublisher.getInstance().publishTherapySession({...});

// ❌ Battle doesn't do this yet
```

**4. API Client Usage:**
```typescript
// Base URL: 'http://localhost:3006/api' (NOT 4000)
// Uses axios with credentials: true for cookies
// CSRF token automatically added to POST/PUT/DELETE
```

---

## Required Changes

### Phase 1: Replace Demo Data with Real Characters

**File:** `frontend/src/components/ImprovedBattleArena.tsx`

**Current Code (Lines 1137-1143):**
```typescript
// Create AI opponent team
const aiOpponentTeam = createDemoOpponentTeam();
actions.setOpponentTeam(aiOpponentTeam);
```

**Proposed Change:**
```typescript
// Load real opponent from backend matchmaking or create from real character data
const opponentCharacters = await characterAPI.getUserCharacters(); // Get real chars
const selectedOpponent = opponentCharacters[Math.floor(Math.random() * opponentCharacters.length)];

const opponentTeam: Team = {
  id: `opponent-${selectedOpponent.id}`,
  name: `${selectedOpponent.name}'s Team`,
  characters: [convertToTeamCharacter(selectedOpponent)],
  teamChemistry: 70,
  currentMorale: 80,
  maxMorale: 100
};
actions.setOpponentTeam(opponentTeam);
```

**Impact:** Player now faces real characters from database, not fake demo data.

---

### Phase 2: Integrate Event System

**File:** `frontend/src/components/ImprovedBattleArena.tsx`

**Add at top:**
```typescript
import EventPublisher from '@/services/eventPublisher';
```

**Add after battle starts (around line 1146):**
```typescript
// Publish battle start event
await EventPublisher.getInstance().publishBattleStart({
  winnerId: '', // Will be determined later
  loserId: '',
  participants: [
    ...playerTeamFromSelection.characters.map(c => c.characterId),
    ...opponentTeam.characters.map(c => c.characterId)
  ],
  battleDuration: 0,
  strategyUsed: 'balanced', // From user selection
  teamworkRating: playerTeamFromSelection.teamChemistry,
  battleType: 'arena'
});
```

**Add after battle ends:**
```typescript
// Publish battle end event
await EventPublisher.getInstance().publishBattleEnd({
  winnerId: winner.id,
  loserId: loser.id,
  participants: [...],
  battleDuration: battleDurationInSeconds,
  strategyUsed: userStrategy,
  mvpPlayer: determineM VP(),
  teamworkRating: finalChemistry,
  battleType: 'arena'
});
```

**Impact:** All battles now create memory events that characters can reference in therapy/chat.

---

### Phase 3: Character Progression Integration

**File:** `frontend/src/components/ImprovedBattleArena.tsx`

**Add after battle victory:**
```typescript
// Update character stats in database
for (const character of winningTeam.characters) {
  await characterAPI.updateCharacter(character.characterId, {
    total_battles: character.totalBattles + 1,
    total_wins: character.totalWins + 1,
    experience: character.experience + xpReward
  });
}

for (const character of losingTeam.characters) {
  await characterAPI.updateCharacter(character.characterId, {
    total_battles: character.totalBattles + 1,
    experience: character.experience + (xpReward * 0.5) // Losers get half XP
  });
}
```

**Impact:** Battle wins/losses persist to database, characters level up.

---

### Phase 4: Financial System Integration

**File:** `frontend/src/components/ImprovedBattleArena.tsx`

**Add after battle rewards:**
```typescript
import { characterAPI } from '@/services/apiClient';

// Award currency to winners
const currencyReward = calculateBattleReward(battleDifficulty);

for (const character of winningTeam.characters) {
  await characterAPI.updateFinancials(character.characterId, {
    wallet: character.wallet + currencyReward,
    earnings_received: true
  });

  // Publish financial event
  await EventPublisher.getInstance().publishFinancialEvent({
    type: 'earnings_received',
    characterId: character.characterId,
    amount: currencyReward,
    source: 'battle_victory'
  });
}
```

**Impact:** Characters earn real currency that affects their financial stress/decisions.

---

### Phase 5: Backend WebSocket Sync

**Current Issue:** Frontend has custom WebSocket hook but backend BattleManager expects specific event format.

**File:** `frontend/src/hooks/useBattleWebSocket.ts`

**Current Code:**
```typescript
// Custom implementation
```

**Proposed Change:**
```typescript
// Use backend/src/services/battleService.ts event names
socket.on('battle:matched', handleMatched);
socket.on('battle:strategy_phase', handleStrategyPhase);
socket.on('battle:combat_start', handleCombatStart);
socket.on('battle:turn_update', handleTurnUpdate);
socket.on('battle:battle_end', handleBattleEnd);
```

**Backend Events (from battleService.ts):**
- `battle:matched` - Matchmaking found opponent
- `battle:strategy_phase` - Both players select strategy
- `battle:combat_start` - Combat calculations begin
- `battle:turn_update` - Each combat round update
- `battle:battle_end` - Winner determined, rewards calculated

**Impact:** Frontend and backend properly synchronized in real-time.

---

### Phase 6: Database Persistence

**File:** `backend/src/services/battleService.ts`

**Current:** Already saves to database (`dbAdapter.battles.create()`)

**Enhancement Needed:**
```typescript
// After battle ends, ensure all data persists
await dbAdapter.battles.recordBattleResult({
  battle_id: battleId,
  winner_id: winnerId,
  loser_id: loserId,
  battle_duration: duration,
  combat_log: combatEvents,
  rewards_distributed: {
    winners: winnerRewards,
    losers: loserRewards
  }
});

// Update character battle stats
await dbAdapter.characters.incrementBattleStats(winnerId, {
  total_battles: 1,
  total_wins: 1
});

await dbAdapter.characters.incrementBattleStats(loserId, {
  total_battles: 1
});
```

**Impact:** Complete battle history available for analytics and character memories.

---

## Implementation Plan

### Step 1: Character Loading (1 hour)
- Replace all `createDemo*()` calls with `characterAPI.getUserCharacters()`
- Create helper function `convertToTeamCharacter()` for character format conversion
- Test that real characters display correctly

### Step 2: Event Integration (1 hour)
- Add EventPublisher calls at battle start/end
- Verify events appear in database `game_events` table
- Test that therapy/chat can reference battle events

### Step 3: Stat Persistence (1 hour)
- Add character update calls after battle
- Verify total_battles and total_wins increment
- Test XP gain and level-up triggers

### Step 4: Financial Integration (1 hour)
- Add wallet updates for battle rewards
- Publish financial events
- Test that currency appears in character finances

### Step 5: WebSocket Sync (2 hours)
- Align frontend event names with backend
- Test real-time battle flow
- Debug any race conditions

### Step 6: End-to-End Testing (2 hours)
- Full battle from matchmaking → combat → rewards
- Verify all database updates
- Confirm events publish correctly
- Test with multiple users

**Total Estimated Time: 8 hours**

---

## Risk Assessment

### Low Risk ✅
- Character loading (standard pattern used elsewhere)
- Event publishing (GameEventBus already stable)
- Database updates (characterAPI already handles this)

### Medium Risk ⚠️
- WebSocket synchronization (requires careful event name matching)
- Race conditions in battle state updates
- Proper error handling for network failures

### High Risk 🔴
- None identified - all systems have working examples to follow

---

## Testing Strategy

### Unit Tests
- `convertToTeamCharacter()` function
- Battle reward calculations
- Event data formatting

### Integration Tests
- Full battle flow with real characters
- Event publishing and retrieval
- Database persistence of battle results

### User Acceptance Tests
1. User selects real characters for battle
2. Matchmaking finds opponent (or AI with real character)
3. Battle executes with real-time updates
4. Winner receives rewards (XP, currency)
5. Battle appears in character memories
6. Stats update in database
7. Characters can discuss battle in therapy/chat

---

## Success Criteria

- [ ] No more `createDemo*()` calls in battle code
- [ ] All battles publish events to GameEventBus
- [ ] Character stats persist after every battle
- [ ] Winners receive currency rewards
- [ ] Battle events appear in therapy context
- [ ] WebSocket real-time updates work
- [ ] Database has complete battle history
- [ ] Can run 10 consecutive battles without errors

---

## Questions for Review

1. **Matchmaking:** Should battles be:
   - AI only (easier to test)
   - Real multiplayer (requires 2+ users)
   - Mixed (AI until real opponent available)

2. **Rewards:** Current values:
   - XP: 100 per win, 50 per loss
   - Currency: Based on opponent difficulty
   - Are these balanced?

3. **Event Priority:** Should battle events:
   - Always publish (high memory usage)
   - Only significant battles (arena/tournament)
   - User configurable

4. **Backend API:** Should we:
   - Keep port 4000 for Socket.IO
   - Or unify on port 3006 with apiClient

---

## Next Steps

**If this proposal is approved:**
1. I will implement Phase 1 (Character Loading) first
2. Test that real characters load correctly
3. Show you the working result before proceeding
4. Continue to Phase 2 only after your confirmation

**Do you want me to proceed, or do you have questions/changes?**
