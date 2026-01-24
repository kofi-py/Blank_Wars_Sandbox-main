# Adherence System Design Assessment

**Date:** October 31, 2025
**Assessment:** Careful evaluation of feasibility and integration challenges

---

## Executive Summary

**Overall Verdict:** ⚠️ **FEASIBLE BUT SIGNIFICANT INTEGRATION WORK REQUIRED**

The adherence system design is **conceptually sound** and **well-aligned** with the existing psychology/battle architecture. However, there are **4 major integration challenges** and **2 critical data structure issues** that must be addressed for it to work correctly in practice.

---

## ✅ What Works Well (Strengths)

### 1. **Clean Integration Point Exists**
**Location:** `frontend/src/systems/physicalBattleEngine.ts` line 1040-1051

The code already has the EXACT hook we need:
```typescript
const gameplanCheck = this.performGameplanAdherenceCheck(character, initiativeEntry.plannedAction);

if (gameplanCheck.checkResult === 'follows_strategy') {
  actualAction = this.convertPlannedToExecuted(initiativeEntry.plannedAction);
} else {
  actualAction = this.generateImprovisedAction(character, gameplanCheck, battleState);
  //              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //              THIS is where we plug in the survey system
}
```

**Assessment:** Perfect integration point. We don't need to refactor the battle engine - just replace `generateImprovisedAction()` with the survey system.

### 2. **Adherence Calculation is Solid**
**Location:** `frontend/src/systems/physicalBattleEngine.ts` line 938-985

The existing adherence score calculation is well-designed:
- Uses multiple factors (mental health, stress, team trust, relationships)
- Returns 4-tier result (follows/slight_deviation/improvises/goes_rogue)
- Already called every turn

**Assessment:** No changes needed here. The pass/fail mechanism already works.

### 3. **Wildcard Actions Align with Existing Deviation System**
**Location:** `frontend/src/data/characterPsychology.ts` line 853-949

The codebase ALREADY has a deviation system with predefined chaos actions:
- `friendly_fire`
- `pacifist_mode`
- `berserker_rage`
- `identity_crisis`
- `dimensional_escape`
- `environmental_chaos`
- `complete_breakdown`

**Assessment:** We don't need to invent wildcards - they already exist! We just need to surface them as survey options when adherence fails.

### 4. **Judge System Already Implemented**
**Location:** `frontend/src/data/aiJudgeSystem.ts` + `frontend/src/systems/physicalBattleEngine.ts` line 71-91

The judge decision system is FULLY FUNCTIONAL:
- Judge characters already exist in game: **Eleanor Roosevelt** (compassionate), **King Solomon** (wisdom/justice), **Anubis** (absolute judgment)
- Judge rulings convert chaos actions to mechanical effects
- Already integrated into battle execution and therapy system

**Assessment:** Wildcard consequences are already handled. No extra work needed.

---

## ⚠️ Major Integration Challenges

### Challenge 1: **Powers/Spells Data Not Available in Battle State**

**Problem:**
The survey needs to offer real combat options like:
- "Attack Enemy #2 with Fire Blast"
- "Use Lightning Bolt on Enemy #1"

But the current `BattleCharacter` interface has:
```typescript
interface BattleCharacter {
  character: Character; // This has abilities: string[] (just IDs)
  // ... other fields
}
```

**What's Missing:**
- Power definitions (name, description, effects, cooldown)
- Spell definitions (name, description, effects, cost)
- Current cooldown states for each ability
- Unlocked status for each power/spell

**Current State:**
Powers and spells are stored in separate database tables:
- `power_definitions` (388 powers total: 12 skills, 77 abilities, 63 species, 236 signature)
- `spell_definitions` (314 spells)
- `character_powers` (which powers each character has unlocked)
- `character_spells` (which spells each character has unlocked)

**Impact:** 🔴 **CRITICAL BLOCKER**

Without this data, the survey can only offer:
- "Attack Enemy X" (generic)
- "Defend"
- "Flee"
- Wildcard actions

It CANNOT offer:
- "Use [Specific Power] on Enemy X"
- "Cast [Specific Spell] on Enemy Y"

**Solution Required:**
1. When battle starts, load ALL unlocked powers/spells for ALL characters
2. Add to `BattleCharacter`:
```typescript
interface BattleCharacter {
  // ... existing fields
  unlockedPowers: PowerDefinition[];
  unlockedSpells: SpellDefinition[];
  powerCooldowns: Map<string, number>; // power_id -> turns remaining
  spellCooldowns: Map<string, number>; // spell_id -> turns remaining
}
```
3. Survey generator reads from these arrays to build real action options

