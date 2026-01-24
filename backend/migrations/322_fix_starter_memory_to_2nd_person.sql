-- Migration 322: Fix starter memory to use 2nd person POV
-- All character-addressing text must use 2nd person for consistency
-- This fixes migration 317 which used 1st person ("I remember")

BEGIN;

DO $$
BEGIN
    RAISE NOTICE 'Migration 322: Converting starter memories from 1st person to 2nd person...';
END $$;

-- Update existing starter memories to 2nd person
UPDATE character_memories
SET content = REPLACE(
    REPLACE(
        REPLACE(
            REPLACE(content,
                'The last thing I remember is going to sleep in',
                'The last thing you remember is going to sleep in'),
            'and then waking up as a contestant on this bizarre reality show. I think I might have been kidnapped but I don''t know who I can trust or ask for help.',
            'and then waking up as a contestant on this bizarre reality show. You think you might have been kidnapped but you don''t know who you can trust or ask for help.'),
        'I remember',
        'You remember'),
    'I think',
    'You think')
WHERE id LIKE 'starter_memory_%';

DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO updated_count FROM character_memories WHERE id LIKE 'starter_memory_%';
    RAISE NOTICE 'Migration 322 complete: Updated % starter memories to 2nd person POV', updated_count;
END $$;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (322, '322_fix_starter_memory_to_2nd_person')
ON CONFLICT (version) DO NOTHING;

COMMIT;
