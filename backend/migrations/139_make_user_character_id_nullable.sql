-- Make user_character_id nullable for 3v3 battles
-- Migration 139: Allow null user_character_id for team-based battles

BEGIN;

-- Make user_character_id nullable (3v3 uses team_data instead)
DO $$
BEGIN
  ALTER TABLE battles ALTER COLUMN user_character_id DROP NOT NULL;
EXCEPTION WHEN others THEN
  -- Already nullable, ignore
END $$;

-- Record migration
INSERT INTO migration_log (version, name) VALUES (139, '139_make_user_character_id_nullable') ON CONFLICT (version) DO NOTHING;

COMMIT;
