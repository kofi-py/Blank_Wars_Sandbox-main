-- Migration 288: Fix generated columns NULL in BEFORE INSERT trigger
--
-- Problem: financial_stress and coach_trust_level are GENERATED ALWAYS columns.
-- PostgreSQL computes them AFTER the BEFORE INSERT trigger runs, so they're NULL
-- when sync_current_mood() tries to read them, causing:
-- "STRICT MODE: missing required stat: financial_stress"
--
-- Fix: BEFORE INSERT sets current_mood to a temporary value (50).
-- AFTER INSERT trigger recalculates mood with real generated column values.

-- ============================================================================
-- STEP 1: Update sync_current_mood to skip calculation on INSERT
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_current_mood() RETURNS TRIGGER AS $$
DECLARE
  v_modifiers_array JSONB;
  v_calculated_mood INTEGER;
BEGIN
  -- On INSERT: generated columns (financial_stress, coach_trust_level) are NULL.
  -- Set temporary mood and let AFTER INSERT trigger calculate the real value.
  IF TG_OP = 'INSERT' THEN
    NEW.current_mood := 50;
    RETURN NEW;
  END IF;

  -- On UPDATE: generated columns are populated, calculate normally
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

  NEW.current_mood := v_calculated_mood;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 2: Create AFTER INSERT trigger to calculate mood with real values
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_current_mood_after_insert() RETURNS TRIGGER AS $$
DECLARE
  v_modifiers_array JSONB;
  v_calculated_mood INTEGER;
BEGIN
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
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 3: Create the AFTER INSERT trigger
-- ============================================================================

DROP TRIGGER IF EXISTS trg_sync_current_mood_after_insert ON user_characters;

CREATE TRIGGER trg_sync_current_mood_after_insert
  AFTER INSERT ON user_characters
  FOR EACH ROW
  EXECUTE FUNCTION sync_current_mood_after_insert();

-- ============================================================================
-- STEP 4: Log migration
-- ============================================================================

INSERT INTO migration_log (version, name)
VALUES (288, '288_fix_generated_columns_in_mood_trigger')
ON CONFLICT (version) DO NOTHING;
