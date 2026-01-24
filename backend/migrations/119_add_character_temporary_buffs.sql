-- Migration: Add character temporary buffs system
-- Purpose: Track time-based stat boosts from therapy, conflicts, coaching, etc.
-- Governance: Real timestamps for expiration, proper cleanup

CREATE TABLE IF NOT EXISTS character_temporary_buffs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  character_id TEXT NOT NULL REFERENCES user_characters(id) ON DELETE CASCADE,
  stat_name TEXT NOT NULL,
  value INTEGER NOT NULL,
  source TEXT NOT NULL, -- 'therapy', 'conflict_resolution', 'coaching', 'equipment', etc.
  source_id TEXT, -- Optional reference to the source (e.g., therapy session ID)
  description TEXT,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_character_temporary_buffs_character_id 
  ON character_temporary_buffs(character_id);

CREATE INDEX IF NOT EXISTS idx_character_temporary_buffs_expires_at 
  ON character_temporary_buffs(expires_at);

CREATE INDEX IF NOT EXISTS idx_character_temporary_buffs_active 
  ON character_temporary_buffs(character_id, expires_at);

-- Comments for documentation
COMMENT ON TABLE character_temporary_buffs IS 
  'Tracks time-based temporary stat boosts from various sources. Buffs automatically expire based on expires_at timestamp.';

COMMENT ON COLUMN character_temporary_buffs.stat_name IS 
  'Name of the stat being modified (e.g., mental_health, morale, communication, etc.)';

COMMENT ON COLUMN character_temporary_buffs.value IS 
  'Value of the buff (positive for boost, negative for debuff). Applied additively to base stat.';

COMMENT ON COLUMN character_temporary_buffs.source IS 
  'Source type of the buff for tracking and analytics';

COMMENT ON COLUMN character_temporary_buffs.expires_at IS 
  'When this buff expires. A cleanup job periodically removes expired buffs.';
