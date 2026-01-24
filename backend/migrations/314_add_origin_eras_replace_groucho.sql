-- Migration 314: Add missing origin_era values and replace Groucho Marx with P.T. Barnum
--
-- This migration:
-- 1. Adds origin_era to 20 system characters (mascots, hosts, real_estate_agents, trainers)
-- 2. Replaces groucho_marx with pt_barnum as a host (Groucho not public domain until 2027)

BEGIN;

-- ============================================================================
-- MASCOTS (13 characters)
-- ============================================================================

UPDATE characters SET origin_era = 'The Wild, Present Day' WHERE id = 'honey_badger';
UPDATE characters SET origin_era = 'Ancient Egypt, The Old Kingdom' WHERE id = 'sphinx';
UPDATE characters SET origin_era = 'The Salish Sea, Pacific Northwest, J-Pod, Present Day' WHERE id = 'orca';
UPDATE characters SET origin_era = 'Campion District, Western Australia, November 1932' WHERE id = 'emu';
UPDATE characters SET origin_era = 'Amboseli National Park, Kenya, Present Day' WHERE id = 'elephant';
UPDATE characters SET origin_era = 'A Glass Bowl in Mr. Chen''s Study, Hangzhou, Song Dynasty' WHERE id = 'goldfish';
UPDATE characters SET origin_era = 'The Arabian Desert, As Described by Herodotus, 500 BCE' WHERE id = 'phoenix';
UPDATE characters SET origin_era = 'The Eighth Plague, Egypt, 1446 BCE' WHERE id = 'locusts';
UPDATE characters SET origin_era = 'The Murrumbidgee River, New South Wales, 1798' WHERE id = 'platypus';
UPDATE characters SET origin_era = 'The Adirondack Mountains, New York, Present Day' WHERE id = 'porcupine';
UPDATE characters SET origin_era = 'Hell''s Kitchen Cupcakes, New York, 3:47 AM Last Tuesday' WHERE id = 'cupcake';
UPDATE characters SET origin_era = 'Biological Research Module, International Space Station, 2024' WHERE id = 'streptococcus_a';
UPDATE characters SET origin_era = 'Dunnottar Castle, Scotland, The Siege of 1652' WHERE id = 'wraith';

-- ============================================================================
-- HOSTS (3 characters - 2 updates, 1 replacement)
-- ============================================================================

UPDATE characters SET origin_era = 'Fleischer Studios, New York, 1930' WHERE id = 'betty_boop';
UPDATE characters SET origin_era = 'The Tea Party, Wonderland, 1865' WHERE id = 'mad_hatter';

-- Replace Groucho Marx with P.T. Barnum
-- Step 1: Insert P.T. Barnum FIRST (before updating FKs that will reference him)
INSERT INTO characters (
    id, name, role, species, archetype, origin_era, backstory,
    personality_traits, comedy_style, scene_image_slug, rarity
) VALUES (
    'pt_barnum',
    'P.T. Barnum',
    'host',
    'human',
    'showman',
    'The Greatest Show on Earth, Madison Square Garden, Opening Night, 1874',
    'You are Phineas Taylor Barnum, the greatest showman who ever lived. You founded the Barnum & Bailey Circus and turned spectacle into an art form. You believe there is a sucker born every minute, and you say it with a smile that makes them thank you for the observation. You have promoted opera singers, exhibited curiosities both real and fabricated, and created entertainment empires. Every moment is an opportunity for drama, every person a potential audience member. You never let the truth get in the way of a good story, and you never let a good story go untold.',
    '["theatrical", "bombastic", "shrewd", "charismatic", "opportunistic", "larger than life"]'::jsonb,
    'Theatrical ringmaster bombast with a carnival barker''s rapid-fire patter, sells the sizzle not the steak, turns mundane into magnificent through sheer force of enthusiasm, winks at the audience while spinning tall tales, makes you feel like you''re part of the greatest show on earth even when you know you''re being had',
    'host_barnum',
    'epic'
);

-- Step 2: Update user_characters that have groucho_marx as their assigned host
UPDATE user_characters SET host_id = 'pt_barnum' WHERE host_id = 'groucho_marx';

-- Step 3: Update the system character's own user_characters instances
UPDATE user_characters SET character_id = 'pt_barnum' WHERE character_id = 'groucho_marx';

-- Step 4: Delete Groucho Marx LAST (after all references are updated)
DELETE FROM characters WHERE id = 'groucho_marx';

-- ============================================================================
-- REAL ESTATE AGENTS (3 characters)
-- ============================================================================

UPDATE characters SET origin_era = 'Long Island, New York, 1977' WHERE id = 'barry';
UPDATE characters SET origin_era = 'Rossum Universal Robots Factory, Prague, 2045' WHERE id = 'lmb_3000';
UPDATE characters SET origin_era = 'A Rotting Cesspool, Dreaded Dimension 17-R, 50,000 Years Hence, A Timeline That Never Occurred' WHERE id = 'zyxthala';

-- ============================================================================
-- TRAINERS (2 characters)
-- ============================================================================

UPDATE characters SET origin_era = 'Mount Olympus, The Age of Heroes, Ancient Greece' WHERE id = 'athena';
UPDATE characters SET origin_era = 'Thimble Theatre, King Features Syndicate, 1929' WHERE id = 'popeye';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT id, name, role, origin_era
FROM characters
WHERE role IN ('mascot', 'host', 'real_estate_agent', 'trainer')
ORDER BY role, id;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (314, '314_add_origin_eras_replace_groucho')
ON CONFLICT (version) DO NOTHING;

COMMIT;
