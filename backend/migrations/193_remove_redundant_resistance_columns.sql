-- Migration 193: Remove redundant resistance columns
-- physical_resistance and magical_resistance are consolidated into defense and magic_defense
-- The 4 elemental resistances (fire, cold, lightning, toxic) handle elemental damage

BEGIN;

-- Remove from characters table
ALTER TABLE characters DROP COLUMN IF EXISTS physical_resistance;
ALTER TABLE characters DROP COLUMN IF EXISTS magical_resistance;

-- Remove from user_characters table
ALTER TABLE user_characters DROP COLUMN IF EXISTS current_physical_resistance;
ALTER TABLE user_characters DROP COLUMN IF EXISTS current_magical_resistance;

COMMIT;

-- Verification
SELECT 'Removed redundant resistance columns' AS status;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (193, '193_remove_redundant_resistance_columns')
ON CONFLICT (version) DO NOTHING;
