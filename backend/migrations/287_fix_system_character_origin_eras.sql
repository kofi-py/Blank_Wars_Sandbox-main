-- Migration 287: Fix system character data issues
--
-- Problem 1: 4 system characters have empty origin_era values, causing prompts to show "from null"
-- Problem 2: System characters were incorrectly assigned to headquarters (should be NULL)
--
-- Fix: Populate origin_era values and remove headquarters assignments for system characters

BEGIN;

-- Fix 1: Populate missing origin_era values
UPDATE characters SET origin_era = '19th-20th Century Switzerland (1875-1961)' WHERE name = 'Carl Jung';
UPDATE characters SET origin_era = 'The World of 1883 Pinocchio' WHERE name = 'Seraphina';
UPDATE characters SET origin_era = 'The Nordic Nine Worlds' WHERE name = 'Argock';
UPDATE characters SET origin_era = 'A Future Factory That Mass-Produces Reality Television Hosts' WHERE name = 'Hostmaster v8.72';

-- Fix 2: Remove headquarters assignments from all system characters
-- System characters (therapists, judges, trainers, hosts, real_estate_agents) should NOT be in headquarters
-- Disable trigger that blocks NULL sleeping_arrangement
ALTER TABLE user_characters DISABLE TRIGGER trg_sync_sleeping_mood_modifier;

UPDATE user_characters uc
SET headquarters_id = NULL, sleeping_arrangement = NULL
FROM characters c
WHERE uc.character_id = c.id
  AND c.role IN ('therapist', 'judge', 'trainer', 'host', 'real_estate_agent');

-- Re-enable trigger
ALTER TABLE user_characters ENABLE TRIGGER trg_sync_sleeping_mood_modifier;

COMMIT;

-- Log migration
INSERT INTO migration_log (version, name, description)
VALUES (287, '287_fix_system_character_data', 'Fix origin_era for 4 system characters and remove HQ assignments from all system characters')
ON CONFLICT (version) DO NOTHING;
