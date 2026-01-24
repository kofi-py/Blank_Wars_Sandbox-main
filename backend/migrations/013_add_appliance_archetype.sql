-- Migration: Add appliance archetype for Crumbsworth and future appliance characters
-- Purpose: Support the new appliance archetype class

-- Step 1: Drop the existing constraint
ALTER TABLE characters DROP CONSTRAINT IF EXISTS characters_archetype_check;

-- Step 2: Add new constraint including 'appliance'
ALTER TABLE characters ADD CONSTRAINT characters_archetype_check
  CHECK (archetype = ANY (ARRAY[
    'warrior'::text,
    'scholar'::text,
    'trickster'::text,
    'beast'::text,
    'leader'::text,
    'mage'::text,
    'mystic'::text,
    'tank'::text,
    'assassin'::text,
    'appliance'::text,
    'system'::text
  ]));

-- Step 3: Add comment
COMMENT ON CONSTRAINT characters_archetype_check ON characters IS 'Allowed archetypes including the new appliance class for sentient objects/machines';
