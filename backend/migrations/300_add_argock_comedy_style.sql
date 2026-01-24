-- Migration: 300 - Add comedy_style to Argock
-- Description: Argock was added in migration 069 with comedian_style_id but never got comedy_style populated
-- The training domain requires comedy_style for persona building
-- Created: 2026-01-01

BEGIN;

-- Set Argock's comedy_style to match Moe Howard's style (his comedian_style_id reference)
UPDATE characters
SET
  comedy_style = 'Slapstick authoritarian, aggressive control, violent rhythm',
  comedian_name = 'Moe Howard'
WHERE id = 'argock';

-- Verify the update
DO $$
DECLARE
  argock_record RECORD;
BEGIN
  SELECT id, name, comedy_style, comedian_name
  INTO argock_record
  FROM characters
  WHERE id = 'argock';

  IF argock_record.id IS NULL THEN
    RAISE EXCEPTION 'Argock character not found';
  END IF;

  IF argock_record.comedy_style IS NULL THEN
    RAISE EXCEPTION 'Failed to set Argock comedy_style';
  END IF;

  IF argock_record.comedian_name IS NULL THEN
    RAISE EXCEPTION 'Failed to set Argock comedian_name';
  END IF;

  RAISE NOTICE 'Successfully set Argock comedy_style: % (comedian: %)',
    argock_record.comedy_style,
    argock_record.comedian_name;
END $$;

COMMIT;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (300, '300_add_argock_comedy_style')
ON CONFLICT (version) DO NOTHING;
