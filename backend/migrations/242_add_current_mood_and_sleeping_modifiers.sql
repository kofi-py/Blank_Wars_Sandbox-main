-- Migration 242: Add current_mood calculation + sleeping mood modifiers + update get_full_character_data
-- FIXES:
-- 1. Regression: Restores 'coach_name' logic lost from 231.
-- 2. Type Safety: STRICT UUID ENFORCEMENT via Casting.
--    - Functions accept ONLY UUID.
--    - Table columns (TEXT) are cast to UUID (::uuid) for comparisons.
--    - This guarantees strict validation; invalid strings will cause query failures.
-- 3. No Data Hiding: STRICT MODE means STRICT.

BEGIN;

-- 1. Add current_mood column
ALTER TABLE user_characters ADD COLUMN IF NOT EXISTS current_mood INTEGER;

-- 0. DISABLE TRIGGERS (Critical Safety)
-- Prevent existing triggers from firing during schema changes
DROP TRIGGER IF EXISTS trg_sync_sleeping_mood_modifier ON user_characters;
DROP TRIGGER IF EXISTS trg_sync_current_mood ON user_characters;
DROP TRIGGER IF EXISTS trg_sync_current_mood_character ON characters;

-- 2. Calculate current mood (STRICT MODE, no fallbacks)
CREATE OR REPLACE FUNCTION calculate_current_mood(
  p_userchar_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_uc RECORD;
  v_char RECORD;
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
  SELECT * INTO v_uc FROM user_characters WHERE id = p_userchar_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'STRICT MODE: User character % not found', p_userchar_id;
  END IF;

  IF v_uc.character_id IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % has no character_id', p_userchar_id;
  END IF;

  SELECT mood_modifier INTO v_char
  FROM characters
  WHERE id = v_uc.character_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'STRICT MODE: Character % not found (referenced by user_character %)', v_uc.character_id, p_userchar_id;
  END IF;

  IF v_char.mood_modifier IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: mood_modifier is null for character %', v_uc.character_id;
  END IF;

  -- Strict required stats (no fallbacks)
  IF v_uc.current_mental_health IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % missing required stat: current_mental_health', p_userchar_id;
  END IF;
  IF v_uc.current_morale IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % missing required stat: current_morale', p_userchar_id;
  END IF;
  IF v_uc.current_stress IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % missing required stat: current_stress', p_userchar_id;
  END IF;
  IF v_uc.current_fatigue IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % missing required stat: current_fatigue', p_userchar_id;
  END IF;
  IF v_uc.current_confidence IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % missing required stat: current_confidence', p_userchar_id;
  END IF;
  IF v_uc.financial_stress IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % missing required stat: financial_stress', p_userchar_id;
  END IF;
  IF v_uc.coach_trust_level IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % missing required stat: coach_trust_level', p_userchar_id;
  END IF;
  IF v_uc.bond_level IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % missing required stat: bond_level', p_userchar_id;
  END IF;
  IF v_uc.current_team_player IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % missing required stat: current_team_player', p_userchar_id;
  END IF;
  IF v_uc.current_health IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % missing required stat: current_health', p_userchar_id;
  END IF;
  IF v_uc.current_max_health IS NULL OR v_uc.current_max_health = 0 THEN
    RAISE EXCEPTION 'STRICT MODE: User character % missing required stat: current_max_health', p_userchar_id;
  END IF;
  IF v_uc.win_percentage IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % missing required stat: win_percentage', p_userchar_id;
  END IF;
  IF v_uc.gameplan_adherence IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % missing required stat: gameplan_adherence', p_userchar_id;
  END IF;
  IF v_uc.current_win_streak IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % missing required stat: current_win_streak', p_userchar_id;
  END IF;
  IF v_uc.current_energy IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % missing required stat: current_energy', p_userchar_id;
  END IF;
  IF v_uc.current_max_energy IS NULL OR v_uc.current_max_energy = 0 THEN
    RAISE EXCEPTION 'STRICT MODE: User character % missing required stat: current_max_energy', p_userchar_id;
  END IF;
  IF v_uc.current_mana IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % missing required stat: current_mana', p_userchar_id;
  END IF;
  IF v_uc.current_max_mana IS NULL OR v_uc.current_max_mana = 0 THEN
    RAISE EXCEPTION 'STRICT MODE: User character % missing required stat: current_max_mana', p_userchar_id;
  END IF;
  IF v_uc.wallet IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % missing required stat: wallet', p_userchar_id;
  END IF;
  IF v_uc.debt_principal IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % missing required stat: debt_principal', p_userchar_id;
  END IF;
  IF (v_uc.debt_principal + 100) = 0 THEN
    RAISE EXCEPTION 'STRICT MODE: User character % has invalid debt_principal for mood calculation', p_userchar_id;
  END IF;
  IF v_uc.gameplay_mood_modifiers IS NULL OR jsonb_typeof(v_uc.gameplay_mood_modifiers->'modifiers') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'STRICT MODE: User character % missing required field: gameplay_mood_modifiers', p_userchar_id;
  END IF;

  v_stat_mood := (
    (v_uc.current_mental_health * 0.15) +
    (v_uc.current_morale * 0.12) +
    ((100 - v_uc.current_stress) * 0.10) +
    ((100 - v_uc.current_fatigue) * 0.08) +
    (v_uc.current_confidence * 0.08) +
    ((100 - v_uc.financial_stress) * 0.05) +
    (v_uc.coach_trust_level * 0.04) +
    (v_uc.bond_level * 0.04) +
    (v_uc.current_team_player * 0.04) +
    ((v_uc.current_health::numeric / v_uc.current_max_health) * 100 * 0.05) +
    (v_uc.win_percentage * 0.04) +
    (v_uc.gameplan_adherence * 0.03) +
    (LEAST(v_uc.current_win_streak, 10) * 10 * 0.03) +
    ((v_uc.current_energy::numeric / v_uc.current_max_energy) * 100 * 0.05) +
    ((v_uc.current_mana::numeric / v_uc.current_max_mana) * 100 * 0.03) +
    (LEAST(v_uc.wallet::numeric / (v_uc.debt_principal + 100)::numeric * 100, 100) * 0.02)
  );

  FOR v_mod IN SELECT * FROM jsonb_array_elements(v_uc.gameplay_mood_modifiers->'modifiers') LOOP
    IF NOT (v_mod ? 'value') THEN
      RAISE EXCEPTION 'STRICT MODE: mood modifier missing value for user_character %', p_userchar_id;
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
        RAISE EXCEPTION 'STRICT MODE: mood modifier missing applied_at for user_character %', p_userchar_id;
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

  v_final_mood := GREATEST(0, LEAST(100, v_stat_mood + v_char.mood_modifier + v_gameplay_modifier));
  RETURN v_final_mood::integer;
END;
$$ LANGUAGE plpgsql;

-- 3. Sleeping arrangement -> gameplay_mood_modifiers
CREATE OR REPLACE FUNCTION upsert_sleeping_mood_modifier(
  p_userchar_id UUID
) RETURNS VOID AS $$
DECLARE
  v_uc RECORD;
  v_sleeping_modifier INTEGER;
  v_sleeping_source TEXT;
  v_new_modifier JSONB;
  v_modifiers JSONB;
BEGIN
  SELECT uc.sleeping_arrangement, uc.gameplay_mood_modifiers
  INTO v_uc
  FROM user_characters uc
  WHERE uc.id = p_userchar_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'STRICT MODE: User character % not found', p_userchar_id;
  END IF;

  IF v_uc.sleeping_arrangement IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: sleeping_arrangement is null for user character %', p_userchar_id;
  END IF;

  IF v_uc.gameplay_mood_modifiers IS NULL OR jsonb_typeof(v_uc.gameplay_mood_modifiers->'modifiers') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'STRICT MODE: gameplay_mood_modifiers is null or malformed for user character %', p_userchar_id;
  END IF;

  SELECT mood_modifier
  INTO v_sleeping_modifier
  FROM sleeping_spot_types
  WHERE id = v_uc.sleeping_arrangement;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'STRICT MODE: sleeping_spot_types missing for sleeping_arrangement %', v_uc.sleeping_arrangement;
  END IF;

  IF v_sleeping_modifier IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: sleeping_spot_types.mood_modifier is null for sleeping_arrangement %', v_uc.sleeping_arrangement;
  END IF;

  v_sleeping_source := 'sleeping_' || v_uc.sleeping_arrangement;

  v_new_modifier := jsonb_build_object(
    'source', v_sleeping_source,
    'value', v_sleeping_modifier,
    'current_value', v_sleeping_modifier,
    'applied_at', NOW(),
    'expires_at', NULL,
    'decay_rate', NULL,
    'removable_by', NULL
  );

  SELECT COALESCE(jsonb_agg(m), '[]'::jsonb)
  INTO v_modifiers
  FROM jsonb_array_elements(v_uc.gameplay_mood_modifiers->'modifiers') AS m
  WHERE COALESCE(m->>'source', '') NOT LIKE 'sleeping_%';

  v_modifiers := v_modifiers || jsonb_build_array(v_new_modifier);

  UPDATE user_characters
  SET gameplay_mood_modifiers = jsonb_set(
    v_uc.gameplay_mood_modifiers,
    '{modifiers}',
    v_modifiers
  )
  WHERE id = p_userchar_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_sleeping_mood_modifier() RETURNS TRIGGER AS $$
BEGIN
  PERFORM upsert_sleeping_mood_modifier(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_sleeping_mood_modifier ON user_characters;
CREATE TRIGGER trg_sync_sleeping_mood_modifier
AFTER INSERT OR UPDATE OF sleeping_arrangement ON user_characters
FOR EACH ROW EXECUTE FUNCTION sync_sleeping_mood_modifier();

-- 4. Keep current_mood updated
CREATE OR REPLACE FUNCTION sync_current_mood() RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_characters
  SET current_mood = calculate_current_mood(NEW.id)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_current_mood ON user_characters;
CREATE TRIGGER trg_sync_current_mood
AFTER INSERT OR UPDATE OF
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

CREATE OR REPLACE FUNCTION sync_current_mood_on_character() RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_characters
  SET current_mood = calculate_current_mood(id)
  WHERE character_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_current_mood_character ON characters;
CREATE TRIGGER trg_sync_current_mood_character
AFTER UPDATE OF mood_modifier ON characters
FOR EACH ROW
WHEN (OLD.mood_modifier IS DISTINCT FROM NEW.mood_modifier)
EXECUTE FUNCTION sync_current_mood_on_character();

-- 5. Update get_full_character_data with STRICT UUID logic
-- Clean up old signatures
DROP FUNCTION IF EXISTS get_full_character_data(TEXT);
DROP FUNCTION IF EXISTS get_full_character_data(TEXT, TEXT);

CREATE OR REPLACE FUNCTION get_full_character_data(
  p_userchar_id UUID -- STRICT: UUID ONLY
) RETURNS JSONB AS $$
DECLARE
  v_char RECORD;
  v_uc RECORD;
  v_tc RECORD;
  v_character_id TEXT;
  v_identity JSONB;
  v_combat JSONB;
  v_psychological JSONB;
BEGIN
  -- =====================================================
  -- 1. FETCH USER CHARACTER DATA FIRST (to get character_id)
  -- =====================================================
  SELECT uc.*, t.team_name, u.coach_name -- FIXED: Added coach_name
  INTO v_uc
  FROM user_characters uc
  LEFT JOIN teams t ON uc.user_id = t.user_id
  LEFT JOIN users u ON uc.user_id = u.id -- FIXED: Added users JOIN
  WHERE uc.id = p_userchar_id; -- STRICT: UUID ID Match

  IF NOT FOUND THEN
    RAISE EXCEPTION 'STRICT MODE: User character % not found', p_userchar_id;
  END IF;

  -- Extract canonical character_id from user_characters
  v_character_id := v_uc.character_id;

  IF v_character_id IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % has no character_id', p_userchar_id;
  END IF;

  -- =====================================================
  -- STRICT MODE: Combat stat checks (battle-critical)
  -- =====================================================
  IF v_uc.current_attack IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % missing required stat: current_attack', p_userchar_id;
  END IF;
  IF v_uc.current_defense IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % missing required stat: current_defense', p_userchar_id;
  END IF;
  IF v_uc.current_health IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % missing required stat: current_health', p_userchar_id;
  END IF;
  IF v_uc.current_max_health IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % missing required stat: current_max_health', p_userchar_id;
  END IF;
  IF v_uc.level IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % missing required stat: level', p_userchar_id;
  END IF;

  -- =====================================================
  -- STRICT MODE: Psychological stat checks (AI behavior-critical)
  -- =====================================================
  IF v_uc.current_stress IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % missing required stat: current_stress', p_userchar_id;
  END IF;
  IF v_uc.current_confidence IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % missing required stat: current_confidence', p_userchar_id;
  END IF;
  IF v_uc.current_morale IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % missing required stat: current_morale', p_userchar_id;
  END IF;
  IF v_uc.current_mood IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % missing required stat: current_mood', p_userchar_id;
  END IF;
  IF v_uc.current_fatigue IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % missing required stat: current_fatigue', p_userchar_id;
  END IF;
  IF v_uc.current_ego IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % missing required stat: current_ego', p_userchar_id;
  END IF;
  IF v_uc.current_mental_health IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % missing required stat: current_mental_health', p_userchar_id;
  END IF;
  IF v_uc.coach_trust_level IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % missing required stat: coach_trust_level', p_userchar_id;
  END IF;
  IF v_uc.bond_level IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % missing required stat: bond_level', p_userchar_id;
  END IF;
  IF v_uc.gameplan_adherence IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % missing required stat: gameplan_adherence', p_userchar_id;
  END IF;
  IF v_uc.gameplay_mood_modifiers IS NULL OR jsonb_typeof(v_uc.gameplay_mood_modifiers->'modifiers') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'STRICT MODE: User character % missing required field: gameplay_mood_modifiers', p_userchar_id;
  END IF;

  -- =====================================================
  -- 2. FETCH BASE CHARACTER DATA (using derived character_id)
  -- =====================================================
  SELECT
    c.*,
    cs.comedian_name AS cs_comedian_name,
    cs.comedy_style AS cs_comedy_style,
    cs.category AS cs_category
  INTO v_char
  FROM characters c
  LEFT JOIN comedian_styles cs ON c.comedian_style_id = cs.id
  WHERE c.id = v_character_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'STRICT MODE: Character % not found (referenced by user_character %)', v_character_id, p_userchar_id;
  END IF;

  IF v_char.name IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: Character % missing required field: name', v_character_id;
  END IF;
  IF v_char.backstory IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: Character % missing required field: backstory', v_character_id;
  END IF;
  IF v_char.species IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: Character % missing required field: species', v_character_id;
  END IF;
  IF v_char.archetype IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: Character % missing required field: archetype', v_character_id;
  END IF;

  -- =====================================================
  -- 3. FETCH TEAM CONTEXT
  -- =====================================================
  SELECT tc.*
  INTO v_tc
  FROM team_context tc
  JOIN teams t ON tc.team_id = t.id
  WHERE t.user_id = v_uc.user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'STRICT MODE: Team context not found for user character %', p_userchar_id;
  END IF;

  -- =====================================================
  -- 4. BUILD IDENTITY PACKAGE
  -- Now includes character_id for downstream persona lookup
  -- =====================================================
  v_identity := jsonb_build_object(
    'archetype', v_char.archetype,
    'backstory', v_char.backstory,
    'character_id', v_character_id,
    'comedian_category', COALESCE(v_char.cs_category, 'inspired'),
    'comedian_name', COALESCE(v_char.comedian_name, v_char.cs_comedian_name),
    'comedy_style', COALESCE(v_char.comedy_style, v_char.cs_comedy_style),
    'conversation_style', v_char.conversation_style,
    'conversation_topics', v_char.conversation_topics,
    'debt', v_uc.debt,
    'experience', v_uc.experience,
    'hq_tier', v_tc.hq_tier,
    'id', v_char.id,
    'level', v_uc.level,
    'monthly_earnings', v_uc.monthly_earnings,
    'name', v_char.name,
    'coach_name', v_uc.coach_name, -- FIXED: Included in output
    'origin_era', v_char.origin_era,
    'personality_traits', v_char.personality_traits,
    'scene_type', v_tc.current_scene_type,
    'sleeping_arrangement', v_uc.sleeping_arrangement,
    'species', v_char.species,
    'team_id', v_tc.team_id,
    'team_name', v_uc.team_name,
    'time_of_day', v_tc.current_time_of_day,
    'title', v_char.title,
    'total_battles', v_uc.total_battles,
    'total_losses', v_uc.total_losses,
    'total_wins', v_uc.total_wins,
    'userchar_id', v_uc.id,
    'wallet', v_uc.wallet,
    'win_percentage', v_uc.win_percentage,
    -- Array fields
    'recent_decisions', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'coach_advice', cd.coach_advice,
        'created_at', cd.created_at,
        'decision_type', cd.decision_type,
        'description', cd.description,
        'domain', cd.domain,
        'followed_advice', cd.followed_advice,
        'outcome', cd.outcome
      ) ORDER BY cd.created_at DESC), '[]'::jsonb)
      FROM (
        SELECT * FROM character_decisions
        -- STRICT CAST: Column TEXT cast to UUID = Param UUID
        -- This forces the column data to be valid UUID or it crashes.
        WHERE character_id::uuid = p_userchar_id
        ORDER BY created_at DESC
        LIMIT 5
      ) cd
    ),
    'recent_memories', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'content', cm.content,
        'created_at', cm.created_at,
        'emotion_type', cm.emotion_type,
        'importance', cm.importance,
        'intensity', cm.intensity,
        'tags', cm.tags
      ) ORDER BY cm.created_at DESC), '[]'::jsonb)
      FROM (
        SELECT * FROM character_memories
        -- STRICT CAST: Column TEXT cast to UUID = Param UUID
        WHERE character_id::uuid = p_userchar_id
        ORDER BY created_at DESC
        LIMIT 10
      ) cm
    ),
    'recent_opponents', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'opponent_name', c.name,
        'opponent_id', bp.character_id,
        'battle_date', b.created_at,
        'result', CASE
          WHEN b.winner_id = p_userchar_id THEN 'won'
          WHEN b.winner_id IS NULL THEN 'draw'
          ELSE 'lost'
        END
      ) ORDER BY b.created_at DESC), '[]'::jsonb)
      FROM battles b
      JOIN battle_participants bp ON b.id = bp.battle_id
      JOIN user_characters uc ON uc.id = bp.character_id::uuid -- STRICT: TABLE TEXT -> UUID
      JOIN characters c ON uc.character_id = c.id
      WHERE b.id IN (
        SELECT battle_id FROM battle_participants
        -- STRICT CAST: Column TEXT cast to UUID = Param UUID
        WHERE character_id::uuid = p_userchar_id
      )
      -- STRICT CAST: Column TEXT cast to UUID = Param UUID
      AND bp.character_id::uuid != p_userchar_id
      LIMIT 5
    ),
    'roommates', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'character_id', uc2.character_id,
        'id', uc2.id,
        'name', c.name,
        'sleeping_arrangement', uc2.sleeping_arrangement
      ) ORDER BY c.name), '[]'::jsonb)
      FROM user_characters uc2
      JOIN characters c ON uc2.character_id = c.id
      WHERE uc2.user_id = v_uc.user_id
        AND uc2.id != p_userchar_id -- UUID vs UUID (Safe)
        AND uc2.headquarters_id = v_uc.headquarters_id
    ),
    'teammates', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'archetype', c.archetype,
        'character_id', uc2.character_id,
        'current_health', uc2.current_health,
        'current_max_health', uc2.current_max_health,
        'id', uc2.id,
        'level', uc2.level,
        'name', c.name
      ) ORDER BY c.name), '[]'::jsonb)
      FROM user_characters uc2
      JOIN characters c ON uc2.character_id = c.id
      WHERE uc2.user_id = v_uc.user_id AND uc2.id != p_userchar_id
    )
  );

  -- =====================================================
  -- 5. BUILD COMBAT PACKAGE
  -- =====================================================
  v_combat := jsonb_build_object(
    'current_attack', v_uc.current_attack,
    'current_cold_resistance', v_uc.current_cold_resistance,
    'current_defense', v_uc.current_defense,
    'current_dexterity', v_uc.current_dexterity,
    'current_elemental_resistance', v_uc.current_elemental_resistance,
    'current_energy', v_uc.current_energy,
    'current_fire_resistance', v_uc.current_fire_resistance,
    'current_health', v_uc.current_health,
    'current_initiative', v_uc.current_initiative,
    'current_intelligence', v_uc.current_intelligence,
    'current_lightning_resistance', v_uc.current_lightning_resistance,
    'current_magic_attack', v_uc.current_magic_attack,
    'current_magic_defense', v_uc.current_magic_defense,
    'current_mana', v_uc.current_mana,
    'current_max_energy', v_uc.current_max_energy,
    'current_max_health', v_uc.current_max_health,
    'current_max_mana', v_uc.current_max_mana,
    'current_special', v_uc.current_special,
    'current_speed', v_uc.current_speed,
    'current_spirit', v_uc.current_spirit,
    'current_toxic_resistance', v_uc.current_toxic_resistance,
    'current_wisdom', v_uc.current_wisdom,
    'energy_regen_rate', v_uc.energy_regen_rate,
    'mana_regen_rate', v_uc.mana_regen_rate,
    -- Array fields
    'equipment', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'equipment_id', ce.equipment_id,
        'is_equipped', ce.is_equipped,
        'item_name', e.name,
        'item_stats', e.stats,
        'slot', e.slot
      ) ORDER BY e.slot), '[]'::jsonb)
      FROM character_equipment ce
      JOIN equipment e ON ce.equipment_id = e.id
      WHERE ce.character_id = p_userchar_id AND ce.is_equipped = true
    ),
    'inventory', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'equipment_id', ce.equipment_id,
        'is_equipped', ce.is_equipped,
        'item_name', e.name,
        'item_stats', e.stats,
        'slot', e.slot
      ) ORDER BY e.name), '[]'::jsonb)
      FROM character_equipment ce
      JOIN equipment e ON ce.equipment_id = e.id
      WHERE ce.character_id = p_userchar_id
    ),
    'items', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', ci.item_id,
        'name', i.name,
        'quantity', ci.quantity
      ) ORDER BY i.name), '[]'::jsonb)
      FROM character_items ci
      JOIN items i ON ci.item_id = i.id
      WHERE ci.character_id = p_userchar_id
    ),
    'powers', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'cooldown_expires_at', cp.cooldown_expires_at,
        'current_rank', cp.current_rank,
        'description', pd.description,
        'id', cp.power_id,
        'name', pd.name,
        'on_cooldown', cp.on_cooldown,
        'preference_score', cp.preference_score
      ) ORDER BY pd.name), '[]'::jsonb)
      FROM character_powers cp
      JOIN power_definitions pd ON cp.power_id = pd.id
      WHERE cp.character_id = p_userchar_id AND cp.unlocked = true
    ),
    'spells', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'cooldown_expires_at', cs.cooldown_expires_at,
        'current_rank', cs.current_rank,
        'description', sd.description,
        'id', cs.spell_id,
        'name', sd.name,
        'on_cooldown', cs.on_cooldown,
        'preference_score', cs.preference_score
      ) ORDER BY sd.name), '[]'::jsonb)
      FROM character_spells cs
      JOIN spell_definitions sd ON cs.spell_id = sd.id
      WHERE cs.character_id = p_userchar_id AND cs.unlocked = true
    )
  );

  -- =====================================================
  -- 6. BUILD PSYCHOLOGICAL PACKAGE
  -- =====================================================
  v_psychological := jsonb_build_object(
    'bond_level', v_uc.bond_level,
    'coach_trust_level', v_uc.coach_trust_level,
    'current_confidence', v_uc.current_confidence,
    'current_ego', v_uc.current_ego,
    'current_fatigue', v_uc.current_fatigue,
    'current_mental_health', v_uc.current_mental_health,
    'current_morale', v_uc.current_morale,
    'current_mood', v_uc.current_mood,
    'current_stress', v_uc.current_stress,
    'current_team_player', v_uc.current_team_player,
    'financial_stress', v_uc.financial_stress,
    'gameplan_adherence', v_uc.gameplan_adherence,
    'gameplay_mood_modifiers', v_uc.gameplay_mood_modifiers,
    -- Array/object fields
    'equipment_prefs', jsonb_build_object(
      'armor_proficiency', v_char.armor_proficiency,
      'preferred_armor_type', v_char.preferred_armor_type,
      'preferred_weapons', v_char.preferred_weapons,
      'weapon_proficiencies', v_char.weapon_proficiencies
    ),
    'category_preferences', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'category_type', ccp.category_type,
        'category_value', ccp.category_value,
        'preference_score', ccp.preference_score
      ) ORDER BY ccp.category_type, ccp.category_value), '[]'::jsonb)
      FROM character_category_preferences ccp
      WHERE ccp.character_id = p_userchar_id
    ),
    'relationships', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'affection', cr.current_affection,
        'character_id', cr.character2_id,
        'character_name', c.name,
        'respect', cr.current_respect,
        'rivalry', cr.current_rivalry,
        'shared_battles', cr.shared_battles,
        'therapy_sessions_together', cr.therapy_sessions_together,
        'trust', cr.current_trust
      ) ORDER BY c.name), '[]'::jsonb)
      FROM character_relationships cr
      JOIN characters c ON cr.character2_id = c.id
      WHERE cr.character1_id = v_character_id
    )
  );

  -- =====================================================
  -- 7. RETURN AS 3 NESTED PACKAGES
  -- =====================================================
  RETURN jsonb_build_object(
    'IDENTITY', v_identity,
    'COMBAT', v_combat,
    'PSYCHOLOGICAL', v_psychological
  );
END;
$$ LANGUAGE plpgsql;

-- 6. Backfill sleeping modifiers and current_mood
DO $$
DECLARE
  v_rec RECORD;
BEGIN
  FOR v_rec IN SELECT id FROM user_characters LOOP
    PERFORM upsert_sleeping_mood_modifier(v_rec.id);
  END LOOP;
END;
$$;

-- STRICT: This will fail if any required data is missing.
UPDATE user_characters
SET current_mood = calculate_current_mood(id);

ALTER TABLE user_characters ALTER COLUMN current_mood SET NOT NULL;

COMMIT;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (242, '242_add_current_mood_and_sleeping_modifiers')
ON CONFLICT (version) DO NOTHING;
