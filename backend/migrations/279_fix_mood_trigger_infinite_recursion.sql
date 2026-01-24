-- Migration 279: Fix sync_current_mood infinite recursion
--
-- CRITICAL BUG: The AFTER UPDATE trigger was doing UPDATE user_characters,
-- which fired the trigger again, causing infinite recursion and stack overflow.
--
-- FIX: Change to BEFORE trigger that modifies NEW.current_mood directly.

-- ============================================================================
-- STEP 1: Drop the broken AFTER triggers
-- ============================================================================

DROP TRIGGER IF EXISTS trg_sync_current_mood_insert ON user_characters;
DROP TRIGGER IF EXISTS trg_sync_current_mood_update ON user_characters;

-- ============================================================================
-- STEP 2: Replace trigger function to use BEFORE trigger pattern
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_current_mood() RETURNS TRIGGER AS $$
DECLARE
  v_modifiers_array JSONB;
  v_calculated_mood INTEGER;
BEGIN
  -- STRICT MODE: Validate gameplay_mood_modifiers structure
  IF NEW.gameplay_mood_modifiers IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: gameplay_mood_modifiers is null for user_character %', NEW.id;
  END IF;

  IF NEW.gameplay_mood_modifiers->'modifiers' IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: gameplay_mood_modifiers.modifiers is null for user_character %', NEW.id;
  END IF;

  IF jsonb_typeof(NEW.gameplay_mood_modifiers->'modifiers') != 'array' THEN
    RAISE EXCEPTION 'STRICT MODE: gameplay_mood_modifiers.modifiers is not an array for user_character %', NEW.id;
  END IF;

  -- Extract just the modifiers array to pass to function
  v_modifiers_array := NEW.gameplay_mood_modifiers->'modifiers';

  -- Calculate mood and set it directly on NEW (no UPDATE needed)
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

  -- Set the mood directly on NEW record (BEFORE trigger pattern)
  NEW.current_mood := v_calculated_mood;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 3: Create BEFORE triggers (not AFTER)
-- ============================================================================

CREATE TRIGGER trg_sync_current_mood_insert
  BEFORE INSERT ON user_characters
  FOR EACH ROW
  EXECUTE FUNCTION sync_current_mood();

CREATE TRIGGER trg_sync_current_mood_update
  BEFORE UPDATE ON user_characters
  FOR EACH ROW
  EXECUTE FUNCTION sync_current_mood();

-- ============================================================================
-- STEP 4: Log migration
-- ============================================================================

INSERT INTO migration_log (version, name)
VALUES (279, '279_fix_mood_trigger_infinite_recursion')
ON CONFLICT (version) DO NOTHING;
