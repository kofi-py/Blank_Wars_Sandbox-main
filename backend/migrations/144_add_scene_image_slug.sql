-- Migration: 144_add_scene_image_slug
-- Description: Add scene_image_slug column to characters table for non-battle image mapping
-- PHILOSOPHY: Fail-fast, no fallbacks - if data is missing, throw errors immediately

BEGIN;

-- Add scene_image_slug column to characters table safely
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'characters' AND column_name = 'scene_image_slug') THEN
        ALTER TABLE characters ADD COLUMN scene_image_slug VARCHAR(100) NOT NULL DEFAULT '';
    END IF;
END $$;

-- Populate scene_image_slug with id by default
UPDATE characters SET scene_image_slug = id;

-- Update exceptions where filename differs from ID
-- CRITICAL: These must match the standardized filenames in the repo (post-cleanup)
UPDATE characters SET scene_image_slug = 'frankenstein' WHERE id = 'frankenstein_monster';
UPDATE characters SET scene_image_slug = 'space_cyborg' WHERE id = 'space_cyborg'; -- Ensure it's space_cyborg, not cyborg
UPDATE characters SET scene_image_slug = 'rilak' WHERE id = 'rilak_trelkar'; -- Map Rilak Trelkar to 'rilak' filenames

-- Remove default constraint after populating data
ALTER TABLE characters ALTER COLUMN scene_image_slug DROP DEFAULT;

-- Create index for lookups
CREATE INDEX IF NOT EXISTS idx_characters_scene_image_slug ON characters (scene_image_slug);

-- Record migration
INSERT INTO migration_log (version, name) VALUES (144, '144_add_scene_image_slug') ON CONFLICT (version) DO NOTHING;

COMMIT;
