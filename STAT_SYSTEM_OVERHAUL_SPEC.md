# Stat System Overhaul - Complete Specification
**Date:** 2025-11-23
**Status:** Design Complete - Ready for Implementation
**Impact:** MASSIVE - Complete restructuring of character attribute system

---

## Executive Summary

**The Problem:**
- Two parallel stat systems fighting each other (attributes in `characters` table, combat stats in `user_characters` table)
- Inconsistent data structures with fallbacks masking bugs
- Combat stats calculated but not spendable by players
- No clear distinction between permanent stats and temporary buffs

**The Solution:**
Flatten combat stats into the attribute system, creating a unified stat model with four-tier modifiers and automatic recalculation.

---

## Core Design Decisions

### 1. Attribute Unification (The "Flattening")

**Before (Two Systems):**
```sql
-- characters table
strength, dexterity, intelligence, wisdom, charisma, spirit

-- user_characters table
current_attack, current_defense, current_speed
```

**After (One Unified System):**
```sql
-- All are attributes players can spend points on:
attack, defense, speed, magic_attack, magic_defense,     -- Former combat stats
strength, dexterity, intelligence, wisdom, charisma, spirit,  -- Original attributes
endurance                                                  -- New attribute
```

**Total: 12 spendable attributes**

---

## Complete Attribute List

| Attribute | Source | Description |
|-----------|--------|-------------|
| `attack` | Former combat stat | Physical attack power, combat technique |
| `defense` | Former combat stat | Physical defensive ability |
| `speed` | Former combat stat | Movement speed, initiative |
| `magic_attack` | Former combat stat | Magical damage output |
| `magic_defense` | Former combat stat | Magical resistance |
| `strength` | Original attribute | Raw physical power, damage modifier |
| `endurance` | **NEW** | Physical toughness, resistance, stamina |
| `dexterity` | Original attribute | Agility, accuracy, evasion, critical chance |
| `intelligence` | Original attribute | Magical power, spell effectiveness |
| `wisdom` | Original attribute | Insight, magical resistance modifier |
| `charisma` | Original attribute | Social influence, inspiration |
| `spirit` | Original attribute | Spiritual power, special abilities |

---

## Vitals System (Resource Pools)

**NOT attributes - these are resource pools with current/max values:**

- **Health** (HP) - Survival resource
- **Mana** - Magic casting fuel
- **Energy** - Physical action fuel

### Hybrid Growth System

**Every Level (Automatic - Archetype-based):**
```
Warrior:    +15 HP, +3 mana, +5 energy
Mage:       +8 HP,  +12 mana, +3 energy
Trickster:  +10 HP, +5 mana,  +8 energy
Tank:       +18 HP, +2 mana,  +4 energy
Berserker:  +12 HP, +3 mana,  +10 energy
```

**Every 3rd Level (3, 6, 9, 12...) - Core Points:**
- Level 3: 1 core point
- Level 6: 2 core points
- Level 9: 3 core points
- Level 12: 4 core points

Players spend core points on vitals:
- 1 core point = +20 max_health OR +15 max_mana OR +15 max_energy

---

## Four-Tier Modifier System

### Tier 1: Universal Base (50)
All attributes start at base 50 for all characters.

```sql
CREATE TABLE universal_attribute_base (
  attribute_name VARCHAR(50) PRIMARY KEY,
  base_value INTEGER NOT NULL DEFAULT 50
);
```

### Tier 2: Archetype Modifiers
Class-based bonuses/penalties applied to all characters of that archetype.

```sql
CREATE TABLE archetype_attribute_modifiers (
  archetype VARCHAR(50) NOT NULL,
  attribute_name VARCHAR(50) NOT NULL,
  modifier INTEGER NOT NULL,
  PRIMARY KEY (archetype, attribute_name)
);
```

**Example Data (from existing migration 093):**
```sql
-- Warrior
('warrior', 'attack', +10)
('warrior', 'defense', +10)
('warrior', 'strength', +5)
('warrior', 'magic_attack', -15)

-- Mage
('mage', 'magic_attack', +15)
('mage', 'intelligence', +10)
('mage', 'attack', -10)
('mage', 'endurance', -5)
```

### Tier 3: Species Modifiers
Racial/species bonuses applied to all characters of that species.

