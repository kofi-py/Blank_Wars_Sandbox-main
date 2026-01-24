# Adherence System - Complete Implementation Plan

**Date:** October 31, 2025
**Scope:** Full step-by-step implementation tasks

---

## Phase 1: Data Loading Infrastructure (Foundation)

### Task 1.1: Load Powers into Battle State
**File:** `frontend/src/systems/battleEngine.ts` (or wherever battle initialization happens)
**Estimated Time:** 3-4 hours

**What to do:**
1. Find where `BattleCharacter` objects are created during battle initialization
2. For each character, query their unlocked powers:
```typescript
const powers = await characterAPI.getCharacterPowers(character.id);
const unlockedPowers = powers.filter(p => p.unlocked === true);
```
3. Add `unlockedPowers: PowerDefinition[]` to BattleCharacter interface
4. Store power definitions with character in battle state
5. Test: Log character powers at battle start, verify names/IDs match database

**Acceptance Criteria:**
- [ ] BattleCharacter has `unlockedPowers` array populated
- [ ] Powers include: id, name, tier, current_rank, description, effects
- [ ] Console log shows correct power count per character

---

### Task 1.2: Load Spells into Battle State
**File:** Same as 1.1
**Estimated Time:** 2-3 hours

**What to do:**
1. Query unlocked spells for each character:
```typescript
const spells = await characterAPI.getCharacterSpells(character.id);
const unlockedSpells = spells.filter(s => s.unlocked === true);
```
2. Add `unlockedSpells: SpellDefinition[]` to BattleCharacter interface
3. Store spell definitions with character in battle state
4. Test: Log character spells at battle start

**Acceptance Criteria:**
- [ ] BattleCharacter has `unlockedSpells` array populated
- [ ] Spells include: id, name, current_rank, mana_cost, description, effects
- [ ] Console log shows correct spell count per character

---

### Task 1.3: Initialize Cooldown Tracking
**File:** Same as 1.1
**Estimated Time:** 2 hours

**What to do:**
1. Add to BattleCharacter:
```typescript
powerCooldowns: Map<string, number>; // power_id -> turns remaining
spellCooldowns: Map<string, number>; // spell_id -> turns remaining
```
2. Initialize all cooldowns to 0 at battle start
3. After character uses power/spell, set cooldown:
```typescript
character.powerCooldowns.set(powerId, power.cooldown || 0);
```
4. At start of each round, decrement all cooldowns:
```typescript
character.powerCooldowns.forEach((turns, id) => {
  if (turns > 0) character.powerCooldowns.set(id, turns - 1);
});
```

**Acceptance Criteria:**
- [ ] Cooldowns initialize to 0
- [ ] Cooldowns increment when ability used
- [ ] Cooldowns decrement each round
- [ ] Console log shows cooldown states

---

### Task 1.4: Load Equipment Definitions
**File:** Same as 1.1
**Estimated Time:** 2 hours

**What to do:**
1. Character already has `equippedItems` but they're just IDs
2. Load full equipment definitions:
```typescript
const weapon = character.equippedItems.weapon
  ? await characterAPI.getEquipmentById(character.equippedItems.weapon)
  : null;
```
3. Replace equipment IDs with full definitions in BattleCharacter
4. Equipment includes: name, description, stats (atk, def, etc.)

**Acceptance Criteria:**
- [ ] BattleCharacter.equippedItems has full weapon/armor/accessory objects
- [ ] Equipment includes name and stats
- [ ] Can display weapon name in UI (not just "equipped weapon")

---

## Phase 2: Pre-Battle Coaching UI (Planning Interface)

### Task 2.1: Create Character Action Planner Component
**File:** `frontend/src/components/battle/CharacterActionPlanner.tsx` (new file)
**Estimated Time:** 6-8 hours

