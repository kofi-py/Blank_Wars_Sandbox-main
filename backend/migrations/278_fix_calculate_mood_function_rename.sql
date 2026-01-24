-- Migration 278: Fix calculate_mood_from_stats function (retry of 276)
--
-- Migration 276 failed because PostgreSQL doesn't allow renaming parameters
-- in CREATE OR REPLACE FUNCTION. The migration was partially applied:
-- - Function NOT updated (still has old code)
-- - Trigger function WAS updated
-- - Triggers were recreated
-- - migration_log shows 276 as applied
--
-- This migration properly DROPs the function first, then recreates it.

-- ============================================================================
-- STEP 1: DROP the old function (required to rename parameter)
-- ============================================================================

DROP FUNCTION IF EXISTS calculate_mood_from_stats(
  TEXT, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER,
  INTEGER, INTEGER, INTEGER, INTEGER, REAL, INTEGER, INTEGER, INTEGER,
  INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, JSONB
);

-- ============================================================================
-- STEP 2: Create function with correct parameter name and STRICT MODE body
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
  p_mood_modifiers_array JSONB  -- Renamed: expects array, not wrapper object
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
-- STEP 3: Log migration
-- ============================================================================

INSERT INTO migration_log (version, name)
VALUES (278, '278_fix_calculate_mood_function_rename')
ON CONFLICT (version) DO NOTHING;