```sql
CREATE TABLE species_attribute_modifiers (
  species VARCHAR(50) NOT NULL,
  attribute_name VARCHAR(50) NOT NULL,
  modifier INTEGER NOT NULL,
  PRIMARY KEY (species, attribute_name)
);
```

**Actual Game Species:**
- human
- human_magical
- zeta_reticulan_grey
- robot
- dire_wolf
- deity
- reptilian
- golem

**Example Data (needs to be populated based on game lore):**
```sql
('human', 'endurance', +5)
('robot', 'defense', +20)
('robot', 'endurance', +15)
('dire_wolf', 'attack', +20)
('dire_wolf', 'speed', +15)
('deity', 'magic_attack', +25)
('golem', 'strength', +25)
('golem', 'endurance', +30)
('golem', 'speed', -20)
```

### Tier 4: Signature/Individual Modifiers
Character-specific legendary traits and unique bonuses.

```sql
CREATE TABLE signature_attribute_modifiers (
  character_id VARCHAR(50) NOT NULL REFERENCES characters(id),
  attribute_name VARCHAR(50) NOT NULL,
  modifier INTEGER NOT NULL,
  source VARCHAR(100),
  PRIMARY KEY (character_id, attribute_name, source)
);
```

**Example Data:**
```sql
('achilles', 'attack', +5, 'legendary_warrior')
('achilles', 'speed', +3, 'swift_footed')
('merlin', 'magic_attack', +8, 'archmage')
('sun_wukong', 'dexterity', +10, 'monkey_king_agility')
```

---

## Database Schema Changes

### user_characters Table Changes

```sql
ALTER TABLE user_characters ADD COLUMN

-- BASE ATTRIBUTES (permanent, increased by spending attribute points)
base_attack INTEGER NOT NULL DEFAULT 0,
base_defense INTEGER NOT NULL DEFAULT 0,
base_speed INTEGER NOT NULL DEFAULT 0,
base_magic_attack INTEGER NOT NULL DEFAULT 0,
base_magic_defense INTEGER NOT NULL DEFAULT 0,
base_strength INTEGER NOT NULL DEFAULT 0,
base_endurance INTEGER NOT NULL DEFAULT 0,
base_dexterity INTEGER NOT NULL DEFAULT 0,
base_intelligence INTEGER NOT NULL DEFAULT 0,
base_wisdom INTEGER NOT NULL DEFAULT 0,
base_charisma INTEGER NOT NULL DEFAULT 0,
base_spirit INTEGER NOT NULL DEFAULT 0,

-- CURRENT ATTRIBUTES (calculated: base + all 4 tiers + temp buffs)
current_attack INTEGER NOT NULL DEFAULT 50,
current_defense INTEGER NOT NULL DEFAULT 50,
current_speed INTEGER NOT NULL DEFAULT 50,
current_magic_attack INTEGER NOT NULL DEFAULT 50,
current_magic_defense INTEGER NOT NULL DEFAULT 50,
current_strength INTEGER NOT NULL DEFAULT 50,
current_endurance INTEGER NOT NULL DEFAULT 50,
current_dexterity INTEGER NOT NULL DEFAULT 50,
current_intelligence INTEGER NOT NULL DEFAULT 50,
current_wisdom INTEGER NOT NULL DEFAULT 50,
current_charisma INTEGER NOT NULL DEFAULT 50,
current_spirit INTEGER NOT NULL DEFAULT 50,

-- VITALS (resource pools)
current_health INTEGER NOT NULL,
max_health INTEGER NOT NULL,
current_mana INTEGER NOT NULL DEFAULT 0,
max_mana INTEGER NOT NULL DEFAULT 0,
current_energy INTEGER NOT NULL DEFAULT 0,
max_energy INTEGER NOT NULL DEFAULT 0,

-- TEMPORARY BUFFS (expires, from coaching/items/spells)
temp_attribute_buffs JSONB DEFAULT '[]'::jsonb,
-- Format: [{"attribute": "attack", "value": 10, "source": "coaching", "expires_at": "2025-11-25T10:00:00Z"}]

-- ATTRIBUTE POINTS
attribute_points_available INTEGER DEFAULT 0,
core_points_available INTEGER DEFAULT 0,

-- TRACKING
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
```