**What to do:**
1. Create modal/panel component that shows when coach clicks "PLAN TURN"
2. Display character info at top (name, HP, AP available)
3. Create action sequence builder:
   - Step 1 dropdown: Move, Attack, Power, Spell, Defend, Item
   - Based on selection, show relevant options (which hex, which target, which ability)
   - Show AP cost and remaining AP
   - Disable options that cost more AP than remaining
4. Allow adding up to 3 action steps (3 AP total)
5. Show real-time AP calculation
6. Save button stores PlannedAction to state

**Acceptance Criteria:**
- [ ] UI shows all character's available powers by name
- [ ] UI shows all character's available spells by name
- [ ] UI shows hex grid for movement selection
- [ ] UI shows enemy characters as attack targets
- [ ] AP cost updates in real-time
- [ ] Can't select actions exceeding 3 AP
- [ ] Saved plan includes specific ability IDs and target IDs

---

### Task 2.2: Hex Grid Selection for Movement
**File:** Component from 2.1 + `HexGrid.tsx`
**Estimated Time:** 4-5 hours

**What to do:**
1. Render hex grid in planning UI
2. Highlight reachable hexes (within movement range)
3. Click hex to select as movement target
4. Store hex position (q, r coordinates) in action plan
5. Show visual indicator of selected hex

**Acceptance Criteria:**
- [ ] Grid shows in planning UI
- [ ] Can click hex to select movement destination
- [ ] Selected hex highlighted
- [ ] Hex coordinates stored in PlannedAction.actionSequence[0].targetHex

---

### Task 2.3: Pre-Battle Huddle Summary Screen
**File:** `frontend/src/components/battle/PreBattleHuddle.tsx` (new file)
**Estimated Time:** 3-4 hours

**What to do:**
1. Create screen shown after all characters have plans
2. Display summary of each character's plan:
   - Character name
   - Action 1: [description]
   - Action 2: [description]
   - Action 3: [description]
3. "Lock In Plans" button to proceed to battle
4. "Edit Plans" button to go back to planning

**Acceptance Criteria:**
- [ ] Shows all 3 characters' plans in readable format
- [ ] Can edit any character's plan before locking in
- [ ] Lock In proceeds to battle phase
- [ ] Plans stored in battle state

---

### Task 2.4: Between-Round Planning Screen
**File:** Same as 2.3
**Estimated Time:** 3-4 hours

**What to do:**
1. After each round completes, show round summary:
   - What happened (attacks, damage, effects)
   - Current HP of all characters
   - Which characters followed/rejected plans
