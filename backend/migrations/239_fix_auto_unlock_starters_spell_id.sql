-- Migration 239: Fix auto_unlock_starters trigger - s.spell_id does not exist
-- Problem: The trigger uses s.spell_id but the column is actually s.id in spell_definitions
-- This file is updated to contain the CORRECT SQL (verified against production schema)
-- to ensure it runs successfully if the migration runner attempts it.

BEGIN;

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
    INSERT INTO character_powers (character_id, power_id, mastery_points, mastery_level)
    SELECT NEW.id, p.id, 0, 1
    FROM power_definitions p
    WHERE p.is_starter = TRUE
    ON CONFLICT DO NOTHING;

    -- 2. Unlock Starter Spells (FIX: s.id instead of s.spell_id)
    INSERT INTO character_spells (character_id, spell_id, mastery_points, mastery_level)
    SELECT NEW.id, s.id, 0, 1
    FROM spell_definitions s
    WHERE s.is_starter = TRUE
    AND (
        -- A. Signature Spell: Matches Character ID
        (s.character_id IS NOT NULL AND s.character_id = NEW.character_id)
        OR
        -- B. Archetype Spell: Matches Archetype
        (s.archetype IS NOT NULL AND s.archetype = v_archetype)
        OR
        -- C. Species Spell: Matches Species
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

-- Log migration outside transaction
INSERT INTO migration_log (version, name)
VALUES (239, '239_fix_auto_unlock_starters_spell_id')
ON CONFLICT (version) DO NOTHING;
