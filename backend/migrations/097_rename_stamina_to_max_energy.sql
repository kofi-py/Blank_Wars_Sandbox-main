-- Migration 097: Rename stamina to max_energy in characters table
-- Stamina was incorrectly used for "HP and damage resistance" which overlaps with defense
-- Renaming to max_energy aligns with traditional RPG design and creates the missing column
-- needed for archetype/species/individual modifiers

ALTER TABLE characters RENAME COLUMN stamina TO max_energy;

-- Verify column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'characters' AND column_name = 'max_energy';
