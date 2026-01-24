-- Migration 061: Unified Character Points System
-- Purpose: Replace 4 separate point pools with single character_points currency
-- Cost Structure: Tier+Rank based (1,3,5 / 3,5,7 / 5,7,9 / 7,9,11)
-- Date: 2025-10-28

BEGIN;

-- ===== ADD CHARACTER_POINTS COLUMN =====

-- Add unified character_points column
ALTER TABLE user_characters ADD COLUMN IF NOT EXISTS character_points INTEGER DEFAULT 0 CHECK (character_points >= 0);

-- Create index for character_points
CREATE INDEX IF NOT EXISTS idx_user_characters_character_points ON user_characters(character_points);

-- ===== MIGRATE EXISTING POINTS TO UNIFIED SYSTEM =====

-- Convert existing separate point pools to unified character_points
-- This gives players their total points from all pools combined
UPDATE user_characters
SET character_points = COALESCE(skill_points, 0) + COALESCE(archetype_points, 0) + COALESCE(species_points, 0) + COALESCE(signature_points, 0)
WHERE character_points = 0;

-- ===== DEPRECATE OLD POINT COLUMNS =====

-- Rename old columns to indicate they're deprecated (keeping for rollback safety)
ALTER TABLE user_characters RENAME COLUMN skill_points TO skill_points_deprecated;
ALTER TABLE user_characters RENAME COLUMN archetype_points TO archetype_points_deprecated;
ALTER TABLE user_characters RENAME COLUMN species_points TO species_points_deprecated;
ALTER TABLE user_characters RENAME COLUMN signature_points TO signature_points_deprecated;

-- Drop old index
DROP INDEX IF EXISTS idx_user_characters_points;

-- ===== UPDATE POWER COSTS (TIER+RANK BASED) =====

-- Universal/Skill Powers: (1, 3, 5)
UPDATE power_definitions
SET unlock_cost = 1,
    rank_up_cost = 3  -- This will be rank 1→2 cost, rank 2→3 will be calculated as tier*2+rank
WHERE tier = 'skill';

-- Archetype/Ability Powers: (3, 5, 7)
UPDATE power_definitions
SET unlock_cost = 3,
    rank_up_cost = 5
WHERE tier = 'ability';

-- Species Powers: (5, 7, 9)
UPDATE power_definitions
SET unlock_cost = 5,
    rank_up_cost = 7
WHERE tier = 'species';

-- Signature Powers: (7, 9, 11)
UPDATE power_definitions
SET unlock_cost = 7,
    rank_up_cost = 9
WHERE tier = 'signature';

-- ===== ADD RANK_UP_COST_R3 COLUMN FOR RANK 2→3 COST =====

-- Add new column for rank 2→3 cost (different from rank 1→2)
ALTER TABLE power_definitions ADD COLUMN IF NOT EXISTS rank_up_cost_r3 INTEGER;

-- Set rank 2→3 costs based on tier
UPDATE power_definitions SET rank_up_cost_r3 = 5 WHERE tier = 'skill';      -- Universal: 5
UPDATE power_definitions SET rank_up_cost_r3 = 7 WHERE tier = 'ability';    -- Archetype: 7
UPDATE power_definitions SET rank_up_cost_r3 = 9 WHERE tier = 'species';    -- Species: 9
UPDATE power_definitions SET rank_up_cost_r3 = 11 WHERE tier = 'signature'; -- Signature: 11

-- ===== UPDATE SPELL COSTS (TIER+RANK BASED) =====

-- Add cost columns to spell_definitions if they don't exist
ALTER TABLE spell_definitions ADD COLUMN IF NOT EXISTS unlock_cost INTEGER;
ALTER TABLE spell_definitions ADD COLUMN IF NOT EXISTS rank_up_cost INTEGER;
ALTER TABLE spell_definitions ADD COLUMN IF NOT EXISTS rank_up_cost_r3 INTEGER;

-- Universal Spells: (1, 3, 5)
UPDATE spell_definitions
SET unlock_cost = 1,
    rank_up_cost = 3,
    rank_up_cost_r3 = 5
WHERE category = 'universal';

-- Archetype Spells: (3, 5, 7)
UPDATE spell_definitions
SET unlock_cost = 3,
    rank_up_cost = 5,
    rank_up_cost_r3 = 7
WHERE category = 'archetype' AND archetype IS NOT NULL;

-- Species Spells: (5, 7, 9)
UPDATE spell_definitions
SET unlock_cost = 5,
    rank_up_cost = 7,
    rank_up_cost_r3 = 9
WHERE category = 'species' AND species IS NOT NULL;

-- Signature Spells: (7, 9, 11)
UPDATE spell_definitions
SET unlock_cost = 7,
    rank_up_cost = 9,
    rank_up_cost_r3 = 11
WHERE category = 'signature' AND character_id IS NOT NULL;

-- ===== COMMENTS =====

COMMENT ON COLUMN user_characters.character_points IS 'Unified point pool for unlocking and ranking up both powers and spells. Replaces separate skill/archetype/species/signature pools.';
COMMENT ON COLUMN power_definitions.unlock_cost IS 'Character points needed to unlock this power at Rank 1. Based on tier: skill=1, ability=3, species=5, signature=7';
COMMENT ON COLUMN power_definitions.rank_up_cost IS 'Character points needed to rank up from Rank 1 to Rank 2. Based on tier: skill=3, ability=5, species=7, signature=9';
COMMENT ON COLUMN power_definitions.rank_up_cost_r3 IS 'Character points needed to rank up from Rank 2 to Rank 3. Based on tier: skill=5, ability=7, species=9, signature=11';
COMMENT ON COLUMN spell_definitions.unlock_cost IS 'Character points needed to unlock this spell at Rank 1. Based on category: universal=1, archetype=3, species=5, signature=7';
COMMENT ON COLUMN spell_definitions.rank_up_cost IS 'Character points needed to rank up from Rank 1 to Rank 2';
COMMENT ON COLUMN spell_definitions.rank_up_cost_r3 IS 'Character points needed to rank up from Rank 2 to Rank 3';

COMMIT;
