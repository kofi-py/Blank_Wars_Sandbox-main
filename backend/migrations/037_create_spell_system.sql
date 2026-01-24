-- Migration: Create Spell System
-- Purpose: Add tables for spell definitions, user spells, and character spell loadouts
-- Related: Power & Spell System Feature

-- ===== SPELL DEFINITIONS TABLE =====
CREATE TABLE IF NOT EXISTS spell_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  flavor_text TEXT,
  tier TEXT NOT NULL CHECK (tier IN ('universal', 'archetype', 'species', 'signature')),
  category TEXT, -- Descriptive type: offensive, defensive, heal, buff, debuff, utility (matches power_definitions.category)

  -- Restrictions (NULL means available to all)
  archetype TEXT, -- For tier=archetype: which archetype can use this
  species TEXT, -- For tier=species: which species can use this
  character_id TEXT, -- For tier=signature: which specific character owns this

  -- Costs & Requirements
  unlock_cost_coins INTEGER NOT NULL DEFAULT 100,
  learn_time_seconds INTEGER NOT NULL DEFAULT 0, -- 0 = instant, 3600 = 1 hour, 86400 = 24 hours
  required_level INTEGER NOT NULL DEFAULT 1,

  -- Battle Stats
  mana_cost INTEGER NOT NULL DEFAULT 10,
  cooldown_turns INTEGER NOT NULL DEFAULT 1,
  charges_per_battle INTEGER, -- NULL = unlimited (just cooldown)

  -- Effects (JSON format similar to powers)
  -- Example: {"damage": 50, "damageType": "fire", "statusEffect": "burn"}
  effects JSONB NOT NULL DEFAULT '{}',

  -- Metadata
  icon TEXT,
  animation TEXT, -- Reference to animation/visual effect
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for spell_definitions (match power_definitions pattern)
CREATE INDEX IF NOT EXISTS idx_spell_definitions_tier ON spell_definitions(tier);
CREATE INDEX IF NOT EXISTS idx_spell_definitions_category ON spell_definitions(category);
CREATE INDEX IF NOT EXISTS idx_spell_definitions_archetype ON spell_definitions(archetype) WHERE archetype IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_spell_definitions_species ON spell_definitions(species) WHERE species IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_spell_definitions_character ON spell_definitions(character_id) WHERE character_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_spell_definitions_level ON spell_definitions(required_level);

-- ===== USER SPELLS TABLE =====
CREATE TABLE IF NOT EXISTS user_spells (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  spell_id TEXT NOT NULL REFERENCES spell_definitions(id) ON DELETE CASCADE,

  -- Learning Progress
  is_learned BOOLEAN NOT NULL DEFAULT FALSE,
  learning_started_at TIMESTAMP WITHOUT TIME ZONE,
  learned_at TIMESTAMP WITHOUT TIME ZONE,

  -- Usage Stats
  times_used INTEGER NOT NULL DEFAULT 0,
  proficiency_level INTEGER NOT NULL DEFAULT 1 CHECK (proficiency_level BETWEEN 1 AND 10),
  total_damage_dealt INTEGER NOT NULL DEFAULT 0,
  total_healing_done INTEGER NOT NULL DEFAULT 0,

  -- Metadata
  acquired_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, spell_id)
);

-- Indexes for user_spells
CREATE INDEX IF NOT EXISTS idx_user_spells_user_id ON user_spells(user_id);
CREATE INDEX IF NOT EXISTS idx_user_spells_spell_id ON user_spells(spell_id);
CREATE INDEX IF NOT EXISTS idx_user_spells_learned ON user_spells(user_id, is_learned);
CREATE INDEX IF NOT EXISTS idx_user_spells_learning ON user_spells(user_id, is_learned, learning_started_at) WHERE is_learned = FALSE AND learning_started_at IS NOT NULL;

-- ===== CHARACTER SPELL LOADOUT TABLE =====
CREATE TABLE IF NOT EXISTS character_spell_loadout (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_character_id TEXT NOT NULL REFERENCES user_characters(id) ON DELETE CASCADE,
  spell_id TEXT NOT NULL REFERENCES spell_definitions(id) ON DELETE CASCADE,
  slot_number INTEGER NOT NULL CHECK (slot_number BETWEEN 1 AND 10),

  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_character_id, slot_number), -- Each slot can only have one spell
  UNIQUE(user_character_id, spell_id) -- Can't equip same spell twice on same character
);

-- Indexes for character_spell_loadout
CREATE INDEX IF NOT EXISTS idx_character_spell_loadout_character ON character_spell_loadout(user_character_id);
CREATE INDEX IF NOT EXISTS idx_character_spell_loadout_spell ON character_spell_loadout(spell_id);

-- Add comments
COMMENT ON TABLE spell_definitions IS 'Defines all available spells in the game with their properties, costs, and effects';
COMMENT ON TABLE user_spells IS 'Tracks which spells each user has acquired and their progress in learning them';
COMMENT ON TABLE character_spell_loadout IS 'Defines which spells each character has equipped for battle (max 10 slots)';

COMMENT ON COLUMN spell_definitions.category IS 'Spell category: universal (all), archetype-specific, species-specific, signature (character-specific)';
COMMENT ON COLUMN spell_definitions.learn_time_seconds IS 'Time required to learn spell in seconds (0 = instant, 86400 = 24 hours)';
COMMENT ON COLUMN spell_definitions.charges_per_battle IS 'Limited uses per battle (NULL = unlimited, just cooldown applies)';
COMMENT ON COLUMN user_spells.proficiency_level IS 'Spell mastery level (1-10), increases with usage (future feature)';
COMMENT ON COLUMN character_spell_loadout.slot_number IS 'Spell slot position (1-10), determines spell order in battle UI';
