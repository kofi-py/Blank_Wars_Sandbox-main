/**
 * Apply the DB function fix for the type mismatch issue
 */
import { query } from './src/database/postgres';
import dotenv from 'dotenv';

dotenv.config();

async function applyFix() {
  console.log('Applying DB function fix...');

  const sql = `
CREATE OR REPLACE FUNCTION get_full_character_data(
  p_character_id TEXT,
  p_userchar_id TEXT
) RETURNS JSONB AS $$
DECLARE
  v_char RECORD;
  v_uc RECORD;
  v_tc RECORD;
  v_identity JSONB;
  v_combat JSONB;
  v_psychological JSONB;
BEGIN
  SELECT c.*, cs.comedian_name AS cs_comedian_name, cs.comedy_style AS cs_comedy_style
  INTO v_char
  FROM characters c
  LEFT JOIN comedian_styles cs ON c.comedian_style_id = cs.id
  WHERE c.id = p_character_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'STRICT MODE: Character % not found', p_character_id; END IF;
  IF v_char.name IS NULL THEN RAISE EXCEPTION 'STRICT MODE: Character % missing name', p_character_id; END IF;
  IF v_char.backstory IS NULL THEN RAISE EXCEPTION 'STRICT MODE: Character % missing backstory', p_character_id; END IF;
  IF v_char.species IS NULL THEN RAISE EXCEPTION 'STRICT MODE: Character % missing species', p_character_id; END IF;
  IF v_char.archetype IS NULL THEN RAISE EXCEPTION 'STRICT MODE: Character % missing archetype', p_character_id; END IF;

  SELECT uc.*, t.team_name INTO v_uc
  FROM user_characters uc
  LEFT JOIN teams t ON uc.user_id = t.user_id
  WHERE uc.id = p_userchar_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'STRICT MODE: User character % not found', p_userchar_id; END IF;
  IF v_uc.character_id != p_character_id THEN RAISE EXCEPTION 'STRICT MODE: User character % does not match character %', p_userchar_id, p_character_id; END IF;
  IF v_uc.current_attack IS NULL THEN RAISE EXCEPTION 'STRICT MODE: User character % missing current_attack', p_userchar_id; END IF;
  IF v_uc.current_defense IS NULL THEN RAISE EXCEPTION 'STRICT MODE: User character % missing current_defense', p_userchar_id; END IF;
  IF v_uc.current_health IS NULL THEN RAISE EXCEPTION 'STRICT MODE: User character % missing current_health', p_userchar_id; END IF;
  IF v_uc.current_max_health IS NULL THEN RAISE EXCEPTION 'STRICT MODE: User character % missing current_max_health', p_userchar_id; END IF;
  IF v_uc.level IS NULL THEN RAISE EXCEPTION 'STRICT MODE: User character % missing level', p_userchar_id; END IF;

  SELECT tc.* INTO v_tc
  FROM team_context tc
  JOIN teams t ON tc.team_id = t.id::text
  WHERE t.user_id = v_uc.user_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'STRICT MODE: Team context not found for user character %', p_userchar_id; END IF;

  v_identity := jsonb_build_object(
    'archetype', v_char.archetype,
    'backstory', v_char.backstory,
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
    'win_percentage', v_uc.win_percentage,
    'recent_decisions', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'coach_advice', cd.coach_advice, 'created_at', cd.created_at,
        'decision_type', cd.decision_type, 'description', cd.description,
        'domain', cd.domain, 'followed_advice', cd.followed_advice, 'outcome', cd.outcome
      ) ORDER BY cd.created_at DESC), '[]'::jsonb)
      FROM (SELECT * FROM character_decisions WHERE character_id = p_userchar_id ORDER BY created_at DESC LIMIT 5) cd
    ),
    'recent_memories', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'content', cm.content, 'created_at', cm.created_at,
        'emotion_type', cm.emotion_type, 'importance', cm.importance,
        'intensity', cm.intensity, 'tags', cm.tags
      ) ORDER BY cm.created_at DESC), '[]'::jsonb)
      FROM (SELECT * FROM character_memories WHERE character_id = p_userchar_id ORDER BY created_at DESC LIMIT 10) cm
    ),
    'roommates', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'character_id', uc2.character_id, 'id', uc2.id, 'name', c.name, 'sleeping_arrangement', uc2.sleeping_arrangement
      ) ORDER BY c.name), '[]'::jsonb)
      FROM user_characters uc2 JOIN characters c ON uc2.character_id = c.id
      WHERE uc2.user_id = v_uc.user_id AND uc2.id != p_userchar_id AND uc2.headquarters_id = v_uc.headquarters_id
    ),
    'teammates', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'archetype', c.archetype, 'character_id', uc2.character_id, 'current_health', uc2.current_health,
        'current_max_health', uc2.current_max_health, 'id', uc2.id, 'level', uc2.level, 'name', c.name
      ) ORDER BY c.name), '[]'::jsonb)
      FROM user_characters uc2 JOIN characters c ON uc2.character_id = c.id
      WHERE uc2.user_id = v_uc.user_id AND uc2.id != p_userchar_id
    )
  );

  v_combat := jsonb_build_object(
    'current_attack', v_uc.current_attack, 'current_cold_resistance', v_uc.current_cold_resistance,
    'current_defense', v_uc.current_defense, 'current_dexterity', v_uc.current_dexterity,
    'current_elemental_resistance', v_uc.current_elemental_resistance, 'current_energy', v_uc.current_energy,
    'current_fire_resistance', v_uc.current_fire_resistance, 'current_health', v_uc.current_health,
    'current_initiative', v_uc.current_initiative, 'current_intelligence', v_uc.current_intelligence,
    'current_lightning_resistance', v_uc.current_lightning_resistance, 'current_magic_attack', v_uc.current_magic_attack,
    'current_magic_defense', v_uc.current_magic_defense, 'current_mana', v_uc.current_mana,
    'current_max_energy', v_uc.current_max_energy, 'current_max_health', v_uc.current_max_health,
    'current_max_mana', v_uc.current_max_mana, 'current_special', v_uc.current_special,
    'current_speed', v_uc.current_speed, 'current_spirit', v_uc.current_spirit,
    'current_toxic_resistance', v_uc.current_toxic_resistance, 'current_wisdom', v_uc.current_wisdom,
    'energy_regen_rate', v_uc.energy_regen_rate, 'mana_regen_rate', v_uc.mana_regen_rate,
    'equipment', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'equipment_id', ce.equipment_id, 'is_equipped', ce.is_equipped,
        'item_name', e.name, 'item_stats', e.stats, 'slot', e.slot
      ) ORDER BY e.slot), '[]'::jsonb)
      FROM character_equipment ce JOIN equipment e ON ce.equipment_id = e.id
      WHERE ce.character_id = p_userchar_id AND ce.is_equipped = true
    ),
    'inventory', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'equipment_id', ce.equipment_id, 'is_equipped', ce.is_equipped,
        'item_name', e.name, 'item_stats', e.stats, 'slot', e.slot
      ) ORDER BY e.name), '[]'::jsonb)
      FROM character_equipment ce JOIN equipment e ON ce.equipment_id = e.id
      WHERE ce.character_id = p_userchar_id
    ),
    'items', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', ci.item_id, 'name', i.name, 'quantity', ci.quantity
      ) ORDER BY i.name), '[]'::jsonb)
      FROM character_items ci JOIN items i ON ci.item_id = i.id
      WHERE ci.character_id = p_userchar_id
    ),
    'powers', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'cooldown_expires_at', cp.cooldown_expires_at, 'current_rank', cp.current_rank,
        'description', pd.description, 'id', cp.power_id, 'name', pd.name, 'on_cooldown', cp.on_cooldown,
        'preference_score', cp.preference_score
      ) ORDER BY pd.name), '[]'::jsonb)
      FROM character_powers cp JOIN power_definitions pd ON cp.power_id = pd.id
      WHERE cp.character_id = p_userchar_id AND cp.unlocked = true
    ),
    'spells', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'cooldown_expires_at', cs.cooldown_expires_at, 'current_rank', cs.current_rank,
        'description', sd.description, 'id', cs.spell_id, 'name', sd.name, 'on_cooldown', cs.on_cooldown,
        'preference_score', cs.preference_score
      ) ORDER BY sd.name), '[]'::jsonb)
      FROM character_spells cs JOIN spell_definitions sd ON cs.spell_id = sd.id
      WHERE cs.character_id = p_userchar_id AND cs.unlocked = true
    )
  );

  v_psychological := jsonb_build_object(
    'bond_level', v_uc.bond_level, 'coach_trust_level', v_uc.coach_trust_level,
    'current_confidence', v_uc.current_confidence, 'current_ego', v_uc.current_ego,
    'current_fatigue', v_uc.current_fatigue, 'current_mental_health', v_uc.current_mental_health,
    'current_morale', v_uc.current_morale, 'current_stress', v_uc.current_stress,
    'current_team_player', v_uc.current_team_player, 'financial_stress', v_uc.financial_stress,
    'gameplan_adherence', v_uc.gameplan_adherence,
    'gameplay_mood_modifiers', COALESCE(v_uc.gameplay_mood_modifiers, '{"modifiers": []}'::jsonb),
    'equipment_prefs', jsonb_build_object(
      'armor_proficiency', v_char.armor_proficiency, 'preferred_armor_type', v_char.preferred_armor_type,
      'preferred_weapons', v_char.preferred_weapons, 'weapon_proficiencies', v_char.weapon_proficiencies
    ),
    'category_preferences', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'category_type', ccp.category_type, 'category_value', ccp.category_value,
        'preference_score', ccp.preference_score
      ) ORDER BY ccp.category_type, ccp.category_value), '[]'::jsonb)
      FROM character_category_preferences ccp
      WHERE ccp.character_id = p_userchar_id
    ),
    'relationships', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'affection', cr.current_affection, 'character_id', cr.character2_id, 'character_name', c.name,
        'respect', cr.current_respect, 'rivalry', cr.current_rivalry, 'shared_battles', cr.shared_battles,
        'therapy_sessions_together', cr.therapy_sessions_together, 'trust', cr.current_trust
      ) ORDER BY c.name), '[]'::jsonb)
      FROM character_relationships cr JOIN characters c ON cr.character2_id = c.id
      WHERE cr.character1_id = p_character_id
    )
  );

  RETURN jsonb_build_object('IDENTITY', v_identity, 'COMBAT', v_combat, 'PSYCHOLOGICAL', v_psychological);
END;
$$ LANGUAGE plpgsql;
`;

  try {
    await query(sql);
    console.log('✅ DB function updated successfully!');
  } catch (error) {
    console.error('❌ Failed to update DB function:', error);
  }

  process.exit(0);
}

applyFix();
