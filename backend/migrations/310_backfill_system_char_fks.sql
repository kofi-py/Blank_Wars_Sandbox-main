-- Migration 310: Backfill System Character FKs on Existing user_characters
-- Sets the new FK columns based on existing role for all system character instances

BEGIN;

-- Backfill the new FK columns based on existing role
-- Each system character gets its corresponding FK set to character_id

UPDATE user_characters uc
SET judge_id = uc.character_id
FROM characters c
WHERE uc.character_id = c.id AND c.role = 'judge';

UPDATE user_characters uc
SET therapist_id = uc.character_id
FROM characters c
WHERE uc.character_id = c.id AND c.role = 'therapist';

UPDATE user_characters uc
SET trainer_id = uc.character_id
FROM characters c
WHERE uc.character_id = c.id AND c.role = 'trainer';

UPDATE user_characters uc
SET host_id = uc.character_id
FROM characters c
WHERE uc.character_id = c.id AND c.role = 'host';

UPDATE user_characters uc
SET real_estate_agent_id = uc.character_id
FROM characters c
WHERE uc.character_id = c.id AND c.role = 'real_estate_agent';

-- Note: mascot_id backfill handled in Migration 311

COMMIT;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (310, '310_backfill_system_char_fks')
ON CONFLICT (version) DO NOTHING;
