-- Function to get or create coach level requirement
-- Ensures infinite leveling for coaches
CREATE OR REPLACE FUNCTION get_or_create_coach_level_requirement(target_level INTEGER)
RETURNS TABLE (
    lvl INTEGER,
    total_xp_req BIGINT,
    skill_pts INTEGER,
    c_title VARCHAR,
    c_tier VARCHAR
) AS $$
DECLARE
    current_max_level INTEGER;
    current_total_xp BIGINT;
    i INTEGER;
    xp_req BIGINT;
    new_title VARCHAR;
    new_tier VARCHAR;
BEGIN
    -- 1. Try to find the level directly
    IF EXISTS (SELECT 1 FROM coach_experience_levels WHERE level = target_level) THEN
        RETURN QUERY 
        SELECT level, total_xp_required, skill_points_reward, title, tier 
        FROM coach_experience_levels 
        WHERE level = target_level;
        RETURN;
    END IF;

    -- 2. If not found, generate levels up to target_level
    SELECT level, total_xp_required INTO current_max_level, current_total_xp 
    FROM coach_experience_levels 
    ORDER BY level DESC 
    LIMIT 1;

    IF current_max_level IS NULL THEN
        current_max_level := 0;
        current_total_xp := 0;
    END IF;

    FOR i IN (current_max_level + 1)..target_level LOOP
        -- Calculate XP required (Same balanced formula: 500 + 100 * level)
        xp_req := 500 + (i * 100);
        current_total_xp := current_total_xp + xp_req;

        -- Determine Title/Tier (Legendary for > 100)
        new_title := 'Legendary Coach';
        new_tier := 'Legend';

        INSERT INTO coach_experience_levels (
            level, 
            total_xp_required, 
            skill_points_reward, 
            title,
            tier
        ) VALUES (
            i, 
            current_total_xp, 
            1, 
            new_title,
            new_tier
        );
    END LOOP;

    -- 3. Return the newly created level
    RETURN QUERY 
    SELECT level, total_xp_required, skill_points_reward, title, tier 
    FROM coach_experience_levels 
    WHERE level = target_level;
END;
$$ LANGUAGE plpgsql;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (174, '174_coach_infinite_leveling_func')
ON CONFLICT (version) DO NOTHING;
