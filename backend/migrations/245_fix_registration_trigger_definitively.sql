-- Migration 245: Fix Registration Trigger Definitively
-- Purpose: Fix the "s.spell_id does not exist" crash and ensure correct comparisons.
-- 1. Correct s.spell_id -> s.id in auto_unlock_starters()
-- 2. Correct character comparison NEW.id -> NEW.character_id
-- 3. Use v_archetype and v_species instead of NEW.archetype/NEW.species (which don't exist)

BEGIN;

-- FIX: Correct the Trigger Function (Registration Blocker)
CREATE OR REPLACE FUNCTION public.auto_unlock_starters()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_archetype text;
    v_species text;
BEGIN
    -- Fetch archetype and species from characters table
    SELECT archetype, species INTO v_archetype, v_species
    FROM characters
    WHERE id = NEW.character_id;

    -- 1. Unlock Starter Powers
    -- Filters by character_id, archetype, or species
    INSERT INTO character_powers (character_id, power_id, mastery_points, mastery_level)
    SELECT NEW.id, p.id, 0, 1
    FROM power_definitions p
    WHERE p.is_starter = TRUE
    AND (
        (p.character_id IS NOT NULL AND p.character_id = NEW.character_id)
        OR
        (p.archetype IS NOT NULL AND p.archetype = v_archetype)
        OR
        (p.species IS NOT NULL AND p.species = v_species)
        OR
        (p.archetype IS NULL AND p.character_id IS NULL AND p.species IS NULL)
    )
    ON CONFLICT DO NOTHING;

    -- 2. Unlock Starter Spells (FIXED: Uses s.id, not s.spell_id)
    INSERT INTO character_spells (character_id, spell_id, mastery_points, mastery_level)
    SELECT NEW.id, s.id, 0, 1
    FROM spell_definitions s
    WHERE s.is_starter = TRUE
    AND (
        -- A. Signature Spell: Matches Character ID (Canonical ID)
        (s.character_id IS NOT NULL AND s.character_id = NEW.character_id)
        OR
        -- B. Archetype Spell: Matches Archetype (using local variable)
        (s.archetype IS NOT NULL AND s.archetype = v_archetype)
        OR
        -- C. Species Spell: Matches Species (using local variable)
        (s.species IS NOT NULL AND s.species = v_species)
        OR
        -- D. Universal Spell: No specific requirements
        (s.archetype IS NULL AND s.character_id IS NULL AND s.species IS NULL)
    )
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$function$;

COMMIT;

-- Ensure previous critical logs are marked as done
INSERT INTO migration_log (version, name) VALUES 
('244', '244_fix_mood_trigger_arguments')
ON CONFLICT (version) DO NOTHING;

-- Log this migration
INSERT INTO migration_log (version, name)
VALUES ('245', '245_fix_registration_trigger_definitively')
ON CONFLICT (version) DO NOTHING;
