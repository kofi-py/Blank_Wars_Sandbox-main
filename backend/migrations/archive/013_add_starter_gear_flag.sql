-- Migration 013: Add starter_gear_given flag to prevent multiple starter gear grants
-- Ensures characters only get starter equipment once when first created

BEGIN;

-- Add starter_gear_given flag to user_characters table
ALTER TABLE user_characters 
ADD COLUMN IF NOT EXISTS starter_gear_given BOOLEAN DEFAULT FALSE;

-- Mark all existing characters as having received starter gear
-- (prevents giving existing characters free gear)
UPDATE user_characters 
SET starter_gear_given = TRUE 
WHERE starter_gear_given IS FALSE;

-- Record migration completion
INSERT INTO migration_log (version, name) VALUES (13, '013_add_starter_gear_flag') ON CONFLICT (version) DO NOTHING;

COMMIT;