**Estimated Work:** 4-6 hours
- Modify battle initialization to load powers/spells
- Update BattleCharacter interface
- Test that powers/spells persist through battle

---

### Challenge 2: **PlannedAction Structure is Incomplete**

**Problem:**
The coach needs to specify a strategy for each character during pre-battle huddle:
```typescript
interface PlannedAction {
  type: string;
  targetId?: string;
  abilityId?: string;
  narrativeDescription?: string;
}
```

But this doesn't capture:
- **Which specific power/spell to use** (abilityId could be power OR spell - ambiguous)
- **Conditional logic** (e.g., "Use heal if HP < 50%, otherwise attack")
- **Target priority** (e.g., "Attack weakest enemy first")

**Current Reality:**
Looking at the actual implementation (line 1088-1102), `convertPlannedToExecuted()` doesn't even read `abilityId` - it just copies the type and targetId.

**Impact:** 🟡 **MEDIUM PROBLEM**

The coaching phase can set:
- Strategy (aggressive/defensive/balanced)
- Maybe a target

But it CANNOT set:
- "Use Fire Blast on Enemy #2, then Lightning Bolt on Enemy #3"

**Solution Options:**

**Option A: Simple Strategy Only (Recommended)**
Keep PlannedAction simple - just store strategy type (aggressive/defensive/balanced) and target priority.

When character follows plan:
- Execute best available action based on strategy
- Select target based on priority rule
- System auto-picks which power/spell to use

When character rebels:
- Survey offers specific power/spell choices
- Character picks based on personality

**Option B: Detailed Action Planning**
Expand PlannedAction to include specific ability choices:
```typescript
interface PlannedAction {
  primaryAction: {
    type: 'power' | 'spell' | 'basic_attack';
    abilityId?: string;
    targetId: string;
  };
  fallbackAction?: PlannedAction; // If primary fails (cooldown, no target)
  conditions?: ActionCondition[];
}
```

**Recommendation:** Option A
- Simpler to implement
- More flexible (characters adapt to changing battle state)
- Still allows coaching decisions (strategy + priority)
- Rebellion is more meaningful (character picks different power/target)

**Estimated Work:** 2-3 hours for Option A

---

### Challenge 3: **Survey Generation is Complex**

**Problem:**
Generating a valid action survey requires checking:

1. **Available Targets:**
   - Which enemies are alive?
   - Which enemies are in range?
   - Which teammates are alive (for friendly fire)?

2. **Available Powers:**
   - Which powers are unlocked?
   - Which powers are off cooldown?
   - Does character have enough energy/mana?

3. **Available Spells:**
   - Which spells are unlocked?
   - Which spells are off cooldown?
   - Does character have enough mana?

4. **Wildcard Actions:**
   - Which wildcards are available based on mental health?
   - Which wildcards are available based on character archetype?

**Current Implementation:**
None exists. `generateImprovisedAction()` has 11 lines of hardcoded logic.

**Impact:** 🟡 **MEDIUM COMPLEXITY**

**Solution Required:**
Create `ActionSurveyGenerator` class:
```typescript
class ActionSurveyGenerator {
  static generate(
    character: BattleCharacter,
    battleState: BattleState,
    gameplanCheck: GameplanAdherenceCheck
  ): ActionSurvey {
    const options: ActionOption[] = [];

    // 1. Add attack options for each valid target
    const validTargets = this.getValidTargets(character, battleState);
    for (const target of validTargets) {
      // Basic attack
      options.push({
        id: `attack_${target.id}_basic`,
        type: 'attack',
        label: `Attack ${target.name} with basic attack`,
        target: target.id,
        weapon: character.equippedItems.weapon?.id
      });

      // Powers (if any available)
      const availablePowers = this.getAvailablePowers(character);
      for (const power of availablePowers) {
        options.push({
          id: `attack_${target.id}_power_${power.id}`,
          type: 'power',
          label: `Use ${power.name} on ${target.name}`,
          target: target.id,
          ability: power.id
        });
      }

      // Spells (if any available)
      const availableSpells = this.getAvailableSpells(character);
      for (const spell of availableSpells) {
        options.push({
          id: `attack_${target.id}_spell_${spell.id}`,
          type: 'spell',
          label: `Cast ${spell.name} at ${target.name}`,
          target: target.id,
          ability: spell.id
        });
      }
    }

    // 2. Add defensive options
    options.push({
      id: 'defend',
      type: 'defend',
      label: 'Stand ground and defend'
    });

    options.push({
      id: 'flee',
      type: 'flee',
      label: 'Try to flee (will be forced back)'
    });

    // 3. Add wildcard actions based on psychology
    const wildcards = this.getAvailableWildcards(character);
    options.push(...wildcards);

    return { question: "What will you do?", options };
  }

  private static getAvailablePowers(character: BattleCharacter): PowerDefinition[] {
    return character.unlockedPowers.filter(power => {
      const cooldown = character.powerCooldowns.get(power.id) || 0;
      const hasEnough Energy = character.currentEnergy >= (power.energy_cost || 0);
      return cooldown === 0 && hasEnoughEnergy;
    });
  }

  // ... more helper methods
}
```

