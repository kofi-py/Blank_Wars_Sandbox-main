-- Migration 124: Update combat stats index to use max_health
-- The health -> max_health rename was done in migration 098
-- This migration updates the index to reflect the new column name

-- Update the index that references the column
DROP INDEX IF EXISTS idx_characters_combat_stats;
CREATE INDEX idx_characters_combat_stats ON characters(max_health, attack, defense);

-- Add comment for clarity
COMMENT ON COLUMN characters.max_health IS 'Maximum health points for this character template. Consistent naming with user_characters.max_health';
