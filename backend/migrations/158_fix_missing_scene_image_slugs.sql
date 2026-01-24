-- Migration: 158_fix_missing_scene_image_slugs
-- Description: Fix characters added after migration 144 that are missing scene_image_slug
-- This sets scene_image_slug = id for any character where it's NULL or empty

-- Fix any characters with NULL or empty scene_image_slug
UPDATE characters
SET scene_image_slug = id
WHERE scene_image_slug IS NULL OR scene_image_slug = '';

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (158, '158_fix_missing_scene_image_slugs')
ON CONFLICT (version) DO NOTHING;
