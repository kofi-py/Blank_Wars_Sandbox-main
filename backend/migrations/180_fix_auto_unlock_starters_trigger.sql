-- Migration 181: Fix auto_unlock_starters trigger
-- Issue: Original trigger (163) referenced NEW.archetype and NEW.species on user_characters,
-- but those columns exist on the characters table, not user_characters.
-- Fix: Fetch archetype/species from characters table using NEW.character_id

-- Drop the broken trigger first
DROP TRIGGER IF EXISTS trigger_auto_unlock_starters ON user_characters;

-- Recreate the function with correct column references
CREATE OR REPLACE FUNCTION auto_unlock_starters()
RETURNS TRIGGER AS $$
DECLARE
    v_archetype text;
    v_species text;
BEGIN
    -- Fetch archetype and species from characters table (not user_characters)
    SELECT archetype, species INTO v_archetype, v_species
    FROM characters
    WHERE id = NEW.character_id;

    -- 1. Unlock Starter Powers for this user_character
    INSERT INTO character_powers (character_id, power_id, mastery_points, mastery_level)
    SELECT NEW.id, p.id, 0, 1
    FROM power_definitions p
    WHERE p.is_starter = TRUE
    ON CONFLICT DO NOTHING;

    -- 2. Unlock Starter Spells for this user_character
    INSERT INTO character_spells (character_id, spell_id, mastery_points, mastery_level)
    SELECT NEW.id, s.id, 0, 1
    FROM spell_definitions s
    WHERE s.is_starter = TRUE
    AND (
        -- A. Signature Spell: Matches the base character
        (s.character_id IS NOT NULL AND s.character_id = NEW.character_id)
        OR
        -- B. Archetype Spell: Matches character's archetype
        (s.archetype IS NOT NULL AND s.archetype = v_archetype)
        OR
        -- C. Species Spell: Matches character's species
        (s.species IS NOT NULL AND s.species = v_species)
        OR
        -- D. Universal Spell: No specific requirements
        (s.archetype IS NULL AND s.character_id IS NULL AND s.species IS NULL)
    )
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_auto_unlock_starters
AFTER INSERT ON user_characters
FOR EACH ROW
EXECUTE FUNCTION auto_unlock_starters();

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (180, '180_fix_auto_unlock_starters_trigger')
ON CONFLICT (version) DO NOTHING;
