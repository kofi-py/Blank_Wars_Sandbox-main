-- Migration 005: Add confidence_level to user_characters
-- Confidence affects adherence, performance, and decision-making

ALTER TABLE user_characters
ADD COLUMN IF NOT EXISTS confidence_level INTEGER DEFAULT 50 CHECK (confidence_level >= 0 AND confidence_level <= 100);

COMMENT ON COLUMN user_characters.confidence_level IS 'Character confidence level (0-100). Affects adherence to coach strategy, combat performance, and willingness to take risks. Influenced by wins/losses, bond_level, and recent experiences.';
