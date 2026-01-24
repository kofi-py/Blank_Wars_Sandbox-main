-- Migration 241: Critical Fixes (Unified)
-- Purpose: Fix Deployment Crash, Registration Crash, and Character Load Crash
-- 1. Fix auto_unlock_starters trigger (s.spell_id -> s.id typo)
-- 2. Fix get_full_character_data function (add missing cs.category select)
-- 3. Fix user_characters.id (add missing DEFAULT gen_random_uuid())
-- 4. Fix Migration Logic (mark 237-240 as done to stop loops)

BEGIN;

-- FIX 1: Correct the Trigger Function (Registration Blocker)
CREATE OR REPLACE FUNCTION public.auto_unlock_starters()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_archetype text;
    v_species text;
BEGIN
    -- Fetch archetype and species from characters table
    SELECT archetype, species INTO v_archetype, v_species
    FROM characters
    WHERE id = NEW.character_id;

    -- Unlock Starter Powers
    INSERT INTO character_powers (character_id, power_id, mastery_points, mastery_level)
    SELECT NEW.id, p.id, 0, 1
    FROM power_definitions p
    WHERE p.is_starter = TRUE
    ON CONFLICT DO NOTHING;

    -- Unlock Starter Spells (FIXED: Uses s.id, not s.spell_id)
    INSERT INTO character_spells (character_id, spell_id, mastery_points, mastery_level)
    SELECT NEW.id, s.id, 0, 1
    FROM spell_definitions s
    WHERE s.is_starter = TRUE
    AND (
        (s.character_id IS NOT NULL AND s.character_id = NEW.character_id)
        OR
        (s.archetype IS NOT NULL AND s.archetype = v_archetype)
        OR
        (s.species IS NOT NULL AND s.species = v_species)
        OR
        (s.archetype IS NULL AND s.character_id IS NULL AND s.species IS NULL)
    )
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$function$;

-- FIX 2: Correct the Character Data Function (Loading Blocker)
CREATE OR REPLACE FUNCTION get_full_character_data(
  p_userchar_id TEXT
) RETURNS JSONB AS $$
DECLARE
  v_char RECORD;
  v_uc RECORD;
  v_tc RECORD;
  v_character_id TEXT;
  v_target_uuid UUID;
  v_identity JSONB;
  v_combat JSONB;
  v_psychological JSONB;
BEGIN
  -- Strict cast input to UUID 
  v_target_uuid := p_userchar_id::uuid;

  -- 1. FETCH USER CHARACTER
  SELECT uc.*, t.team_name
  INTO v_uc
  FROM user_characters uc
  LEFT JOIN teams t ON uc.user_id = t.user_id
  WHERE uc.id = v_target_uuid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'STRICT MODE: User character % not found', p_userchar_id;
  END IF;

  v_character_id := v_uc.character_id;

  IF v_character_id IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % has no character_id', p_userchar_id;
  END IF;

  -- 2. FETCH BASE CHARACTER (FIXED: Added cs.category selection)
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
    RAISE EXCEPTION 'STRICT MODE: Character % not found', v_character_id;
  END IF;

  -- 3. FETCH TEAM CONTEXT
  SELECT tc.*
  INTO v_tc
  FROM team_context tc
  JOIN teams t ON tc.team_id = t.id
  WHERE t.user_id = v_uc.user_id;

  -- 4. BUILD IDENTITY
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
    'win_percentage', v_uc.win_percentage
  );

  -- 5. BUILD COMBAT PACKAGE
  v_combat := jsonb_build_object(
    'abilities', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'ability_id', ca.ability_id,
        'ability_name', ca.ability_name,
        'rank', ca.rank
      )), '[]'::jsonb)
      FROM character_abilities ca
      WHERE ca.character_id = v_character_id
    ),
    'equipment', jsonb_build_object(
      'accessory', (SELECT item_id FROM user_equipment WHERE equipped_to_character_id = v_target_uuid AND slot_type = 'accessory' LIMIT 1),
      'armor', (SELECT item_id FROM user_equipment WHERE equipped_to_character_id = v_target_uuid AND slot_type = 'armor' LIMIT 1),
      'weapon', (SELECT item_id FROM user_equipment WHERE equipped_to_character_id = v_target_uuid AND slot_type = 'weapon' LIMIT 1)
    ),
    'stats', jsonb_build_object(
      'current_health', v_uc.current_health,
      'max_health', v_uc.max_health
    ),
    'unlocked_spells', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'cooldown', sd.base_cooldown,
        'damage', sd.base_damage,
        'description', sd.description,
        'mana_cost', sd.base_mana_cost,
        'spell_id', cs.spell_id,
        'spell_name', sd.name
      )), '[]'::jsonb)
      FROM character_spells cs
      JOIN spell_definitions sd ON cs.spell_id = sd.id
      WHERE cs.character_id = v_target_uuid AND cs.unlocked = true
    )
  );

  -- 6. BUILD PSYCHOLOGICAL PACKAGE
  v_psychological := jsonb_build_object(
    'bond_level', v_uc.bond_level,
    'coach_trust_level', v_uc.coach_trust_level,
    'current_confidence', v_uc.current_confidence,
    'current_ego', v_uc.current_ego,
    'current_fatigue', v_uc.current_fatigue,
    'current_mental_health', v_uc.current_mental_health,
    'current_morale', v_uc.current_morale,
    'current_stress', v_uc.current_stress,
    'current_team_player', v_uc.current_team_player,
    'financial_stress', v_uc.financial_stress,
    'gameplan_adherence', v_uc.gameplan_adherence,
    'gameplay_mood_modifiers', COALESCE(v_uc.gameplay_mood_modifiers, '{"modifiers": []}'::jsonb),
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
      WHERE ccp.character_id = v_target_uuid
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

  -- 7. RETURN
  RETURN jsonb_build_object(
    'IDENTITY', v_identity,
    'COMBAT', v_combat,
    'PSYCHOLOGICAL', v_psychological
  );
END;
$$ LANGUAGE plpgsql;

-- FIX 3: Default ID Value (Registration Blocker)
ALTER TABLE user_characters ALTER COLUMN id SET DEFAULT gen_random_uuid();

COMMIT;

-- FIX 4: Stop Runner Loops (Mark problematic versions as done)
INSERT INTO migration_log (version, name) VALUES 
(237, '237_fix_trigger_and_create_therapist_entries'),
(238, '238_fix_comedian_category_column'),
(239, '239_fix_auto_unlock_starters_spell_id'),
(240, '240_force_fix_auto_unlock_starters'),
(241, '241_critical_fixes')
ON CONFLICT (version) DO NOTHING;
