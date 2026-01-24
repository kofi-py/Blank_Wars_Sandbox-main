-- Add initiative generated column
-- Formula: speed + dexterity
-- Note: Formula updated in migration 145 to weighted version

BEGIN;

-- Use DO block to handle IF NOT EXISTS for generated columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='characters' AND column_name='initiative') THEN
    ALTER TABLE characters ADD COLUMN initiative INTEGER GENERATED ALWAYS AS (speed + dexterity) STORED;
  END IF;
END $$;

-- Create index for sorting by initiative
CREATE INDEX IF NOT EXISTS idx_characters_initiative ON characters(initiative DESC);

-- Record migration
INSERT INTO migration_log (version, name) VALUES (131, '131_add_initiative_column') ON CONFLICT (version) DO NOTHING;

COMMIT;
