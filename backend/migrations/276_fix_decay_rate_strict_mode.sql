-- Migration 276: Fix decay_rate STRICT MODE + Fix trigger to pass correct data type
--
-- Issues fixed:
-- 1. COALESCE((v_mod->>'decay_rate')::INTEGER, 0) silently treats missing decay_rate as permanent
-- 2. Trigger was passing {"modifiers": [...]} but function expects [...] array
--
-- Solution:
-- 1. Trigger now extracts and passes just the modifiers array
-- 2. Function validates decay_rate against mood_event_types definition
-- 3. No COALESCE fallbacks - throw errors on bad data

-- ============================================================================
-- STEP 1: DROP old function (required to rename parameter from p_gameplay_mood_modifiers to p_mood_modifiers_array)
-- ============================================================================

DROP FUNCTION IF EXISTS calculate_mood_from_stats(
  TEXT, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER,
  INTEGER, INTEGER, INTEGER, INTEGER, REAL, INTEGER, INTEGER, INTEGER,
  INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, JSONB
);

-- ============================================================================
-- STEP 2: Create calculate_mood_from_stats with renamed param and STRICT MODE
-- ============================================================================

CREATE FUNCTION calculate_mood_from_stats(
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
  p_mood_modifiers_array JSONB  -- Renamed for clarity: expects array, not wrapper object
) RETURNS INTEGER AS $$
DECLARE
  v_char_mood_modifier INTEGER;
  v_char_role TEXT;
  v_stat_mood NUMERIC;
  v_gameplay_modifier INTEGER := 0;
  v_final_mood INTEGER;
  v_mod JSONB;
  v_value INTEGER;
  v_expires_at TIMESTAMPTZ;
  v_decay_rate INTEGER;
  v_applied_at TIMESTAMPTZ;
  v_effective INTEGER;
  v_days_elapsed INTEGER;
  v_source TEXT;
  v_expected_decay_rate INTEGER;