2. Timer: 30 seconds to decide
3. "Keep Same Plans" button (uses previous round's plans)
4. "Revise Plans" button (opens CharacterActionPlanner again)
5. Update available actions based on current state:
   - Which abilities are on cooldown
   - Which enemies are still alive
   - Current positions

**Acceptance Criteria:**
- [ ] Round summary displays
- [ ] Timer counts down from 30 seconds
- [ ] Can keep or revise plans
- [ ] Planning UI shows updated cooldowns/targets
- [ ] Auto-proceeds if timer expires (keeps same plans)

---

## Phase 3: Action Survey System (When Adherence Fails)

### Task 3.1: Action Survey Generator
**File:** `frontend/src/systems/actionSurveyGenerator.ts` (new file)
**Estimated Time:** 8-10 hours

**What to do:**
1. Create `generateActionSurvey()` function that takes:
   - character: BattleCharacter
   - battleState: BattleState
   - coachPlan: PlannedAction
2. Generate ALL available action options:

**A. Movement Options:**
```typescript
const reachableHexes = HexMovementEngine.getReachableHexes(...);
for (const hex of reachableHexes) {
  options.push({
    id: `move_${hex.q}_${hex.r}`,
    type: 'move',
    label: `Move to (${hex.q}, ${hex.r})`,
    apCost: 1,
    targetHex: hex
  });
}
```

**B. Attack Options (for each alive enemy):**
```typescript
const enemies = getAliveEnemies(character, battleState);
for (const enemy of enemies) {
  // Basic attack
  options.push({
    id: `attack_${enemy.id}_basic`,
    type: 'attack',
    label: `Attack ${enemy.name} with ${weaponName}`,
    apCost: 2,
    targetId: enemy.id
  });

  // Powers (filter by cooldown)
  for (const power of character.unlockedPowers) {
    const cooldown = character.powerCooldowns.get(power.id) || 0;
    if (cooldown === 0) {
      options.push({
        id: `power_${power.id}_${enemy.id}`,
        type: 'power',
        label: `Use ${power.name} on ${enemy.name}`,
        apCost: power.current_rank,
        abilityId: power.id,
        targetId: enemy.id
      });
    }
  }

  // Spells (filter by cooldown + mana)
  for (const spell of character.unlockedSpells) {
    const cooldown = character.spellCooldowns.get(spell.id) || 0;
    const hasEnoughMana = character.currentMana >= spell.mana_cost;
    if (cooldown === 0 && hasEnoughMana) {
      options.push({
        id: `spell_${spell.id}_${enemy.id}`,
        type: 'spell',
        label: `Cast ${spell.name} at ${enemy.name}`,
        apCost: spell.current_rank,
        abilityId: spell.id,
        targetId: enemy.id,
        manaCost: spell.mana_cost
      });
    }
  }
}
```

**C. Defensive Options:**
```typescript
options.push({
  id: 'defend',
  type: 'defend',
  label: 'Take defensive stance',
  apCost: 0
});
```

**D. Item Options:**
```typescript
for (const item of character.inventory.filter(i => i.usable_in_battle)) {
  options.push({
    id: `item_${item.id}`,
    type: 'item',
    label: `Use ${item.name}`,
    apCost: 1,
    itemId: item.id
  });
}
```

**E. Wildcard Chaos Actions:**
```typescript
const wildcards = getAvailableWildcards(character);
options.push(...wildcards);
```

**F. Combo Options (move + attack):**
```typescript
// Limit combinations to avoid explosion (top 3 movement options × enemies)
for (const hex of reachableHexes.slice(0, 3)) {
  for (const enemy of enemies) {
    options.push({
      id: `combo_move_attack_${hex.q}_${hex.r}_${enemy.id}`,
      type: 'combo',
      label: `Move to (${hex.q}, ${hex.r}) then attack ${enemy.name}`,
      apCost: 3,
      actionSequence: [
        { type: 'move', targetHex: hex, apCost: 1 },
        { type: 'attack', targetId: enemy.id, apCost: 2 }
      ]
    });
  }
}
```

3. Return survey object with question and all options

**Acceptance Criteria:**
- [ ] Survey includes movement options for all reachable hexes
- [ ] Survey includes attack options for all alive enemies
- [ ] Survey includes all available powers (not on cooldown)
- [ ] Survey includes all available spells (not on cooldown, has mana)
- [ ] Survey includes defend option
- [ ] Survey includes usable items
- [ ] Survey includes wildcard chaos actions
- [ ] Survey includes combo options (move + attack)
- [ ] Each option has: id, type, label, apCost, and relevant target/ability IDs

---

### Task 3.2: Wildcard Actions Database
**File:** `frontend/src/data/wildcardActions.ts` (new file)
**Estimated Time:** 4-5 hours

**What to do:**
1. Create array of wildcard action definitions:
```typescript
export const WILDCARD_ACTIONS: WildcardAction[] = [
  {
    id: 'friendly_fire',
    label: 'Attack a teammate',
    minMentalHealthRequired: 40, // Only available if mental health < 40
    apCost: 2,
    consequence: {
      mechanicalEffect: { type: 'damage', target: 'teammate', amount: 20 },
      psychologyEffect: {
        mentalHealthChange: -15,
        stressChange: +20,
        adherenceChange: -5
      },
      judgeReaction: 'warning'
    }
  },
  {
    id: 'attack_judge',
    label: 'Attack the judge',
    minMentalHealthRequired: 20,
    apCost: 3,
    consequence: {
      mechanicalEffect: { type: 'skip_turn', target: 'self' },
      psychologyEffect: {
        mentalHealthChange: -30,
        stressChange: +40,
        adherenceChange: -20
      },
      judgeReaction: 'disqualification'
    }
  },
  {
    id: 'refuse_fight',
    label: 'Refuse to fight (pacifist)',
    minMentalHealthRequired: 50,
    apCost: 0,
    consequence: {
      mechanicalEffect: { type: 'skip_turn', target: 'self' },
      psychologyEffect: {
        mentalHealthChange: +10,
        stressChange: -15,
        adherenceChange: -10
      },
      judgeReaction: 'ignore'
    }
  },
  {
    id: 'berserk_rage',
    label: 'Enter berserker rage',
    minMentalHealthRequired: 30,
    apCost: 3,
    consequence: {
      mechanicalEffect: {
        type: 'damage',
        target: 'random', // Can hit enemy OR teammate
        amount: 'base_damage * 1.5'
      },
      psychologyEffect: {
        mentalHealthChange: -20,
        stressChange: +30,
        adherenceChange: -15
      },
      judgeReaction: 'warning'
    }
  },
  {
    id: 'flee_battle',
    label: 'Try to flee the battle',
    minMentalHealthRequired: 100, // Always available
    apCost: 0,
    consequence: {
      mechanicalEffect: { type: 'skip_turn', target: 'self' }, // Fails, forced back
      psychologyEffect: {
        mentalHealthChange: -15, // Shame from fleeing + being forced back
        stressChange: +10, // Stress increases
        adherenceChange: -20
      },
      judgeReaction: 'penalty',
      narrativeOutcome: 'Arena barrier forces character back, loses turn'
    }
  }
];
```

2. Create `getAvailableWildcards()` function:
```typescript
export function getAvailableWildcards(character: BattleCharacter): WildcardOption[] {
  return WILDCARD_ACTIONS
    .filter(w => character.psychStats.mentalHealth < w.minMentalHealthRequired)
    .map(w => ({
      id: w.id,
      type: 'wildcard',
      label: w.label,
      apCost: w.apCost,
      effect: w.id,
      consequence: w.consequence
    }));
}
```

**Acceptance Criteria:**
- [ ] All 5+ wildcard actions defined with complete consequences
- [ ] Mental health thresholds correct (lower = more chaos available)
- [ ] Each wildcard has mechanical effect, psychology effect, judge reaction
- [ ] getAvailableWildcards() filters based on character's current mental health

---

### Task 3.3: AI Action Selector
**File:** `frontend/src/systems/aiActionSelector.ts` (new file)
**Estimated Time:** 6-8 hours

**What to do:**
1. Create `selectActionFromSurvey()` function:
```typescript
export function selectActionFromSurvey(
  character: TeamCharacter,
  survey: ActionSurvey,
  coachPlan: PlannedAction
): ActionOption {
  // Calculate weight for each option
  const weightedOptions = survey.options.map(option => ({
    option,
    weight: calculateOptionWeight(option, character, coachPlan)
  }));

  // Sort by weight descending
  weightedOptions.sort((a, b) => b.weight - a.weight);

  // Weighted random from top 5 options
  const topOptions = weightedOptions.slice(0, 5);
  return weightedRandomSelect(topOptions);
}
```

2. Create `calculateOptionWeight()` with personality modifiers:

**Archetype Weights:**
```typescript
if (character.archetype === 'berserker') {
  if (option.type === 'attack' || option.type === 'power') weight += 60;
  if (option.type === 'defend') weight -= 40;
}
if (character.archetype === 'tank') {
  if (option.type === 'defend') weight += 50;
}
if (character.archetype === 'mage') {
  if (option.type === 'spell') weight += 50;
}
if (character.archetype === 'assassin') {
  if (option.type === 'move') weight += 40;
  if (option.type === 'combo') weight += 50;
}
if (character.archetype === 'support') {
  if (option.type === 'item' && isHealingItem(option.itemId)) weight += 50;
}
```

**Personality Weights:**
```typescript
if (character.conflictResponse === 'aggressive') {
  if (option.type === 'attack' || option.type === 'power') weight += 40;
}
if (character.conflictResponse === 'withdrawn') {
  if (option.type === 'defend') weight += 50;
  if (option.id === 'flee') weight += 60;
}
```

**Psychology State Weights:**
```typescript
if (character.psychStats.mentalHealth < 30) {
  if (option.type === 'wildcard') weight += 80;
}
if (character.mentalState.stress > 70) {
  if (option.id === 'flee') weight += 70;
}
if (character.psychStats.ego > 80) {
  if (isStrongestEnemy(option.targetId)) weight += 60;
}
```

**Strategic Intent Conflict:**
```typescript
// If coach wanted defensive but character is aggressive
if (coachPlan.strategicIntent === 'defensive') {
  if (character.archetype === 'berserker' || character.psychStats.ego > 70) {
    if (option.type === 'attack') weight += 50; // Rebel
  }
}
```

3. Create `weightedRandomSelect()` helper

**Acceptance Criteria:**
- [ ] All archetypes have unique weight preferences
- [ ] All personality traits affect weights
- [ ] Mental health, stress, ego affect weights
- [ ] Strategic intent conflict creates rebellion bias
- [ ] Selection is weighted random (not always highest weight)
- [ ] Test: Berserker rarely picks defend, tank rarely picks aggressive attacks

---

### Task 3.4: Integration with PhysicalBattleEngine
**File:** `frontend/src/systems/physicalBattleEngine.ts`
**Estimated Time:** 4-5 hours

**What to do:**
1. Find `generateImprovisedAction()` function (currently hardcoded)
2. Replace with survey system:
```typescript
static generateImprovisedAction(
  character: BattleCharacter,
  gameplanCheck: GameplanAdherenceCheck,
  battleState: BattleState,
  coachPlan: PlannedAction
): ExecutedAction {
  // Generate survey of all available actions
  const survey = ActionSurveyGenerator.generate(character, battleState, coachPlan);

  // AI selects from survey based on personality
  const chosenOption = AIActionSelector.select(character, survey, gameplanCheck);

  // Log the rebellion
  console.log(`${character.name} rejected coach's plan and chose: ${chosenOption.label}`);

  // Convert chosen option to ExecutedAction
  return convertOptionToAction(chosenOption);
}
```

3. Create `convertOptionToAction()` helper:
```typescript
function convertOptionToAction(option: ActionOption): ExecutedAction {
  if (option.type === 'combo') {
    // Execute sequence of actions
    return {
      type: 'combo',
      sequence: option.actionSequence,
      narrativeDescription: option.label
    };
  }

  return {
    type: option.type,
    targetId: option.targetId,
    abilityId: option.abilityId,
    targetHex: option.targetHex,
    itemId: option.itemId,
    narrativeDescription: option.label
  };
}
```

4. Handle unavailable actions:
```typescript
static executeCharacterTurn(...) {
  // Check if coach's planned action is available
  if (!isActionAvailable(plannedAction, battleState)) {
    // Treat as adherence fail
    gameplanCheck.checkResult = 'goes_rogue';
    actualAction = this.generateImprovisedAction(character, gameplanCheck, battleState, plannedAction);
  }
}
```

**Acceptance Criteria:**
- [ ] Survey generates when adherence fails
- [ ] AI selects from survey
- [ ] Chosen action executes correctly
- [ ] Unavailable actions trigger survey
- [ ] Wildcard actions execute with consequences
- [ ] Combat log shows character's chosen action

---

## Phase 4: UI Feedback & Notifications

### Task 4.1: Rebellion Notification
**File:** `frontend/src/components/battle/RebellionNotification.tsx` (new file)
**Estimated Time:** 3-4 hours

**What to do:**
1. Create notification component shown when adherence fails:
```tsx
<div className="rebellion-notification">
  <h3>🚨 STRATEGY REJECTED</h3>
  <p>{character.name} has rejected your plan!</p>

  <div className="plan-summary">
    <strong>Your Plan:</strong>
    <ul>
      {coachPlan.actionSequence.map(action => (
        <li key={action.order}>{formatActionStep(action)}</li>
      ))}
    </ul>
  </div>

  <div className="adherence-info">
    <p>Adherence Score: {adherenceScore}/100 (FAILED)</p>
    <p>Reason: {rebellionReason}</p>
  </div>

  <p>{character.name} is making their own decision...</p>
