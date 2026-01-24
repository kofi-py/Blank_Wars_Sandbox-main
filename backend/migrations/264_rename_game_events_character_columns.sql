-- Migration 264: Consolidate game_events character columns into single array
--
-- Changes:
--   primary_character_id (VARCHAR) + secondary_character_ids (TEXT[])
--   → userchar_ids (UUID[])
--
-- All involved characters in one flat array - no hierarchy, no "primary" vs "secondary".

BEGIN;

-- Step 1: Add new consolidated column
ALTER TABLE game_events
  ADD COLUMN userchar_ids UUID[];

-- Step 2: Migrate data - combine primary and secondary into single array
UPDATE game_events
SET userchar_ids = (
  CASE
    WHEN secondary_character_ids IS NULL OR array_length(secondary_character_ids, 1) IS NULL
    THEN ARRAY[primary_character_id::uuid]
    ELSE ARRAY[primary_character_id::uuid] || ARRAY(SELECT unnest(secondary_character_ids)::uuid)
  END
);

-- Step 3: Make the new column NOT NULL (all events must have at least one character)
ALTER TABLE game_events
  ALTER COLUMN userchar_ids SET NOT NULL;

-- Step 4: Drop old columns and indexes
DROP INDEX IF EXISTS idx_game_events_primary_char;
ALTER TABLE game_events DROP COLUMN primary_character_id;
ALTER TABLE game_events DROP COLUMN secondary_character_ids;

-- Step 5: Create GIN index for efficient array queries (find events involving any character)
CREATE INDEX idx_game_events_userchar_ids ON game_events USING GIN (userchar_ids);

-- Record the migration
INSERT INTO migration_log (version, name)
VALUES (264, '264_consolidate_game_events_userchar_ids')
ON CONFLICT (version) DO NOTHING;

COMMIT;
