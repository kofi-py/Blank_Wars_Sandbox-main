-- Add experience tracking to character_spells to mirror character_powers progression
-- Safe to run multiple times: adds column only if missing and backfills NULLs

ALTER TABLE character_spells
  ADD COLUMN IF NOT EXISTS experience INTEGER NOT NULL DEFAULT 0;

UPDATE character_spells
SET experience = 0
WHERE experience IS NULL;
