# Granular PlannedAction System Design

**Date:** October 31, 2025
**Status:** Complete system design - NO shortcuts, NO compromises

---

## Overview

The coach must be able to plan EVERY detail of a character's turn as if the user is directly controlling them. This includes:
- Which hex to move to (if moving)
- Which action to take (basic attack, power, spell, defend, item)
- Which specific target to attack
- Conditional logic (if X happens, do Y instead)
- Fallback plans if primary action unavailable

---

## Action Point System

Each character has **3 action points per turn** that can be spent on:

| Action Type | AP Cost | Example |
|-------------|---------|---------|
| Move 1 hex | 1 AP | Move from (0,0) to (1,0) |
| Basic Attack | 2 AP | Attack with equipped weapon |
| Rank 1 Power/Spell | 1 AP | Quick strike, minor heal |
| Rank 2 Power/Spell | 2 AP | Fireball, shield bash |
| Rank 3 Power/Spell | 3 AP | Ultimate ability, devastating spell |
| Defend | 0 AP | Defensive stance (can still be done after other actions) |
| Use Item | 1 AP | Healing potion, buff scroll |

**Examples:**
- Move (1 AP) + Basic Attack (2 AP) = 3 AP total ✅
- Move (1 AP) + Rank 2 Spell (2 AP) = 3 AP total ✅
- Rank 3 Power (3 AP) = 3 AP total (no movement) ✅
- Move (1 AP) + Move (1 AP) + Rank 1 Power (1 AP) = 3 AP total ✅
- Rank 1 Power (1 AP) + Basic Attack (2 AP) = 3 AP total ✅

---

## PlannedAction Data Structure

```typescript
interface PlannedAction {
  // Action sequence - exactly what the coach wants the character to do
  actionSequence: ActionStep[];

  // Coach's strategic intent (for AI to understand WHY coach chose this, used for rebellion weighting)
  strategicIntent: 'aggressive' | 'defensive' | 'supportive' | 'tactical';
}

interface ActionStep {
  order: number; // 1, 2, 3 (executed in sequence)
  type: 'move' | 'attack' | 'power' | 'spell' | 'defend' | 'item';
  apCost: number;

  // Movement details
  targetHex?: HexPosition; // Where to move

  // Attack/Power/Spell details
  abilityId?: string; // Power or spell ID from database
  abilityType?: 'power' | 'spell' | 'basic_attack';
  targetId?: string; // Which character to target (specific character ID)

  // Item usage
  itemId?: string;
  itemTarget?: string; // Which character to use item on (specific character ID)
}

interface HexPosition {
  q: number;
  r: number;
}
```

---

## Coaching UI Flow

### Phase 1: Pre-Battle Huddle (Before Battle Starts)

