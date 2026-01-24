-- Migration 008: Four-Tier Power System
-- Creates power_definitions (master catalog) and character_powers (instance tracking)
-- Supports: Skills, Abilities (archetype), Species Powers, Signature Powers

BEGIN;

-- ============================================================================
-- POWER DEFINITIONS TABLE (Master Catalog - Game Design Data)
-- ============================================================================
CREATE TABLE IF NOT EXISTS power_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('skill', 'ability', 'species', 'signature')),

  -- Categorization
  category TEXT, -- 'combat', 'financial', 'minigame', 'progression', 'offensive', 'defensive', 'support'
  archetype TEXT, -- for tier='ability': 'warrior', 'mage', 'assassin', etc.
  species TEXT, -- for tier='species': 'vampire', 'human', 'deity', etc.
  character_id TEXT, -- for tier='signature': specific character like 'achilles'

  -- Description
  description TEXT NOT NULL,
  flavor_text TEXT, -- lore/story text
  icon TEXT, -- emoji or icon identifier

  -- Progression
  max_rank INTEGER NOT NULL DEFAULT 1,
  rank_bonuses JSONB, -- [{rank: 2, improvements: [...]}]

  -- Unlock Requirements
  unlock_level INTEGER, -- character level required
  unlock_challenge TEXT, -- e.g., 'defeat_100_enemies', 'die_and_revive'
  unlock_cost INTEGER, -- points needed to unlock (0 = auto-unlock)
  rank_up_cost INTEGER DEFAULT 0,
  prerequisite_power_id TEXT REFERENCES power_definitions(id), -- must have this power first

  -- Battle Mechanics
  power_type TEXT CHECK (power_type IN ('active', 'passive', 'toggle')),
  effects JSONB, -- [{type: 'damage', value: 150, target: 'enemy', damageType: 'physical'}]
  cooldown INTEGER DEFAULT 0, -- turns
  energy_cost INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_power_definitions_tier ON power_definitions(tier);
CREATE INDEX idx_power_definitions_archetype ON power_definitions(archetype);
CREATE INDEX idx_power_definitions_species ON power_definitions(species);
CREATE INDEX idx_power_definitions_character ON power_definitions(character_id);
CREATE INDEX idx_power_definitions_category ON power_definitions(category);

-- ============================================================================
-- CHARACTER POWERS TABLE (Instance Tracking - Character Progress)
-- ============================================================================
CREATE TABLE IF NOT EXISTS character_powers (
  id TEXT PRIMARY KEY DEFAULT 'charpow_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 8),
  character_id TEXT NOT NULL REFERENCES user_characters(id) ON DELETE CASCADE,
  power_id TEXT NOT NULL REFERENCES power_definitions(id),

  -- Progression
  current_rank INTEGER NOT NULL DEFAULT 1,
  experience INTEGER NOT NULL DEFAULT 0, -- for use-based progression (species powers)

  -- Status
  unlocked BOOLEAN NOT NULL DEFAULT false,
  unlocked_at TIMESTAMP,
  unlocked_by TEXT, -- 'level_up', 'point_spend', 'challenge_complete', 'auto', 'rebellion'

  -- Usage Tracking
  times_used INTEGER NOT NULL DEFAULT 0, -- how many times this power has been used
  last_used_at TIMESTAMP,

  -- Battle State (for active powers)
  on_cooldown BOOLEAN DEFAULT false,
  cooldown_expires_at TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(character_id, power_id)
);

CREATE INDEX idx_character_powers_character ON character_powers(character_id);
CREATE INDEX idx_character_powers_power ON character_powers(power_id);
CREATE INDEX idx_character_powers_unlocked ON character_powers(unlocked);
CREATE INDEX idx_character_powers_tier ON character_powers(power_id); -- for joins to get tier

-- ============================================================================
-- POINT TRACKING ON USER_CHARACTERS
-- ============================================================================
ALTER TABLE user_characters ADD COLUMN IF NOT EXISTS skill_points INTEGER DEFAULT 0 CHECK (skill_points >= 0);
ALTER TABLE user_characters ADD COLUMN IF NOT EXISTS archetype_points INTEGER DEFAULT 0 CHECK (archetype_points >= 0);
ALTER TABLE user_characters ADD COLUMN IF NOT EXISTS species_points INTEGER DEFAULT 0 CHECK (species_points >= 0);
ALTER TABLE user_characters ADD COLUMN IF NOT EXISTS signature_points INTEGER DEFAULT 0 CHECK (signature_points >= 0);

CREATE INDEX IF NOT EXISTS idx_user_characters_points ON user_characters(skill_points, archetype_points, species_points, signature_points);

-- ============================================================================
-- POWER UNLOCK LOG (Audit Trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS power_unlock_log (
  id TEXT PRIMARY KEY DEFAULT 'powlog_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 8),
  character_id TEXT NOT NULL REFERENCES user_characters(id) ON DELETE CASCADE,
  power_id TEXT NOT NULL REFERENCES power_definitions(id),

  -- What happened
  action TEXT NOT NULL CHECK (action IN ('unlock', 'rank_up', 'use')),
  from_rank INTEGER,
  to_rank INTEGER,

  -- Context
  triggered_by TEXT, -- 'coach_suggestion', 'character_rebellion', 'auto', 'challenge_complete'
  points_spent INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_power_unlock_log_character ON power_unlock_log(character_id);
CREATE INDEX idx_power_unlock_log_power ON power_unlock_log(power_id);
CREATE INDEX idx_power_unlock_log_action ON power_unlock_log(action);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE power_definitions IS 'Master catalog of all powers in the game (skills, abilities, species powers, signatures)';
COMMENT ON TABLE character_powers IS 'Tracks which powers each character instance has unlocked and their progression';
COMMENT ON TABLE power_unlock_log IS 'Audit trail of power unlocks and rank-ups for analytics and debugging';

COMMENT ON COLUMN power_definitions.tier IS 'Power tier: skill (universal), ability (archetype), species (race), signature (character-unique)';
COMMENT ON COLUMN power_definitions.power_type IS 'Active (triggered), Passive (always on), Toggle (enable/disable)';
COMMENT ON COLUMN character_powers.unlocked_by IS 'How this power was unlocked: level_up, point_spend, challenge_complete, auto (signature), rebellion (AI choice)';

COMMIT;
