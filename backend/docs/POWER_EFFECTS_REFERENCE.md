# Power Effects Reference Guide

## Overview
This document maps power effect types from the `power_definitions.effects` JSON column to their implementations in `battleMechanicsService.ts`.

## Effect Types

### 1. DAMAGE
Deals direct damage to target.

**JSON Structure:**
```json
{
  "type": "damage",
  "value": 50,
  "damageType": "physical|magic|fire|ice|lightning|poison|psychic|etc",
  "target": "single_enemy|all_enemies|self|single_ally|all_allies",
  "rank": 1
}
```

**Implementation:** Calculated through `BattleMechanics.calculateDamageWithResistance()`
**Resistance Applied:** Yes, based on damageType
**Can Crit:** Yes (if from attack ability)

---

### 2. HEAL
Restores health points.

**JSON Structure:**
```json
{
  "type": "heal",
  "value": 30,
  "target": "self|single_ally|all_allies",
  "rank": 1
}
```

**Implementation:** Direct HP restoration, capped at maxHealth
**Notes:** Cannot overheal unless special effect allows it

---

### 3. STAT_MODIFIER
Temporarily or permanently modifies character stats.

**JSON Structure:**
```json
{
  "type": "stat_modifier",
  "stat": "attack|defense|speed|max_hp|magic_attack|magic_defense|evasion|accuracy|etc",
  "value": 25,
  "duration": 2,
  "target": "self|enemy|all_allies",
  "rank": 1
}
```

**Common Stats:**
- `attack` - Physical attack power
- `defense` - Physical defense
- `speed` - Turn priority
- `max_hp` - Maximum health
- `magic_attack` - Spell power
- `magic_defense` - Spell resistance
- `evasion` - Dodge chance
- `accuracy` - Hit chance
- `lifesteal` - HP drain percentage
- `all` - All stats at once

**Implementation:** Applied as status effect, processed each turn
**Duration:** `999` = permanent (until battle ends)

---

### 4. STATUS_EFFECT
Applies crowd control or condition effects.

**JSON Structure:**
```json
{
  "type": "status_effect",
  "statusEffect": "stun|poison|burn|freeze|charm|confusion|fear|sleep|paralyze",
  "duration": 3,
  "chance": 50,
  "target": "single_enemy|all_enemies",
  "rank": 2
}
```

**Status Effect Types:**
- **stun** - Cannot act (CC diminishing returns apply)
- **poison** - Damage over time
- **burn** - Damage over time + healing reduction
- **freeze** - Cannot act, take extra damage
- **charm** - Controlled by enemy
- **confusion** - Random target selection
- **fear** - Forced to flee/skip turn
- **sleep** - Cannot act, breaks on damage
- **paralyze** - Cannot act (CC diminishing returns apply)

**Implementation:** `BattleMechanics.applyStatusEffect()` with CC diminishing returns
**Diminishing Returns:** Full → 50% → 25% → Immune

---

### 5. IMMUNITY
Grants immunity to damage types or effects.

**JSON Structure:**
```json
{
  "type": "immunity",
  "immunityType": "poison|disease|bleed|burn|cc|critical_hits|physical|magic",
  "duration": 2,
  "count": 1,
  "rank": 3
}
```

**Immunity Types:**
- `poison`, `disease`, `bleed`, `burn` - Specific status immunities
- `cc` - All crowd control effects
- `critical_hits` - Cannot be crit
- `physical` - Physical damage immunity
- `magic` - Magic damage immunity
- `debuff` - All debuff immunity

**Implementation:** Checked before applying effects
**Count:** Number of times immunity blocks before expiring

---

### 6. SHIELD
Creates damage absorption barrier.

**JSON Structure:**
```json
{
  "type": "shield",
  "value": 50,
  "duration": 2,
  "target": "self",
  "rank": 2
}
```

**Implementation:** `BattleMechanics.applyShields()`
**Behavior:** Absorbs damage before HP, shields stack

---

### 7. PURGE
Removes buffs or debuffs.

**JSON Structure:**
```json
{
  "type": "purge",
  "purgeType": "debuff|buff|all",
  "count": 2,
  "target": "self|enemy",
  "rank": 2
}
```

**Implementation:** `BattleMechanics.purgeEffects()`
**Count:** `99` = remove all

---

### 8. SPECIAL
Custom mechanics not covered by standard types.

**JSON Structure:**
```json
{
  "type": "special",
  "specialType": "absorb_damage|reflect_spell_chance|drain_mana|etc",
  "value": 30,
  "duration": 2,
  "rank": 3
}
```

**Common Special Types:**
- `absorb_damage` - Damage shield with special behavior
- `reflect_spell_chance` - % chance to reflect magic
- `drain_mana` - Steal enemy mana
- `spell_damage_reduction` - Reduce magic damage taken
- `lifesteal_heals_double` - Lifesteal is 2x effective
- `overheal_as_shield` - Excess healing becomes shield
- `charmed_attacks_allies` - Charm makes target attack their allies
- `controlled_attacks_enemies` - Mind control forces enemy attacks
- `copy_enemy_ability` - Copy target's ability
- `dodge_physical_attacks` - % chance to dodge physical
- `untargetable` - Cannot be targeted
- `attack_twice_per_turn` - Extra action
- `pierce_through_to_second_target` - AOE splash
- `attacks_cannot_miss` - 100% accuracy
- `reflect_mental_attacks` - Return psychic damage
- `tech_abilities_empowered` - Tech powers stronger

