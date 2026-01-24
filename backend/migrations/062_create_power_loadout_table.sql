-- Migration: Create Power Loadout Table
-- Purpose: Add loadout system for powers (matching spell loadout system)
-- Related: Power & Spell System Feature - Unified Loadout Management

-- ===== CHARACTER POWER LOADOUT TABLE =====
CREATE TABLE IF NOT EXISTS character_power_loadout (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_character_id TEXT NOT NULL REFERENCES user_characters(id) ON DELETE CASCADE,
  power_id TEXT NOT NULL REFERENCES power_definitions(id) ON DELETE CASCADE,
  slot_number INTEGER NOT NULL CHECK (slot_number BETWEEN 1 AND 8),

  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_character_id, slot_number), -- Each slot can only have one power
  UNIQUE(user_character_id, power_id) -- Can't equip same power twice on same character
);

-- Indexes for character_power_loadout
CREATE INDEX IF NOT EXISTS idx_character_power_loadout_character ON character_power_loadout(user_character_id);
CREATE INDEX IF NOT EXISTS idx_character_power_loadout_power ON character_power_loadout(power_id);

-- Add comments
COMMENT ON TABLE character_power_loadout IS 'Defines which powers each character has equipped for battle (max 8 slots)';
COMMENT ON COLUMN character_power_loadout.slot_number IS 'Power slot position (1-8), determines power order in battle UI';
COMMENT ON COLUMN character_power_loadout.user_character_id IS 'Reference to the character who has this power equipped';
COMMENT ON COLUMN character_power_loadout.power_id IS 'Reference to the power definition that is equipped';
