# Spell System Design Document

## Overview
The spell system provides learnable/unlockable abilities that complement character signature powers. Unlike powers (which are permanent character traits), spells can be equipped/unequipped and swapped between battles.

---

## Spell Tier Structure

### Tier Hierarchy
1. **Common** (White) - Basic spells, easy to learn, low cost
2. **Uncommon** (Green) - Moderate power, requires some progression
3. **Rare** (Blue) - Strong effects, mid-game spells
4. **Epic** (Purple) - Powerful spells, endgame content
5. **Legendary** (Orange/Gold) - Ultimate spells, very rare, game-changing

### Tier Properties

| Tier | Unlock Cost | Learn Time | Mana Cost | Cooldown | Power Level |
|------|------------|------------|-----------|----------|-------------|
| Common | 100 coins | Instant | 10-20 | 1-2 turns | 1x |
| Uncommon | 500 coins | 1 hour | 20-35 | 2-3 turns | 1.5x |
| Rare | 2000 coins | 4 hours | 35-50 | 3-4 turns | 2.5x |
| Epic | 8000 coins | 12 hours | 50-75 | 4-5 turns | 4x |
| Legendary | 25000 coins | 24 hours | 75-100 | 5-6 turns | 7x |

---

## Spell Categories

###  1. Universal Spells
Available to all characters regardless of class/archetype/species.

**Examples:**
- Heal (restore HP)
- Shield (temporary defense boost)
- Haste (increase speed)
- Slow (decrease enemy speed)
- Dispel (remove status effects)

### 2. Class-Specific Spells
Only available to characters of specific classes.

#### Warrior Class
- Weapon Mastery (increase attack)
- Battle Rage (damage boost, defense penalty)
- Second Wind (HP restoration in combat)
- Whirlwind Attack (AOE physical damage)

#### Mage Class
- Fireball (fire damage)
- Ice Lance (ice damage + slow)
- Lightning Bolt (lightning damage + chain)
- Arcane Missiles (magic damage, multi-hit)

#### Scholar Class
- Analyze Weakness (reveal enemy stats, increase crit)
- Tactical Insight (team coordination boost)
- Knowledge is Power (convert intelligence to damage)
- Study (gain temporary stat boost)

#### Tank Class
- Fortify (massive defense increase)
- Taunt (force enemy to attack you)
- Last Stand (invulnerability when low HP)
- Guardian Angel (protect ally, redirect damage)

#### Leader Class
- Rally (team-wide stat boost)
- Inspire (team energy restoration)
- Coordinate Strike (team attack bonus)
- Strategic Retreat (team defensive stance)

