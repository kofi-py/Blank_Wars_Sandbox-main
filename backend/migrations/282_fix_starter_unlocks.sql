-- Migration 282: Fix starter abilities not being unlocked
--
-- Problem:
-- 1. Trigger auto_unlock_starters doesn't set unlocked=true (defaults to false)
-- 2. Trigger uses s.spell_id which doesn't exist (should be s.id)
-- 3. character_spells constraint doesn't allow 'starter' as unlocked_by value
--
-- Result: All 452 characters have locked starter powers and spells

BEGIN;

-- =====================================================
-- 1. UPDATE CONSTRAINT TO ALLOW 'starter'
-- =====================================================

ALTER TABLE character_spells DROP CONSTRAINT IF EXISTS character_spells_unlocked_by_check;
ALTER TABLE character_spells ADD CONSTRAINT character_spells_unlocked_by_check
CHECK (unlocked_by = ANY (ARRAY['level_up'::text, 'point_spend'::text, 'challenge_complete'::text, 'auto'::text, 'rebellion'::text, 'starter'::text]));

-- =====================================================
-- 2. FIX TRIGGER FUNCTION
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

    -- 1. Unlock Starter Powers (includes unlocked=true)
    INSERT INTO character_powers (character_id, power_id, mastery_points, mastery_level, unlocked, unlocked_at, unlocked_by)
    SELECT NEW.id, p.id, 0, 1, true, NOW(), 'starter'
    FROM power_definitions p
    WHERE p.is_starter = TRUE
    ON CONFLICT DO NOTHING;

    -- 2. Unlock Starter Spells (fixed: s.id not s.spell_id, includes unlocked=true)
    INSERT INTO character_spells (character_id, spell_id, mastery_points, mastery_level, unlocked, unlocked_at, unlocked_by)
    SELECT NEW.id, s.id, 0, 1, true, NOW(), 'starter'
    FROM spell_definitions s
    WHERE s.is_starter = TRUE
    AND (
        (s.character_id IS NOT NULL AND s.character_id = NEW.character_id)
        OR
        (s.archetype IS NOT NULL AND s.archetype = v_archetype)
        OR
        (s.species IS NOT NULL AND s.species = v_species)
        OR
        (s.archetype IS NULL AND s.character_id IS NULL AND s.species IS NULL)
    )
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$function$;

-- =====================================================
-- 3. FIX EXISTING DATA
-- =====================================================

-- Unlock all starter powers
UPDATE character_powers cp
SET
    unlocked = true,
    unlocked_at = COALESCE(cp.unlocked_at, cp.created_at, NOW()),
    unlocked_by = 'starter'
FROM power_definitions pd
WHERE cp.power_id = pd.id
  AND pd.is_starter = true
  AND cp.unlocked = false;

-- Unlock all starter spells
UPDATE character_spells cs
SET
    unlocked = true,
    unlocked_at = COALESCE(cs.unlocked_at, cs.created_at, NOW()),
    unlocked_by = 'starter'
FROM spell_definitions sd
WHERE cs.spell_id = sd.id
  AND sd.is_starter = true
  AND cs.unlocked = false;

COMMIT;

-- =====================================================
-- LOG MIGRATION
-- =====================================================

INSERT INTO migration_log (version, name)
VALUES (282, '282_fix_starter_unlocks')
ON CONFLICT (version) DO NOTHING;