**Estimated Work:** 6-8 hours
- Survey generator class
- Helper methods for filtering valid options
- Integration with wildcard system
- Testing with various character states

---

### Challenge 4: **AI Action Selection Logic**

**Problem:**
The AI needs to pick from the survey based on character personality. Current implementation doesn't have this.

**Impact:** 🟢 **LOW COMPLEXITY** (but important)

**Solution:**
```typescript
class AIActionSelector {
  static select(
    character: TeamCharacter,
    survey: ActionSurvey,
    gameplanCheck: GameplanAdherenceCheck
  ): ActionOption {
    // Weight each option
    const weights = survey.options.map(option => ({
      option,
      weight: this.calculateWeight(option, character, gameplanCheck)
    }));

    // Weighted random selection
    return this.weightedRandom(weights);
  }

  private static calculateWeight(
    option: ActionOption,
    character: TeamCharacter,
    gameplanCheck: GameplanAdherenceCheck
  ): number {
    let weight = 100; // Base

    // Archetype preferences
    if (character.archetype === 'berserker') {
      if (option.type === 'attack') weight += 50;
      if (option.type === 'defend') weight -= 30;
    }
    if (character.archetype === 'tank') {
      if (option.type === 'defend') weight += 40;
    }

    // Personality preferences
    if (character.conflictResponse === 'aggressive') {
      if (option.type === 'attack') weight += 30;
    }
    if (character.conflictResponse === 'withdrawn') {
      if (option.type === 'defend') weight += 40;
      if (option.id === 'flee') weight += 50;
    }

    // Psychology state
    if (character.psychStats.mentalHealth < 30) {
      if (option.type === 'wildcard') weight += 60;
    }
    if (character.mentalState.stress > 70) {
      if (option.id === 'flee') weight += 50;
    }

    // Ego affects target selection
    if (character.psychStats.ego > 80) {
      // High ego = prefer attacking strongest enemy
      if (option.target && this.isStrongestEnemy(option.target)) {
        weight += 40;
      }
    }

    return Math.max(0, weight);
  }
}
```

**Estimated Work:** 4-5 hours
- AI selector class
- Personality weight logic
- Testing different character types
- Balancing weights

---

## 🔴 Critical Data Structure Issues

### Issue 1: **Equipment Not Loaded in Battle**

**Problem:**
The survey wants to offer: "Attack with [Weapon Name]"

But equipment data isn't in BattleCharacter:
```typescript
interface BattleCharacter {
  character: Character; // Has equippedItems but not loaded
  equipmentBonuses: { attackBonus, defenseBonus, etc }; // Just the stats
}
```

**Solution:**
Load full equipment definitions when battle starts:
```typescript
interface BattleCharacter {
  equippedItems: {
    weapon?: EquipmentDefinition;
    armor?: EquipmentDefinition;
    accessory?: EquipmentDefinition;
  };
}
```

**Estimated Work:** 2 hours

---

### Issue 2: **Character Personality Traits Not in BattleCharacter**

**Problem:**
AI selector needs access to:
- `character.archetype` ✅ (exists)
- `character.conflictResponse` ❌ (not in BattleCharacter)
- `character.decisionMaking` ❌ (not in BattleCharacter)
- `character.psychStats` ❌ (not in BattleCharacter)

**Current State:**
`BattleCharacter.character` is of type `Character`, which doesn't have these fields.

**Solution:**
Convert to `TeamCharacter` format when initializing battle:
```typescript
interface BattleCharacter {
  character: TeamCharacter; // Has all personality data
  // ... rest
}
```

**Estimated Work:** 1-2 hours (character conversion already exists)

---

## 🎯 Performance Considerations

### Survey Generation Cost