</div>
```

2. Show notification before character acts
3. After character acts, update to show what they chose:
```tsx
<div className="action-result">
  <h3>{character.name}'s Turn</h3>
  <p>Chose: {chosenAction.label}</p>
  <p>Result: {formatResult(outcome)}</p>
</div>
```

**Acceptance Criteria:**
- [ ] Notification shows when adherence fails
- [ ] Displays coach's rejected plan
- [ ] Shows adherence score and reason
- [ ] Updates to show character's chosen action after execution
- [ ] Does NOT show survey/decision process (hidden from coach)

---

### Task 4.2: Battle Log System
**File:** `frontend/src/components/battle/BattleLog.tsx` (new or enhance existing)
**Estimated Time:** 3-4 hours

**What to do:**
1. Create scrolling battle log that shows all actions
2. Log entries for:
   - Character followed plan: ✓ "[Name] follows strategy: [action]"
   - Character rebelled: 🚨 "[Name] rejected strategy and chose: [action]"
   - Damage dealt: "[Name] deals X damage to [Target]"
   - Status effects: "[Name] is now [status]"
   - Judge interventions: ⚖️ "Judge [Name] intervenes: [ruling]"
3. Auto-scroll to latest entry
4. Color code: green = followed, red = rebelled, yellow = judge

**Acceptance Criteria:**
- [ ] Log shows all battle actions in order
- [ ] Clearly indicates which actions were planned vs improvised
- [ ] Judge rulings appear in log
- [ ] Auto-scrolls to latest
- [ ] Can scroll back to see history

---

## Phase 5: Database & Persistence

### Task 5.1: Store Planned Actions
**File:** Backend database + API routes
**Estimated Time:** 3-4 hours

**What to do:**
1. Create table (already designed in planning doc):
```sql
CREATE TABLE battle_planned_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID NOT NULL,
  character_id UUID NOT NULL,
  round_number INT NOT NULL,
  action_sequence JSONB NOT NULL,
  strategic_intent VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);
