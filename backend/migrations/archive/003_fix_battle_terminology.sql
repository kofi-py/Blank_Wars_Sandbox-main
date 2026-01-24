-- Migration: 003_fix_battle_terminology
-- Description: Fix battles table to follow consistent user_* naming convention
-- The user is the COACH. Characters are FIGHTERS. No "player" terminology.
-- Created: 2025-10-05

BEGIN;

-- Rename columns to follow user_* convention
ALTER TABLE battles RENAME COLUMN player_user_id TO user_id;
ALTER TABLE battles RENAME COLUMN player_team_data TO user_team_data;

-- Drop old index and create new one with correct name
DROP INDEX IF EXISTS idx_battles_player;
CREATE INDEX idx_battles_user ON battles (user_id);

-- Update global_morale JSON: {"player": 50} -> {"user": 50}
UPDATE battles
SET global_morale = jsonb_build_object(
  'user', COALESCE((global_morale->>'player')::int, 50),
  'opponent', COALESCE((global_morale->>'opponent')::int, 50)
)
WHERE global_morale ? 'player';

-- Record migration version
INSERT INTO migration_log (version, name) VALUES (3, '003_fix_battle_terminology') ON CONFLICT (version) DO NOTHING;

COMMIT;