**Remove (deprecated fields):**
- `current_attack` (old version - conflicts with new schema)
- `current_defense` (old version)
- `current_speed` (old version)
- Any `max_health` without `current_` prefix

---

## Battle Stats Table (Composite Calculations)

These are **derived composites** showing the breakdown of final battle effectiveness.

```sql
CREATE TABLE battle_stats (
  user_character_id UUID PRIMARY KEY REFERENCES user_characters(id) ON DELETE CASCADE,

  -- PHYSICAL COMBAT
  physical_damage INTEGER NOT NULL,      -- current_attack + current_strength
  physical_resistance INTEGER NOT NULL,  -- current_defense + current_endurance

  -- MAGICAL COMBAT
  magic_damage INTEGER NOT NULL,         -- current_magic_attack + current_intelligence
  magic_resistance INTEGER NOT NULL,     -- current_magic_defense + current_wisdom

  -- DERIVED COMBAT STATS
  accuracy INTEGER NOT NULL,             -- Based on current_dexterity
  evasion INTEGER NOT NULL,              -- Based on current_speed + (current_dexterity / 2)
  critical_chance INTEGER NOT NULL,      -- Based on current_dexterity / 10
  initiative INTEGER NOT NULL,           -- Based on current_speed + current_dexterity

  -- METADATA
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT valid_battle_stats CHECK (
    physical_damage >= 0 AND
    magic_damage >= 0 AND
    physical_resistance >= 0 AND
    magic_resistance >= 0 AND
    accuracy >= 0 AND
    evasion >= 0 AND
    critical_chance >= 0 AND
    critical_chance <= 100
  )
);
```

**Formulas:**
```
physical_damage = current_attack + current_strength
physical_resistance = current_defense + current_endurance
magic_damage = current_magic_attack + current_intelligence
magic_resistance = current_magic_defense + current_wisdom
accuracy = current_dexterity
evasion = current_speed + (current_dexterity / 2)
critical_chance = current_dexterity / 10  (max 100%)
initiative = current_speed + current_dexterity
```

---

## Calculation Flow

### On Character Creation
```
1. Universal base (50) for all attributes
2. + Archetype modifiers (from archetype_attribute_modifiers)
3. + Species modifiers (from species_attribute_modifiers)
4. + Signature modifiers (from signature_attribute_modifiers)
5. = Starting current_* values (with base_* all at 0)
```

### When Player Spends Attribute Point
```
1. Decrement attribute_points_available
2. Increment chosen base_* attribute (e.g., base_attack += 1)
3. TRIGGER recalculates current_attack = universal_base + base_attack + archetype_mod + species_mod + signature_mod + temp_buffs
4. TRIGGER updates battle_stats table
```

### When Temporary Buff Added (coaching, item, spell)
```
1. Add to temp_attribute_buffs JSONB array
2. TRIGGER recalculates affected current_* attribute
3. TRIGGER updates battle_stats table
```

### When Temporary Buff Expires
```
1. Remove from temp_attribute_buffs array (where expires_at < NOW())
2. TRIGGER recalculates affected current_* attribute
3. TRIGGER updates battle_stats table
```

---

## Auto-Update System (Database Triggers)

### Function: Calculate Current Attributes

```sql
CREATE OR REPLACE FUNCTION calculate_current_attributes(p_user_character_id UUID)
RETURNS void AS $$
DECLARE
  v_character_id VARCHAR(50);
  v_archetype VARCHAR(50);
  v_species VARCHAR(50);
BEGIN
  -- Get character metadata
  SELECT uc.character_id, c.archetype, c.species
  INTO v_character_id, v_archetype, v_species
  FROM user_characters uc
  JOIN characters c ON c.id = uc.character_id
  WHERE uc.id = p_user_character_id;

  -- Update ALL current_* attributes
  UPDATE user_characters uc SET
    current_attack = (
      50 + -- universal base
      base_attack + -- points spent
      COALESCE((SELECT modifier FROM archetype_attribute_modifiers
                WHERE archetype = v_archetype AND attribute_name = 'attack'), 0) +
      COALESCE((SELECT modifier FROM species_attribute_modifiers
                WHERE species = v_species AND attribute_name = 'attack'), 0) +
      COALESCE((SELECT SUM(modifier) FROM signature_attribute_modifiers
                WHERE character_id = v_character_id AND attribute_name = 'attack'), 0) +
      COALESCE((SELECT SUM((buff->>'value')::INTEGER)
                FROM jsonb_array_elements(temp_attribute_buffs) AS buff
                WHERE buff->>'attribute' = 'attack'
                AND (buff->>'expires_at')::TIMESTAMP > NOW()), 0)
    ),
    -- Repeat for all 12 attributes: defense, speed, magic_attack, magic_defense,
    -- strength, endurance, dexterity, intelligence, wisdom, charisma, spirit

    updated_at = NOW()
  WHERE id = p_user_character_id;
END;
$$ LANGUAGE plpgsql;
```