**Per Turn:**
- 1 adherence check (already exists)
- IF fails: 1 survey generation
- Survey generation involves:
  - Filter 3-6 alive enemies
  - Filter 5-50 unlocked powers (check cooldowns)
  - Filter 5-50 unlocked spells (check cooldowns)
  - Filter 2-8 wildcard actions (check mental health thresholds)
  - Total: ~15-100 options generated

**Worst Case:** 100 options × 6 characters = 600 option objects per round

**Assessment:** 🟢 **ACCEPTABLE**
- Survey only generated when adherence fails (~30-50% of turns)
- JavaScript can generate 600 small objects in <1ms
- No network calls involved
- Survey discarded after selection

**Optimization:** Cache available powers/spells per character (only recalculate when cooldowns change)

---

## 🚧 Implementation Risks

### Risk 1: **Incomplete Power/Spell Data**
**Likelihood:** HIGH
**Impact:** HIGH

If powers/spells aren't fully loaded, survey will be incomplete and battles will feel generic.

**Mitigation:**
- Add validation: Fail battle start if power/spell data missing
- Log warning if character has <3 unlocked abilities
- Fallback: If survey empty, use current hardcoded logic

---

### Risk 2: **AI Selection Creates Infinite Loops**
**Likelihood:** MEDIUM
**Impact:** MEDIUM

If AI selector has bugs, character could pick invalid actions repeatedly.

**Mitigation:**
- Add timeout: If no valid selection after 3 attempts, use default (defend)
- Log all selections for debugging
- Add unit tests for AI selector with edge cases

---

### Risk 3: **Wildcard Actions Break Game State**
**Likelihood:** LOW
**Impact:** HIGH

Wildcard actions like "attack judge" or "dimensional escape" could crash the battle if not handled correctly.

**Mitigation:**
- Judge system already handles these
- Add safety checks before executing wildcards
- Test each wildcard action thoroughly

---

### Risk 4: **Survey UI Not Visible to User**
**Likelihood:** MEDIUM
**Impact:** MEDIUM

The survey is for AI decision-making, but user should SEE what the character chose.

**Current Design:** Only logs to console

**Better Design:**
Show notification:
> "🚨 Sun Wukong rejected your strategy!"
> "He chose: Attack Enemy #1 with Demon Smash instead"

**Mitigation:**
- Add battle log UI component
- Show character rebellion messages prominently
- Add "?" button to explain why character rebelled

---

## 📊 Estimated Total Implementation Effort

### Core System (Required)
1. Load powers/spells in battle initialization: **4-6 hours**
2. Action survey generator: **6-8 hours**
3. AI action selector: **4-5 hours**
4. Integration with physicalBattleEngine: **2-3 hours**
5. Testing and debugging: **6-8 hours**

**Subtotal:** **22-30 hours** (3-4 days)

### Polish (Recommended)
6. Battle log UI for showing rebellions: **4-6 hours**
7. Equipment data loading: **2 hours**
8. Personality data integration: **1-2 hours**
9. Balancing AI weights: **4-6 hours**

**Subtotal:** **11-16 hours** (1-2 days)

### **Grand Total:** **33-46 hours** (4-6 days of work)

---

## ✅ Final Verdict

### Will It Work?

**YES** - with the following caveats:

1. **Powers/spells MUST be loaded** into battle state (4-6 hours work)
2. **Survey generator** must be built from scratch (6-8 hours work)
3. **AI selector** must be built from scratch (4-5 hours work)
4. **Integration** is clean - existing code has perfect hooks (2-3 hours work)

### Is It Worth It?

**YES** - this system will:
- ✅ Make battles feel dynamic and unpredictable
- ✅ Make psychology stats meaningful (currently just visual)
- ✅ Give characters real personality during combat
- ✅ Add strategic depth (coach must consider character personality)
- ✅ Create memorable battle moments (wildcards + judge reactions)

### Recommended Approach

**Phase 1: MVP (22-30 hours)**
- Load powers/spells in battle
- Build survey generator (attack/defend/flee + wildcards only, NO specific powers yet)
- Build basic AI selector
- Integration and testing

**Test:** Characters rebel and pick from 5-10 generic options + wildcards

**Phase 2: Full System (11-16 hours)**
- Add specific powers/spells to survey
- Polish AI weights
- Add battle log UI
- Balance and tune

**Test:** Characters rebel and use specific named powers/spells

This phased approach reduces risk and delivers value incrementally.

---

## 🎯 Recommendation

**PROCEED WITH IMPLEMENTATION**

But do it in 2 phases:
1. **MVP** (1 week) - Generic actions + wildcards
2. **Polish** (3-4 days) - Specific powers/spells + UI

This design is solid and will significantly improve the battle system's depth and replayability.