```

2. Create API endpoint:
```typescript
POST /api/battles/:battleId/planned-actions
Body: {
  characterId: string,
  roundNumber: number,
  actionSequence: ActionStep[],
  strategicIntent: string
}
```

3. Store planned actions when coach locks in plans
4. Retrieve planned actions when round starts

**Acceptance Criteria:**
- [ ] Table created in database
- [ ] API endpoint stores planned actions
- [ ] API endpoint retrieves planned actions by battle + round
- [ ] JSONB stores full action sequence

---

### Task 5.2: Store Adherence Check Results
**File:** Backend database + API routes
**Estimated Time:** 3-4 hours

**What to do:**
1. Create table:
```sql
CREATE TABLE battle_adherence_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID NOT NULL,
  character_id UUID NOT NULL,
  round_number INT NOT NULL,
  adherence_score INT NOT NULL,
  check_result VARCHAR(50),
  chosen_action JSONB,
  was_rebellion BOOLEAN DEFAULT FALSE,
  rebellion_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

2. Create API endpoint:
```typescript
POST /api/battles/:battleId/adherence-checks
Body: {
  characterId: string,
  roundNumber: number,
  adherenceScore: number,
  checkResult: string,
  chosenAction: ActionOption,
  wasRebellion: boolean,
  rebellionReason: string
}
```

