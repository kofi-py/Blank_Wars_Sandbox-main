-- Migration 167: Create character_modifiers table for gameplay modifiers
-- This replaces the legacy duplicate stat columns on user_characters
-- Current stats = characters (canonical) + SUM(character_modifiers)

CREATE TABLE IF NOT EXISTS character_modifiers (
  id SERIAL PRIMARY KEY,

  -- Which user_character this modifier applies to
  user_character_id TEXT NOT NULL REFERENCES user_characters(id) ON DELETE CASCADE,

  -- Which stat is being modified
  stat_name VARCHAR(50) NOT NULL,  -- 'strength', 'intelligence', 'max_energy', 'attack', etc.

  -- The modifier value (positive or negative)
  modifier_value INTEGER NOT NULL,  -- +5, -10, etc.

  -- Modifier classification
  modifier_type VARCHAR(20) NOT NULL CHECK (modifier_type IN ('permanent', 'temporary')),

  -- Source of the modifier
  source_type VARCHAR(30) NOT NULL CHECK (source_type IN (
    'point_allocation',   -- Level up stat allocation
    'battle_victory',     -- Rewards from winning battles
    'item',               -- Equipment/consumable effects
    'buff',               -- Positive spell/ability effects
    'curse',              -- Negative spell/ability effects
    'training',           -- Training session rewards
    'event',              -- Special event rewards/penalties
    'other'               -- Catch-all for edge cases
  )),

  -- Optional reference to the source (item_id, battle_id, etc.)
  source_id VARCHAR(100),

  -- For temporary modifiers: when does it expire?
  -- NULL means permanent (never expires)
  expires_at TIMESTAMP WITH TIME ZONE,

  -- Audit trail
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Optional notes/description
  notes TEXT
);

-- Indexes for common queries
CREATE INDEX idx_character_modifiers_user_character ON character_modifiers(user_character_id);
CREATE INDEX idx_character_modifiers_stat ON character_modifiers(stat_name);
CREATE INDEX idx_character_modifiers_expires ON character_modifiers(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_character_modifiers_type ON character_modifiers(modifier_type);
CREATE INDEX idx_character_modifiers_source ON character_modifiers(source_type);

-- Compound index for modifier lookups - filtering for expiration happens at query time
CREATE INDEX idx_character_modifiers_lookup ON character_modifiers(user_character_id, stat_name, expires_at);

COMMENT ON TABLE character_modifiers IS 'Stores gameplay modifiers that stack on top of canonical character stats. Current stat = characters.stat + SUM(character_modifiers.modifier_value)';
