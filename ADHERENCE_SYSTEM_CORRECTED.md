# Adherence System - CORRECTED Understanding

**Date:** October 31, 2025
**Status:** Researched from actual code

---

## How Adherence Actually Works

### 1. BEFORE EACH TURN - Adherence Check Roll

**Location:** `frontend/src/systems/physicalBattleEngine.ts` line 938-985

```typescript
// This happens EVERY TURN for EVERY CHARACTER
const gameplanCheck = PhysicalBattleEngine.performGameplanAdherenceCheck(
  character,
  plannedAction // The coach's plan for this turn
);

// Result is one of:
// - 'follows_strategy' (adherence >= 80)
// - 'slight_deviation' (adherence >= 60)
// - 'improvises' (adherence >= 30)
// - 'goes_rogue' (adherence < 30)
```

**Calculation:**
```typescript
const baseAdherence = character.gameplanAdherence; // 0-100 (from psychStats.training)
const mentalHealthMod = (mentalHealth - 50) * 0.5;
const teamChemistryMod = (teamTrust - 50) * 0.3;
const stressMod = -stress * 0.4;
const relationshipMod = ±20; // Based on enemies/allies present

finalAdherence = baseAdherence + mentalHealthMod + teamChemistryMod + stressMod + relationshipMod;
```

### 2. IF ADHERENCE PASSES - Follow Coach's Plan

```typescript
if (gameplanCheck.checkResult === 'follows_strategy') {
  // Character executes EXACTLY what coach planned
  actualAction = coach's plannedAction;
}
```

**Example:**
- Coach planned: "Attack enemy character #2 with Fire Blast spell"
- Character does: **Attacks enemy #2 with Fire Blast**
- Example log: "Sun Wukong follows your strategy and attacks Enemy #2 with Fire Blast"

### 3. IF ADHERENCE FAILS - Character Makes Own Decision

**Location:** `frontend/src/systems/physicalBattleEngine.ts` line 1104-1130

```typescript
if (gameplanCheck.checkResult !== 'follows_strategy') {
  // Character IMPROVISES - system generates action based on psychology
  actualAction = PhysicalBattleEngine.generateImprovisedAction(
    character,
    gameplanCheck,
    battleState
  );
}
```

**Current Implementation** (lines 1111-1129):
```typescript
// HARDCODED simple logic:
if (stress > 80) {
  return { type: 'flee' }; // Character tries to run away
}

if (mentalHealth < 30) {
  return {
    type: 'basic_attack',
    targetId: randomEnemy.id // Attacks random enemy in berserker rage
  };
}

// Default fallback
return { type: 'defend' }; // Character ignores plan and defends
```

---

## THE MISSING SYSTEM - Multiple Choice Survey

**What's supposed to happen** (according to your description):

When adherence fails, the system should:

