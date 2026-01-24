-- Add coach_lockout_until column to user_characters table
-- This column stores the timestamp until which the coach is locked out of making decisions for this character
-- Used when a character rebels and autonomously chooses an upgrade

ALTER TABLE user_characters
ADD COLUMN IF NOT EXISTS coach_lockout_until TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_user_characters_lockout ON user_characters(coach_lockout_until);

-- Record migration
INSERT INTO migration_log (version, name) VALUES (140, '140_add_coach_lockout') ON CONFLICT (version) DO NOTHING;
