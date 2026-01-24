-- Migration 063: Fix Spell Table Structure
-- Purpose: Replace incorrect user_spells with character_spells (mirrors character_powers)
-- Date: 2025-10-29
-- Issue: user_spells was created with user_id, but spells should be unlocked per CHARACTER instance, not per user

BEGIN;

-- ============================================================================
-- DROP INCORRECT TABLE
-- ============================================================================
-- user_spells was created incorrectly in migration 037
-- It references users(id) when it should reference user_characters(id)
-- Confirmed empty (0 rows) on 2025-10-29, safe to drop
DROP TABLE IF EXISTS user_spells CASCADE;

-- ============================================================================
-- CREATE CORRECT CHARACTER_SPELLS TABLE (Mirrors character_powers)
-- ============================================================================
CREATE TABLE IF NOT EXISTS character_spells (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  character_id TEXT NOT NULL REFERENCES user_characters(id) ON DELETE CASCADE,
  spell_id TEXT NOT NULL REFERENCES spell_definitions(id) ON DELETE CASCADE,

  -- Progression (matches character_powers)
  current_rank INTEGER NOT NULL DEFAULT 1 CHECK (current_rank BETWEEN 1 AND 3),

  -- Status (matches character_powers)
  unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  unlocked_at TIMESTAMP WITHOUT TIME ZONE,
  unlocked_by TEXT CHECK (unlocked_by IN ('level_up', 'point_spend', 'challenge_complete', 'auto', 'rebellion')),

  -- Usage Tracking (matches character_powers)
  times_cast INTEGER NOT NULL DEFAULT 0,
  last_cast_at TIMESTAMP WITHOUT TIME ZONE,

  -- Battle State (matches character_powers with on_cooldown)
  on_cooldown BOOLEAN NOT NULL DEFAULT FALSE,
  cooldown_expires_at TIMESTAMP WITHOUT TIME ZONE,

  -- Stats (spell-specific fields)
  total_damage_dealt INTEGER NOT NULL DEFAULT 0,
  total_healing_done INTEGER NOT NULL DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Constraints (matches character_powers: one spell per character)
  UNIQUE(character_id, spell_id)
);

-- ============================================================================
-- INDEXES (Match character_powers pattern)
-- ============================================================================
CREATE INDEX idx_character_spells_character ON character_spells(character_id);
CREATE INDEX idx_character_spells_spell ON character_spells(spell_id);
CREATE INDEX idx_character_spells_unlocked ON character_spells(character_id, unlocked);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE character_spells IS 'Tracks spell unlocks and progression per character instance (mirrors character_powers structure)';
COMMENT ON COLUMN character_spells.character_id IS 'References user_characters(id) - the specific character instance that unlocked this spell';
COMMENT ON COLUMN character_spells.unlocked_by IS 'How spell was unlocked: point_spend (coach directed), rebellion (character chose), auto (level up), etc.';
COMMENT ON COLUMN character_spells.current_rank IS 'Current rank of this spell (1-3), unlocked with character_points';
COMMENT ON COLUMN character_spells.times_cast IS 'Number of times this spell has been cast in battles';

COMMIT;
