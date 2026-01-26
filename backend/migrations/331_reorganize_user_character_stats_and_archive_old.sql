-- Migration 331: Reorganize user_character stats and archive old table
-- 1. Archive user_characters_old
-- 2. Add base_* columns to user_characters
-- 3. Backfill from attribute_allocations JSONB

BEGIN;

-- 1. ARCHIVE user_characters_old if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_characters_old') THEN
        -- Create archive schema if not exists
        CREATE SCHEMA IF NOT EXISTS archive;
        -- Move table to archive schema
        ALTER TABLE user_characters_old SET SCHEMA archive;
        RAISE NOTICE 'user_characters_old moved to archive schema';
    ELSE
        RAISE NOTICE 'user_characters_old does not exist, skipping archive';
    END IF;
END $$;

-- 2. ADD base_* columns to user_characters
ALTER TABLE user_characters
ADD COLUMN IF NOT EXISTS base_attack INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS base_defense INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS base_speed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS base_max_health INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS base_max_energy INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS base_max_mana INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS base_strength INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS base_endurance INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS base_accuracy INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS base_evasion INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS base_critical_chance INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS base_critical_damage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS base_charisma INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS base_battle_focus INTEGER DEFAULT 0;

-- 3. BACKFILL FROM attribute_allocations JSONB
-- Assuming the keys in JSONB match the attribute names
UPDATE user_characters
SET
    base_attack = COALESCE((attribute_allocations->>'attack')::integer, 0),
    base_defense = COALESCE((attribute_allocations->>'defense')::integer, 0),
    base_speed = COALESCE((attribute_allocations->>'speed')::integer, 0),
    base_max_health = COALESCE((attribute_allocations->>'max_health')::integer, 0),
    base_max_energy = COALESCE((attribute_allocations->>'max_energy')::integer, 0),
    base_max_mana = COALESCE((attribute_allocations->>'max_mana')::integer, 0),
    base_strength = COALESCE((attribute_allocations->>'strength')::integer, 0),
    base_endurance = COALESCE((attribute_allocations->>'endurance')::integer, 0),
    base_accuracy = COALESCE((attribute_allocations->>'accuracy')::integer, 0),
    base_evasion = COALESCE((attribute_allocations->>'evasion')::integer, 0),
    base_critical_chance = COALESCE((attribute_allocations->>'critical_chance')::integer, 0),
    base_critical_damage = COALESCE((attribute_allocations->>'critical_damage')::integer, 0),
    base_charisma = COALESCE((attribute_allocations->>'charisma')::integer, 0),
    base_battle_focus = COALESCE((attribute_allocations->>'battle_focus')::integer, 0);

-- Log migration
INSERT INTO migration_log (version, description)
VALUES ('331', 'Archive user_characters_old and add base_* columns to user_characters')
ON CONFLICT (version) DO UPDATE SET description = EXCLUDED.description;

COMMIT;
