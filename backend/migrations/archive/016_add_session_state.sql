-- Migration: Add session_state table for semantic persistence
-- This replaces tensor KV cache with tiny semantic state (few KB)

CREATE TABLE IF NOT EXISTS session_state (
  sid TEXT PRIMARY KEY,
  character_id TEXT NOT NULL,
  user_id TEXT,
  session_flags JSONB NOT NULL DEFAULT '{}',          -- ≤ 1 KB
  short_context TEXT NOT NULL DEFAULT '',             -- ≤ 2048 B
  last_user_intent TEXT NOT NULL DEFAULT '',          -- ≤ 256 B
  slots JSONB NOT NULL DEFAULT '{}',                  -- small scalars only
  short_tool_result JSONB NOT NULL DEFAULT '{}',      -- ≤ 2 KB
  digest_id TEXT,
  schema_version SMALLINT DEFAULT 1,
  ts_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for TTL cleanup
CREATE INDEX idx_session_state_ts_updated ON session_state (ts_updated);

-- Add to migration_history
INSERT INTO migration_history (version, description, applied_at)
VALUES (16, 'Add session_state table for semantic persistence', NOW())
ON CONFLICT (version) DO NOTHING;