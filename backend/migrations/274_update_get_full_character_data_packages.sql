-- Migration 274: Update get_full_character_data() to include new stats in packages
-- Adds 8 new stats to COMBAT package
-- Adds current_communication to PSYCHOLOGICAL package

BEGIN;

CREATE OR REPLACE FUNCTION public.get_full_character_data(p_userchar_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
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
  SELECT uc.*, t.team_name, u.coach_name
  INTO v_uc
  FROM user_characters uc
  LEFT JOIN teams t ON uc.user_id = t.user_id
  LEFT JOIN users u ON uc.user_id = u.id
  WHERE uc.id = p_userchar_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'STRICT MODE: User character % not found', p_userchar_id;
  END IF;

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
  IF v_uc.current_strength IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % missing required stat: current_strength', p_userchar_id;
  END IF;
  IF v_uc.current_endurance IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % missing required stat: current_endurance', p_userchar_id;
  END IF;
  IF v_uc.current_accuracy IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % missing required stat: current_accuracy', p_userchar_id;
  END IF;
  IF v_uc.current_evasion IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % missing required stat: current_evasion', p_userchar_id;
  END IF;
  IF v_uc.current_critical_chance IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % missing required stat: current_critical_chance', p_userchar_id;
  END IF;
  IF v_uc.current_critical_damage IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % missing required stat: current_critical_damage', p_userchar_id;
  END IF;
  IF v_uc.current_charisma IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % missing required stat: current_charisma', p_userchar_id;
  END IF;
  IF v_uc.current_battle_focus IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % missing required stat: current_battle_focus', p_userchar_id;
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
  IF v_uc.current_communication IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % missing required stat: current_communication', p_userchar_id;
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
  -- =====================================================
  v_identity := jsonb_build_object(
    'archetype', v_char.archetype,
    'backstory', v_char.backstory,
    'character_id', v_character_id,
    'comedian_category', v_char.cs_category,
    'comedian_name', v_char.cs_comedian_name,
    'comedy_style', v_char.cs_comedy_style,
    'conversation_style', v_char.conversation_style,
    'conversation_topics', v_char.conversation_topics,
    'debt', v_uc.debt,
    'experience', v_uc.experience,
    'hq_tier', v_tc.hq_tier,
    'id', v_char.id,
    'level', v_uc.level,
    'monthly_earnings', v_uc.monthly_earnings,
    'name', v_char.name,
    'coach_name', v_uc.coach_name,
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
    'recent_decisions', (
      SELECT jsonb_agg(jsonb_build_object(
        'coach_advice', cd.coach_advice,
        'created_at', cd.created_at,
        'decision_type', cd.decision_type,
        'description', cd.description,
        'domain', cd.domain,
        'followed_advice', cd.followed_advice,
        'outcome', cd.outcome
      ) ORDER BY cd.created_at DESC)
      FROM (
        SELECT * FROM character_decisions
        WHERE character_id = p_userchar_id
        ORDER BY created_at DESC
        LIMIT 5
      ) cd
    ),
    'recent_memories', (
      SELECT jsonb_agg(jsonb_build_object(
        'content', cm.content,
        'created_at', cm.created_at,
        'emotion_type', cm.emotion_type,
        'importance', cm.importance,
        'intensity', cm.intensity,
        'tags', cm.tags
      ) ORDER BY cm.created_at DESC)
      FROM (
        SELECT * FROM character_memories
        WHERE user_character_id = p_userchar_id
        ORDER BY created_at DESC
        LIMIT 10
      ) cm
    ),
    'recent_opponents', (
      SELECT jsonb_agg(jsonb_build_object(
        'opponent_name', c.name,
        'opponent_id', bp.character_id,
        'battle_date', b.started_at,
        'result', CASE
          WHEN b.winner_id = p_userchar_id THEN 'won'
          WHEN b.winner_id IS NULL THEN 'draw'
          ELSE 'lost'
        END
      ) ORDER BY b.started_at DESC)
      FROM battles b
      JOIN battle_participants bp ON b.id = bp.battle_id
      JOIN user_characters uc ON uc.id = bp.character_id
      JOIN characters c ON uc.character_id = c.id
      WHERE b.id IN (
        SELECT battle_id FROM battle_participants
        WHERE character_id = p_userchar_id
      )
      AND bp.character_id != p_userchar_id
      LIMIT 5
    ),
    'roommates', (
      SELECT jsonb_agg(jsonb_build_object(
        'character_id', uc2.character_id,
        'id', uc2.id,
        'name', c.name,
        'sleeping_arrangement', uc2.sleeping_arrangement
      ) ORDER BY c.name)
      FROM user_characters uc2
      JOIN characters c ON uc2.character_id = c.id
      WHERE uc2.user_id = v_uc.user_id
        AND uc2.id != p_userchar_id
        AND uc2.headquarters_id = v_uc.headquarters_id
    ),
    'teammates', (
      SELECT jsonb_agg(jsonb_build_object(
        'archetype', c.archetype,
        'character_id', uc2.character_id,
        'current_health', uc2.current_health,
        'current_max_health', uc2.current_max_health,
        'id', uc2.id,
        'level', uc2.level,
        'name', c.name
      ) ORDER BY c.name)
      FROM user_characters uc2
      JOIN characters c ON uc2.character_id = c.id
      WHERE uc2.user_id = v_uc.user_id AND uc2.id != p_userchar_id
    )
  );

  -- =====================================================
  -- 5. BUILD COMBAT PACKAGE (with 8 new stats)
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
    'current_speed', v_uc.current_speed,
    'current_spirit', v_uc.current_spirit,
    'current_toxic_resistance', v_uc.current_toxic_resistance,
    'current_wisdom', v_uc.current_wisdom,
    'energy_regen_rate', v_uc.energy_regen_rate,
    'mana_regen_rate', v_uc.mana_regen_rate,
    -- 8 NEW STATS added in migration 274
    'current_strength', v_uc.current_strength,
    'current_endurance', v_uc.current_endurance,
    'current_accuracy', v_uc.current_accuracy,
    'current_evasion', v_uc.current_evasion,
    'current_critical_chance', v_uc.current_critical_chance,
    'current_critical_damage', v_uc.current_critical_damage,
    'current_charisma', v_uc.current_charisma,
    'current_battle_focus', v_uc.current_battle_focus,
    'equipment', (
      SELECT jsonb_agg(jsonb_build_object(
        'equipment_id', ce.equipment_id,
        'is_equipped', ce.is_equipped,
        'item_name', e.name,
        'item_stats', e.stats,
        'slot', e.slot
      ) ORDER BY e.slot)
      FROM character_equipment ce
      JOIN equipment e ON ce.equipment_id = e.id
      WHERE ce.character_id = p_userchar_id AND ce.is_equipped = true
    ),
    'inventory', (
      SELECT jsonb_agg(jsonb_build_object(
        'equipment_id', ce.equipment_id,
        'is_equipped', ce.is_equipped,
        'item_name', e.name,
        'item_stats', e.stats,
        'slot', e.slot
      ) ORDER BY e.name)
      FROM character_equipment ce
      JOIN equipment e ON ce.equipment_id = e.id
      WHERE ce.character_id = p_userchar_id
    ),
    'items', (
      SELECT jsonb_agg(jsonb_build_object(
        'id', ci.item_id,
        'name', i.name,
        'quantity', ci.quantity
      ) ORDER BY i.name)
      FROM character_items ci
      JOIN items i ON ci.item_id = i.id
      WHERE ci.character_id = p_userchar_id
    ),
    'powers', (
      SELECT jsonb_agg(jsonb_build_object(
        'cooldown_expires_at', cp.cooldown_expires_at,
        'current_rank', cp.current_rank,
        'description', pd.description,
        'id', cp.power_id,
        'name', pd.name,
        'on_cooldown', cp.on_cooldown,
        'preference_score', cp.preference_score
      ) ORDER BY pd.name)
      FROM character_powers cp
      JOIN power_definitions pd ON cp.power_id = pd.id
      WHERE cp.character_id = p_userchar_id AND cp.unlocked = true
    ),
    'spells', (
      SELECT jsonb_agg(jsonb_build_object(
        'cooldown_expires_at', cs.cooldown_expires_at,
        'current_rank', cs.current_rank,
        'description', sd.description,
        'id', cs.spell_id,
        'name', sd.name,
        'on_cooldown', cs.on_cooldown,
        'preference_score', cs.preference_score
      ) ORDER BY sd.name)
      FROM character_spells cs
      JOIN spell_definitions sd ON cs.spell_id = sd.id
      WHERE cs.character_id = p_userchar_id AND cs.unlocked = true
    )
  );

  -- =====================================================
  -- 6. BUILD PSYCHOLOGICAL PACKAGE (with current_communication)
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
    -- current_communication added in migration 274
    'current_communication', v_uc.current_communication,
    'equipment_prefs', jsonb_build_object(
      'armor_proficiency', v_char.armor_proficiency,
      'preferred_armor_type', v_char.preferred_armor_type,
      'preferred_weapons', v_char.preferred_weapons,
      'weapon_proficiencies', v_char.weapon_proficiencies
    ),
    'category_preferences', (
      SELECT jsonb_agg(jsonb_build_object(
        'category_type', ccp.category_type,
        'category_value', ccp.category_value,
        'preference_score', ccp.preference_score
      ) ORDER BY ccp.category_type, ccp.category_value)
      FROM character_category_preferences ccp
      WHERE ccp.character_id = p_userchar_id
    ),
    'relationships', (
      SELECT jsonb_agg(jsonb_build_object(
        'affection', cr.current_affection,
        'character_id', cr.character2_id,
        'character_name', c.name,
        'respect', cr.current_respect,
        'rivalry', cr.current_rivalry,
        'shared_battles', cr.shared_battles,
        'therapy_sessions_together', cr.therapy_sessions_together,
        'trust', cr.current_trust
      ) ORDER BY c.name)
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
$function$;

COMMIT;

-- =====================================================
-- LOG MIGRATION
-- =====================================================

INSERT INTO migration_log (version, name)
VALUES (274, '274_update_get_full_character_data_packages')
ON CONFLICT (version) DO NOTHING;
