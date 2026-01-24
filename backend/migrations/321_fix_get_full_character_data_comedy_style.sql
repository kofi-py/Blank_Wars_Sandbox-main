-- Migration 321: Fix get_full_character_data to use comedy_style from characters table
--
-- PROBLEM: The function was reading comedy_style from the deprecated comedian_styles table
-- via comedian_style_id JOIN. Migration 313 moved comedy_style directly to characters table,
-- and migration 315 fixed get_system_character_data, but get_full_character_data was missed.
--
-- FIX: Remove comedian_styles JOIN, read comedy_style directly from characters.comedy_style

BEGIN;

DO $$
BEGIN
    RAISE NOTICE 'Migration 321: Fixing get_full_character_data to use characters.comedy_style directly...';
END $$;

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
  -- Subquery results for validation
  v_recent_decisions JSONB;
  v_recent_memories JSONB;
  v_recent_opponents JSONB;
  v_roommates JSONB;
  v_teammates JSONB;
  v_equipment JSONB;
  v_inventory JSONB;
  v_items JSONB;
  v_powers JSONB;
  v_spells JSONB;
  v_category_preferences JSONB;
  v_relationships JSONB;
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
  -- CHANGED: Removed comedian_styles JOIN - comedy_style now comes directly from characters table
  -- =====================================================
  SELECT c.*
  INTO v_char
  FROM characters c
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
  -- 4. FETCH AND VALIDATE ARRAY DATA
  -- =====================================================

  -- recent_decisions: CAN be empty for new characters
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'coach_advice', cd.coach_advice,
    'created_at', cd.created_at,
    'decision_type', cd.decision_type,
    'description', cd.description,
    'domain', cd.domain,
    'followed_advice', cd.followed_advice,
    'outcome', cd.outcome
  ) ORDER BY cd.created_at DESC), '[]'::jsonb)
  INTO v_recent_decisions
  FROM (
    SELECT * FROM character_decisions
    WHERE character_id = p_userchar_id
    ORDER BY created_at DESC
    LIMIT 5
  ) cd;

  -- recent_memories: CAN be empty for new characters
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'content', cm.content,
    'created_at', cm.created_at,
    'emotion_type', cm.emotion_type,
    'importance', cm.importance,
    'intensity', cm.intensity,
    'tags', cm.tags
  ) ORDER BY cm.created_at DESC), '[]'::jsonb)
  INTO v_recent_memories
  FROM (
    SELECT * FROM character_memories
    WHERE user_character_id = p_userchar_id
    ORDER BY created_at DESC
    LIMIT 10
  ) cm;

  -- recent_opponents: CAN be empty for new characters (no battles yet)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'opponent_name', c.name,
    'opponent_id', bp.character_id,
    'battle_date', b.started_at,
    'result', CASE
      WHEN b.winner_id = p_userchar_id THEN 'won'
      WHEN b.winner_id IS NULL THEN 'draw'
      ELSE 'lost'
    END
  ) ORDER BY b.started_at DESC), '[]'::jsonb)
  INTO v_recent_opponents
  FROM battles b
  JOIN battle_participants bp ON b.id = bp.battle_id
  JOIN user_characters uc ON uc.id = bp.character_id
  JOIN characters c ON uc.character_id = c.id
  WHERE b.id IN (
    SELECT battle_id FROM battle_participants
    WHERE character_id = p_userchar_id
  )
  AND bp.character_id != p_userchar_id
  LIMIT 5;

  -- roommates: MUST have values (all characters have roommates)
  SELECT jsonb_agg(jsonb_build_object(
    'character_id', uc2.character_id,
    'id', uc2.id,
    'name', c.name,
    'sleeping_arrangement', uc2.sleeping_arrangement
  ) ORDER BY c.name)
  INTO v_roommates
  FROM user_characters uc2
  JOIN characters c ON uc2.character_id = c.id
  WHERE uc2.user_id = v_uc.user_id
    AND uc2.id != p_userchar_id
    AND uc2.headquarters_id = v_uc.headquarters_id;

  IF v_roommates IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % has no roommates', p_userchar_id;
  END IF;

  -- teammates: MUST have values (all characters have teammates)
  SELECT jsonb_agg(jsonb_build_object(
    'archetype', c.archetype,
    'character_id', uc2.character_id,
    'current_health', uc2.current_health,
    'current_max_health', uc2.current_max_health,
    'id', uc2.id,
    'level', uc2.level,
    'name', c.name
  ) ORDER BY c.name)
  INTO v_teammates
  FROM user_characters uc2
  JOIN characters c ON uc2.character_id = c.id
  WHERE uc2.user_id = v_uc.user_id AND uc2.id != p_userchar_id;

  IF v_teammates IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % has no teammates', p_userchar_id;
  END IF;

  -- equipment (equipped): CAN be empty (characters don't start with equipped gear)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'equipment_id', ce.equipment_id,
    'is_equipped', ce.is_equipped,
    'item_name', e.name,
    'item_stats', e.stats,
    'slot', e.slot
  )), '[]'::jsonb)
  INTO v_equipment
  FROM character_equipment ce
  JOIN equipment e ON ce.equipment_id = e.id
  WHERE ce.user_character_id = p_userchar_id AND ce.is_equipped = true;

  -- inventory (unequipped): CAN be empty
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'equipment_id', ce.equipment_id,
    'is_equipped', ce.is_equipped,
    'item_name', e.name,
    'item_stats', e.stats,
    'slot', e.slot
  )), '[]'::jsonb)
  INTO v_inventory
  FROM character_equipment ce
  JOIN equipment e ON ce.equipment_id = e.id
  WHERE ce.user_character_id = p_userchar_id AND ce.is_equipped = false;

  -- items (consumables): CAN be empty
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'item_id', ci.item_id,
    'item_name', i.name,
    'quantity', ci.quantity
  )), '[]'::jsonb)
  INTO v_items
  FROM character_items ci
  JOIN items i ON ci.item_id = i.id
  WHERE ci.user_character_id = p_userchar_id;

  -- powers: CAN be empty (depends on character build)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'power_id', cp.power_id,
    'power_name', p.name,
    'power_level', cp.power_level
  )), '[]'::jsonb)
  INTO v_powers
  FROM character_powers cp
  JOIN powers p ON cp.power_id = p.id
  WHERE cp.user_character_id = p_userchar_id;

  -- spells: CAN be empty (depends on character build)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'spell_id', cs.spell_id,
    'spell_name', s.name,
    'spell_level', cs.spell_level
  )), '[]'::jsonb)
  INTO v_spells
  FROM character_spells cs
  JOIN spells s ON cs.spell_id = s.id
  WHERE cs.user_character_id = p_userchar_id;

  -- category_preferences: CAN be empty for new characters
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'category_id', cp.category_id,
    'category_name', c.name,
    'preference_level', cp.preference_level
  )), '[]'::jsonb)
  INTO v_category_preferences
  FROM character_category_preferences cp
  JOIN categories c ON cp.category_id = c.id
  WHERE cp.user_character_id = p_userchar_id;

  -- relationships: MUST have values (all characters have relationships)
  SELECT jsonb_agg(jsonb_build_object(
    'character2_id', cr.character2_id,
    'character2_name', c.name,
    'current_sentiment', cr.current_sentiment,
    'battles_fought_together', cr.battles_fought_together,
    'battles_won_together', cr.battles_won_together,
    'therapy_sessions_together', cr.therapy_sessions_together,
    'trust', cr.current_trust
  ) ORDER BY c.name)
  INTO v_relationships
  FROM character_relationships cr
  JOIN characters c ON cr.character2_id = c.id
  WHERE cr.character1_id = v_character_id;

  IF v_relationships IS NULL THEN
    RAISE EXCEPTION 'STRICT MODE: User character % has no relationships', p_userchar_id;
  END IF;

  -- =====================================================
  -- 5. BUILD IDENTITY PACKAGE
  -- CHANGED: comedy_style now from v_char.comedy_style (characters table)
  --          comedian_category and comedian_name are deprecated (NULL)
  -- =====================================================
  v_identity := jsonb_build_object(
    'archetype', v_char.archetype,
    'backstory', v_char.backstory,
    'character_id', v_character_id,
    'comedian_category', NULL,
    'comedian_name', NULL,
    'comedy_style', v_char.comedy_style,
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
    'recent_decisions', v_recent_decisions,
    'recent_memories', v_recent_memories,
    'recent_opponents', v_recent_opponents,
    'roommates', v_roommates,
    'teammates', v_teammates
  );

  -- =====================================================
  -- 6. BUILD COMBAT PACKAGE
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
    'current_strength', v_uc.current_strength,
    'current_endurance', v_uc.current_endurance,
    'current_accuracy', v_uc.current_accuracy,
    'current_evasion', v_uc.current_evasion,
    'current_critical_chance', v_uc.current_critical_chance,
    'current_critical_damage', v_uc.current_critical_damage,
    'current_charisma', v_uc.current_charisma,
    'current_battle_focus', v_uc.current_battle_focus,
    'equipment', v_equipment,
    'inventory', v_inventory,
    'items', v_items,
    'powers', v_powers,
    'spells', v_spells
  );

  -- =====================================================
  -- 7. BUILD PSYCHOLOGICAL PACKAGE
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
    'current_communication', v_uc.current_communication,
    'equipment_prefs', jsonb_build_object(
      'armor_proficiency', v_char.armor_proficiency,
      'preferred_armor_type', v_char.preferred_armor_type,
      'preferred_weapons', v_char.preferred_weapons,
      'weapon_proficiencies', v_char.weapon_proficiencies
    ),
    'category_preferences', v_category_preferences,
    'relationships', v_relationships
  );

  -- =====================================================
  -- 8. RETURN AS 3 NESTED PACKAGES
  -- =====================================================
  RETURN jsonb_build_object(
    'IDENTITY', v_identity,
    'COMBAT', v_combat,
    'PSYCHOLOGICAL', v_psychological
  );
END;
$function$;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (321, '321_fix_get_full_character_data_comedy_style')
ON CONFLICT (version) DO NOTHING;

DO $$
BEGIN
    RAISE NOTICE 'Migration 321 complete: get_full_character_data now reads comedy_style from characters table directly';
END $$;

COMMIT;
