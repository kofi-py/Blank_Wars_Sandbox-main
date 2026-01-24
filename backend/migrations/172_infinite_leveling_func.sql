-- Function to get or create level requirement
-- This ensures infinite leveling by generating rows on demand
CREATE OR REPLACE FUNCTION get_or_create_level_requirement(target_level INTEGER)
RETURNS TABLE (
    lvl INTEGER,
    total_xp_req BIGINT,
    stat_pts INTEGER,
    skill_pts INTEGER,
    ability_pts INTEGER,
    t_title VARCHAR
) AS $$
DECLARE
    current_max_level INTEGER;
    current_total_xp BIGINT;
    i INTEGER;
    xp_req BIGINT;
    tier VARCHAR;
    ability_pts_val INTEGER;
BEGIN
    -- 1. Try to find the level directly
    IF EXISTS (SELECT 1 FROM experience_levels WHERE level = target_level) THEN
        RETURN QUERY 
        SELECT level, total_xp_required, stat_points_reward, skill_points_reward, ability_points_reward, tier_title 
        FROM experience_levels 
        WHERE level = target_level;
        RETURN;
    END IF;

    -- 2. If not found, generate levels up to target_level
    -- Get the current highest level
    SELECT level, total_xp_required INTO current_max_level, current_total_xp 
    FROM experience_levels 
    ORDER BY level DESC 
    LIMIT 1;

    -- Safety check: If table is empty (shouldn't happen due to seeding), start from 0
    IF current_max_level IS NULL THEN
        current_max_level := 0;
        current_total_xp := 0;
    END IF;

    -- Loop from next level up to target_level
    FOR i IN (current_max_level + 1)..target_level LOOP
        -- Calculate XP required for this level (Formula: 100 * 1.1^(lvl-2) * (lvl-1)^1.2)
        -- Note: We use the same formula as the seed migration
        xp_req := FLOOR(100 * POWER(1.1, i - 2) * POWER(i - 1, 1.2));
        current_total_xp := current_total_xp + xp_req;

        -- Determine Tier (Legend for > 50)
        IF i <= 10 THEN tier := 'Novice';
        ELSIF i <= 20 THEN tier := 'Apprentice';
        ELSIF i <= 30 THEN tier := 'Adept';
        ELSIF i <= 40 THEN tier := 'Expert';
        ELSIF i <= 50 THEN tier := 'Master';
        ELSE tier := 'Legend';
        END IF;

        -- Determine Ability Points (1 every 5 levels)
        IF i % 5 = 0 THEN ability_pts_val := 1;
        ELSE ability_pts_val := 0;
        END IF;

        -- Insert the new level
        INSERT INTO experience_levels (
            level, 
            total_xp_required, 
            stat_points_reward, 
            skill_points_reward, 
            ability_points_reward, 
            tier_title
        ) VALUES (
            i, 
            current_total_xp, 
            5, -- Standard stat points
            3, -- Standard skill points
            ability_pts_val,
            tier
        );
    END LOOP;

    -- 3. Return the newly created level
    RETURN QUERY 
    SELECT level, total_xp_required, stat_points_reward, skill_points_reward, ability_points_reward, tier_title 
    FROM experience_levels 
    WHERE level = target_level;
END;
$$ LANGUAGE plpgsql;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (172, '172_infinite_leveling_func')
ON CONFLICT (version) DO NOTHING;
