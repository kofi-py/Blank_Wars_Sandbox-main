-- Transition from 1v1 character tracking to 3v3 team tracking
-- Migration 138: Remove character-level constraints for 3v3 battles

BEGIN;

-- Drop individual character constraint
-- In 3v3 mode, we track teams via user_team_data/opponent_team_data JSONB
-- Individual character_id columns are legacy/optional
ALTER TABLE battles DROP CONSTRAINT IF EXISTS check_opponent_character_exists;

-- Keep the coach/user constraint (WHO is battling)
-- check_opponent_exists ensures opponent_user_id OR opponent_ai_coach_id exists
-- (Already created in migration 136)

-- Record migration
INSERT INTO migration_log (version, name) VALUES (138, '138_remove_character_constraints_3v3') ON CONFLICT (version) DO NOTHING;

COMMIT;
