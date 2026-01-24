# Database Audit Summary - Stat System Overhaul
**Date:** 2025-11-23
**Status:** Audit Complete

---

## Current Database State

### Existing Tables & Columns

**characters table (template/base):**
```sql
-- From 001 + 006 migrations
id VARCHAR(50) PRIMARY KEY
name, title, archetype, rarity, origin_story, source_material
-- Combat stats (renamed from base_*)
attack INTEGER DEFAULT 100
defense INTEGER DEFAULT 100
speed INTEGER DEFAULT 100
health INTEGER DEFAULT 1000
magic_attack INTEGER DEFAULT 50  -- renamed from base_special
magic_defense INTEGER DEFAULT 50

-- Attributes (added in 006)
strength INTEGER DEFAULT 50
dexterity INTEGER DEFAULT 50
stamina INTEGER DEFAULT 50  ⚠️ NEEDS TO BE RENAMED TO 'endurance'
intelligence INTEGER DEFAULT 50
wisdom INTEGER DEFAULT 50
charisma INTEGER DEFAULT 50
spirit INTEGER DEFAULT 50

-- Advanced combat stats
critical_chance INTEGER DEFAULT 5
critical_damage INTEGER DEFAULT 150
accuracy INTEGER DEFAULT 85
evasion INTEGER DEFAULT 10
max_mana INTEGER DEFAULT 100
energy_regen INTEGER DEFAULT 10

-- Mental/psychological
base_mental_health, base_stress_resistance, base_confidence, base_teamwork
personality_traits, motivations, fears, background_story
```

**user_characters table (instances):**
```sql
-- From 001 + 093 + 116 migrations
id UUID PRIMARY KEY
user_id, character_id
current_level, experience, bond_level

-- Current combat stats
current_attack INTEGER NOT NULL
current_defense INTEGER NOT NULL
current_speed INTEGER NOT NULL
current_max_health INTEGER NOT NULL
current_health INTEGER NOT NULL

-- Mental stats
current_mental_health, stress, confidence, battle_focus
team_trust, strategy_deviation_risk, gameplan_adherence

-- Equipment
equipped_weapon_id, equipped_armor_id, equipped_accessory_id

-- Attribute system (from 116)
attribute_points INTEGER DEFAULT 0
attribute_allocations JSONB DEFAULT '{}'
attribute_pending_survey JSONB

-- Performance tracking
skill_points, training_sessions_completed, battles_participated
total_damage_dealt, critical_hits, etc.
```

---

## Existing Modifier System (Migrations 093 & 099)

### Migration 093: Archetype Modifiers
**Applied to:** `user_characters` table (directly modifies current_* values)
**Method:** Hardcoded UPDATE statements (50 + modifier)

**Archetypes with data:**
- warrior, beast, tank, assassin
- mage, scholar, trickster, detective
- leader, beastmaster, magical_appliance, mystic
- system (no modifiers)

**Fields modified:**
- Combat: current_attack, current_defense, current_speed, current_special, current_max_health
- Resources: max_energy, max_mana
- Mental: current_training, current_mental_health, current_team_player, current_ego, current_communication

### Migration 099: Species Modifiers
**Applied to:** `characters` table (template stats)
**Method:** Hardcoded UPDATE statements (base + modifier)

**Species in migration 099:**
- Common: human, kangaroo, dire_wolf, undead
- Basic: robot, cyborg, golem, dinosaur
- Advanced: human_magical, vampire, unicorn, zeta_reticulan_grey
- Elite: angel, magical_toaster
- Legendary: deity

**Species in our spec (8 species):**
- human ✅
- human_magical ✅
- zeta_reticulan_grey ✅
- robot ✅
- dire_wolf ✅
- deity ✅
- reptilian ❌ (missing from migration 099)
- golem ✅

**Species to remove/ignore:**
- kangaroo, undead, cyborg, dinosaur, vampire, unicorn, angel, magical_toaster

---

## Conflicts & Issues

### 1. ❌ Stamina vs Endurance
- Migration 006 added `stamina` attribute
- Our spec uses `endurance`
- **Action:** Rename stamina → endurance in migration

### 2. ❌ No Modifier Tables
- Current system: Hardcoded UPDATE statements bake modifiers into values
- Our spec: Separate modifier tables with dynamic calculation
- **Action:** Create modifier tables and extract data from migrations 093/099

