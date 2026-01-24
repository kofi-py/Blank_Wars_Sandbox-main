-- Create experience_levels table
CREATE TABLE IF NOT EXISTS experience_levels (
    level INTEGER PRIMARY KEY,
    total_xp_required BIGINT NOT NULL,
    stat_points_reward INTEGER DEFAULT 5,
    skill_points_reward INTEGER DEFAULT 3,
    ability_points_reward INTEGER DEFAULT 0,
    tier_title VARCHAR(50)
);

-- Function to calculate XP curve (same as the TS formula)
-- Base: 100, Multiplier: 1.5, Exponent: 1.2
DO $$
DECLARE
    lvl INTEGER;
    xp_req BIGINT;
    total_xp BIGINT := 0;
    prev_xp_req BIGINT := 0;
    tier VARCHAR;
    ability_pts INTEGER;
BEGIN
    -- Clear existing data to avoid conflicts
    TRUNCATE experience_levels;

    -- Level 1 is 0 XP
    INSERT INTO experience_levels (level, total_xp_required, tier_title, ability_points_reward)
    VALUES (1, 0, 'Novice', 0);

    FOR lvl IN 2..100 LOOP
        -- Calculate XP required for this level (formula from service)
        -- Math.floor(100 * Math.pow(1.1, level - 1) * Math.pow(level - 1, 1.2))
        xp_req := FLOOR(100 * POWER(1.1, lvl - 2) * POWER(lvl - 1, 1.2));
        total_xp := total_xp + xp_req;

        -- Determine Tier
        IF lvl <= 10 THEN tier := 'Novice';
        ELSIF lvl <= 20 THEN tier := 'Apprentice';
        ELSIF lvl <= 30 THEN tier := 'Adept';
        ELSIF lvl <= 40 THEN tier := 'Expert';
        ELSIF lvl <= 50 THEN tier := 'Master';
        ELSE tier := 'Legend';
        END IF;

        -- Determine Ability Points (1 every 5 levels)
        IF lvl % 5 = 0 THEN ability_pts := 1;
        ELSE ability_pts := 0;
        END IF;

        INSERT INTO experience_levels (
            level, 
            total_xp_required, 
            stat_points_reward, 
            skill_points_reward, 
            ability_points_reward, 
            tier_title
        ) VALUES (
            lvl, 
            total_xp, 
            5, -- Standard stat points
            3, -- Standard skill points
            ability_pts,
            tier
        );
    END LOOP;
END $$;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (171, '171_create_experience_levels')
ON CONFLICT (version) DO NOTHING;
