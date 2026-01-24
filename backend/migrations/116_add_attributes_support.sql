-- Add per-character attribute points and allocation tracking
-- This migration is idempotent and will not fail if columns already exist

ALTER TABLE user_characters
  ADD COLUMN IF NOT EXISTS attribute_points INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS attribute_allocations JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS attribute_pending_survey JSONB;

-- No data backfill needed; defaults ensure existing rows remain valid.