### 3. ❌ Missing base_* and current_* Split
- `user_characters` only has current_attack, current_defense, current_speed
- Needs all 12 attributes with base_* and current_* versions
- **Action:** Add 24 new columns (12 base_*, 12 current_*)

### 4. ❌ No Battle Stats Table
- **Action:** Create new `battle_stats` table

### 5. ❌ No Calculation Functions
- **Action:** Create calculate_current_attributes() and update_battle_stats() functions

### 6. ❌ Vitals Not Fully Implemented
- Has max_energy, max_mana on user_characters
- Missing: current_energy, current_mana
- **Action:** Add vitals columns

### 7. ❌ No Temporary Buffs System
- **Action:** Add temp_attribute_buffs JSONB column

### 8. ⚠️ Species List Mismatch
- Migration 099 has many species not in our game
- Missing reptilian species
- **Action:** Create new species modifiers for our 8 species only

---

## Migration Strategy

### New Migrations to Create

**Migration 120: Rename stamina to endurance**
```sql
ALTER TABLE characters RENAME COLUMN stamina TO endurance;
```

**Migration 121: Create modifier tables**
```sql
CREATE TABLE universal_attribute_base (...);
CREATE TABLE archetype_attribute_modifiers (...);
CREATE TABLE species_attribute_modifiers (...);
CREATE TABLE signature_attribute_modifiers (...);
```

**Migration 122: Populate modifier tables**
- Extract data from migrations 093 (archetypes) and 099 (species)
- Convert hardcoded modifiers to table rows

**Migration 123: Add base_* and current_* columns to user_characters**
```sql
ALTER TABLE user_characters ADD COLUMN
  base_attack, base_defense, base_speed, ... (12 attributes)
  current_magic_attack, current_magic_defense, ... (missing current_*)
```

**Migration 124: Add vitals and buffs**
```sql
ALTER TABLE user_characters ADD COLUMN
  current_mana, max_mana,
  current_energy, max_energy,
  temp_attribute_buffs JSONB,
  core_points_available INTEGER
```

**Migration 125: Create battle_stats table**

**Migration 126: Create calculation functions**
- calculate_current_attributes()
- update_battle_stats()

**Migration 127: Create triggers**
- Auto-update on base_* or temp_attribute_buffs changes

**Migration 128: Data migration**
- Populate base_* values (reverse-engineer from current values)
- Initialize battle_stats for all characters
- Clean up temp buffs

**Migration 129: Add equipment/power/spell requirements**
```sql
ALTER TABLE equipment ADD COLUMN required_strength, ...
ALTER TABLE powers ADD COLUMN required_intelligence, ...
ALTER TABLE spells ADD COLUMN required_wisdom, ...
```

---

## Data Extraction Plan

### From Migration 093 (Archetype Modifiers)

Convert this pattern:
```sql
UPDATE user_characters SET
  current_attack = 50 + 10,  -- warrior gets +10 attack
  current_defense = 50 + 10  -- warrior gets +10 defense
WHERE archetype = 'warrior';
```

To this data:
```sql
INSERT INTO archetype_attribute_modifiers VALUES
('warrior', 'attack', 10),
('warrior', 'defense', 10);
```

### From Migration 099 (Species Modifiers)

Convert this pattern:
```sql
UPDATE characters SET
  attack = attack + 10  -- human gets +10 attack
WHERE species = 'human';
```

To this data:
```sql
INSERT INTO species_attribute_modifiers VALUES
('human', 'attack', 10);
```

---

## Attributes List (Final)

### 12 Total Attributes (all spendable):

**5 Former Combat Stats:**
1. attack
2. defense
3. speed
4. magic_attack
5. magic_defense

**6 Original Attributes:**
6. strength
7. dexterity
8. intelligence
9. wisdom
10. charisma
11. spirit

**1 New Attribute:**
12. endurance

### Each attribute needs:
- `base_attack` (permanent, from spent attribute points)
- `current_attack` (calculated: universal_base + base + archetype_mod + species_mod + signature_mod + temp_buffs)

---

## Next Steps

1. ✅ Audit complete
2. Create migration 120: Rename stamina → endurance
3. Create migration 121: Modifier tables
4. Create migration 122: Populate modifiers (extract from 093/099)
5. Continue with remaining migrations...

---

**End of Audit**
