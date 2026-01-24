-- Migration 291: Fix GENERATED columns NULL in BEFORE UPDATE trigger
--
-- Problem: In BEFORE UPDATE trigger, GENERATED columns (financial_stress, coach_trust_level)
-- are NULL in NEW when not explicitly set by the UPDATE statement.
-- This causes "STRICT MODE: missing required stat: financial_stress" when
-- initialize_user_character_stats does an UPDATE that triggers sync_current_mood.
--
-- Fix: Explicitly check if the source column (financial_personality) changed.
-- If it changed, PostgreSQL computed the new GENERATED value in NEW.
-- If it didn't change, use OLD (the current stored value, which is correct).

BEGIN;

CREATE OR REPLACE FUNCTION sync_current_mood() RETURNS TRIGGER AS $$
DECLARE
  v_modifiers_array JSONB;
  v_calculated_mood INTEGER;
  v_financial_stress INTEGER;
  v_coach_trust_level INTEGER;
BEGIN
  -- On INSERT: generated columns (financial_stress, coach_trust_level) are NULL.
  -- Set temporary mood and let AFTER INSERT trigger calculate the real value.
  IF TG_OP = 'INSERT' THEN
    NEW.current_mood := 50;
    RETURN NEW;
  END IF;

  -- On UPDATE: GENERATED columns (financial_stress, coach_trust_level) are computed
  -- from financial_personality. PostgreSQL only populates NEW with the computed value
  -- if the source column is being updated. Otherwise NEW has NULL.
  --
  -- Logic: If source changed, use NEW (newly computed). If not, use OLD (unchanged).
  IF NEW.financial_personality IS DISTINCT FROM OLD.financial_personality THEN
    v_financial_stress := NEW.financial_stress;
    v_coach_trust_level := NEW.coach_trust_level;
  ELSE
    v_financial_stress := OLD.financial_stress;
    v_coach_trust_level := OLD.coach_trust_level;
  END IF;

  -- Validate gameplay_mood_modifiers
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
    v_financial_stress,
    v_coach_trust_level,
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

  NEW.current_mood := v_calculated_mood;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (291, '291_fix_generated_columns_in_update_trigger')
ON CONFLICT (version) DO NOTHING;

COMMIT;
