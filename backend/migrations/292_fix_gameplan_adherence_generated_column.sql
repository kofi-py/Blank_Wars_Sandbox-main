-- Migration 292: Fix gameplan_adherence GENERATED column in BEFORE UPDATE trigger
--
-- Problem: gameplan_adherence is also a GENERATED column and is NULL in NEW
-- during BEFORE UPDATE trigger, causing "missing required stat: gameplan_adherence"
--
-- Fix: Add gameplan_adherence to the list of GENERATED columns that use OLD values.
-- For the init UPDATE, OLD contains the values computed during INSERT (same values).

BEGIN;

CREATE OR REPLACE FUNCTION sync_current_mood() RETURNS TRIGGER AS $$
DECLARE
  v_modifiers_array JSONB;
  v_calculated_mood INTEGER;
  v_financial_stress INTEGER;
  v_coach_trust_level INTEGER;
  v_gameplan_adherence INTEGER;
BEGIN
  -- On INSERT: generated columns (financial_stress, coach_trust_level, gameplan_adherence) are NULL.
  -- Set temporary mood and let AFTER INSERT trigger calculate the real value.
  IF TG_OP = 'INSERT' THEN
    NEW.current_mood := 50;
    RETURN NEW;
  END IF;

  -- On UPDATE: GENERATED columns may be NULL in NEW (PostgreSQL behavior).
  -- PostgreSQL computes GENERATED columns AFTER BEFORE triggers complete.
  --
  -- For columns generated from financial_personality:
  -- If financial_personality changed, NEW has the computed value. Otherwise use OLD.
  IF NEW.financial_personality IS DISTINCT FROM OLD.financial_personality THEN
    v_financial_stress := NEW.financial_stress;
    v_coach_trust_level := NEW.coach_trust_level;
  ELSE
    v_financial_stress := OLD.financial_stress;
    v_coach_trust_level := OLD.coach_trust_level;
  END IF;

  -- gameplan_adherence is GENERATED from multiple columns (current_training, current_morale, etc.)
  -- In BEFORE UPDATE, the new computed value isn't available yet.
  -- Use OLD value - for init UPDATE, this is the value computed during INSERT.
  v_gameplan_adherence := OLD.gameplan_adherence;

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
    v_gameplan_adherence,
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
VALUES (292, '292_fix_gameplan_adherence_generated_column')
ON CONFLICT (version) DO NOTHING;

COMMIT;
