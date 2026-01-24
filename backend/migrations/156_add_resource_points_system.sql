-- Migration 156: Add Resource Points System
-- Separate point pool for max_health, max_energy, max_mana allocation

ALTER TABLE user_characters
  ADD COLUMN IF NOT EXISTS resource_points INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS resource_allocations JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS resource_pending_survey JSONB;

CREATE INDEX IF NOT EXISTS idx_user_characters_resource_points ON user_characters(resource_points);

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (156, '156_add_resource_points_system')
ON CONFLICT (version) DO NOTHING;
