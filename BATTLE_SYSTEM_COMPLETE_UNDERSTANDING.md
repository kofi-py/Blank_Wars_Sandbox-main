# Complete Battle System Understanding

**Date:** October 31, 2025
**Purpose:** Document complete understanding before clean rewrite

---

## Core Concept

The battle system is a **PHYSICAL COMBAT system with PSYCHOLOGICAL MODIFIERS**, NOT pure psychological warfare.

- Characters deal **physical damage** and take **physical HP damage**
- **Psychology affects performance** (e.g., low mental health = worse accuracy, high ego = ignores strategy)
- Battles happen on a **hex grid** for tactical positioning
- **Coaching** is a pre-battle phase where you set strategies
- **Adherence** determines if characters follow your strategy or go rogue

---

## Battle Flow Architecture

### Phase 1: TEAM SELECTION
**Duration:** Until user confirms team
**Location:** Frontend only

**What Happens:**
1. User sees their character roster (from `characterAPI.getUserCharacters()`)
2. Characters show health status:
   - ✅ Healthy (can fight)
   - 🤕 Injured (can't fight, needs rest)
   - ☠️ Dead (can't fight, needs resurrection)
3. User selects 1-3 characters for their team
4. System validates selection (all must be healthy)

**Key Data:**
```typescript
interface TeamSelection {
  selectedCharacters: Character[]; // From database
  healthStatuses: CharacterHealthStatus[];
  canProceed: boolean; // All selected are healthy
}
```

**Components Needed:**
- Character roster grid
- Health status indicators
- Selection checkboxes
- "Confirm Team" button

---

### Phase 2: OPPONENT GENERATION
**Duration:** Instant (system-driven)
**Location:** Frontend + Backend

**What Happens:**
1. System analyzes player team:
   - Average level
   - Total power (sum of stats + equipment)
   - Weight class (rookie/amateur/pro/championship)
2. Generates AI opponent team from database characters:
   - Same weight class
   - Similar total power (±20%)
   - 1-3 characters matching player team size
3. Converts both teams to `TeamCharacter` format

**Key Functions:**
```typescript
async function createAIOpponentTeam(playerTeam: Team): Promise<Team> {
  // Load ALL characters from database
  const allChars = await characterAPI.getUserCharacters();

  // Calculate player team power
  const playerPower = playerTeam.characters.reduce((sum, c) =>
    sum + c.traditionalStats.strength + c.equipmentBonuses.atk, 0
  );

  // Find characters in similar power range
  const similarPowerChars = allChars.filter(char => {
    const charPower = char.traditionalStats.strength +
      (char.equippedItems?.weapon?.stats?.atk || 0);
    return Math.abs(charPower - (playerPower / playerTeam.characters.length)) < 50;
  });

  // Randomly select opponent team
  const teamSize = playerTeam.characters.length;
  const shuffled = similarPowerChars.sort(() => Math.random() - 0.5);
  const opponentChars = shuffled.slice(0, teamSize);

  // Convert to TeamCharacter format
  return {
    id: `ai_opponent_${Date.now()}`,
    name: 'AI Team',
    coachName: 'AI Coach',
    characters: convertCharactersToTeamCharacters(opponentChars),
    coachingPoints: 3,
    // ... other team properties
  };
}
```

**NO FALLBACKS TO DEMO TEAMS!** If not enough characters exist, show error.

---

### Phase 3: PRE-BATTLE HUDDLE (COACHING PHASE)
**Duration:** 30-60 seconds (timer-based)
**Location:** Frontend + Backend coordination

**What Happens:**
1. UI shows `StrategyPanel` or `CharacterSpecificStrategyPanel`
2. For EACH character on player team, user sets:
   - **Strategy:** Aggressive / Defensive / Balanced
   - **Target Priority:** Which opponent to focus
   - **Item Usage:** When to use healing/buff items
   - **Special Tactics:** Character-specific options
3. Backend starts strategy selection phase:
```typescript
// Backend: battleService.ts
battle.phase = BATTLE_PHASES.STRATEGY_SELECT;
startPhaseTimer(battle.id, BATTLE_PHASES.STRATEGY_SELECT, 15); // 15 second timer
```
4. User must complete strategies before timer expires
5. If timer expires, default strategies are auto-assigned

**Key Data Structures:**
```typescript
interface CharacterStrategy {
  characterId: string;
  strategy: 'aggressive' | 'defensive' | 'balanced';
  targetPriority: 'weakest' | 'strongest' | 'healer' | 'nearest';
  itemUsage: {
    useHealingAt: number; // HP % threshold (e.g., 50 = use healing at 50% HP)
    useBu ffsWhen: 'start' | 'mid' | 'desperate';
  };
  specialTactics?: any; // Character-specific
}

interface TeamGameplan {
  characterStrategies: Map<string, CharacterStrategy>;
  overallStrategy: 'aggressive' | 'defensive' | 'balanced';
  completedAt: Date;
}
```

**UI Components:**
- `StrategyPanel` - Shows all characters, user sets each one's strategy
- Timer display (countdown from 60s to 0)
- Character portraits with strategy dropdowns
- "Lock In Strategies" button

**Backend WebSocket:**
```typescript
socket.on('select_strategy', (data: { characterId: string, strategy: CharacterStrategy }) => {
  // Store strategy for character
  battleState.characterStrategies.set(data.characterId, data.strategy);

  // Check if all strategies set
  if (allStrategiesSet()) {
    // Proceed to adherence check
    transitionToAdherenceCheck();
  }
});
```

---

### Phase 4: ADHERENCE CHECK
**Duration:** 2-5 seconds (system calculation)
**Location:** Frontend + Backend

**What Happens:**
1. For EACH character, system calls `checkGameplanAdherence()`:
```typescript
function checkGameplanAdherence(
  character: TeamCharacter,
  strategy: CharacterStrategy,
  teamMorale: number
): { willFollow: boolean; adherenceScore: number; reason: string } {

  // Calculate adherence score (0-100)
  let score = character.psychStats.training; // Base: how trainable they are

  // Modifiers
  score += character.psychStats.mentalHealth * 0.4; // Mental state affects compliance
  score += character.psychStats.teamPlayer * 0.3;   // Team player = more likely to follow
  score += (100 - character.psychStats.ego) * 0.2;  // High ego = less likely to follow
  score += teamMorale * 0.3;                        // Team morale helps

  // Strategy mismatch penalties
  if (strategy.strategy === 'defensive' && character.archetype === 'berserker') {
    score -= 30; // Berserker hates defensive strategy
  }
  if (strategy.strategy === 'aggressive' && character.conflictResponse === 'withdrawn') {
    score -= 25; // Withdrawn personality hates aggression
  }

  // Random factor (chaos)
  score += (Math.random() - 0.5) * 20;

  const willFollow = score > 50;

  return {
    willFollow,
    adherenceScore: Math.max(0, Math.min(100, score)),
    reason: willFollow ? '' : generateRebellionReason(character, strategy)
  };
}
```

2. **If character WILL follow:** No UI change, proceed to battle
3. **If character REBELS:**
   - Show `DisagreementModal` with character's response
   - Character explains why they disagree
   - Two options:
     - **Insist:** Force character to follow (costs adherence points, mental health drops)
     - **Adapt:** Accept character's preferred strategy (no penalty, but you lose control)
   - If you insist too much, character may trigger **Rebellion System**:
     - Auto-spends character points on abilities they want
     - Loses trust in coaching
     - May refuse future coaching sessions

**Key Components:**
```typescript
// Frontend: DisagreementModal.tsx
interface DisagreementModalProps {
  character: TeamCharacter;
  disagreementReason: string;
  onInsist: () => void; // Force strategy
  onAdapt: (newStrategy: CharacterStrategy) => void; // Accept character's preference
}

// Character response examples:
"I'm a berserker, coach. Defensive play is for cowards!"
"My mental health is too low to focus on complex tactics."
"Trust me, I know how to handle this opponent better than you."
```

**Rebellion Consequences:**
```typescript
interface RebellionEvent {
  characterId: string;
  trigger: 'forced_strategy' | 'ignored_input' | 'low_adherence';
  consequence: {
    mentalHealthLoss: number; // -10 to -30
    adherencePointsLost: number; // -5 to -15
    autoSpentPoints?: number; // May auto-unlock abilities
  };
}
```

---

### Phase 5: BATTLE START (HEX GRID COMBAT)
**Duration:** Until battle ends (1 opponent defeated or all rounds complete)
**Location:** Frontend (HexBattleArena) + Backend (battle logic)

**What Happens:**
1. **Initialize Hex Grid:**
```typescript
// Frontend: HexBattleArena.tsx
const grid = HexGridSystem.initializeBattleGrid();

// Place player team on left side (Team 1 positions)
const team1Positions = HexGridSystem.getTeam1StartPositions();
playerTeam.characters.forEach((char, i) => {
  grid.characterPositions.set(char.id, team1Positions[i]);
});

// Place opponent team on right side (Team 2 positions)
const team2Positions = HexGridSystem.getTeam2StartPositions();
opponentTeam.characters.forEach((char, i) => {
  grid.characterPositions.set(char.id, team2Positions[i]);
});
```

2. **Calculate Turn Order** (based on speed stat):
```typescript
const turnOrder = [...playerTeam.characters, ...opponentTeam.characters]
  .sort((a, b) => b.traditionalStats.speed - a.traditionalStats.speed)
  .map(c => c.id);

// Example: [char3_id, char1_id, char4_id, char2_id, char5_id, char6_id]
// Fastest character goes first
```

3. **Battle Loop:**
```typescript
for (const characterId of turnOrder) {
  const character = getCharacterById(characterId);
  const isPlayer = playerTeam.characters.some(c => c.id === characterId);

  if (isPlayer) {
    // PLAYER'S TURN
    // Show UI: "Your Turn: [Character Name]"
    // User can:
    // - Move (click hex to move, costs action points)
    // - Attack (click enemy character in range)
    // - Use Ability (select ability, then target)
    // - End Turn (skip remaining actions)

    await waitForPlayerAction();
  } else {
    // AI'S TURN
    // AI decides:
    const action = AIDecisionEngine.chooseAction(character, grid, opponentStrategy);
    // - Move toward nearest enemy
    // - Attack if in range
    // - Use ability if cooldown ready

    await executeAIAction(action);
  }

  // Check win condition after each turn
  if (isTeamDefeated(opponentTeam)) {
    return endBattle('player_wins');
  }
  if (isTeamDefeated(playerTeam)) {
    return endBattle('opponent_wins');
  }
}

// All turns complete = Round ends
roundNumber++;
if (roundNumber >= MAX_ROUNDS) {
  return endBattle('draw');
}
```

4. **Combat Mechanics:**
```typescript
function executeAttack(attacker: TeamCharacter, defender: TeamCharacter): CombatResult {
  // Base damage calculation
  const baseDamage = attacker.traditionalStats.strength +
                     attacker.equipmentBonuses.atk;

  // Apply strategy modifiers
  const strategyMod = attacker.strategy === 'aggressive' ? 1.3 :
                      attacker.strategy === 'defensive' ? 0.8 : 1.0;

  // Apply adherence modifiers
  const adherenceMod = attacker.gameplanAdherence > 70 ? 1.1 : // Following plan = bonus
                       attacker.gameplanAdherence < 30 ? 0.7 : // Rebelling = penalty
                       1.0;

  // Apply psychology modifiers
  const mentalHealthMod = attacker.psychStats.mentalHealth / 100;
  const stressMod = 1.0 - (attacker.mentalState.stress / 200); // High stress = worse performance

  // Calculate final damage
  const damage = baseDamage * strategyMod * adherenceMod * mentalHealthMod * stressMod;

  // Apply defense
  const defense = defender.traditionalStats.vitality + defender.equipmentBonuses.def;
  const finalDamage = Math.max(1, damage - (defense * 0.5));

  // Apply damage
  defender.currentHp -= finalDamage;

  return {
    attacker: attacker.name,
    defender: defender.name,
    damage: finalDamage,
    defenderHp: defender.currentHp,
    isCritical: false, // TODO: implement crit chance
    message: `${attacker.name} attacks ${defender.name} for ${finalDamage} damage!`
  };
}
```

**Visual System (Already Complete):**
- `CharacterToken.tsx` - Colored circles (blue = player, red = opponent)
- HP bars below each character
- Character names
- Turn indicator (yellow pulsing dot on active character)
- Status effects (purple circles)
- Damage numbers floating up (TODO: implement animations)

---

### Phase 6: BATTLE RESOLUTION
**Duration:** 5-10 seconds
**Location:** Frontend + Backend

**What Happens:**
1. Determine winner:
   - **Player Wins:** All opponent characters HP = 0
   - **Opponent Wins:** All player characters HP = 0
   - **Draw:** Max rounds reached, both teams have survivors
2. Calculate rewards:
```typescript
// Backend: battleService.ts (line 1524-1551)
async function awardBattleRewards(battle: BattleState, winner: 'player' | 'opponent'): Promise<void> {
  if (winner === 'player') {
    for (const character of battle.playerTeam.characters) {
      // Award XP based on opponent level
      const xpGained = calculateXP(
        character.level,
        battle.opponentTeam.averageLevel,
        battle.playerTeam.characters.length
      );

      // Call progression service (auto-grants character_points on level-up)
      await CharacterProgressionService.awardExperience(
        character.id,
        xpGained,
        'battle_victory'
      );

      // Update battle stats
      await db.updateCharacterBattleStats(character.id, {
        total_battles: character.total_battles + 1,
        total_wins: character.total_wins + 1
      });
    }

    // Update team coaching points
    battle.playerTeam.coachingPoints = 3; // Reset to 3 on win
    battle.playerTeam.consecutiveLosses = 0;
  } else {
    // Loss: Degrade coaching points
    battle.playerTeam.consecutiveLosses++;
    if (battle.playerTeam.consecutiveLosses >= 3) {
      battle.playerTeam.coachingPoints = Math.max(0, battle.playerTeam.coachingPoints - 1);
    }
  }
}
```

3. Show results UI:
```typescript
interface BattleResult {
  winner: 'player' | 'opponent' | 'draw';
  playerTeamStatus: {
    survivors: TeamCharacter[];
    defeated: TeamCharacter[];
    totalDamageDealt: number;
  };
  opponentTeamStatus: {
    survivors: TeamCharacter[];
    defeated: TeamCharacter[];
    totalDamageDealt: number;
  };
  rewards: {
    xpPerCharacter: Map<string, number>;
    levelsGained: string[]; // character IDs that leveled up
    characterPointsGained: Map<string, number>;
  };
  psychologyChanges: {
    mentalHealthChanges: Map<string, number>; // Character ID -> change
    adherenceChanges: Map<string, number>;
    rebellionEvents: RebellionEvent[];
  };
}
```

4. Show `BattleRewards` component:
   - Victory/Defeat banner
   - XP gained per character
   - Level-ups with animation
   - Character points earned
   - Psychology stat changes
   - "Return to Headquarters" button

---

## Key Data Flows

### Character Loading Flow
```
1. User opens Battle Arena
   ↓
2. Frontend calls: characterAPI.getUserCharacters()
   ↓
3. Backend query:
   SELECT uc.id, uc.level, uc.experience, uc.character_points,
          uc.current_health, uc.max_health, uc.is_injured, uc.is_dead,
          c.name, c.archetype, c.rarity
   FROM user_characters uc
   JOIN characters c ON uc.character_id = c.id
   WHERE uc.user_id = $1
   ↓
4. Frontend receives Character[] array
   ↓
5. Convert to TeamCharacter[] using convertCharactersToTeamCharacters()
   ↓
6. Display in team selection UI
```

### Strategy -> Adherence -> Battle Flow
```
1. User sets strategies (Phase 3)
   ↓
2. Frontend sends: socket.emit('select_strategy', { characterId, strategy })
   ↓
3. Backend stores strategies in battle state
   ↓
4. When all strategies set:
   ↓
5. Backend calculates adherence for each character
   ↓
6. For each character that rebels:
   ↓
7. Frontend shows DisagreementModal
   ↓
8. User chooses: Insist or Adapt
   ↓
9. If Insist: Apply penalties, proceed with original strategy
   If Adapt: Use character's preferred strategy
   ↓
10. All adherence resolved:
    ↓
11. Backend: phase = 'round_combat'
    ↓
12. Frontend: Render HexBattleArena
    ↓
13. Battle loop begins
```

### Combat Execution Flow
```
1. Character's turn starts
   ↓
2. If player character:
   - Show "Your Turn" UI
   - Wait for user input (move/attack/ability/end)
   ↓
3. If AI character:
   - Calculate best action based on strategy
   - Execute immediately
   ↓
4. Execute action:
   ↓
5. Calculate damage/effect with modifiers:
   - Base stats
   - Equipment bonuses
   - Strategy modifiers
   - Adherence modifiers
   - Psychology modifiers (mental health, stress, confidence)
   ↓
6. Apply damage to target
   ↓
7. Update UI:
   - Character token HP bar
   - Damage number animation
   - Status effects
   ↓
8. Add to combat log
   ↓
9. Check win condition:
   - If team defeated: End battle
   - If not: Next character's turn
   ↓
10. When all characters have acted:
    - Round ends
    - Check max rounds
    - If max rounds: End battle (draw)
    - If not: New round starts at step 1
```

---

## Critical Integration Points

### 1. Character Database → Battle System
**File:** `frontend/src/services/apiClient.ts`
```typescript
// CRITICAL: No filtering, return database data as-is
getUserCharacters: async () => {
  const response = await fetch('/api/user/characters');
  const data = await response.json();
  return data.characters || [];
}
```

### 2. Character Conversion
**File:** `frontend/src/utils/characterConversion.ts`
```typescript
// Converts database Character → battle TeamCharacter
// Adds convenience properties (strength, speed, stamina)
// Initializes psychology stats, abilities, equipment bonuses
export function convertCharacterToTeamCharacter(char: Character): TeamCharacter
```

### 3. Adherence System
**File:** `frontend/src/data/teamBattleSystem.ts`
```typescript
// Line 269
export function checkGameplanAdherence(
  character: TeamCharacter,
  teamMorale: number,
  isInjured: boolean,
  isLosing: boolean
): { willFollow: boolean; adherenceScore: number; reason: string }
```

### 4. XP/Rewards
**File:** `backend/src/services/battleService.ts` (line 1524-1551)
```typescript
// Already implemented - awards XP after battle
// Calls CharacterProgressionService.awardExperience()
// Auto-grants 2 character_points per level-up
```

### 5. Hex Grid System
**Files:**
- `frontend/src/systems/hexGridSystem.ts` - Grid calculations
- `frontend/src/systems/hexMovementEngine.ts` - Movement/actions
- `frontend/src/systems/hexLineOfSight.ts` - Attack range
- `frontend/src/components/battle/HexBattleArena.tsx` - Main arena
- `frontend/src/components/battle/CharacterToken.tsx` - Visual tokens

### 6. Coaching System
**Files:**
- `frontend/src/hooks/useCoachingSystem.ts` - Coaching logic
- `frontend/src/components/StrategyPanel.tsx` - Strategy UI
- `frontend/src/components/CoachingPanel.tsx` - Coaching UI
- `backend/src/routes/coachingRoutes.ts` - Coaching API

---

## What's Currently Broken

### ❌ Demo Character Fallbacks
**Problem:** Code falls back to fake characters everywhere
**Fix:** Remove ALL `createDemoPlayerTeam`, `createDemoOpponentTeam` references

### ❌ Hex Grid Toggle
**Problem:** Unnecessary toggle button that crashes the page
**Fix:** Remove toggle, make hex grid the ONLY mode

### ❌ Missing Coaching Phase
**Problem:** Battles jump straight to combat
**Fix:** Add Phase 3 (PRE_BATTLE_HUDDLE) before battle starts

### ❌ Missing Adherence Check
**Problem:** `checkGameplanAdherence` exists but is never called
**Fix:** Add Phase 4 (ADHERENCE_CHECK) after coaching

### ❌ No Rebellion System
**Problem:** Characters can't rebel against strategies
**Fix:** Wire up DisagreementModal when adherence check fails

---

## Clean Implementation Plan

### New File: `SimpleBattleArena.tsx`

**State Management:**
```typescript
type BattlePhase =
  | 'team_selection'
  | 'opponent_generation'
  | 'pre_battle_huddle'
  | 'adherence_check'
  | 'battle_combat'
  | 'battle_end';

interface SimpleBattleState {
  phase: BattlePhase;

  // Team Selection
  availableCharacters: Character[];
  selectedCharacterIds: string[];

  // Teams
  playerTeam: Team | null;
  opponentTeam: Team | null;

  // Coaching
  characterStrategies: Map<string, CharacterStrategy>;
  adherenceResults: Map<string, AdherenceResult>;
  timer: number | null;

  // Battle
  currentTurnCharacterId: string | null;
  combatLog: CombatEvent[];

  // Results
  battleResult: BattleResult | null;
}
```

**Component Structure:**
```tsx
<SimpleBattleArena>
  {phase === 'team_selection' && (
    <TeamSelectionPanel
      characters={availableCharacters}
      selected={selectedCharacterIds}
      onSelect={handleCharacterSelect}
      onConfirm={handleConfirmTeam}
    />
  )}

  {phase === 'opponent_generation' && (
    <LoadingSpinner text="Finding opponent..." />
  )}

  {phase === 'pre_battle_huddle' && (
    <CoachingPhase
      playerTeam={playerTeam!}
      strategies={characterStrategies}
      onStrategySet={handleStrategySet}
      timer={timer}
    />
  )}

  {phase === 'adherence_check' && hasDisagreements() && (
    <AdherenceCheckPhase
      disagreements={getDisagreements()}
      onResolve={handleDisagreementResolve}
    />
  )}

  {phase === 'battle_combat' && (
    <HexBattleArena
      userTeam={playerTeam!}
      opponentTeam={opponentTeam!}
      onBattleEnd={handleBattleEnd}
    />
  )}

  {phase === 'battle_end' && (
    <BattleResults
      result={battleResult!}
      onReturn={handleReturnToHQ}
    />
  )}
</SimpleBattleArena>
```

---

## Summary

The battle system is a **6-phase flow**:
1. **Team Selection** - Pick your characters
2. **Opponent Generation** - System creates AI team
3. **Pre-Battle Huddle** - Set strategies for each character
4. **Adherence Check** - Characters may rebel against strategies
5. **Battle Combat** - Hex grid turn-based combat
6. **Battle Resolution** - Show results, award XP/points

**Key Principles:**
- ✅ ONLY use real characters from database
- ✅ Psychology affects combat performance (not IS combat)
- ✅ Adherence system allows character rebellion
- ✅ Hex grid is the ONLY battle mode
- ✅ XP/rewards already integrated
- ✅ Coaching points system for team management

**Next Step:** Build `SimpleBattleArena.tsx` with clean implementation of all 6 phases.

Ready to proceed?
