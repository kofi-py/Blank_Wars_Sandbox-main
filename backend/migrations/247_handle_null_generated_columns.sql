-- Migration 247: Handle NULL generated columns in mood calculation
-- Problem: financial_stress and coach_trust_level are GENERATED columns
-- They are NULL during BEFORE INSERT (not calculated yet)
-- But the strict mode checks reject NULL values
-- Solution: Use COALESCE to provide defaults when they're NULL during BEFORE INSERT
-- After INSERT completes, the real generated values will be calculated

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
  v_char_role TEXT;
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
  -- NOTE: financial_stress and coach_trust_level are GENERATED columns
  -- They are NULL during BEFORE INSERT, so we use COALESCE to provide defaults
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
  -- GENERATED COLUMNS: Use COALESCE for financial_stress and coach_trust_level
  -- They will be NULL during BEFORE INSERT but calculated after INSERT completes
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

  -- Calculate base mood from stats
  -- Use COALESCE for generated columns that are NULL during BEFORE INSERT
  v_stat_mood :=
    p_current_mental_health * 0.15 +
    p_current_morale * 0.15 +
    (100 - p_current_stress) * 0.10 +
    (100 - p_current_fatigue) * 0.10 +
    p_current_confidence * 0.10 +
    (100 - COALESCE(p_financial_stress, 0)) * 0.05 +
    COALESCE(p_coach_trust_level, 50) * 0.05 +
    p_bond_level * 0.05 +
    p_current_team_player * 0.05 +
    (p_current_health::NUMERIC / NULLIF(p_current_max_health, 0) * 100) * 0.05 +
    (p_win_percentage * 100) * 0.05 +
    p_gameplan_adherence * 0.05 +
    LEAST(p_current_win_streak * 2, 10);

  -- Process gameplay mood modifiers (temporary stat boosts/penalties)
  IF p_gameplay_mood_modifiers IS NOT NULL AND jsonb_typeof(p_gameplay_mood_modifiers) = 'array' THEN
    FOR v_mod IN SELECT * FROM jsonb_array_elements(p_gameplay_mood_modifiers)
    LOOP
      v_value := (v_mod->>'value')::INTEGER;
      v_expires_at := (v_mod->>'expires_at')::TIMESTAMPTZ;
      v_decay_rate := COALESCE((v_mod->>'decay_rate')::INTEGER, 0);
      v_applied_at := (v_mod->>'applied_at')::TIMESTAMPTZ;

      IF v_expires_at > NOW() THEN
        IF v_decay_rate > 0 THEN
          v_days_elapsed := EXTRACT(EPOCH FROM (NOW() - v_applied_at)) / 86400;
          v_effective := GREATEST(0, v_value - (v_days_elapsed * v_decay_rate));
        ELSE
          v_effective := v_value;
        END IF;
        v_gameplay_modifier := v_gameplay_modifier + v_effective;
      END IF;
    END LOOP;
  END IF;

  v_final_mood := LEAST(100, GREATEST(0, ROUND(v_stat_mood + v_char_mood_modifier + v_gameplay_modifier)));
  RETURN v_final_mood;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (247, '247_handle_null_generated_columns')
ON CONFLICT (version) DO NOTHING;
