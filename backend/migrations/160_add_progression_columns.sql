
-- Rename experience to mastery_points in character_spells (if exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'character_spells' AND column_name = 'experience'
    ) THEN
        ALTER TABLE character_spells RENAME COLUMN experience TO mastery_points;
    END IF;
END $$;

-- Ensure mastery_points column exists
ALTER TABLE character_spells
ADD COLUMN IF NOT EXISTS mastery_points INTEGER DEFAULT 0;

-- Add mastery_points to character_powers
ALTER TABLE character_powers 
ADD COLUMN IF NOT EXISTS mastery_points INTEGER DEFAULT 0;

-- Add mastery_level to character_spells
ALTER TABLE character_spells 
ADD COLUMN IF NOT EXISTS mastery_level INTEGER DEFAULT 1;

-- Add mastery_level to character_powers
ALTER TABLE character_powers 
ADD COLUMN IF NOT EXISTS mastery_level INTEGER DEFAULT 1;

-- Add strength_level to spell_definitions
ALTER TABLE spell_definitions 
ADD COLUMN IF NOT EXISTS strength_level INTEGER DEFAULT 1;

-- Add strength_level to power_definitions
ALTER TABLE power_definitions 
ADD COLUMN IF NOT EXISTS strength_level INTEGER DEFAULT 1;

-- Add required_stats to spell_definitions
ALTER TABLE spell_definitions 
ADD COLUMN IF NOT EXISTS required_stats JSONB DEFAULT NULL;

-- Add required_stats to power_definitions
ALTER TABLE power_definitions 
ADD COLUMN IF NOT EXISTS required_stats JSONB DEFAULT NULL;

-- Add rank_up_cost_r2 to spell_definitions
ALTER TABLE spell_definitions 
ADD COLUMN IF NOT EXISTS rank_up_cost_r2 INTEGER DEFAULT NULL;

-- Add rank_up_cost_r2 to power_definitions
ALTER TABLE power_definitions 
ADD COLUMN IF NOT EXISTS rank_up_cost_r2 INTEGER DEFAULT NULL;

-- Add is_starter to spell_definitions
ALTER TABLE spell_definitions 
ADD COLUMN IF NOT EXISTS is_starter BOOLEAN DEFAULT FALSE;

-- Add is_starter to power_definitions
ALTER TABLE power_definitions 
ADD COLUMN IF NOT EXISTS is_starter BOOLEAN DEFAULT FALSE;

-- Add character_id to spell_definitions (for Signature Spells)
ALTER TABLE spell_definitions
ADD COLUMN IF NOT EXISTS character_id VARCHAR(255) DEFAULT NULL;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (160, '160_add_progression_columns')
ON CONFLICT (version) DO NOTHING;
