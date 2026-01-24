-- Migration 004: Add gameplan_adherence_level to user_characters
-- This column stores the character's tendency to follow coach's strategy
-- Value is calculated based on archetype, species, rarity, and personality

ALTER TABLE user_characters
ADD COLUMN IF NOT EXISTS gameplan_adherence_level INTEGER;

-- No default value - must be calculated during character creation
COMMENT ON COLUMN user_characters.gameplan_adherence_level IS 'Characters tendency to follow coachs strategy (0-100). Calculated from archetype, species, rarity, personality. Modified by stress, HP, confidence.';
