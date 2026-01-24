-- Migration 311: Create user_characters for New System Characters
-- Creates user_characters entries for new trainers (athena, popeye) and random mascot for all users

BEGIN;

-- Make combat stats nullable for non-contestants on user_characters
ALTER TABLE user_characters ALTER COLUMN current_health DROP NOT NULL;
ALTER TABLE user_characters ALTER COLUMN current_ego DROP NOT NULL;
ALTER TABLE user_characters ALTER COLUMN current_mental_health DROP NOT NULL;
ALTER TABLE user_characters ALTER COLUMN current_team_player DROP NOT NULL;
ALTER TABLE user_characters ALTER COLUMN current_training DROP NOT NULL;

-- Add constraint: these stats required only for contestants
ALTER TABLE user_characters DROP CONSTRAINT IF EXISTS chk_uc_contestant_stats;
ALTER TABLE user_characters ADD CONSTRAINT chk_uc_contestant_stats
CHECK (
    role != 'contestant' OR (
        current_health IS NOT NULL AND
        current_ego IS NOT NULL AND
        current_mental_health IS NOT NULL AND
        current_team_player IS NOT NULL AND
        current_training IS NOT NULL
    )
);

-- Create user_characters entries for new trainers (athena, popeye) for all existing users
-- Trainers don't need combat stats - those fields stay NULL
INSERT INTO user_characters (
    id, user_id, character_id, nickname, acquired_at, role, trainer_id
)
SELECT
    gen_random_uuid() AS id,
    u.id AS user_id,
    c.id AS character_id,
    c.name AS nickname,
    NOW() AS acquired_at,
    c.role AS role,
    c.id AS trainer_id
FROM users u
CROSS JOIN characters c
WHERE c.id IN ('athena', 'popeye')
AND NOT EXISTS (
    SELECT 1 FROM user_characters uc
    WHERE uc.user_id = u.id AND uc.character_id = c.id
);

-- Create user_characters entries for mascots for all existing users
-- Each user gets one random mascot (different per user)
-- Mascots don't need combat stats - those fields stay NULL
INSERT INTO user_characters (
    id, user_id, character_id, nickname, acquired_at, role, mascot_id
)
SELECT
    gen_random_uuid() AS id,
    u.id AS user_id,
    m.id AS character_id,
    m.name AS nickname,
    NOW() AS acquired_at,
    'mascot' AS role,
    m.id AS mascot_id
FROM users u
CROSS JOIN LATERAL (
    -- Each user gets a different random mascot
    SELECT id, name FROM characters WHERE role = 'mascot' ORDER BY random() LIMIT 1
) m
WHERE NOT EXISTS (
    SELECT 1 FROM user_characters uc
    WHERE uc.user_id = u.id AND uc.role = 'mascot'
);

COMMIT;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (311, '311_create_user_chars_for_new_system_chars')
ON CONFLICT (version) DO NOTHING;
