-- Create coach_experience_levels table
CREATE TABLE IF NOT EXISTS coach_experience_levels (
    level INTEGER PRIMARY KEY,
    total_xp_required BIGINT NOT NULL,
    skill_points_reward INTEGER DEFAULT 1,
    title VARCHAR(50),
    tier VARCHAR(50)
);

-- Function to calculate XP curve (Balanced Formula)
-- Base: 100, Multiplier: 1.1, Exponent: 1.2 (Same as Character Progression)
DO $$
DECLARE
    lvl INTEGER;
    xp_req BIGINT;
    total_xp BIGINT := 0;
    c_title VARCHAR;
    c_tier VARCHAR;
BEGIN
    -- Clear existing data
    TRUNCATE coach_experience_levels;

    -- Level 1 is 0 XP
    INSERT INTO coach_experience_levels (level, total_xp_required, title, tier)
    VALUES (1, 0, 'Rookie Coach', 'Rookie');

    FOR lvl IN 2..100 LOOP
        -- Calculate XP required for this level (Linear Growth Formula)
        -- Base: 500, Growth: 100 per level
        -- Level 1: 600, Level 100: 10,500
        -- Total to Lvl 100: ~555,000 XP (~1,400 wins)
        xp_req := 500 + (lvl * 100);
        total_xp := total_xp + xp_req;

        -- Determine Title and Tier
        IF lvl <= 10 THEN 
            c_title := 'Rookie Coach';
            c_tier := 'Rookie';
        ELSIF lvl <= 25 THEN 
            c_title := 'Assistant Coach';
            c_tier := 'Assistant';
        ELSIF lvl <= 50 THEN 
            c_title := 'Head Coach';
            c_tier := 'Head';
        ELSIF lvl <= 75 THEN 
            c_title := 'Master Coach';
            c_tier := 'Master';
        ELSIF lvl <= 100 THEN 
            c_title := 'Elite Coach';
            c_tier := 'Elite';
        ELSE 
            c_title := 'Legendary Coach';
            c_tier := 'Legend';
        END IF;

        INSERT INTO coach_experience_levels (
            level, 
            total_xp_required, 
            skill_points_reward, 
            title,
            tier
        ) VALUES (
            lvl, 
            total_xp, 
            1, -- 1 Skill Point per level
            c_title,
            c_tier
        );
    END LOOP;
END $$;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (173, '173_create_coach_experience_levels')
ON CONFLICT (version) DO NOTHING;
