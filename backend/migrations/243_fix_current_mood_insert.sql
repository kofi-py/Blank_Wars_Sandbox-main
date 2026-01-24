-- Migration 243: Fix current_mood calculation for INSERT
--
-- Problem: Migration 242's trigger fires AFTER INSERT, but current_mood is NOT NULL.
-- When app INSERT doesn't include current_mood, constraint fails before trigger runs.
--
-- Solution: Refactor mood calculation to work with BEFORE INSERT trigger.
-- 1. Extract calculation logic into parameter-based function
-- 2. BEFORE INSERT trigger calculates mood from NEW's stats
-- 3. AFTER UPDATE trigger continues to work as before

BEGIN;

-- 1. Create parameter-based mood calculation function
-- Takes all required stats as parameters instead of querying
CREATE OR REPLACE FUNCTION calculate_mood_from_stats(
  p_character_id TEXT,
  p_current_mental_health INTEGER,
  p_current_morale INTEGER,
  p_current_stress INTEGER,
  p_current_fatigue INTEGER,
  p_current_confidence INTEGER,
  p_financial_stress INTEGER,
  p_coach_trust_level INTEGER,
  p_bond_level INTEGER,
  p_current_team_player INTEGER,
  p_current_health INTEGER,
  p_current_max_health INTEGER,
  p_win_percentage REAL,
  p_gameplan_adherence INTEGER,
  p_current_win_streak INTEGER,
  p_current_energy INTEGER,
  p_current_max_energy INTEGER,
  p_current_mana INTEGER,
  p_current_max_mana INTEGER,
  p_wallet INTEGER,
  p_debt_principal INTEGER,
  p_gameplay_mood_modifiers JSONB
) RETURNS INTEGER AS $$
DECLARE
  v_char_mood_modifier INTEGER;
  v_stat_mood NUMERIC;
  v_gameplay_modifier INTEGER := 0;
  v_final_mood INTEGER;
  v_mod JSONB;
  v_value INTEGER;
  v_current_value INTEGER;
  v_expires_at TIMESTAMPTZ;
  v_decay_rate INTEGER;
  v_applied_at TIMESTAMPTZ;
  v_effective INTEGER;
  v_days_elapsed INTEGER;
BEGIN
  -- Fetch character's base mood modifier
  SELECT mood_modifier INTO v_char_mood_modifier
  FROM characters
  WHERE id = p_character_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'STRICT MODE: Character % not found', p_character_id;
  END IF;

  IF v_char_mood_modifier IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: mood_modifier is null for character %', p_character_id;
  END IF;

  -- Validate all required stats
  IF p_current_mental_health IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: missing required stat: current_mental_health';
  END IF;
  IF p_current_morale IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: missing required stat: current_morale';
  END IF;
  IF p_current_stress IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: missing required stat: current_stress';
  END IF;
  IF p_current_fatigue IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: missing required stat: current_fatigue';
  END IF;
  IF p_current_confidence IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: missing required stat: current_confidence';
  END IF;
  IF p_financial_stress IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: missing required stat: financial_stress';
  END IF;
  IF p_coach_trust_level IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: missing required stat: coach_trust_level';
  END IF;
  IF p_bond_level IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: missing required stat: bond_level';
  END IF;
  IF p_current_team_player IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: missing required stat: current_team_player';
  END IF;
  IF p_current_health IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: missing required stat: current_health';
  END IF;
  IF p_current_max_health IS NULL OR p_current_max_health = 0 THEN
    RAISE EXCEPTION 'STRICT MODE: missing required stat: current_max_health';
  END IF;
  IF p_win_percentage IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: missing required stat: win_percentage';
  END IF;
  IF p_gameplan_adherence IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: missing required stat: gameplan_adherence';
  END IF;
  IF p_current_win_streak IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: missing required stat: current_win_streak';
  END IF;
  IF p_current_energy IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: missing required stat: current_energy';
  END IF;
  IF p_current_max_energy IS NULL OR p_current_max_energy = 0 THEN
    RAISE EXCEPTION 'STRICT MODE: missing required stat: current_max_energy';
  END IF;
  IF p_current_mana IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: missing required stat: current_mana';
  END IF;
  IF p_current_max_mana IS NULL OR p_current_max_mana = 0 THEN
    RAISE EXCEPTION 'STRICT MODE: missing required stat: current_max_mana';
  END IF;
  IF p_wallet IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: missing required stat: wallet';
  END IF;
  IF p_debt_principal IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: missing required stat: debt_principal';
  END IF;
  IF (p_debt_principal + 100) = 0 THEN
    RAISE EXCEPTION 'STRICT MODE: invalid debt_principal for mood calculation';
  END IF;
  IF p_gameplay_mood_modifiers IS NULL OR jsonb_typeof(p_gameplay_mood_modifiers->'modifiers') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'STRICT MODE: missing required field: gameplay_mood_modifiers';
  END IF;

  -- Calculate stat-based mood
  v_stat_mood := (
    (p_current_mental_health * 0.15) +
    (p_current_morale * 0.12) +
    ((100 - p_current_stress) * 0.10) +
    ((100 - p_current_fatigue) * 0.08) +
    (p_current_confidence * 0.08) +
    ((100 - p_financial_stress) * 0.05) +
    (p_coach_trust_level * 0.04) +
    (p_bond_level * 0.04) +
    (p_current_team_player * 0.04) +
    ((p_current_health::numeric / p_current_max_health) * 100 * 0.05) +
    (p_win_percentage * 0.04) +
    (p_gameplan_adherence * 0.03) +
    (LEAST(p_current_win_streak, 10) * 10 * 0.03) +
    ((p_current_energy::numeric / p_current_max_energy) * 100 * 0.05) +
    ((p_current_mana::numeric / p_current_max_mana) * 100 * 0.03) +
    (LEAST(p_wallet::numeric / (p_debt_principal + 100)::numeric * 100, 100) * 0.02)
  );

  -- Calculate gameplay modifiers (decay, expiration, etc.)
  FOR v_mod IN SELECT * FROM jsonb_array_elements(p_gameplay_mood_modifiers->'modifiers') LOOP
    IF NOT (v_mod ? 'value') THEN
      RAISE EXCEPTION 'STRICT MODE: mood modifier missing value';
    END IF;

    v_value := (v_mod->>'value')::int;
    v_current_value := NULL;
    IF v_mod ? 'current_value' THEN
      v_current_value := (v_mod->>'current_value')::int;
    END IF;

    v_expires_at := NULL;
    IF v_mod ? 'expires_at' THEN
      v_expires_at := (v_mod->>'expires_at')::timestamptz;
    END IF;

    v_decay_rate := NULL;
    IF v_mod ? 'decay_rate' THEN
      v_decay_rate := (v_mod->>'decay_rate')::int;
    END IF;

    v_applied_at := NULL;
    IF v_mod ? 'applied_at' THEN
      v_applied_at := (v_mod->>'applied_at')::timestamptz;
    END IF;

    IF v_expires_at IS NOT NULL AND v_expires_at < NOW() THEN
      v_effective := 0;
    ELSIF v_decay_rate IS NOT NULL AND v_decay_rate > 0 THEN
      IF v_applied_at IS NULL THEN
        RAISE EXCEPTION 'STRICT MODE: mood modifier missing applied_at';
      END IF;
      v_days_elapsed := EXTRACT(DAY FROM NOW() - v_applied_at)::int;
      IF v_value > 0 THEN
        v_effective := GREATEST(0, v_value - (v_decay_rate * v_days_elapsed));
      ELSE
        v_effective := LEAST(0, v_value + (v_decay_rate * v_days_elapsed));
      END IF;
    ELSE
      IF v_current_value IS NOT NULL THEN
        v_effective := v_current_value;
      ELSE
        v_effective := v_value;
      END IF;
    END IF;

    v_gameplay_modifier := v_gameplay_modifier + v_effective;
  END LOOP;

  -- Final mood: stat_mood + base character mood + gameplay modifiers, clamped 0-100
  v_final_mood := GREATEST(0, LEAST(100, v_stat_mood + v_char_mood_modifier + v_gameplay_modifier));
  RETURN v_final_mood::integer;