#### Trickster Class
- Smoke Bomb (dodge chance increase)
- Poison (damage over time)
- Steal Buffs (take enemy's positive effects)
- Misdirection (redirect attacks)

### 3. Archetype-Specific Spells
Based on character archetype (e.g., Vampire, Deity, Cyborg, etc.)

**Vampire Archetype:**
- Blood Drain (HP steal)
- Bat Swarm (AOE + evasion)
- Hypnotize (control enemy)

**Deity Archetype:**
- Divine Intervention (prevent death once)
- Holy Light (heal + damage undead)
- Smite (massive single-target damage)

**Cyborg Archetype:**
- System Override (ignore debuffs)
- Energy Surge (burst damage)
- Repair Protocol (heal over time)

---

## Spell Mechanics

### Learning System
1. **Discovery**: Spells appear in shop or as battle rewards
2. **Purchase**: Buy spell scroll/tome with coins
3. **Learning**: Spend time to learn (instant for Common, up to 24h for Legendary)
4. **Mastery**: Use spell repeatedly to increase proficiency (optional advanced feature)

### Loadout System
- Characters can equip **5-10 spells** (increases with level)
- Spells can be swapped between battles (not during battle)
- Strategic loadout building encouraged

### Battle Usage
- Spells cost **Mana/Energy** to cast
- Spells have **Cooldowns** (measured in turns)
- Some spells have **Charges** (limited uses per battle)
- Spells can be **Countered** or **Resisted**

---

## Database Schema

### spell_definitions Table
```sql
CREATE TABLE spell_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  flavor_text TEXT,
  tier TEXT NOT NULL CHECK (tier IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  category TEXT NOT NULL CHECK (category IN ('universal', 'class', 'archetype', 'species')),

  -- Restrictions
  restricted_to_class TEXT, -- NULL for universal, class_id for class-specific
  restricted_to_archetype TEXT, -- archetype_id for archetype-specific
  restricted_to_species TEXT, -- species_id for species-specific

  -- Costs & Requirements
  unlock_cost_coins INTEGER NOT NULL,
  learn_time_seconds INTEGER NOT NULL,
  required_level INTEGER DEFAULT 1,

  -- Battle Stats
  mana_cost INTEGER NOT NULL,
  cooldown_turns INTEGER NOT NULL,
  charges_per_battle INTEGER, -- NULL = unlimited (just cooldown)

  -- Effects (JSON)
  effects JSONB NOT NULL, -- damage, healing, buffs, debuffs, etc.

  -- Metadata
  icon TEXT,
  animation TEXT, -- reference to animation/visual effect
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### user_spells Table
```sql
CREATE TABLE user_spells (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id),
  spell_id TEXT NOT NULL REFERENCES spell_definitions(id),

  -- Learning Progress
  is_learned BOOLEAN DEFAULT FALSE,
  learning_started_at TIMESTAMP,
  learned_at TIMESTAMP,

  -- Usage Stats
  times_used INTEGER DEFAULT 0,
  proficiency_level INTEGER DEFAULT 1, -- 1-10 scale
  total_damage_dealt INTEGER DEFAULT 0,
  total_healing_done INTEGER DEFAULT 0,

  -- Metadata
  acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, spell_id)
);
```

### character_spell_loadout Table
```sql
CREATE TABLE character_spell_loadout (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_character_id TEXT NOT NULL REFERENCES user_characters(id),
  spell_id TEXT NOT NULL REFERENCES spell_definitions(id),
  slot_number INTEGER NOT NULL CHECK (slot_number BETWEEN 1 AND 10),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_character_id, slot_number),
  UNIQUE(user_character_id, spell_id) -- Can't equip same spell twice
);
```

---

## Progression Path

### Early Game (Levels 1-10)
- Focus on **Common** universal spells
- Learn 1-2 class-specific Common spells
- Build basic 5-spell loadout

### Mid Game (Levels 11-25)
- Unlock **Uncommon** and **Rare** spells
- Expand loadout to 7-8 spells
- Start specializing into class/archetype spells

### Late Game (Levels 26-40)
- Access to **Epic** spells
- Full 10-spell loadout
- Deep specialization

### Endgame (Level 40+)
- Hunt for **Legendary** spells
- Min-max loadouts for different strategies
- Master spell combinations (combos)

---

## Spell Acquisition Methods

1. **Shop** - Buy from spell vendors
2. **Battle Rewards** - Random drops from victories
3. **Quests** - Complete specific challenges
4. **Level Up** - Unlock spells at certain levels
5. **Special Events** - Limited-time spells
6. **Achievements** - Unlock for accomplishments

---

## Future Enhancements (Post-MVP)

- **Spell Combinations** - Cast certain spells together for bonus effects
- **Spell Crafting** - Create custom variations of spells
- **Spell Mastery** - Increase proficiency to reduce costs/cooldowns
- **Forbidden Spells** - High-risk, high-reward dark magic
- **Elemental Weaknesses** - Rock-paper-scissors for spell types
- **Spell Schools** - Organize spells into magic schools (Evocation, Conjuration, etc.)

---

## Visual Design Notes

- Each tier should have distinct visual styling (colors, particle effects)
- Spell icons should be immediately recognizable
- Cast animations should feel impactful
- Cooldown indicators must be clear and visible
- Mana bar should be prominent during battles

---

## Balance Considerations

- Legendary spells should feel powerful but not game-breaking
- Universal spells provide baseline utility
- Class spells should define playstyle identity
- Loadout building should involve meaningful choices
- Cooldowns prevent spell spam
- Mana costs create resource management gameplay

---

**Status**: Design Complete, Ready for Implementation
**Next Steps**: Create database migrations and start implementing spell definitions
