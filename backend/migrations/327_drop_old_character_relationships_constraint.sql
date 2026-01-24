-- Migration 327: Drop old unique constraint on character_relationships
--
-- PROBLEM: Old unique constraint on (character1_id, character2_id) blocks per-user relationships
-- because multiple users can have the same character pair (e.g., space_cyborg -> cleopatra).
--
-- FIX: Drop the old constraint. Keep the new constraint on (user_character1_id, user_character2_id)
-- which allows per-user relationships.

BEGIN;

DO $$
BEGIN
    RAISE NOTICE 'Migration 327: Dropping old character_relationships unique constraint...';
END $$;

-- Drop the old unique constraint on base character IDs
ALTER TABLE character_relationships
DROP CONSTRAINT IF EXISTS character_relationships_character1_id_character2_id_key;

DO $$
BEGIN
    RAISE NOTICE 'Migration 327 complete: Dropped old unique constraint';
END $$;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (327, '327_drop_old_character_relationships_constraint')
ON CONFLICT (version) DO NOTHING;

COMMIT;
