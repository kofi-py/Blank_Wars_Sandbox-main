-- Migration: Fix Foreign Key on character_category_preferences
-- Description: Changes the FK to point to user_characters instead of characters.

BEGIN;

-- 1. Drop the incorrect constraint if it exists
ALTER TABLE character_category_preferences 
DROP CONSTRAINT IF EXISTS character_category_preferences_character_id_fkey;

-- 2. Add the correct constraint safely
-- We try to add it. If it fails due to duplicates, we assume it's done. 
-- However, standard SQL scripts just run.
-- Since we dropped it above, we can add it safely now.

ALTER TABLE character_category_preferences 
ADD CONSTRAINT character_category_preferences_character_id_fkey 
FOREIGN KEY (character_id) REFERENCES user_characters(id) ON DELETE CASCADE;

COMMIT;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (253, '253_fix_preference_fk')
ON CONFLICT (version) DO NOTHING;
