-- Migration 098: Add missing stat columns to characters table
-- This migration adds columns that are referenced in subsequent archetype/species modifiers
-- but were never created in the initial schema

BEGIN;

-- Add endurance column (used for stamina/durability in combat)
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS endurance INTEGER NOT NULL DEFAULT 50;

-- Rename health to max_health (more accurate naming convention)
-- This column stores the maximum health value for the character
ALTER TABLE characters
RENAME COLUMN health TO max_health;

-- Add check constraint for endurance
ALTER TABLE characters
ADD CONSTRAINT characters_endurance_check
CHECK (endurance >= 0);

COMMIT;

-- Log this migration
INSERT INTO migration_log (version, name) VALUES (98, '098_add_missing_stat_columns') ON CONFLICT (version) DO NOTHING;

-- Verify columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'characters'
  AND column_name IN ('endurance', 'max_health')
ORDER BY column_name;
