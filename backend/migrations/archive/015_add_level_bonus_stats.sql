-- Migration: 015_add_level_bonus_stats
-- Description: Add separate tracking columns for level-up stat bonuses
-- Created: 2025-08-10

BEGIN;

-- Add level bonus tracking columns to user_characters table
ALTER TABLE user_characters 
ADD COLUMN level_bonus_attack INTEGER DEFAULT 0 CHECK (level_bonus_attack >= 0),
ADD COLUMN level_bonus_defense INTEGER DEFAULT 0 CHECK (level_bonus_defense >= 0),
ADD COLUMN level_bonus_speed INTEGER DEFAULT 0 CHECK (level_bonus_speed >= 0),
ADD COLUMN level_bonus_max_health INTEGER DEFAULT 0 CHECK (level_bonus_max_health >= 0),
ADD COLUMN level_bonus_special INTEGER DEFAULT 0 CHECK (level_bonus_special >= 0);

-- Add indexes for performance (these will be used in stat calculations)
CREATE INDEX idx_user_characters_level_bonuses ON user_characters 
(level_bonus_attack, level_bonus_defense, level_bonus_speed, level_bonus_max_health);

-- Add comments for documentation
COMMENT ON COLUMN user_characters.level_bonus_attack IS 'Attack bonus gained from leveling up (separate from base stats and equipment)';
COMMENT ON COLUMN user_characters.level_bonus_defense IS 'Defense bonus gained from leveling up (separate from base stats and equipment)';
COMMENT ON COLUMN user_characters.level_bonus_speed IS 'Speed bonus gained from leveling up (separate from base stats and equipment)';
COMMENT ON COLUMN user_characters.level_bonus_max_health IS 'Max health bonus gained from leveling up (separate from base stats and equipment)';
COMMENT ON COLUMN user_characters.level_bonus_special IS 'Special stat bonus gained from leveling up (separate from base stats and equipment)';

-- Record migration
INSERT INTO migration_log (version, name) VALUES (15, '015_add_level_bonus_stats') ON CONFLICT (version) DO NOTHING;

COMMIT;