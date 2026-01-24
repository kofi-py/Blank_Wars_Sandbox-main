-- Migration: Add Energy and Mana Resource Pools to Characters
-- Purpose: Add current/max energy and mana for power/spell systems
-- Energy: Used for Powers (physical/stamina-based abilities)
-- Mana: Used for Spells (magical abilities)

-- Add energy pool columns
ALTER TABLE user_characters
ADD COLUMN IF NOT EXISTS current_energy INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS max_energy INTEGER DEFAULT 100;

-- Add mana pool columns
ALTER TABLE user_characters
ADD COLUMN IF NOT EXISTS current_mana INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS max_mana INTEGER DEFAULT 100;

-- Add energy/mana regeneration rate columns (regen per turn in battle)
ALTER TABLE user_characters
ADD COLUMN IF NOT EXISTS energy_regen_rate INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS mana_regen_rate INTEGER DEFAULT 10;

-- Set initial values based on character level and archetype
-- Higher level characters get larger resource pools
UPDATE user_characters
SET
  max_energy = 100 + (level * 10),
  current_energy = 100 + (level * 10),
  max_mana = 100 + (level * 10),
  current_mana = 100 + (level * 10);

-- Create index for efficient resource queries
CREATE INDEX IF NOT EXISTS idx_user_characters_energy ON user_characters(current_energy);
CREATE INDEX IF NOT EXISTS idx_user_characters_mana ON user_characters(current_mana);

-- Add comments
COMMENT ON COLUMN user_characters.current_energy IS 'Current energy points (used for Powers)';
COMMENT ON COLUMN user_characters.max_energy IS 'Maximum energy capacity';
COMMENT ON COLUMN user_characters.current_mana IS 'Current mana points (used for Spells)';
COMMENT ON COLUMN user_characters.max_mana IS 'Maximum mana capacity';
COMMENT ON COLUMN user_characters.energy_regen_rate IS 'Energy regeneration per turn in battle';
COMMENT ON COLUMN user_characters.mana_regen_rate IS 'Mana regeneration per turn in battle';

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (54, '054_add_energy_mana_pools')
ON CONFLICT (version) DO NOTHING;
