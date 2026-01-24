-- Update initiative to use weighted formula from battleMechanicsService
-- Old formula: speed + dexterity
-- New formula: FLOOR(speed + (dexterity * 0.5) + (intelligence * 0.2) + (wisdom * 0.2) + (spirit * 0.1))
-- This makes the database the single source of truth for initiative calculation

BEGIN;

-- Drop the old initiative column
ALTER TABLE characters DROP COLUMN IF EXISTS initiative;

-- Add the new initiative column with weighted formula
ALTER TABLE characters
ADD COLUMN initiative INTEGER GENERATED ALWAYS AS (
  FLOOR(
    COALESCE(speed, 0) +
    (COALESCE(dexterity, 0) * 0.5) +
    (COALESCE(intelligence, 0) * 0.2) +
    (COALESCE(wisdom, 0) * 0.2) +
    (COALESCE(spirit, 0) * 0.1)
  )::INTEGER
) STORED;

-- Recreate index for sorting by initiative
DROP INDEX IF EXISTS idx_characters_initiative;
CREATE INDEX idx_characters_initiative ON characters(initiative DESC);

-- Record migration
INSERT INTO migration_log (version, name) VALUES (145, '145_update_initiative_formula') ON CONFLICT (version) DO NOTHING;

COMMIT;