END;
$$ LANGUAGE plpgsql;

-- 2. Refactor existing calculate_current_mood to use new parameter-based function
CREATE OR REPLACE FUNCTION calculate_current_mood(
  p_userchar_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_uc RECORD;
BEGIN
  -- Query the user character row
  SELECT * INTO v_uc FROM user_characters WHERE id = p_userchar_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'STRICT MODE: User character % not found', p_userchar_id;
  END IF;

  IF v_uc.character_id IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % has no character_id', p_userchar_id;
  END IF;

  -- Call parameter-based function with row's values
  RETURN calculate_mood_from_stats(
    v_uc.character_id,
    v_uc.current_mental_health,
    v_uc.current_morale,
    v_uc.current_stress,
    v_uc.current_fatigue,
    v_uc.current_confidence,
    v_uc.financial_stress,
    v_uc.coach_trust_level,
    v_uc.bond_level,
    v_uc.current_team_player,
    v_uc.current_health,
    v_uc.current_max_health,
    v_uc.win_percentage,
    v_uc.gameplan_adherence,
    v_uc.current_win_streak,
    v_uc.current_energy,
    v_uc.current_max_energy,
    v_uc.current_mana,
    v_uc.current_max_mana,
    v_uc.wallet,
    v_uc.debt_principal,
    v_uc.gameplay_mood_modifiers
  );
END;
$$ LANGUAGE plpgsql;

-- 3. Update trigger function to handle INSERT vs UPDATE differently
CREATE OR REPLACE FUNCTION sync_current_mood() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- BEFORE INSERT: Calculate mood from NEW's stats
    NEW.current_mood := calculate_mood_from_stats(
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
    );
    RETURN NEW;
  ELSE
    -- AFTER UPDATE: Query and recalculate
    UPDATE user_characters
    SET current_mood = calculate_current_mood(NEW.id)
    WHERE id = NEW.id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. Recreate triggers - separate BEFORE INSERT and AFTER UPDATE
DROP TRIGGER IF EXISTS trg_sync_current_mood ON user_characters;
DROP TRIGGER IF EXISTS trg_sync_current_mood_insert ON user_characters;
DROP TRIGGER IF EXISTS trg_sync_current_mood_update ON user_characters;

-- BEFORE INSERT trigger - calculates mood before row is inserted
CREATE TRIGGER trg_sync_current_mood_insert
BEFORE INSERT
ON user_characters
FOR EACH ROW EXECUTE FUNCTION sync_current_mood();

-- AFTER UPDATE trigger - recalculates mood after stat changes
CREATE TRIGGER trg_sync_current_mood_update
AFTER UPDATE OF
  current_mental_health,
  current_morale,
  current_stress,
  current_fatigue,
  current_confidence,
  financial_stress,
  coach_trust_level,
  bond_level,
  current_team_player,
  current_health,
  current_max_health,
  win_percentage,
  gameplan_adherence,
  current_win_streak,
  current_energy,
  current_max_energy,
  current_mana,
  current_max_mana,
  wallet,
  debt_principal,
  gameplay_mood_modifiers
ON user_characters
FOR EACH ROW EXECUTE FUNCTION sync_current_mood();

COMMIT;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (243, '243_fix_current_mood_insert')
ON CONFLICT (version) DO NOTHING;