### Function: Update Battle Stats

```sql
CREATE OR REPLACE FUNCTION update_battle_stats(p_user_character_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO battle_stats (
    user_character_id,
    physical_damage,
    physical_resistance,
    magic_damage,
    magic_resistance,
    accuracy,
    evasion,
    critical_chance,
    initiative
  )
  SELECT
    id,
    current_attack + current_strength AS physical_damage,
    current_defense + current_endurance AS physical_resistance,
    current_magic_attack + current_intelligence AS magic_damage,
    current_magic_defense + current_wisdom AS magic_resistance,
    current_dexterity AS accuracy,
    current_speed + (current_dexterity / 2) AS evasion,
    LEAST(current_dexterity / 10, 100) AS critical_chance,
    current_speed + current_dexterity AS initiative
  FROM user_characters
  WHERE id = p_user_character_id
  ON CONFLICT (user_character_id) DO UPDATE SET
    physical_damage = EXCLUDED.physical_damage,
    physical_resistance = EXCLUDED.physical_resistance,
    magic_damage = EXCLUDED.magic_damage,
    magic_resistance = EXCLUDED.magic_resistance,
    accuracy = EXCLUDED.accuracy,
    evasion = EXCLUDED.evasion,
    critical_chance = EXCLUDED.critical_chance,
    initiative = EXCLUDED.initiative,
    calculated_at = NOW();
END;
$$ LANGUAGE plpgsql;
```

### Trigger: Auto-Update on Changes

```sql
CREATE OR REPLACE FUNCTION trigger_update_attributes()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate current_* attributes from base + modifiers + buffs
  PERFORM calculate_current_attributes(NEW.id);

  -- Update battle_stats composites
  PERFORM update_battle_stats(NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_attributes_on_change
  AFTER UPDATE OF
    base_attack, base_defense, base_speed,
    base_magic_attack, base_magic_defense,
    base_strength, base_endurance, base_dexterity,
    base_intelligence, base_wisdom, base_charisma, base_spirit,
    temp_attribute_buffs
  ON user_characters
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_attributes();
```

---

## Equipment/Power/Spell Requirements

### Equipment Table Updates

```sql
ALTER TABLE equipment ADD COLUMN
  -- Existing
  required_level INTEGER,
  required_archetype VARCHAR(50),

  -- NEW: Attribute requirements
  required_attack INTEGER,
  required_defense INTEGER,
  required_strength INTEGER,
  required_endurance INTEGER,
  required_dexterity INTEGER,
  required_intelligence INTEGER,
  required_wisdom INTEGER,
  required_magic_attack INTEGER,
  required_spirit INTEGER;
```

**Example:**
```sql
-- Excalibur legendary sword
required_strength = 50,
required_attack = 40,
required_level = 10

-- Archmage Staff
required_intelligence = 60,
required_magic_attack = 50,
required_wisdom = 40
```

### Powers/Spells Table Updates

```sql
ALTER TABLE powers ADD COLUMN
  required_level INTEGER,
  required_attack INTEGER,
  required_strength INTEGER,
  required_intelligence INTEGER,
  required_spirit INTEGER,
  required_magic_attack INTEGER;

ALTER TABLE spells ADD COLUMN
  required_level INTEGER,
  required_intelligence INTEGER,
  required_wisdom INTEGER,
  required_magic_attack INTEGER,
  required_spirit INTEGER;
```

