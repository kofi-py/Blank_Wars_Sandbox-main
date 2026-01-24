-- Migration 108: Create bond_activity_log table for audit trail
-- This table records every bond change with full context for transparency

CREATE TABLE IF NOT EXISTS bond_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_character_id TEXT NOT NULL REFERENCES user_characters(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  bond_change INTEGER NOT NULL,
  bond_level_before INTEGER NOT NULL,
  bond_level_after INTEGER NOT NULL,
  context JSONB DEFAULT '{}',
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookups by character
CREATE INDEX IF NOT EXISTS idx_bond_activity_log_character 
  ON bond_activity_log(user_character_id, created_at DESC);

-- Index for querying by activity type (analytics)
CREATE INDEX IF NOT EXISTS idx_bond_activity_log_type 
  ON bond_activity_log(activity_type);

-- Index for querying by source system
CREATE INDEX IF NOT EXISTS idx_bond_activity_log_source 
  ON bond_activity_log(source);

-- Comment for documentation
COMMENT ON TABLE bond_activity_log IS 'Audit trail for all bond level changes with full context';
COMMENT ON COLUMN bond_activity_log.activity_type IS 'Type of activity (e.g., therapy_breakthrough, battle_victory_together)';
COMMENT ON COLUMN bond_activity_log.bond_change IS 'Amount bond changed (can be negative)';
COMMENT ON COLUMN bond_activity_log.context IS 'Additional metadata about the activity (participants, outcomes, etc.)';
COMMENT ON COLUMN bond_activity_log.source IS 'System that triggered this bond change (e.g., therapy, battle, chat)';
