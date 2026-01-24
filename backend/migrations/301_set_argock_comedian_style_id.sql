-- Migration: 301 - Set Argock's comedian_style_id to Moe Howard
-- Description: Argock's comedian_style_id was NULL, preventing the JOIN in get_system_character_data
--              from returning comedy_style. Moe Howard exists in comedian_styles with id=10.
-- Created: 2026-01-01

BEGIN;

-- Set Argock's comedian_style_id to point to Moe Howard (id=10)
UPDATE characters
SET comedian_style_id = 10
WHERE id = 'argock';

-- Verify the update
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM characters
    WHERE id = 'argock' AND comedian_style_id = 10
  ) THEN
    RAISE EXCEPTION 'Failed to set comedian_style_id for Argock';
  END IF;

  RAISE NOTICE 'Successfully set Argock comedian_style_id to 10 (Moe Howard)';
END $$;

COMMIT;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (301, '301_set_argock_comedian_style_id')
ON CONFLICT (version) DO NOTHING;