3. Store adherence check result after each character's turn
4. Use for post-battle analysis

**Acceptance Criteria:**
- [ ] Table created
- [ ] API endpoint stores adherence results
- [ ] Can query adherence history for a battle
- [ ] Rebellion events tracked

---

## Phase 6: Testing & Integration

### Task 6.1: Unit Tests for Survey Generator
**Estimated Time:** 4-5 hours

**What to do:**
1. Test survey generates correct options for different scenarios:
   - Character with 5 powers, 3 spells → verify all appear
   - Character with 2 powers on cooldown → verify excluded
   - Character with low mana → verify expensive spells excluded
   - Character with mental health 25 → verify wildcard options appear
2. Test combo generation doesn't explode (limited to reasonable count)
3. Test each option has required fields (id, type, label, apCost)

---

### Task 6.2: Unit Tests for AI Selector
**Estimated Time:** 4-5 hours

**What to do:**
1. Test archetype preferences:
   - Berserker picks attack > defend (run 100x, verify attack chosen >80%)
   - Tank picks defend > attack (run 100x, verify defend chosen >60%)
   - Mage picks spell > basic attack
2. Test psychology state:
   - Mental health < 30 → wildcard options weighted high
   - Stress > 70 → flee option weighted high
   - Ego > 80 → attacks strongest enemy preferred
