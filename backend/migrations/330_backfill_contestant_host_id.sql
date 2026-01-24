-- Migration 330: Backfill host_id on contestant user_characters
--
-- PROBLEM: Registration flow was not setting host_id on contestant characters.
-- Confessional and other features require host_id to be set.
--
-- FIX: Set each contestant's host_id to their user's assigned host character.
-- NOTE: User 492e11a9-a2c5-4ce7-ab97-5befb357167e was manually fixed prior to this migration.

BEGIN;

DO $$
BEGIN
    RAISE NOTICE 'Migration 330: Backfilling host_id on contestant user_characters...';
END $$;

-- Log contestants that already have host_id set
DO $$
DECLARE
    rec RECORD;
    count_already_set INTEGER := 0;
BEGIN
    FOR rec IN
        SELECT uc.id, uc.user_id, uc.character_id, uc.host_id
        FROM user_characters uc
        JOIN characters c ON uc.character_id = c.id
        WHERE c.role = 'contestant' AND uc.host_id IS NOT NULL
    LOOP
        RAISE NOTICE 'ALREADY SET: user_char=%, character=%, host=%', rec.id, rec.character_id, rec.host_id;
        count_already_set := count_already_set + 1;
    END LOOP;
    RAISE NOTICE 'Total contestants with host_id already set: %', count_already_set;
END $$;

-- Log contestants that will be fixed
DO $$
DECLARE
    rec RECORD;
    count_missing INTEGER := 0;
BEGIN
    FOR rec IN
        SELECT uc.id, uc.user_id, uc.character_id
        FROM user_characters uc
        JOIN characters c ON uc.character_id = c.id
        WHERE c.role = 'contestant' AND uc.host_id IS NULL
    LOOP
        RAISE NOTICE 'WILL FIX: user_char=%, character=%', rec.id, rec.character_id;
        count_missing := count_missing + 1;
    END LOOP;
    RAISE NOTICE 'Total contestants missing host_id: %', count_missing;
END $$;

-- Backfill host_id for all contestants missing it
WITH user_hosts AS (
    SELECT DISTINCT uc.user_id, uc.character_id as host_character_id
    FROM user_characters uc
    JOIN characters c ON uc.character_id = c.id
    WHERE c.role = 'host'
)
UPDATE user_characters uc
SET host_id = uh.host_character_id
FROM characters c, user_hosts uh
WHERE uc.character_id = c.id
  AND c.role = 'contestant'
  AND uc.user_id = uh.user_id
  AND uc.host_id IS NULL;

DO $$
BEGIN
    RAISE NOTICE 'Migration 330 complete: Backfilled host_id on contestant user_characters';
END $$;

INSERT INTO migration_log (version, name)
VALUES (330, '330_backfill_contestant_host_id')
ON CONFLICT (version) DO NOTHING;

COMMIT;
