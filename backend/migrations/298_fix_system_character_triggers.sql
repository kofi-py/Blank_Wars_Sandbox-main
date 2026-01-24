-- Migration 298: Fix remaining triggers for system characters
--
-- Problem: sync_current_mood_after_insert and upsert_sleeping_mood_modifier
-- have STRICT MODE checks that fail for system characters (no mood/sleeping data).
--
-- Solution: Add system character skip to both functions.

BEGIN;

-- =====================================================
-- 1. FIX sync_current_mood_after_insert
-- =====================================================

CREATE OR REPLACE FUNCTION public.sync_current_mood_after_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_modifiers_array JSONB;
  v_calculated_mood INTEGER;
BEGIN
  -- System characters don't need mood - skip entirely
  IF NEW.role IS NOT NULL AND NEW.role != 'contestant' THEN
    RETURN NEW;
  END IF;

  IF NEW.gameplay_mood_modifiers IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: gameplay_mood_modifiers is null for user_character %', NEW.id;
  END IF;

  IF NEW.gameplay_mood_modifiers->'modifiers' IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: gameplay_mood_modifiers.modifiers is null for user_character %', NEW.id;
  END IF;

  IF jsonb_typeof(NEW.gameplay_mood_modifiers->'modifiers') != 'array' THEN
    RAISE EXCEPTION 'STRICT MODE: gameplay_mood_modifiers.modifiers is not an array for user_character %', NEW.id;
  END IF;

  v_modifiers_array := NEW.gameplay_mood_modifiers->'modifiers';

  v_calculated_mood := calculate_mood_from_stats(
    NEW.character_id,
    NEW.current_mental_health,
    NEW.current_morale,
    NEW.current_stress,
    NEW.current_fatigue,
    NEW.current_confidence,
    NEW.financial_stress,
    NEW.coach_trust_level,
    NEW.bond_level,
    NEW.current_team_player,
    NEW.current_health,
    NEW.current_max_health,
    NEW.win_percentage,
    NEW.gameplan_adherence,
    NEW.current_win_streak,
    NEW.current_energy,
    NEW.current_max_energy,
    NEW.current_mana,
    NEW.current_max_mana,
    NEW.wallet,
    NEW.debt_principal,
    v_modifiers_array
  );

  -- AFTER trigger must use UPDATE to modify the row
  UPDATE user_characters SET current_mood = v_calculated_mood WHERE id = NEW.id;

  RETURN NEW;
END;
$function$;

-- =====================================================
-- 2. FIX upsert_sleeping_mood_modifier
-- =====================================================

CREATE OR REPLACE FUNCTION public.upsert_sleeping_mood_modifier(p_userchar_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
  v_uc RECORD;
  v_role TEXT;
  v_sleeping_modifier INTEGER;
  v_sleeping_source TEXT;
  v_new_modifier JSONB;
  v_modifiers JSONB;
BEGIN
  -- Check if this is a system character - skip if so
  SELECT c.role INTO v_role
  FROM user_characters uc
  JOIN characters c ON uc.character_id = c.id
  WHERE uc.id = p_userchar_id;

  IF v_role IS NOT NULL AND v_role != 'contestant' THEN
    RETURN;  -- System characters don't need sleeping mood modifiers
  END IF;

  SELECT uc.sleeping_arrangement, uc.gameplay_mood_modifiers
  INTO v_uc
  FROM user_characters uc
  WHERE uc.id = p_userchar_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'STRICT MODE: User character % not found', p_userchar_id;
  END IF;

  IF v_uc.sleeping_arrangement IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: sleeping_arrangement is null for user character %', p_userchar_id;
  END IF;

  IF v_uc.gameplay_mood_modifiers IS NULL OR jsonb_typeof(v_uc.gameplay_mood_modifiers->'modifiers') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'STRICT MODE: gameplay_mood_modifiers is null or malformed for user character %', p_userchar_id;
  END IF;

  SELECT mood_modifier
  INTO v_sleeping_modifier
  FROM sleeping_spot_types
  WHERE id = v_uc.sleeping_arrangement;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'STRICT MODE: sleeping_spot_types missing for sleeping_arrangement %', v_uc.sleeping_arrangement;
  END IF;

  IF v_sleeping_modifier IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: sleeping_spot_types.mood_modifier is null for sleeping_arrangement %', v_uc.sleeping_arrangement;
  END IF;

  v_sleeping_source := 'sleeping_' || v_uc.sleeping_arrangement;

  v_new_modifier := jsonb_build_object(
    'source', v_sleeping_source,
    'value', v_sleeping_modifier,
    'current_value', v_sleeping_modifier,
    'applied_at', NOW(),
    'expires_at', NULL,
    'decay_rate', NULL,
    'removable_by', NULL
  );

  SELECT COALESCE(jsonb_agg(m), '[]'::jsonb)
  INTO v_modifiers
  FROM jsonb_array_elements(v_uc.gameplay_mood_modifiers->'modifiers') AS m
  WHERE COALESCE(m->>'source', '') NOT LIKE 'sleeping_%';

  v_modifiers := v_modifiers || jsonb_build_array(v_new_modifier);

  UPDATE user_characters
  SET gameplay_mood_modifiers = jsonb_set(
    v_uc.gameplay_mood_modifiers,
    '{modifiers}',
    v_modifiers
  )
  WHERE id = p_userchar_id;
END;
$function$;

-- =====================================================
-- 3. LOG MIGRATION
-- =====================================================

INSERT INTO migration_log (version, name)
VALUES (298, '298_fix_system_character_triggers')
ON CONFLICT (version) DO NOTHING;

COMMIT;
