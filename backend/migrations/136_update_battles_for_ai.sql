-- Update Battles Table to support AI Opponents

BEGIN;

-- 1. Make opponent_user_id nullable (since it might be an AI coach)
-- Use DO block to handle if already nullable
DO $$
BEGIN
  ALTER TABLE battles ALTER COLUMN opponent_user_id DROP NOT NULL;
EXCEPTION WHEN others THEN
  -- Already nullable, ignore
END $$;

-- 2. Add columns for AI opponents
ALTER TABLE battles ADD COLUMN IF NOT EXISTS opponent_ai_coach_id UUID REFERENCES ai_coaches(id);
ALTER TABLE battles ADD COLUMN IF NOT EXISTS opponent_ai_team_id UUID REFERENCES ai_teams(id);

-- 3. Add check constraint to ensure at least one opponent type is set
DO $$
BEGIN
  ALTER TABLE battles ADD CONSTRAINT check_opponent_exists
    CHECK (opponent_user_id IS NOT NULL OR opponent_ai_coach_id IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN
  -- Constraint already exists
END $$;

-- Record migration
INSERT INTO migration_log (version, name) VALUES (136, '136_update_battles_for_ai') ON CONFLICT (version) DO NOTHING;

COMMIT;
