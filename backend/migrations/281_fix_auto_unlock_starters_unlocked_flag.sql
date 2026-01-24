-- Migration 281: Fix auto_unlock_starters trigger to set unlocked = true
--
-- Problem: The auto_unlock_starters trigger creates character_powers rows
-- but doesn't set unlocked = true. The column defaults to false, so all
-- starter powers are created as locked, breaking STRICT MODE validation.
--
-- Solution:
-- 1. Update the trigger function to include unlocked = true
-- 2. Fix existing data by setting unlocked = true for all starter powers

BEGIN;

-- =====================================================
-- 0. ADD 'starter' TO THE ALLOWED unlocked_by VALUES
-- =====================================================

ALTER TABLE character_spells DROP CONSTRAINT IF EXISTS character_spells_unlocked_by_check;
ALTER TABLE character_spells ADD CONSTRAINT character_spells_unlocked_by_check
CHECK (unlocked_by = ANY (ARRAY['level_up'::text, 'point_spend'::text, 'challenge_complete'::text, 'auto'::text, 'rebellion'::text, 'starter'::text]));

-- =====================================================
-- 1. FIX THE TRIGGER FUNCTION
-- =====================================================

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

    -- 1. Unlock Starter Powers (FIX: Added unlocked = true, unlocked_at = NOW())
    INSERT INTO character_powers (character_id, power_id, mastery_points, mastery_level, unlocked, unlocked_at, unlocked_by)
    SELECT NEW.id, p.id, 0, 1, true, NOW(), 'starter'
    FROM power_definitions p
    WHERE p.is_starter = TRUE
    ON CONFLICT DO NOTHING;

    -- 2. Unlock Starter Spells (FIX: Added unlocked = true, unlocked_at = NOW())
    INSERT INTO character_spells (character_id, spell_id, mastery_points, mastery_level, unlocked, unlocked_at, unlocked_by)
    SELECT NEW.id, s.id, 0, 1, true, NOW(), 'starter'
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

-- =====================================================
-- 2. FIX EXISTING DATA
-- =====================================================

-- Unlock all starter powers that were created locked
UPDATE character_powers cp
SET
    unlocked = true,
    unlocked_at = COALESCE(cp.unlocked_at, cp.created_at, NOW()),
    unlocked_by = COALESCE(cp.unlocked_by, 'starter')
FROM power_definitions pd
WHERE cp.power_id = pd.id
  AND pd.is_starter = true
  AND cp.unlocked = false;

-- Unlock all starter spells that were created locked
UPDATE character_spells cs
SET
    unlocked = true,
    unlocked_at = COALESCE(cs.unlocked_at, cs.created_at, NOW()),
    unlocked_by = COALESCE(cs.unlocked_by, 'starter')
FROM spell_definitions sd
WHERE cs.spell_id = sd.id
  AND sd.is_starter = true
  AND cs.unlocked = false;

COMMIT;

-- =====================================================
-- LOG MIGRATION
-- =====================================================

INSERT INTO migration_log (version, name)
VALUES (281, '281_fix_auto_unlock_starters_unlocked_flag')
ON CONFLICT (version) DO NOTHING;
