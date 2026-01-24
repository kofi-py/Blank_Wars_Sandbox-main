-- Migration 237: Fix auto_unlock_starters trigger and create therapist user_characters entries
-- 
-- Problem 1: auto_unlock_starters() references s.spell_id but column is s.id
-- Problem 2: Migration 212 logged as run but therapist entries never created (used text id for uuid column)

BEGIN;

-- STEP 1: Fix the auto_unlock_starters trigger (s.spell_id -> s.id)
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

-- STEP 2: Create user_characters entries for therapists, judges, hosts, system characters
-- Uses gen_random_uuid() for proper UUID id column
INSERT INTO user_characters (
  id, user_id, character_id, nickname, level, experience, bond_level,
  current_health, current_max_health, equipment, is_injured,
  total_battles, total_wins, current_stress, current_mental_health,
  current_training, current_team_player, current_ego, current_communication, acquired_at
)
SELECT 
  gen_random_uuid() AS id,
  u.id AS user_id,
  c.id AS character_id,
  c.name AS nickname,
  1, 0, 0,
  LEAST(GREATEST(COALESCE(c.max_health, 100), 1), 999),
  LEAST(GREATEST(COALESCE(c.max_health, 100), 1), 999),
  '[]', false, 0, 0, 0,
  LEAST(GREATEST(COALESCE(c.mental_health, 80), 0), 100),
  LEAST(GREATEST(COALESCE(c.training, 75), 0), 100),
  LEAST(GREATEST(COALESCE(c.team_player, 70), 0), 100),
  LEAST(GREATEST(COALESCE(c.ego, 60), 0), 100),
  LEAST(GREATEST(COALESCE(c.communication, 80), 0), 100),
  NOW()
FROM users u
CROSS JOIN characters c
WHERE c.role IN ('judge', 'therapist', 'host', 'system')
AND NOT EXISTS (
  SELECT 1 FROM user_characters uc 
  WHERE uc.user_id = u.id AND uc.character_id = c.id
);

COMMIT;

-- STEP 3: Log migration (Outside Transaction - the runner handles this mostly, but good for idempotency)
INSERT INTO migration_log (version, name)
VALUES (237, '237_fix_trigger_and_create_therapist_entries')
ON CONFLICT (version) DO NOTHING;
