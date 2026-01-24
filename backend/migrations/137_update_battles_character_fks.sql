-- Update Battles Table to support AI Characters

BEGIN;

-- 1. Make opponent_character_id nullable (since it might be an AI character)
DO $$
BEGIN
  ALTER TABLE battles ALTER COLUMN opponent_character_id DROP NOT NULL;
EXCEPTION WHEN others THEN
  -- Already nullable, ignore
END $$;

-- 2. Add column for AI character
ALTER TABLE battles ADD COLUMN IF NOT EXISTS opponent_ai_character_id UUID REFERENCES ai_characters(id);

-- 3. Add check constraint to ensure at least one opponent character/team is set
-- Note: In 3v3, we might rely on team_id, but for now we track the "Leader" character too.
DO $$
BEGIN
  ALTER TABLE battles ADD CONSTRAINT check_opponent_character_exists
    CHECK (opponent_character_id IS NOT NULL OR opponent_ai_character_id IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN
  -- Constraint already exists
END $$;

-- Record migration
INSERT INTO migration_log (version, name) VALUES (137, '137_update_battles_character_fks') ON CONFLICT (version) DO NOTHING;

COMMIT;
