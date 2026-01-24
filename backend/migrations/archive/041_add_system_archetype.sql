-- Migration 041: Fix hostmaster to be system character
-- Prevents hostmaster from being selectable by users in packs
-- Follows existing pattern: rarity = NULL, archetype = 'system'

BEGIN;

-- Update hostmaster to match system character pattern (like judges and therapists)
UPDATE characters
SET rarity = NULL, archetype = 'system'
WHERE id = 'hostmaster_v8_72';

-- Verify the update
DO $$
DECLARE
    hostmaster_record RECORD;
    system_char_count INTEGER;
BEGIN
    SELECT rarity, archetype INTO hostmaster_record
    FROM characters
    WHERE id = 'hostmaster_v8_72';

    IF hostmaster_record.rarity IS NOT NULL OR hostmaster_record.archetype != 'system' THEN
        RAISE EXCEPTION 'Hostmaster update failed: rarity=%, archetype=%',
            hostmaster_record.rarity, hostmaster_record.archetype;
    END IF;

    SELECT COUNT(*) INTO system_char_count FROM characters WHERE archetype = 'system';
    RAISE NOTICE 'Total system characters: %', system_char_count;
    RAISE NOTICE 'Expected: 7 (1 hostmaster + 3 judges + 3 therapists)';
END $$;

-- Record migration
INSERT INTO migration_log (version, name) VALUES (41, '041_add_system_archetype') ON CONFLICT (version) DO NOTHING;

COMMIT;
