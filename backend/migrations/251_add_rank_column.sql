-- Migration: Add missing rank column to character_category_preferences
-- Description: Adds the 'rank' column safely and ensures constraints/defaults exist.

BEGIN;

-- 1. Add the column safely if it doesn't exist
ALTER TABLE character_category_preferences 
ADD COLUMN IF NOT EXISTS rank INTEGER;

-- 2. Set the Default Value (Migration 196 created it without a default)
ALTER TABLE character_category_preferences 
ALTER COLUMN rank SET DEFAULT 2;

-- 3. Populate existing NULLs if any (safety check)
UPDATE character_category_preferences 
SET rank = 2 
WHERE rank IS NULL;

-- 4. Apply NOT NULL constraint safely
ALTER TABLE character_category_preferences 
ALTER COLUMN rank SET NOT NULL;

-- 5. Add Check Constraint safely (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'character_category_preferences_rank_check') THEN
        ALTER TABLE character_category_preferences 
        ADD CONSTRAINT character_category_preferences_rank_check CHECK (rank >= 1 AND rank <= 4);
    END IF;
END $$;

COMMIT;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (251, '251_add_rank_column')
ON CONFLICT (version) DO NOTHING;
