-- Migration 317: Add starter memory for characters with no memories
-- This ensures every character has at least one memory for the EventContextService
-- Uses 2nd person POV for consistency with all character-addressing text

BEGIN;

DO $$
BEGIN
    RAISE NOTICE 'Migration 317: Adding starter memories for characters without memories...';
END $$;

INSERT INTO character_memories (
    id,
    character_id,
    content,
    emotion_type,
    intensity,
    valence,
    importance,
    created_at,
    tags
)
SELECT
    'starter_memory_' || uc.id::text,
    uc.id::text,
    'The last thing you remember is going to sleep in ' || c.origin_era || ' and then waking up as a contestant on this bizarre reality show. You think you might have been kidnapped but you don''t know who you can trust or ask for help.',
    'confusion',
    7,
    3,
    10,
    NOW(),
    ARRAY['starter', 'origin', 'displacement']
FROM user_characters uc
JOIN characters c ON uc.character_id = c.id
WHERE NOT EXISTS (
    SELECT 1 FROM character_memories cm WHERE cm.character_id = uc.id::text
);

DO $$
DECLARE
    inserted_count INTEGER;
BEGIN
    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    RAISE NOTICE 'Migration 317 complete: Added % starter memories', inserted_count;
END $$;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (317, '317_add_starter_memory')
ON CONFLICT (version) DO NOTHING;

COMMIT;
