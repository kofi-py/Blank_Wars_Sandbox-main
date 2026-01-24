-- Migration 244: Fix calculate_mood_from_stats argument order mismatch
-- The previous trigger definition passed arguments in the wrong order (max_energy before max_health, etc),
-- causing a "function does not exist" error because types didn't match the signature.
-- This migration redefines the trigger using NAMED PARAMETERS for safety.

BEGIN;

-- 1. Redefine the trigger function to use explicit named parameters
CREATE OR REPLACE FUNCTION sync_current_mood() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- BEFORE INSERT: Calculate mood from NEW's stats using named parameters
    -- This prevents positional mismatches
    NEW.current_mood := calculate_mood_from_stats(
      p_character_id => NEW.character_id,
      p_current_mental_health => NEW.current_mental_health,
      p_current_morale => NEW.current_morale,
      p_current_stress => NEW.current_stress,
      p_current_fatigue => NEW.current_fatigue,
      p_current_confidence => NEW.current_confidence,
      p_financial_stress => NEW.financial_stress,
      p_coach_trust_level => NEW.coach_trust_level,
      p_bond_level => NEW.bond_level,
      p_current_team_player => NEW.current_team_player,
      p_current_health => NEW.current_health,
      p_current_max_health => NEW.current_max_health,
      p_win_percentage => NEW.win_percentage,
      p_gameplan_adherence => NEW.gameplan_adherence,
      p_current_win_streak => NEW.current_win_streak,
      p_current_energy => NEW.current_energy,
      p_current_max_energy => NEW.current_max_energy,
      p_current_mana => NEW.current_mana,
      p_current_max_mana => NEW.current_max_mana,
      p_wallet => NEW.wallet,
      p_debt_principal => NEW.debt_principal,
      p_gameplay_mood_modifiers => NEW.gameplay_mood_modifiers
    );
    RETURN NEW;
  ELSE
    -- AFTER UPDATE: Query and recalculate
    -- This path was already working fine, but we keep it for consistency
    UPDATE user_characters
    SET current_mood = calculate_current_mood(NEW.id)
    WHERE id = NEW.id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 2. No changes needed to triggers themselves, just the function definition logic.

COMMIT;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (244, '244_fix_mood_trigger_arguments')
ON CONFLICT (version) DO NOTHING;
