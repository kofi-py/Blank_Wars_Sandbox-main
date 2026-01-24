-- Migration: 124_add_character_battle_images
-- Description: Add battle image columns to characters table for database-driven image mapping
-- PHILOSOPHY: Fail-fast, no fallbacks - if data is missing, throw errors immediately

BEGIN;

-- Add battle image columns to characters table safely
DO $$
BEGIN
    -- Add battle_image_name if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'characters' AND column_name = 'battle_image_name') THEN
        ALTER TABLE characters ADD COLUMN battle_image_name VARCHAR(100) NOT NULL DEFAULT '';
    END IF;

    -- Add battle_image_variants if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'characters' AND column_name = 'battle_image_variants') THEN
        ALTER TABLE characters ADD COLUMN battle_image_variants INTEGER NOT NULL DEFAULT 7;
    END IF;
END $$;

-- Populate existing character battle image names from frontend mapping
-- These names match the actual battle image filenames in /images/colosseaum/
UPDATE characters SET battle_image_name = 'Achilles', battle_image_variants = 7 WHERE id = 'achilles';
UPDATE characters SET battle_image_name = 'Joan of Arc', battle_image_variants = 7 WHERE id = 'joan';
UPDATE characters SET battle_image_name = 'Gengas Khan', battle_image_variants = 7 WHERE id = 'genghis_khan';
UPDATE characters SET battle_image_name = 'Merlin', battle_image_variants = 7 WHERE id = 'merlin';
UPDATE characters SET battle_image_name = 'Sherlock Holmes', battle_image_variants = 7 WHERE id = 'holmes';
UPDATE characters SET battle_image_name = 'Dracula', battle_image_variants = 7 WHERE id = 'dracula';
UPDATE characters SET battle_image_name = 'Cleopatra', battle_image_variants = 7 WHERE id = 'cleopatra';
UPDATE characters SET battle_image_name = 'Sam Spade', battle_image_variants = 7 WHERE id = 'sam_spade';
UPDATE characters SET battle_image_name = 'Billy the Kid', battle_image_variants = 7 WHERE id = 'billy_the_kid';
UPDATE characters SET battle_image_name = 'Robin Hood', battle_image_variants = 7 WHERE id = 'robin_hood';
UPDATE characters SET battle_image_name = 'Agent X', battle_image_variants = 7 WHERE id = 'agent_x';
UPDATE characters SET battle_image_name = 'Frankenstein', battle_image_variants = 7 WHERE id = 'frankenstein_monster';
UPDATE characters SET battle_image_name = 'Cyborg', battle_image_variants = 7 WHERE id = 'space_cyborg';
UPDATE characters SET battle_image_name = 'Rilak', battle_image_variants = 7 WHERE id = 'rilak_trelkar';
UPDATE characters SET battle_image_name = 'Fenrir', battle_image_variants = 7 WHERE id = 'fenrir';
UPDATE characters SET battle_image_name = 'Sun Wukong', battle_image_variants = 7 WHERE id = 'sun_wukong';
UPDATE characters SET battle_image_name = 'Tesla', battle_image_variants = 7 WHERE id = 'tesla';
UPDATE characters SET battle_image_name = 'Aleister Crowley', battle_image_variants = 7 WHERE id = 'aleister_crowley';
UPDATE characters SET battle_image_name = 'Archangel Michael', battle_image_variants = 7 WHERE id = 'archangel_michael';
UPDATE characters SET battle_image_name = 'Crumbsworth', battle_image_variants = 7 WHERE id = 'crumbsworth';
UPDATE characters SET battle_image_name = 'Don Quixote', battle_image_variants = 7 WHERE id = 'don_quixote';
UPDATE characters SET battle_image_name = 'Jack the Ripper', battle_image_variants = 7 WHERE id = 'jack_the_ripper';
UPDATE characters SET battle_image_name = 'Kali', battle_image_variants = 7 WHERE id = 'kali';
UPDATE characters SET battle_image_name = 'Kangaroo', battle_image_variants = 7 WHERE id = 'kangaroo';
UPDATE characters SET battle_image_name = 'Karna', battle_image_variants = 7 WHERE id = 'karna';
UPDATE characters SET battle_image_name = 'Little Bo Peep', battle_image_variants = 7 WHERE id = 'little_bo_peep';
UPDATE characters SET battle_image_name = 'Mami Wata', battle_image_variants = 7 WHERE id = 'mami_wata';
UPDATE characters SET battle_image_name = 'Napoleon Bonaparte', battle_image_variants = 7 WHERE id = 'napoleon_bonaparte';
UPDATE characters SET battle_image_name = 'Quetzalcoatl', battle_image_variants = 7 WHERE id = 'quetzalcoatl';
UPDATE characters SET battle_image_name = 'Ramses II', battle_image_variants = 7 WHERE id = 'ramses_ii';
UPDATE characters SET battle_image_name = 'Shaka Zulu', battle_image_variants = 7 WHERE id = 'shaka_zulu';
UPDATE characters SET battle_image_name = 'Unicorn', battle_image_variants = 7 WHERE id = 'unicorn';
UPDATE characters SET battle_image_name = 'Velociraptor', battle_image_variants = 7 WHERE id = 'velociraptor';

-- Remove default constraint after populating data
-- This enforces that all future character insertions MUST include battle_image_name
ALTER TABLE characters ALTER COLUMN battle_image_name DROP DEFAULT;

-- Create index for battle image lookups
CREATE INDEX idx_characters_battle_image ON characters (battle_image_name);

-- Verify all non-system characters have battle_image_name populated
DO $$
DECLARE
    missing_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO missing_count
    FROM characters
    WHERE rarity IS NOT NULL AND (battle_image_name = '' OR battle_image_name IS NULL);
    
    IF missing_count > 0 THEN
        RAISE EXCEPTION 'Migration failed: % characters missing battle_image_name', missing_count;
    END IF;
END $$;

-- Record migration
-- Record migration safely
INSERT INTO migration_log (version, name) VALUES (125, '125_add_character_battle_images') ON CONFLICT (version) DO NOTHING;

COMMIT;