1. **Generate a survey of real combat actions** based on:
   - Available targets (enemy characters that are alive)
   - Available powers/spells (character's unlocked abilities)
   - Available weapons (equipped items)
   - Special wildcard actions (predefined chaos options)

2. **Present options to AI character:**
```typescript
const survey = {
  question: "You rejected the coach's plan. What will you do?",
  options: [
    // ATTACK OPTIONS (based on available targets)
    {
      id: 'attack_char1_with_weapon',
      label: `Attack ${enemyChar1.name} with ${weapon.name}`,
      type: 'attack',
      target: enemyChar1.id,
      weapon: weapon.id
    },
    {
      id: 'attack_char2_with_power',
      label: `Use ${power.name} on ${enemyChar2.name}`,
      type: 'power',
      target: enemyChar2.id,
      ability: power.id
    },
    {
      id: 'attack_char3_with_spell',
      label: `Cast ${spell.name} at ${enemyChar3.name}`,
      type: 'spell',
      target: enemyChar3.id,
      ability: spell.id
    },

    // DEFENSIVE OPTIONS
    {
      id: 'defend',
      label: 'Stand ground and defend',
      type: 'defend'
    },
    {
      id: 'flee',
      label: 'Try to escape the battle',
      type: 'flee'
    },

    // WILDCARD OPTIONS (predefined chaos)
    {
      id: 'friendly_fire',
      label: 'Attack a teammate (chaos action)',
      type: 'wildcard',
      effect: 'friendly_fire',
      consequence: 'Damages teammate, loses morale, triggers judge'
    },
    {
      id: 'attack_judge',
      label: 'Attack the judge (chaos action)',
      type: 'wildcard',
      effect: 'attack_judge',
      consequence: 'Judge intervenes, likely disqualification'
    },
    {
      id: 'refuse_fight',
      label: 'Refuse to fight (pacifist action)',
      type: 'wildcard',
      effect: 'pacifist_mode',
      consequence: 'Skips turn, gains mental health'
    }
  ]
};
```

3. **AI character selects option** based on personality:
```typescript
function selectActionFromSurvey(
  character: TeamCharacter,
  survey: ActionSurvey,
  gameplanCheck: GameplanAdherenceCheck
): ActionChoice {
  // Weight options based on personality
  const weights = survey.options.map(option => {
    let weight = 100; // Base weight

    // Personality modifiers
    if (character.archetype === 'berserker' && option.type === 'attack') {
      weight += 50; // Berserkers favor attacks
    }
    if (character.conflictResponse === 'withdrawn' && option.type === 'defend') {
      weight += 40; // Withdrawn characters favor defense
    }
    if (character.psychStats.ego > 80 && option.type === 'attack') {
      weight += 30; // High ego = aggressive
    }
    if (character.psychStats.mentalHealth < 30 && option.type === 'wildcard') {
      weight += 60; // Low mental health = chaos actions more likely
    }

    // Stress modifiers
    if (character.mentalState.stress > 70 && option.id === 'flee') {
      weight += 50; // High stress = more likely to flee
    }

    return { option, weight };
  });

  // Select option based on weighted random
  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
  const roll = Math.random() * totalWeight;
  let cumulative = 0;

  for (const { option, weight } of weights) {
    cumulative += weight;
    if (roll <= cumulative) {
      return option;
    }
  }

  // Fallback to first option
  return survey.options[0];
}
```

4. **Execute chosen action:**
```typescript
const chosenAction = selectActionFromSurvey(character, survey, gameplanCheck);

// Log the rebellion
console.log(`${character.name} rejected coach's plan and chose: ${chosenAction.label}`);

// Execute the action
if (chosenAction.type === 'attack') {
  return executeAttack(character, chosenAction.target, chosenAction.weapon);
}
else if (chosenAction.type === 'power' || chosenAction.type === 'spell') {
  return executeAbility(character, chosenAction.ability, chosenAction.target);
}
else if (chosenAction.type === 'wildcard') {
  return executeWildcardAction(character, chosenAction.effect);
}
// etc...
```

---

## Wildcard Actions - Predefined Chaos Bank

**Location:** Should exist in `/frontend/src/data/wildcardActions.ts` (needs to be created)

```typescript
export interface WildcardAction {
  id: string;
  label: string;
  description: string;
  trigger: 'low_mental_health' | 'high_ego' | 'high_stress' | 'identity_crisis' | 'any';
  minMentalHealthRequired: number; // Below this = available as option
  consequence: WildcardConsequence;
}

export interface WildcardConsequence {
  immediateEffect: string; // What happens immediately
  mechanicalEffect: {
    type: 'damage' | 'skip_turn' | 'redirect' | 'stat_change' | 'special';
    target?: 'self' | 'teammate' | 'opponent' | 'judge' | 'environment';
    amount?: number;
  };
  psychologyEffect: {
    mentalHealthChange: number;
    stressChange: number;
    adherenceChange: number; // Permanent change to base adherence
  };
  narrativeOutcome: string;
  judgeReaction: 'ignore' | 'warning' | 'penalty' | 'intervention' | 'disqualification';
}

export const WILDCARD_ACTIONS: WildcardAction[] = [
  {
    id: 'friendly_fire',
    label: 'Attack a teammate',
    description: 'Confusion or rage causes character to attack their own team',
    trigger: 'low_mental_health',
    minMentalHealthRequired: 40,
    consequence: {
      immediateEffect: 'Attacks random teammate with basic attack',
      mechanicalEffect: {
        type: 'damage',
        target: 'teammate',
        amount: 20 // Fixed damage to teammate
      },
      psychologyEffect: {
        mentalHealthChange: -15, // Guilt after realizing mistake
        stressChange: +20,
        adherenceChange: -5 // Permanent adherence penalty
      },
      narrativeOutcome: '{character} attacks {teammate} in confusion! Team morale drops.',
      judgeReaction: 'warning' // First time = warning, second time = penalty
    }
  },
  {
    id: 'attack_judge',
    label: 'Attack the judge',
    description: 'Character loses control and attacks the battle judge',
    trigger: 'identity_crisis',
    minMentalHealthRequired: 20,
    consequence: {
      immediateEffect: 'Attempts to attack judge, immediately stopped',
      mechanicalEffect: {
        type: 'skip_turn',
        target: 'self'
      },
      psychologyEffect: {
        mentalHealthChange: -30,
        stressChange: +40,
        adherenceChange: -20
      },
      narrativeOutcome: '{character} lunges at {judge}! Security tackles them to the ground.',
      judgeReaction: 'disqualification' // Instant loss
    }
  },
  {
    id: 'refuse_fight',
    label: 'Refuse to fight',
    description: 'Character has moral objection and refuses to continue fighting',
    trigger: 'high_stress',
    minMentalHealthRequired: 50,
    consequence: {
      immediateEffect: 'Character skips turn, gains composure',
      mechanicalEffect: {
        type: 'skip_turn',
        target: 'self'
      },
      psychologyEffect: {
        mentalHealthChange: +10, // Peace from following morals
        stressChange: -15,
        adherenceChange: -10 // Permanent adherence penalty (disobeyed)
      },
      narrativeOutcome: '{character} lowers their weapon and refuses to fight. "This isn\'t right."',
      judgeReaction: 'ignore' // Judge allows pacifist behavior
    }
  },
  {
    id: 'berserk_rage',
    label: 'Enter berserker rage',
    description: 'Character loses all control and attacks wildly',
    trigger: 'low_mental_health',
    minMentalHealthRequired: 30,
    consequence: {
      immediateEffect: 'Attacks random target (enemy, teammate, or environment) with +50% damage',
      mechanicalEffect: {
        type: 'damage',
        target: 'random', // Can hit anyone
        amount: 'base_damage * 1.5'
      },
      psychologyEffect: {
        mentalHealthChange: -20,
        stressChange: +30,
        adherenceChange: -15
      },
      narrativeOutcome: '{character} enters a blind rage and attacks {target} with devastating force!',
      judgeReaction: 'warning' // Allowed once, penalized if repeated
    }
  },
  {
    id: 'flee_battle',
    label: 'Try to flee the battle',
    description: 'Character attempts to escape (will be turned back with penalty)',
    trigger: 'high_stress',
    minMentalHealthRequired: 100, // Always available
    consequence: {
      immediateEffect: 'Character tries to flee but arena mechanic forces them back',
      mechanicalEffect: {
        type: 'skip_turn',
        target: 'self'
      },
      psychologyEffect: {
        mentalHealthChange: -15, // Shame from fleeing + being forced back
        stressChange: +10, // Stress increases from failed escape
        adherenceChange: -20 // Major adherence penalty
      },
      narrativeOutcome: '{character} tries to flee but the arena barrier forces them back! They lose their turn in the attempt.',
      judgeReaction: 'penalty' // Judge penalizes attempt to flee
    }
  }
];
```

---

## Complete Adherence Flow in Battle

**Each Turn:**

```
1. Coach's planned action stored (from pre-battle coaching phase)
   ↓
2. Character's turn begins
   ↓
3. ADHERENCE ROLL (based on training, mental health, stress, team trust)
   ↓
4a. PASS (adherence >= 60):
    → Character executes coach's planned action
    → "Zeta attacks Enemy #2 with Fire Blast as planned"
    ↓
4b. FAIL (adherence < 60):
    → Generate action survey from:
       * Available enemies to attack
       * Character's unlocked powers/spells/weapons
       * Wildcard chaos actions (if mental health low enough)
    ↓
    → AI character selects from survey based on personality
    ↓
    → Log rebellion: "Sun Wukong ignored your strategy and chose: Attack Enemy #1 with Lightning Bolt"
    ↓
    → Execute chosen action
    ↓
5. Apply mechanical effects (damage, status, etc.)
   ↓
6. Apply psychology consequences:
   - If followed plan: +adherence, -stress
   - If rebelled: -adherence, mental health ±X depending on action
   ↓
7. Judge may intervene if wildcard action triggered
   ↓
8. Next character's turn
```

---

## What Needs to be Built

### 1. Action Survey Generator
**File:** `frontend/src/systems/actionSurveyGenerator.ts`
- Takes current battle state
- Returns list of valid actions (attacks, powers, spells, wildcards)

### 2. AI Action Selector
**File:** `frontend/src/systems/aiActionSelector.ts`
- Takes survey + character personality
- Returns weighted random choice

### 3. Wildcard Actions Database
**File:** `frontend/src/data/wildcardActions.ts`
- Defines all chaos actions with consequences

### 4. Integration with PhysicalBattleEngine
**File:** `frontend/src/systems/physicalBattleEngine.ts` line 1104-1130
- Replace hardcoded logic with survey system
- Call survey generator when adherence fails
- Call AI selector to choose action
- Execute chosen action

---

## Summary - Corrected Understanding

✅ **Adherence is checked EVERY TURN**
✅ **Pass/Fail based on score calculation**
✅ **Pass = follow coach, Fail = AI chooses from survey**
✅ **Survey contains REAL combat options** (not hardcoded to flee/defend/attack)
✅ **Survey includes wildcard chaos actions** with defined consequences
✅ **AI selection weighted by personality traits**
✅ **Consequences affect psychology and battle state**
✅ **Flee attempts always fail** - character is forced back with penalties

❌ **NOT** a pre-battle one-time check
❌ **NOT** coach can force compliance with penalty
❌ **NOT** hardcoded flee/defend/random attack

**Ready to implement this correctly now?**
