-- Unified Stat System Migration
-- Renames existing columns and adds missing stat columns

BEGIN;

-- Step 1: Rename existing base_ columns to proper names
ALTER TABLE characters RENAME COLUMN base_health TO health;
ALTER TABLE characters RENAME COLUMN base_attack TO attack;
ALTER TABLE characters RENAME COLUMN base_defense TO defense;
ALTER TABLE characters RENAME COLUMN base_speed TO speed;
ALTER TABLE characters RENAME COLUMN base_special TO magic_attack;
ALTER TABLE characters RENAME COLUMN gameplan_adherence_level TO gameplan_adherence;

-- Step 2: Add magic_defense column (companion to magic_attack)
ALTER TABLE characters ADD COLUMN magic_defense INTEGER DEFAULT 50 NOT NULL;

-- Step 3: Add attribute stat columns
ALTER TABLE characters ADD COLUMN strength INTEGER DEFAULT 50 NOT NULL;
ALTER TABLE characters ADD COLUMN dexterity INTEGER DEFAULT 50 NOT NULL;
ALTER TABLE characters ADD COLUMN stamina INTEGER DEFAULT 50 NOT NULL;
ALTER TABLE characters ADD COLUMN intelligence INTEGER DEFAULT 50 NOT NULL;
ALTER TABLE characters ADD COLUMN wisdom INTEGER DEFAULT 50 NOT NULL;
ALTER TABLE characters ADD COLUMN charisma INTEGER DEFAULT 50 NOT NULL;
ALTER TABLE characters ADD COLUMN spirit INTEGER DEFAULT 50 NOT NULL;

-- Step 4: Add advanced combat stat columns
ALTER TABLE characters ADD COLUMN critical_chance INTEGER DEFAULT 5 NOT NULL;
ALTER TABLE characters ADD COLUMN critical_damage INTEGER DEFAULT 150 NOT NULL;
ALTER TABLE characters ADD COLUMN accuracy INTEGER DEFAULT 85 NOT NULL;
ALTER TABLE characters ADD COLUMN evasion INTEGER DEFAULT 10 NOT NULL;
ALTER TABLE characters ADD COLUMN max_mana INTEGER DEFAULT 100 NOT NULL;
ALTER TABLE characters ADD COLUMN energy_regen INTEGER DEFAULT 10 NOT NULL;

-- Step 5: Initialize new attribute stats based on existing combat stats (reasonable defaults)
-- These formulas give characters differentiated stats based on their existing values
UPDATE characters SET
  strength = FLOOR(attack * 0.8)::INTEGER,
  dexterity = FLOOR((speed + accuracy) * 0.5)::INTEGER,
  stamina = FLOOR(health * 0.4)::INTEGER,
  intelligence = FLOOR(magic_attack * 0.8)::INTEGER,
  wisdom = FLOOR(magic_defense * 0.8)::INTEGER,
  charisma = 50,
  spirit = FLOOR((magic_attack + mental_health) * 0.4)::INTEGER
WHERE strength = 50; -- Only update rows that still have defaults

-- Step 6: Create indexes for frequently queried stats
CREATE INDEX IF NOT EXISTS idx_characters_combat_stats ON characters(health, attack, defense);
CREATE INDEX IF NOT EXISTS idx_characters_attribute_stats ON characters(strength, dexterity, intelligence);
CREATE INDEX IF NOT EXISTS idx_characters_psych_stats ON characters(mental_health, stress_level, gameplan_adherence);

COMMIT;

-- Verify migration
SELECT
  name,
  health, attack, defense, speed, magic_attack, magic_defense,
  strength, dexterity, stamina, intelligence, wisdom, charisma, spirit,
  critical_chance, accuracy, evasion
FROM characters
LIMIT 3;