**Unlocking Logic:**
Check `current_*` values (includes temp buffs) for requirements:
```typescript
function canUnlockPower(character: UserCharacter, power: Power): boolean {
  return (
    character.level >= (power.required_level || 0) &&
    character.current_strength >= (power.required_strength || 0) &&
    character.current_intelligence >= (power.required_intelligence || 0) &&
    character.current_spirit >= (power.required_spirit || 0)
    // ... etc
  );
}
```

This allows strategic buffing before attempting to unlock abilities!

---

## Frontend Type Updates

### Contestant Interface (shared/types)

```typescript
export interface Contestant {
  id: string;
  character_id: string;
  user_id: string;

  // Base attributes (permanent)
  base_attack: number;
  base_defense: number;
  base_speed: number;
  base_magic_attack: number;
  base_magic_defense: number;
  base_strength: number;
  base_endurance: number;
  base_dexterity: number;
  base_intelligence: number;
  base_wisdom: number;
  base_charisma: number;
  base_spirit: number;

  // Current attributes (calculated, includes buffs)
  current_attack: number;
  current_defense: number;
  current_speed: number;
  current_magic_attack: number;
  current_magic_defense: number;
  current_strength: number;
  current_endurance: number;
  current_dexterity: number;
  current_intelligence: number;
  current_wisdom: number;
  current_charisma: number;
  current_spirit: number;

  // Vitals
  current_health: number;
  max_health: number;
  current_mana: number;
  max_mana: number;
  current_energy: number;
  max_energy: number;

  // Buffs
  temp_attribute_buffs: TemporaryBuff[];

  // Points
  attribute_points_available: number;
  core_points_available: number;

  // Other existing fields...
  level: number;
  experience: number;
  archetype: string;
  species: string;
  // ...
}

export interface TemporaryBuff {
  attribute: string;  // 'attack', 'strength', etc.
  value: number;
  source: string;     // 'coaching', 'equipment', 'spell', 'consumable'
  expires_at: string; // ISO timestamp
}

export interface BattleStats {
  user_character_id: string;
  physical_damage: number;
  physical_resistance: number;
  magic_damage: number;
  magic_resistance: number;
  accuracy: number;
  evasion: number;
  critical_chance: number;
  initiative: number;
  calculated_at: string;
}
```

---

## Migration Strategy

### Phase 1: Add New Tables
1. Create modifier tables (universal, archetype, species, signature)
2. Create battle_stats table
3. Populate base data

### Phase 2: Extend user_characters
1. Add base_* columns (default 0)
2. Add new current_* columns (endurance, magic_attack, magic_defense, etc.)
3. Add temp_attribute_buffs JSONB
4. Add vitals columns if missing
5. Add points columns

### Phase 3: Migrate Existing Data
1. Copy current combat stats to appropriate current_* fields
2. Calculate initial base_* values by reverse-engineering modifiers
3. Initialize temp_attribute_buffs as empty array

### Phase 4: Create Functions & Triggers
1. Create calculate_current_attributes function
2. Create update_battle_stats function
3. Create triggers for auto-update
4. Initialize battle_stats for all existing characters

### Phase 5: Remove Old Fields
1. Drop deprecated columns (old current_attack if conflicting)
2. Clean up old stat calculation code

### Phase 6: Update Application Code
1. Update TypeScript interfaces
2. Remove all fallbacks (|| 0, ?., etc.)
3. Update battle engines to use new battle_stats
4. Update UI to show base vs current values
5. Add attribute point spending UI
6. Add temp buff display

---

## Benefits of This System

✅ **Single Source of Truth** - All stats flow from one unified attribute system
✅ **No Fallbacks Needed** - Database guarantees all values exist (NOT NULL)
✅ **Transparent Calculations** - Clear four-tier modifier chain
✅ **Strategic Depth** - Players invest in 12 distinct attributes
✅ **Flexible Buffing** - Coaching, items, spells add temporary boosts
✅ **Automatic Sync** - Triggers keep everything up-to-date
✅ **Requirements System** - Equipment/powers gate on attribute thresholds
✅ **Battle Clarity** - Composite stats show damage breakdown
✅ **Scalable** - Easy to add new modifiers or attributes

---

## Next Steps

1. Review and approve this specification
2. Create implementation TODO list
3. Write migration SQL files
4. Update TypeScript types
5. Implement database changes
6. Update application code
7. Test thoroughly
8. Deploy

---

**End of Specification**
