-- Migration: Add missing current stats to user_characters
-- These stats need current versions so prompts use actual character state, not base stats

ALTER TABLE user_characters
ADD COLUMN IF NOT EXISTS current_magic_attack INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS current_magic_defense INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS current_dexterity INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS current_intelligence INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS current_wisdom INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS current_spirit INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS current_elemental_resistance INTEGER DEFAULT 0;

-- Initialize current stats from base stats in characters table
UPDATE user_characters uc
SET
  current_magic_attack = COALESCE(c.magic_attack, 50),
  current_magic_defense = COALESCE(c.magic_defense, 50),
  current_dexterity = COALESCE(c.dexterity, 50),
  current_intelligence = COALESCE(c.intelligence, 50),
  current_wisdom = COALESCE(c.wisdom, 50),
  current_spirit = COALESCE(c.spirit, 50),
  current_elemental_resistance = COALESCE(c.elemental_resistance, 0)
FROM characters c
WHERE uc.character_id = c.id;

-- Add indexes for commonly queried stats
CREATE INDEX IF NOT EXISTS idx_uc_current_magic_attack ON user_characters(current_magic_attack);

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (188, '188_add_missing_current_stats')
ON CONFLICT (version) DO NOTHING;
