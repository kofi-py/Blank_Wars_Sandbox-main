-- Migration: Add battle state snapshot columns and character-in-battle lock
-- Purpose: 
--   1. Store character snapshots when battle starts (for state reconstruction)
--   2. Lock characters during battle to prevent modifications

-- Add snapshot columns to battles table
ALTER TABLE battles ADD COLUMN IF NOT EXISTS user_team_data JSONB;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS opponent_team_data JSONB;

-- Add battle lock to user_characters (TEXT type to match battles.id)
ALTER TABLE user_characters ADD COLUMN IF NOT EXISTS current_battle_id TEXT REFERENCES battles(id) ON DELETE SET NULL;

-- Index for efficient lookup of characters in battle
CREATE INDEX IF NOT EXISTS idx_user_characters_current_battle 
ON user_characters(current_battle_id) 
WHERE current_battle_id IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN battles.user_team_data IS 'JSON snapshot of user team characters at battle start';
COMMENT ON COLUMN battles.opponent_team_data IS 'JSON snapshot of opponent team characters at battle start';
COMMENT ON COLUMN user_characters.current_battle_id IS 'If set, character is locked in this battle and cannot be modified elsewhere';
