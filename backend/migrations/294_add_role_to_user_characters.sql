-- Migration 294: Add role column to user_characters
--
-- Problem: System characters (therapist, judge, etc.) are forced to have
-- contestant-specific columns like sleeping_arrangement and gameplay_mood_modifiers.
--
-- Fix:
-- 1. Add role column to user_characters
-- 2. Populate from characters table
-- 3. Remove NOT NULL from columns that only apply to contestants
-- 4. Add CHECK constraints that only require these for contestants

BEGIN;

-- =====================================================
-- 1. ADD role COLUMN TO user_characters
-- =====================================================

ALTER TABLE user_characters ADD COLUMN IF NOT EXISTS role TEXT;

-- =====================================================
-- 2. POPULATE role FROM characters TABLE
-- =====================================================

UPDATE user_characters uc
SET role = c.role
FROM characters c
WHERE uc.character_id = c.id
AND uc.role IS NULL;

-- =====================================================
-- 3. SET NOT NULL ON role (all rows now have values)
-- =====================================================

ALTER TABLE user_characters ALTER COLUMN role SET NOT NULL;

-- =====================================================
-- 4. REMOVE NOT NULL FROM contestant-only columns
-- =====================================================

ALTER TABLE user_characters ALTER COLUMN sleeping_arrangement DROP NOT NULL;
ALTER TABLE user_characters ALTER COLUMN gameplay_mood_modifiers DROP NOT NULL;

-- =====================================================
-- 5. ADD CHECK CONSTRAINTS - only contestants need these
-- =====================================================

ALTER TABLE user_characters
ADD CONSTRAINT chk_contestant_sleeping_arrangement
CHECK (role != 'contestant' OR sleeping_arrangement IS NOT NULL);

ALTER TABLE user_characters
ADD CONSTRAINT chk_contestant_gameplay_mood_modifiers
CHECK (role != 'contestant' OR gameplay_mood_modifiers IS NOT NULL);

-- =====================================================
-- 6. ADD TRIGGER TO AUTO-SET role ON INSERT
-- =====================================================

CREATE OR REPLACE FUNCTION set_user_character_role()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.role IS NULL THEN
    SELECT role INTO NEW.role FROM characters WHERE id = NEW.character_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_user_character_role ON user_characters;
CREATE TRIGGER trg_set_user_character_role
BEFORE INSERT ON user_characters
FOR EACH ROW
EXECUTE FUNCTION set_user_character_role();

-- =====================================================
-- 7. LOG MIGRATION
-- =====================================================

INSERT INTO migration_log (version, name)
VALUES (294, '294_add_role_to_user_characters')
ON CONFLICT (version) DO NOTHING;

COMMIT;