BEGIN
  -- Fetch character's base mood modifier AND ROLE
  SELECT mood_modifier, role INTO v_char_mood_modifier, v_char_role
  FROM characters
  WHERE id = p_character_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'STRICT MODE: Character % not found', p_character_id;
  END IF;

  -- BYPASS: System roles do not use mood stats. Return neutral 50.
  IF v_char_role IN ('therapist', 'judge', 'host', 'real_estate_agent', 'trainer', 'system') THEN
    RETURN 50;
  END IF;

  IF v_char_mood_modifier IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: mood_modifier is null for character %', p_character_id;
  END IF;

  -- Validate all required stats (STRICT MODE for Contestants ONLY)
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
  IF p_current_max_health IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: missing required stat: current_max_health';
  END IF;
  IF p_current_max_health <= 0 THEN
    RAISE EXCEPTION 'STRICT MODE: current_max_health must be > 0, got %', p_current_max_health;
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
  IF p_wallet IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: missing required stat: wallet';
  END IF;

  -- Calculate base mood from stats using REAL values
  v_stat_mood :=
    p_current_mental_health * 0.15 +
    p_current_morale * 0.15 +
    (100 - p_current_stress) * 0.10 +
    (100 - p_current_fatigue) * 0.10 +
    p_current_confidence * 0.10 +
    (100 - p_financial_stress) * 0.05 +
    p_coach_trust_level * 0.05 +
    p_bond_level * 0.05 +
    p_current_team_player * 0.05 +
    (p_current_health::NUMERIC / NULLIF(p_current_max_health, 0) * 100) * 0.05 +
    (p_win_percentage * 100) * 0.05 +
    p_gameplan_adherence * 0.05 +
    LEAST(p_current_win_streak * 2, 10);

  -- STRICT MODE: Validate mood modifiers array
  IF p_mood_modifiers_array IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: p_mood_modifiers_array is null';
  END IF;
  IF jsonb_typeof(p_mood_modifiers_array) != 'array' THEN
    RAISE EXCEPTION 'STRICT MODE: p_mood_modifiers_array is not an array, got %', jsonb_typeof(p_mood_modifiers_array);
  END IF;

  -- Process gameplay mood modifiers
  FOR v_mod IN SELECT * FROM jsonb_array_elements(p_mood_modifiers_array)
  LOOP
    -- STRICT MODE: Validate required modifier fields
    IF v_mod->>'value' IS NULL THEN
      RAISE EXCEPTION 'STRICT MODE: mood modifier missing required field "value"';
    END IF;
    IF v_mod->>'applied_at' IS NULL THEN
      RAISE EXCEPTION 'STRICT MODE: mood modifier missing required field "applied_at"';
    END IF;

    v_value := (v_mod->>'value')::INTEGER;
    v_expires_at := (v_mod->>'expires_at')::TIMESTAMPTZ;
    v_applied_at := (v_mod->>'applied_at')::TIMESTAMPTZ;
    v_source := v_mod->>'source';

    -- Get decay_rate from modifier JSON (can be null for permanent modifiers)
    v_decay_rate := (v_mod->>'decay_rate')::INTEGER;

    -- STRICT MODE: Validate decay_rate against event type definition
    IF v_source IS NOT NULL THEN
      SELECT default_decay_rate INTO v_expected_decay_rate
      FROM mood_event_types
      WHERE id = v_source;

      -- If event type has a defined decay rate but modifier doesn't, that's data corruption
      IF v_expected_decay_rate IS NOT NULL AND v_decay_rate IS NULL THEN
        RAISE EXCEPTION 'STRICT MODE: Event type "%" requires decay_rate=% but modifier has null decay_rate. Data corruption detected.', v_source, v_expected_decay_rate;
      END IF;
    END IF;

    -- Process modifier if not expired
    IF v_expires_at IS NULL OR v_expires_at > NOW() THEN
      IF v_decay_rate IS NOT NULL AND v_decay_rate > 0 THEN
        v_days_elapsed := EXTRACT(EPOCH FROM (NOW() - v_applied_at)) / 86400;
        v_effective := GREATEST(0, v_value - (v_days_elapsed * v_decay_rate));
      ELSE
        -- No decay (permanent modifier or decay_rate = 0)
        v_effective := v_value;
      END IF;
      v_gameplay_modifier := v_gameplay_modifier + v_effective;
    END IF;
  END LOOP;

  v_final_mood := LEAST(100, GREATEST(0, ROUND(v_stat_mood + v_char_mood_modifier + v_gameplay_modifier)));
  RETURN v_final_mood;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- STEP 3: Update sync_current_mood trigger to pass modifiers array correctly
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_current_mood() RETURNS TRIGGER AS $$
DECLARE
  v_modifiers_array JSONB;
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

  -- BEFORE trigger pattern: Set mood directly on NEW record (no UPDATE needed)
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
    v_modifiers_array  -- Pass just the array, not the wrapper object
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 4: Recreate triggers as BEFORE triggers (not AFTER - avoids infinite recursion)
-- ============================================================================

DROP TRIGGER IF EXISTS trg_sync_current_mood_insert ON user_characters;
DROP TRIGGER IF EXISTS trg_sync_current_mood_update ON user_characters;

CREATE TRIGGER trg_sync_current_mood_insert
  BEFORE INSERT ON user_characters
  FOR EACH ROW
  EXECUTE FUNCTION sync_current_mood();

CREATE TRIGGER trg_sync_current_mood_update
  BEFORE UPDATE ON user_characters
  FOR EACH ROW
  EXECUTE FUNCTION sync_current_mood();

-- ============================================================================
-- STEP 5: Log migration
-- ============================================================================

INSERT INTO migration_log (version, name)
VALUES (276, '276_fix_decay_rate_strict_mode')
ON CONFLICT (version) DO NOTHING;
