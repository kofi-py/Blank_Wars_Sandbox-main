-- Migration 086: Backfill teams for users without teams
-- Created: 2025-11-14
-- Purpose: Create teams for existing users who registered before team auto-creation was implemented

DO $$
DECLARE
    user_record RECORD;
    char1_id TEXT;
    char2_id TEXT;
    char3_id TEXT;
    new_team_id UUID;
    new_team_context_id INTEGER;
BEGIN
    -- Loop through all users who don't have teams
    FOR user_record IN
        SELECT u.id, u.username
        FROM users u
        LEFT JOIN teams t ON u.id = t.user_id
        WHERE t.id IS NULL
    LOOP
        RAISE NOTICE 'Processing user: % (%)', user_record.username, user_record.id;

        -- Get the user's first 3 characters
        SELECT
            MAX(CASE WHEN rn = 1 THEN id END),
            MAX(CASE WHEN rn = 2 THEN id END),
            MAX(CASE WHEN rn = 3 THEN id END)
        INTO char1_id, char2_id, char3_id
        FROM (
            SELECT id, ROW_NUMBER() OVER (ORDER BY acquired_at) as rn
            FROM user_characters
            WHERE user_id = user_record.id
            LIMIT 3
        ) chars;

        -- Check if user has at least one character
        IF char1_id IS NULL THEN
            RAISE NOTICE '  ⚠️ User % has no characters, skipping', user_record.username;
            CONTINUE;
        END IF;

        RAISE NOTICE '  Found characters: %, %, %', char1_id, char2_id, char3_id;

        -- Create the team
        INSERT INTO teams (
            user_id,
            team_name,
            character_slot_1,
            character_slot_2,
            character_slot_3,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            user_record.id,
            'Default Team',
            char1_id,
            char2_id,
            char3_id,
            true,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        )
        RETURNING id INTO new_team_id;

        RAISE NOTICE '  ✅ Created team: %', new_team_id;

        -- Create team_context for this team
        INSERT INTO team_context (
            team_id,
            hq_tier,
            current_scene_type,
            current_time_of_day,
            created_at,
            updated_at
        ) VALUES (
            new_team_id,
            'basic_house',
            'mundane',
            'afternoon',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        )
        RETURNING id INTO new_team_context_id;

        RAISE NOTICE '  ✅ Created team_context: %', new_team_context_id;

    END LOOP;

    RAISE NOTICE '✅ Team backfill complete';
END $$;

-- Verify the results
SELECT
    COUNT(*) as total_users,
    COUNT(t.id) as users_with_teams,
    COUNT(*) - COUNT(t.id) as users_without_teams
FROM users u
LEFT JOIN teams t ON u.id = t.user_id;
