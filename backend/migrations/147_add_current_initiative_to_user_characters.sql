-- Migration 147: Add current_initiative to user_characters
--
-- Architecture:
--   - base_initiative: copied from characters.initiative when user acquires character
--   - current_initiative: generated column factoring in confidence, morale, stress
--
-- Trigger ensures base_initiative is automatically populated on INSERT

BEGIN;

-- 1. Add base_initiative column
ALTER TABLE user_characters
ADD COLUMN IF NOT EXISTS base_initiative INTEGER;

-- 2. Backfill existing user_characters from characters table
UPDATE user_characters uc
SET base_initiative = c.initiative
FROM characters c
WHERE uc.character_id = c.id
AND uc.base_initiative IS NULL;

-- 3. Create trigger function to copy base_initiative on insert
CREATE OR REPLACE FUNCTION copy_base_initiative_from_character()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.base_initiative IS NULL THEN
    SELECT initiative INTO NEW.base_initiative
    FROM characters
    WHERE id = NEW.character_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger (drop first if exists to make idempotent)
DROP TRIGGER IF EXISTS trg_copy_base_initiative ON user_characters;
CREATE TRIGGER trg_copy_base_initiative
BEFORE INSERT ON user_characters
FOR EACH ROW EXECUTE FUNCTION copy_base_initiative_from_character();

-- 5. Add current_initiative generated column
-- Formula: base + confidence bonus + morale bonus - stress penalty
-- confidence_level: 50 = neutral, higher = bonus, lower = penalty
-- morale: 50 = neutral, higher = bonus, lower = penalty
-- stress_level: 0 = no penalty, higher = more penalty
ALTER TABLE user_characters
ADD COLUMN IF NOT EXISTS current_initiative INTEGER GENERATED ALWAYS AS (
  GREATEST(1, ROUND(
    COALESCE(base_initiative, 50) +
    ((COALESCE(confidence_level, 50) - 50) * 0.3) +
    ((COALESCE(morale, 50) - 50) * 0.1) -
    (COALESCE(stress_level, 0) * 0.15)
  ))
) STORED;

-- 6. Create index for turn order sorting
CREATE INDEX IF NOT EXISTS idx_user_characters_current_initiative
ON user_characters(current_initiative DESC);

-- Record migration
INSERT INTO migration_log (version, name)
VALUES (147, '147_add_current_initiative_to_user_characters')
ON CONFLICT (version) DO NOTHING;

COMMIT;
