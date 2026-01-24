-- Migration 249: Fix infinite loop and generated column visibility - use AFTER UPDATE

BEGIN;

-- Drop the old BEFORE trigger if it exists (cleanup from previous failed attempts)
DROP TRIGGER IF EXISTS trg_sync_current_mood_update ON user_characters;

-- Create the new trigger function
CREATE OR REPLACE FUNCTION sync_current_mood_on_update() RETURNS TRIGGER AS $$
BEGIN
  -- Perform a separate UPDATE to set the calculated mood.
  -- improved visibility: In an AFTER trigger, all generated columns in NEW are guaranteed to be calculated.
  UPDATE user_characters
  SET current_mood = calculate_mood_from_stats(
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
    NEW.gameplay_mood_modifiers
  )
  WHERE id = NEW.id;

  RETURN NULL; -- Return value is ignored for AFTER triggers
END;
$$ LANGUAGE plpgsql;

-- Create the AFTER UPDATE trigger
-- The WHEN clause prevents infinite recursion by ensuring the trigger only fires
-- when one of the INPUT dependencies changes, NOT when current_mood itself changes.
CREATE TRIGGER trg_sync_current_mood_update
  AFTER UPDATE ON user_characters
  FOR EACH ROW
  WHEN (
    OLD.current_mental_health IS DISTINCT FROM NEW.current_mental_health OR
    OLD.current_morale IS DISTINCT FROM NEW.current_morale OR
    OLD.current_stress IS DISTINCT FROM NEW.current_stress OR
    OLD.current_fatigue IS DISTINCT FROM NEW.current_fatigue OR
    OLD.current_confidence IS DISTINCT FROM NEW.current_confidence OR
    OLD.bond_level IS DISTINCT FROM NEW.bond_level OR
    OLD.current_team_player IS DISTINCT FROM NEW.current_team_player OR
    OLD.current_health IS DISTINCT FROM NEW.current_health OR
    OLD.current_max_health IS DISTINCT FROM NEW.current_max_health OR
    OLD.win_percentage IS DISTINCT FROM NEW.win_percentage OR
    OLD.current_win_streak IS DISTINCT FROM NEW.current_win_streak OR
    OLD.current_energy IS DISTINCT FROM NEW.current_energy OR
    OLD.current_max_energy IS DISTINCT FROM NEW.current_max_energy OR
    OLD.current_mana IS DISTINCT FROM NEW.current_mana OR
    OLD.current_max_mana IS DISTINCT FROM NEW.current_max_mana OR
    OLD.wallet IS DISTINCT FROM NEW.wallet OR
    OLD.debt_principal IS DISTINCT FROM NEW.debt_principal OR
    OLD.gameplay_mood_modifiers IS DISTINCT FROM NEW.gameplay_mood_modifiers OR
    OLD.financial_personality IS DISTINCT FROM NEW.financial_personality OR
    OLD.financial_stress IS DISTINCT FROM NEW.financial_stress OR
    OLD.coach_trust_level IS DISTINCT FROM NEW.coach_trust_level
  )
  EXECUTE FUNCTION sync_current_mood_on_update();

COMMIT;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (249, '249_prevent_infinite_loop')
ON CONFLICT (version) DO NOTHING;