**Step 1: Character Selection**
Coach sees all 3 selected characters in a row:
```
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  Sun Wukong     │ │  Achilles       │ │  Merlin         │
│  HP: 120/120    │ │  HP: 150/150    │ │  HP: 80/80      │
│  [PLAN TURN]    │ │  [PLAN TURN]    │ │  [PLAN TURN]    │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

**Step 2: Planning Each Character's Turn**
Click "PLAN TURN" opens detailed planning UI:

```
┌──────────────────────────────────────────────────────────┐
│ Planning Turn for: Sun Wukong                            │
│ Action Points Available: 3 AP                            │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ ACTION SEQUENCE:                                          │
│                                                           │
│ ┌─ Step 1 (1 AP remaining: 2 AP) ───────────────────┐  │
│ │ Type: [Move ▼]                                      │  │
│ │ Move to hex: (2, 3) [CLICK GRID TO SELECT]         │  │
│ └────────────────────────────────────────────────────┘  │
│                                                           │
│ ┌─ Step 2 (2 AP remaining: 0 AP) ───────────────────┐  │
│ │ Type: [Power ▼]                                     │  │
│ │ Power: [Cloud Somersault Strike ▼] (Rank 2, 2 AP)  │  │
│ │ Target: [Enemy #1: Achilles ▼]                      │  │
│ │ If target dead: [Attack weakest enemy ▼]           │  │
│ └────────────────────────────────────────────────────┘  │
│                                                           │
│ ┌─ Step 3 (0 AP remaining) ─────────────────────────┐  │
│ │ Type: [No action - out of AP]                       │  │
│ └────────────────────────────────────────────────────┘  │
│                                                           │
│ [+ ADD CONDITIONAL ACTION]                               │
│                                                           │
│ FALLBACK PLAN:                                            │
│ If primary action fails:                                 │
│ [▼] Defend and wait for next turn                        │
│                                                           │
│ [SAVE PLAN] [CLEAR] [PREVIEW]                            │
└──────────────────────────────────────────────────────────┘
```

**Step 3: Adding Conditional Logic**
Click "+ ADD CONDITIONAL ACTION":

```
┌──────────────────────────────────────────────────────────┐
│ IF/THEN CONDITION:                                        │
│                                                           │
│ If [Sun Wukong's HP ▼] is [less than ▼] [50%        ] │
│ Then: [Use healing item ▼] on [Self ▼]                 │
│ Else: [Continue with planned actions]                    │
│                                                           │
│ [SAVE CONDITION] [CANCEL]                                │
└──────────────────────────────────────────────────────────┘
```

**Step 4: Review All Plans**
Before locking in, coach sees summary:

```
┌──────────────────────────────────────────────────────────┐
│ ROUND 1 BATTLE PLAN SUMMARY                              │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ Sun Wukong:                                               │
│   1. Move to (2,3)                                        │
│   2. Use Cloud Somersault Strike on Achilles             │
│   Condition: If HP < 50%, use healing potion             │
│                                                           │
│ Achilles:                                                 │
│   1. Move to (1,2)                                        │
│   2. Basic attack on nearest enemy                        │
│                                                           │
│ Merlin:                                                   │
│   1. Cast Fireball (Rank 2) on enemy group               │
│   2. Defend                                               │
│                                                           │
│ [LOCK IN PLANS] [EDIT PLANS]                             │
└──────────────────────────────────────────────────────────┘
```

---

### Phase 2: Between Rounds (After Round Completes)

After round 1 ends, coach gets **another chance** to adjust plans:

```
┌──────────────────────────────────────────────────────────┐
│ ROUND 1 COMPLETE - PLAN ROUND 2                          │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ Round 1 Results:                                          │
│ ✓ Sun Wukong dealt 45 damage to Achilles                │
│ ✓ Achilles dealt 30 damage to Sun Wukong                │
│ ✓ Merlin's Fireball hit 2 enemies for 60 damage total   │
│                                                           │
│ Current Status:                                           │
│ Sun Wukong: 90/120 HP (followed plan ✓)                 │
│ Achilles: 105/150 HP (followed plan ✓)                  │
│ Merlin: 80/80 HP (followed plan ✓)                      │
│                                                           │
│ Enemy Status:                                             │
│ Enemy Achilles: 65/150 HP                                │
│ Enemy Merlin: 50/80 HP                                   │
│                                                           │
│ [KEEP SAME PLANS] [REVISE PLANS]                         │
│                                                           │
│ Timer: 30 seconds to decide                              │
└──────────────────────────────────────────────────────────┘
```

If coach clicks "REVISE PLANS", they get the full planning UI again with updated information:
- Current HP values
- Enemy positions
- Ability cooldowns
- Item availability

---

## Adherence System Integration

### When Adherence Check Fails

The character rejects the coach's plan and gets presented with a survey.

### When Planned Action Becomes Unavailable

If the coach's planned action cannot be executed (e.g., target is dead, target hex is occupied, ability is on cooldown):
- **Treated as adherence check FAIL**
- Character gets the survey and picks autonomous action
- Same rebellion mechanics apply (mental health changes, adherence penalties, judge reactions)
- No fallback plans needed - character improvises using the survey system

### Survey Generation

The system generates a survey with ALL available actions the character can take:

```typescript
function generateActionSurvey(
  character: BattleCharacter,
  coachPlan: PlannedAction,
  battleState: BattleState
): ActionSurvey {
  const options: ActionOption[] = [];
  const availableAP = 3; // Always start with 3 AP

  // 1. MOVEMENT OPTIONS
  const reachableHexes = HexMovementEngine.getReachableHexes(
    character.id,
    character.position,
    1, // 1 AP for move
    battleState.hexGrid
  );

  for (const hex of reachableHexes) {
    options.push({
      id: `move_to_${hex.q}_${hex.r}`,
      type: 'move',
      label: `Move to position (${hex.q}, ${hex.r})`,
      apCost: 1,
      targetHex: hex,
      consequence: 'Repositions character on battlefield'
    });
  }

  // 2. ATTACK OPTIONS (for each valid enemy)
  const validEnemies = getAliveEnemies(character, battleState);

  for (const enemy of validEnemies) {
    // Basic attack option
    options.push({
      id: `attack_${enemy.id}_basic`,
      type: 'attack',
      label: `Basic attack on ${enemy.name} with ${character.equippedItems.weapon?.name || 'fists'}`,
      apCost: 2,
      targetId: enemy.id,
      expectedDamage: calculateExpectedDamage(character, enemy, 'basic'),
      consequence: `Deals ~${calculateExpectedDamage(character, enemy, 'basic')} damage`
    });

    // Power options (Rank 1, 2, 3)
    const availablePowers = character.unlockedPowers.filter(power => {
      const cooldown = character.powerCooldowns.get(power.id) || 0;
      return cooldown === 0; // Only powers off cooldown
    });

    for (const power of availablePowers) {
      const rank = power.current_rank || 1;
      const apCost = rank; // Rank 1 = 1 AP, Rank 2 = 2 AP, Rank 3 = 3 AP

      if (apCost <= availableAP) {
        options.push({
          id: `power_${power.id}_on_${enemy.id}`,
          type: 'power',
          label: `Use ${power.name} (Rank ${rank}) on ${enemy.name}`,
          apCost: apCost,
          abilityId: power.id,
          targetId: enemy.id,
          expectedDamage: calculateExpectedDamage(character, enemy, 'power', power),
          consequence: `${power.description} - Deals ~${calculateExpectedDamage(character, enemy, 'power', power)} damage`
        });
      }
    }

    // Spell options (Rank 1, 2, 3)
    const availableSpells = character.unlockedSpells.filter(spell => {
      const cooldown = character.spellCooldowns.get(spell.id) || 0;
      const hasEnoughMana = character.currentMana >= (spell.mana_cost || 0);
      return cooldown === 0 && hasEnoughMana;
    });

    for (const spell of availableSpells) {
      const rank = spell.current_rank || 1;
      const apCost = rank;

      if (apCost <= availableAP) {
        options.push({
          id: `spell_${spell.id}_on_${enemy.id}`,
          type: 'spell',
          label: `Cast ${spell.name} (Rank ${rank}) at ${enemy.name}`,
          apCost: apCost,
          abilityId: spell.id,
          targetId: enemy.id,
          expectedDamage: calculateExpectedDamage(character, enemy, 'spell', spell),
          manaCost: spell.mana_cost || 0,
          consequence: `${spell.description} - Deals ~${calculateExpectedDamage(character, enemy, 'spell', spell)} damage, costs ${spell.mana_cost} mana`
        });
      }
    }
  }

  // 3. DEFENSIVE OPTIONS
  options.push({
    id: 'defend',
    type: 'defend',
    label: 'Take defensive stance',
    apCost: 0,
    consequence: '+50% defense until next turn, can still use remaining AP'
  });

  // 4. ITEM OPTIONS
  const availableItems = character.inventory.filter(item =>
    item.usable_in_battle && item.quantity > 0
  );

  for (const item of availableItems) {
    if (item.type === 'healing') {
      options.push({
        id: `item_${item.id}_self`,
        type: 'item',
        label: `Use ${item.name} on self`,
        apCost: 1,
        itemId: item.id,
        consequence: `Restores ${item.heal_amount || 0} HP`
      });
    } else if (item.type === 'buff') {
      options.push({
        id: `item_${item.id}_self`,
        type: 'item',
        label: `Use ${item.name}`,
        apCost: 1,
        itemId: item.id,
        consequence: item.description
      });
    }
  }

  // 5. WILDCARD CHAOS OPTIONS (if mental health low enough)
  const wildcards = getAvailableWildcards(character);
  options.push(...wildcards);

  // 6. COMBINATION OPTIONS (if AP allows)
  // e.g., "Move to (2,3) then attack Enemy #1" (3 AP total)
  if (reachableHexes.length > 0 && validEnemies.length > 0) {
    for (const hex of reachableHexes.slice(0, 3)) { // Limit to 3 movement options to avoid explosion
      for (const enemy of validEnemies) {
        options.push({
          id: `combo_move_${hex.q}_${hex.r}_attack_${enemy.id}`,
          type: 'combo',
          label: `Move to (${hex.q}, ${hex.r}) then attack ${enemy.name}`,
          apCost: 3, // 1 for move + 2 for basic attack
          actionSequence: [
            { type: 'move', targetHex: hex, apCost: 1 },
            { type: 'attack', targetId: enemy.id, apCost: 2 }
          ],
          consequence: `Reposition and attack in one turn`
        });
      }
    }
  }

  return {
    characterId: character.id,
    question: `${character.name}, you rejected the coach's plan. What will you do instead?`,
    options: options,
    coachPlan: coachPlan // Include rejected plan for context
  };
}
```

### AI Selection from Survey

```typescript
function selectActionFromSurvey(
  character: TeamCharacter,
  survey: ActionSurvey,
  gameplanCheck: GameplanAdherenceCheck
): ActionOption {
  // Weight each option based on personality
  const weightedOptions = survey.options.map(option => ({
    option,
    weight: calculateOptionWeight(option, character, survey.coachPlan)
  }));

  // Sort by weight
  weightedOptions.sort((a, b) => b.weight - a.weight);

  // Weighted random selection from top 5 options
  const topOptions = weightedOptions.slice(0, 5);
  return weightedRandomSelect(topOptions);
}

function calculateOptionWeight(
  option: ActionOption,
  character: TeamCharacter,
  coachPlan: PlannedAction
): number {
  let weight = 100; // Base weight

  // ARCHETYPE PREFERENCES
  if (character.archetype === 'berserker') {
    if (option.type === 'attack' || option.type === 'power') weight += 60;
    if (option.type === 'defend') weight -= 40;
    if (option.type === 'item' && option.itemId?.includes('heal')) weight -= 30;
    if (option.expectedDamage && option.expectedDamage > 50) weight += 40; // Berserkers love big damage
  }

  if (character.archetype === 'tank') {
    if (option.type === 'defend') weight += 50;
    if (option.type === 'move') weight += 20; // Tanks like positioning
    if (option.expectedDamage && option.expectedDamage < 30) weight += 20; // Tanks don't chase damage
  }

  if (character.archetype === 'mage') {
    if (option.type === 'spell') weight += 50;
    if (option.type === 'attack') weight -= 20; // Mages prefer spells to basic attacks
    if (option.manaCost && option.manaCost > 20) weight += 30; // Mages like powerful spells
  }

  if (character.archetype === 'assassin') {
    if (option.type === 'move') weight += 40; // Assassins love positioning
    if (option.type === 'combo' && option.actionSequence?.length > 1) weight += 50; // Assassins love combos
    if (option.targetId && isWeakestEnemy(option.targetId)) weight += 40; // Assassins finish weak targets
  }

  if (character.archetype === 'support') {
    if (option.type === 'item' && option.itemId?.includes('heal')) weight += 50;
    if (option.type === 'spell' && isBuffSpell(option.abilityId)) weight += 40;
    if (option.type === 'defend') weight += 30;
  }

  // PERSONALITY PREFERENCES
  if (character.conflictResponse === 'aggressive') {
    if (option.type === 'attack' || option.type === 'power') weight += 40;
    if (option.type === 'defend') weight -= 30;
  }

  if (character.conflictResponse === 'withdrawn') {
    if (option.type === 'defend') weight += 50;
    if (option.type === 'move' && isMovingAway(option.targetHex)) weight += 40;
    if (option.id === 'flee') weight += 60;
  }

  if (character.conflictResponse === 'diplomatic') {
    if (option.type === 'item' && option.itemTarget === 'ally') weight += 40;
    if (option.type === 'defend') weight += 30;
  }

  if (character.conflictResponse === 'manipulative') {
    if (option.type === 'wildcard' && option.effect === 'friendly_fire') weight += 30; // Manipulative characters might betray
    if (option.type === 'combo') weight += 40; // Manipulative = strategic
  }

  // DECISION MAKING STYLE
  if (character.decisionMaking === 'impulsive') {
    if (option.apCost >= 3) weight += 40; // Impulsive = all-in actions
    if (option.type === 'combo') weight -= 20; // Impulsive = less planning
  }

  if (character.decisionMaking === 'calculated') {
    if (option.type === 'combo') weight += 50; // Calculated = combo planning
    if (option.type === 'move' && option.apCost === 1) weight += 30; // Calculated = positioning
  }

  if (character.decisionMaking === 'emotional') {
    if (option.type === 'wildcard') weight += 40;
    if (option.targetId && hasNegativeRelationship(character, option.targetId)) weight += 50; // Emotional = target enemies
  }

  // PSYCHOLOGY STATE MODIFIERS
  if (character.psychStats.mentalHealth < 30) {
    if (option.type === 'wildcard') weight += 80; // Low mental health = chaos actions likely
    if (option.type === 'defend') weight -= 30;
  }

  if (character.mentalState.stress > 70) {
    if (option.id === 'flee') weight += 70;
    if (option.type === 'defend') weight += 40;
    if (option.type === 'attack' && option.expectedDamage > 60) weight -= 30; // High stress = avoid risky moves
  }

  if (character.psychStats.ego > 80) {
    // High ego characters want to attack strongest enemies to prove themselves
    if (option.targetId && isStrongestEnemy(option.targetId)) weight += 60;
    if (option.expectedDamage && option.expectedDamage > 70) weight += 50; // High ego = big plays
    if (option.type === 'defend') weight -= 40; // High ego = no defense
  }

  if (character.psychStats.teamPlayer < 30) {
    // Low team player = selfish actions
    if (option.type === 'item' && option.itemTarget === 'self') weight += 40;
    if (option.type === 'item' && option.itemTarget === 'ally') weight -= 50;
  }

  // STRATEGIC INTENT CONFLICT
  // If coach wanted defensive but character is aggressive archetype
  if (coachPlan.strategicIntent === 'defensive') {
    if (character.archetype === 'berserker' || character.psychStats.ego > 70) {
      // Berserkers and high-ego characters HATE defensive plans
      if (option.type === 'attack' || option.type === 'power') weight += 50; // Rebel by being aggressive
    }
  }

  if (coachPlan.strategicIntent === 'aggressive') {
    if (character.conflictResponse === 'withdrawn' || character.mentalState.stress > 70) {
      // Withdrawn/stressed characters HATE aggressive plans
      if (option.type === 'defend' || option.id === 'flee') weight += 50; // Rebel by being defensive
    }
  }

  // RELATIONSHIP MODIFIERS
  character.relationshipModifiers.forEach(rel => {
    if (rel.relationship === 'enemy' && rel.strength < -50) {
      // Strong enemy relationship = prioritize attacking them
      if (option.targetId === rel.characterId) {
        weight += 60;
      }
    }
    if (rel.relationship === 'ally' && rel.strength > 70) {
      // Strong ally relationship = avoid actions that harm them
      if (option.type === 'wildcard' && option.effect === 'friendly_fire') {
        weight -= 80;
      }
    }
  });

  return Math.max(0, weight);
}
```

---

## Coach Notification System

When a character rebels, the coach sees:

```
┌──────────────────────────────────────────────────────────┐
│ 🚨 STRATEGY REJECTED                                      │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ Sun Wukong has rejected your plan!                       │
│                                                           │
│ Your Plan:                                                │
│   1. Move to (2,3)                                        │
│   2. Use Cloud Somersault Strike on Achilles             │
│                                                           │
│ Adherence Score: 42/100 (FAILED)                         │
│ Reason: High ego + aggressive personality conflicts      │
│         with tactical positioning strategy               │
│                                                           │
│ Sun Wukong is making his own decision...                 │
│                                                           │
│ [Waiting for action...]                                  │
└──────────────────────────────────────────────────────────┘
```

After the character acts:

```
┌──────────────────────────────────────────────────────────┐
│ Sun Wukong's Turn                                         │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ Sun Wukong chose:                                         │
│ ⚔️  Basic attack on Enemy Achilles with Ruyi Jingu Bang  │
│                                                           │
│ Result:                                                   │
│ • Dealt 52 damage to Achilles (98/150 HP remaining)      │
│ • Confidence +5 (acted independently)                     │
│ • Adherence -10 (disobeyed coach)                        │
│                                                           │
│ [CONTINUE]                                                │
└──────────────────────────────────────────────────────────┘
```

The coach does NOT see the survey or decision process - only the result after the fact.

---

## Database Schema Updates Required

### New Tables

```sql
-- Store planned actions for each character
CREATE TABLE battle_planned_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID NOT NULL,
  character_id UUID NOT NULL,
  round_number INT NOT NULL,
  action_sequence JSONB NOT NULL, -- Array of ActionStep objects
  conditions JSONB, -- Array of ActionCondition objects
  fallback_action JSONB,
  strategic_intent VARCHAR(50),
  priority VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Store adherence check results
CREATE TABLE battle_adherence_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID NOT NULL,
  character_id UUID NOT NULL,
  round_number INT NOT NULL,
  adherence_score INT NOT NULL,
  check_result VARCHAR(50), -- 'follows_strategy', 'slight_deviation', 'improvises', 'goes_rogue'
  chosen_action JSONB, -- The action the character actually took
  was_rebellion BOOLEAN DEFAULT FALSE,
  rebellion_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Summary

This system gives the coach FULL granular control over each character's actions:
- ✅ Specific hex movement targets
- ✅ Specific power/spell selection by name
- ✅ Specific target selection
- ✅ Conditional logic (if HP < X, do Y)
- ✅ Fallback plans
- ✅ Multi-action combos
- ✅ Between-round plan revision

When adherence fails:
- ✅ Character gets a survey of ALL real available actions
- ✅ Survey includes specific powers, spells, targets, movements
- ✅ AI selects based on personality, psychology state, and relationships
- ✅ Coach sees the result AFTER the action is taken (surprise element)
- ✅ Consequences are applied (mental health, adherence changes)

**NO shortcuts. NO defaults. NO fallbacks. This is the COMPLETE system.**
