-- Migration 246: Fix System Roles and Mood Trigger
-- Purpose: 
-- 1. Correctly categorize Real Estate Agents (Barry, Zyxthala, LMB-3000).
-- 2. Modify calculate_mood_from_stats to SKIP strict checks for system roles.
-- 3. This allows system characters to exist without "hacked" combat stats.

BEGIN;

-- 1. DATA FIX: Correct Roles for Real Estate Agents
UPDATE characters 
SET role = 'real_estate_agent' 
WHERE id IN ('barry', 'zyxthala', 'lmb_3000');

-- 2. LOGIC FIX: Update calculate_mood_from_stats to handle system roles
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
  IF p_current_mental_health IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: missing required stat: current_mental_health';
  END IF;
  -- ... (Rest of checks remain, but won't be reached by system chars) ...
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

  v_final_mood := GREATEST(0, LEAST(100, v_stat_mood + v_char_mood_modifier + v_gameplay_modifier));
  RETURN v_final_mood::integer;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (246, '246_fix_system_roles_and_trigger')
ON CONFLICT (version) DO NOTHING;