3. Test strategic intent conflict:
   - Defensive plan + aggressive character → picks attack
   - Aggressive plan + withdrawn character → picks defend

---

### Task 6.3: Integration Test - Full Battle Flow
**Estimated Time:** 6-8 hours

**What to do:**
1. Create test battle with 2 characters per team
2. Test flow:
   - Pre-battle huddle → plan actions for all characters
   - Round 1 → some characters follow, some rebel
   - Between rounds → revise plans
   - Round 2 → target dies before character's turn → survey triggered
   - Battle end → verify XP awarded
3. Test all adherence scenarios:
   - Pass: character executes exact plan
   - Fail: character picks from survey
   - Unavailable: survey triggered
4. Test wildcard consequences:
   - Friendly fire → teammate takes damage, morale drops
   - Flee → character loses turn, shame applied
   - Attack judge → judge intervenes

**Acceptance Criteria:**
- [ ] Full battle completes without errors
- [ ] All characters execute actions (planned or improvised)
- [ ] Adherence checks logged
- [ ] Wildcard consequences applied
- [ ] XP awarded at end
- [ ] Battle can be replayed from database logs

---

## Summary Checklist

### Phase 1: Data Loading (11-13 hours)
- [ ] Task 1.1: Load powers
- [ ] Task 1.2: Load spells
- [ ] Task 1.3: Cooldown tracking
- [ ] Task 1.4: Equipment definitions

### Phase 2: Coaching UI (16-21 hours)
- [ ] Task 2.1: Action planner component
- [ ] Task 2.2: Hex grid selection
- [ ] Task 2.3: Pre-battle huddle
- [ ] Task 2.4: Between-round planning

### Phase 3: Survey System (22-28 hours)
- [ ] Task 3.1: Survey generator
- [ ] Task 3.2: Wildcard actions
- [ ] Task 3.3: AI selector
- [ ] Task 3.4: Engine integration

### Phase 4: UI Feedback (6-8 hours)
- [ ] Task 4.1: Rebellion notification
- [ ] Task 4.2: Battle log

### Phase 5: Database (6-8 hours)
- [ ] Task 5.1: Store planned actions
- [ ] Task 5.2: Store adherence results

### Phase 6: Testing (14-18 hours)
- [ ] Task 6.1: Survey tests
- [ ] Task 6.2: AI selector tests
- [ ] Task 6.3: Integration test

---

## Total Estimated Time: 75-97 hours (10-13 full work days)

This is the complete, no-shortcuts implementation.
