-- Migration: Add species column and rename characters
-- Purpose: Support species-aware therapy and fix character naming

-- Step 1: Rename character IDs to proper names
UPDATE characters SET id = 'rilak_trelkar' WHERE id = 'zeta_reticulan';
UPDATE characters SET id = 'zxk14bw7' WHERE id = 'alien_therapist';

-- Step 2: Add species column
ALTER TABLE characters ADD COLUMN IF NOT EXISTS species VARCHAR(50);

-- Step 3: Set species for all characters
UPDATE characters SET species = 'zeta_reticulan_grey' WHERE id = 'rilak_trelkar';
UPDATE characters SET species = 'zeta_reticulan_grey' WHERE id = 'zxk14bw7';
UPDATE characters SET species = 'reptilian' WHERE id = 'zyxthala_reptilian';
UPDATE characters SET species = 'dire_wolf' WHERE id = 'fenrir';
UPDATE characters SET species = 'vampire' WHERE id = 'dracula';
UPDATE characters SET species = 'cyborg' WHERE id = 'space_cyborg';
UPDATE characters SET species = 'human' WHERE species IS NULL;

-- Step 4: Make species NOT NULL with default
ALTER TABLE characters ALTER COLUMN species SET NOT NULL;
ALTER TABLE characters ALTER COLUMN species SET DEFAULT 'human';