**Implementation:** Custom logic in `battleMechanicsService.ts`

---

### 9. LIFESTEAL
Heal based on damage dealt.

**JSON Structure:**
```json
{
  "type": "lifesteal",
  "value": 25,
  "duration": 2,
  "appliesTo": "all_attacks",
  "rank": 2
}
```

**Implementation:** `BattleMechanics.applyLifesteal()`
**Calculation:** damage × (value / 100) = healing

---

### 10. REFLECT
Return percentage of damage to attacker.

**JSON Structure:**
```json
{
  "type": "reflect",
  "value": 30,
  "duration": 2,
  "rank": 2
}
```

**Implementation:** `BattleMechanics.applyReflectDamage()`

---

### 11. REGEN
Heal over time (HoT).

**JSON Structure:**
```json
{
  "type": "regen",
  "value": 5,
  "duration": 3,
  "target": "self",
  "rank": 3
}
```

**Implementation:** Processed in `BattleMechanics.processStatusEffects()`
**Timing:** Applied at start of each turn

---

### 12. TURN_PRIORITY
Modify turn order.

**JSON Structure:**
```json
{
  "type": "turn_priority",
  "value": 50,
  "duration": 1,
  "target": "self|enemy",
  "rank": 2
}
```

**Implementation:** `BattleMechanics.setTurnPriority()`
**Behavior:** Higher value = acts first

---

### 13. DAMAGE_REDUCTION
Flat or percentage damage reduction.

**JSON Structure:**
```json
{
  "type": "damage_reduction",
  "value": 20,
  "target": "self",
  "rank": 1
}
```

**Implementation:** Applied before resistance calculation

---

### 14. AOE_SPLASH
Spread attack to additional targets.

**JSON Structure:**
```json
{
  "type": "aoe_splash",
  "percentage": 30,
  "target": "adjacent_enemies",
  "rank": 3
}
```

**Implementation:** `BattleMechanics.applyAOEDamage()`

---

### 15. DAMAGE_IMMUNITY
Complete damage immunity.

**JSON Structure:**
```json
{
  "type": "damage_immunity",
  "duration": 1,
  "target": "self",
  "rank": 3
}
```

**Implementation:** `BattleMechanics.applyDamageImmunity()` & `isDamageImmune()`

---

## Effect Targeting

### Target Types
- `self` - Caster only
- `single_enemy` - One enemy
- `all_enemies` - All enemy targets
- `single_ally` - One ally
- `all_allies` - All ally targets
- `adjacent_enemies` - Nearby enemies (AOE)

---

## Rank System

Powers have 3 ranks. Effects can be rank-specific:

```json
{
  "effects": [
    {"type": "damage", "value": 30, "rank": 1},
    {"type": "damage", "value": 70, "rank": 2},
    {"type": "damage", "value": 130, "rank": 3},
    {"type": "special", "specialType": "pierce_through", "rank": 3}
  ]
}
```

When power is at rank 2, only rank 1 and rank 2 effects apply.
Rank 3 unlocks additional powerful effects.

---

## Cooldown & Energy Cost

Powers with `cooldown` and `energy_cost` fields:

```json
{
  "cooldown": 2,
  "energy_cost": 25
}
```

- **Cooldown:** Turns before power can be used again
- **Energy Cost:** Mana/stamina required to activate

---

## Power Types

- **active:** Must be manually activated (costs energy)
- **passive:** Always active, no cost
- **toggle:** Can be turned on/off

---

## Integration Notes

### battleService.ts Integration
- `calculateDamage()` - Uses `BattleMechanics.calculateDamageWithResistance()`
- `processStatusEffects()` - Uses `BattleMechanics.processStatusEffects()`
- Critical hits - Uses `BattleMechanics.checkAndConsumeForceCritical()`

### Future Integration Needed
- Power activation in battle UI
- Cooldown tracking per battle
- Energy/mana system
- Visual effects for power usage

---

## Examples

### Simple Damage Power
```json
{
  "id": "fireball",
  "effects": [
    {"type": "damage", "value": 50, "damageType": "fire", "target": "single_enemy", "rank": 1},
    {"type": "damage", "value": 100, "damageType": "fire", "target": "single_enemy", "rank": 2},
    {"type": "status_effect", "statusEffect": "burn", "duration": 3, "chance": 50, "rank": 2},
    {"type": "damage", "value": 180, "damageType": "fire", "target": "all_enemies", "rank": 3}
  ]
}
```

### Complex Buff Power
```json
{
  "id": "battle_rage",
  "effects": [
    {"type": "stat_modifier", "stat": "attack", "value": 30, "duration": 3, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "attack", "value": 60, "duration": 3, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "speed", "value": 25, "duration": 3, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "attack", "value": 120, "duration": 3, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "speed", "value": 50, "duration": 3, "target": "self", "rank": 3},
    {"type": "lifesteal", "value": 30, "duration": 3, "rank": 3}
  ]
}
```

---

## Last Updated
Created: 2025-10-27
Status: Active reference for power system implementation
