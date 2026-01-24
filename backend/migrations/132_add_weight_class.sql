-- Add weight_class generated column to user_characters
-- Formula: (level * 10) + (total_battles / 5)
-- This gives a weight that increases primarily with level, but also slightly with experience (battles fought)

BEGIN;

-- Use DO block to handle IF NOT EXISTS for generated columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_characters' AND column_name='weight_class') THEN
    ALTER TABLE user_characters ADD COLUMN weight_class INTEGER GENERATED ALWAYS AS ((level * 10) + (total_battles / 5)) STORED;
  END IF;
END $$;

-- Create index for matchmaking queries
CREATE INDEX IF NOT EXISTS idx_user_characters_weight_class ON user_characters(weight_class);

-- Record migration
INSERT INTO migration_log (version, name) VALUES (132, '132_add_weight_class') ON CONFLICT (version) DO NOTHING;

COMMIT;
