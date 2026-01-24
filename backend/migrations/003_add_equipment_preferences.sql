-- Migration: Add equipment preference fields to characters table
-- Date: 2025-10-16
-- Description: Add fields for weapon/armor proficiencies and preferences

ALTER TABLE characters
ADD COLUMN IF NOT EXISTS weapon_proficiencies TEXT[], -- Array of weapon types character can use (e.g., ['sword', 'spear', 'axe'])
ADD COLUMN IF NOT EXISTS preferred_weapons TEXT[], -- Array of weapon types character prefers (e.g., ['greatsword', 'battleaxe'])
ADD COLUMN IF NOT EXISTS armor_proficiency TEXT, -- 'light', 'medium', 'heavy', or 'all'
ADD COLUMN IF NOT EXISTS preferred_armor_type TEXT, -- 'light', 'medium', or 'heavy'
ADD COLUMN IF NOT EXISTS equipment_notes TEXT; -- Freeform text for specific equipment preferences/restrictions

-- Add comments for documentation
COMMENT ON COLUMN characters.weapon_proficiencies IS 'Array of weapon types this character can effectively use';
COMMENT ON COLUMN characters.preferred_weapons IS 'Array of weapon types optimal for this character based on archetype and stats';
COMMENT ON COLUMN characters.armor_proficiency IS 'What armor weight classes this character can wear effectively';
COMMENT ON COLUMN characters.preferred_armor_type IS 'Optimal armor weight for this character';
COMMENT ON COLUMN characters.equipment_notes IS 'Additional equipment preferences, restrictions, or special notes';
