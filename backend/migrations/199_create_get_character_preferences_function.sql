-- Migration 199: Create get_character_preferences() PostgreSQL function
-- Returns granular preference data as a separate package
-- Only called by domains that need detailed preference info (equipment, abilities, attributes)

BEGIN;

CREATE OR REPLACE FUNCTION get_character_preferences(
  p_userchar_id TEXT
) RETURNS JSONB AS $$
BEGIN
  RETURN jsonb_build_object(
    'power_preferences', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'power_id', cp.power_id,
        'name', pd.name,
        'preference_score', cp.preference_score
      ) ORDER BY cp.preference_score DESC, pd.name), '[]'::jsonb)
      FROM character_powers cp
      JOIN power_definitions pd ON cp.power_id = pd.id
      WHERE cp.character_id = p_userchar_id AND cp.unlocked = true
    ),
    'spell_preferences', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'spell_id', cs.spell_id,
        'name', sd.name,
        'preference_score', cs.preference_score
      ) ORDER BY cs.preference_score DESC, sd.name), '[]'::jsonb)
      FROM character_spells cs
      JOIN spell_definitions sd ON cs.spell_id = sd.id
      WHERE cs.character_id = p_userchar_id AND cs.unlocked = true
    ),
    'equipment_preferences', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'equipment_id', ce.equipment_id,
        'name', e.name,
        'slot', e.slot,
        'preference_score', ce.preference_score
      ) ORDER BY ce.preference_score DESC, e.name), '[]'::jsonb)
      FROM character_equipment ce
      JOIN equipment e ON ce.equipment_id = e.id
      WHERE ce.character_id = p_userchar_id
    ),
    'attribute_preferences', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'category_type', ccp.category_type,
        'category_value', ccp.category_value,
        'preference_score', ccp.preference_score
      ) ORDER BY ccp.preference_score DESC), '[]'::jsonb)
      FROM character_category_preferences ccp
      WHERE ccp.character_id = p_userchar_id
        AND ccp.category_type = 'attribute'
    ),
    'resource_preferences', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'category_type', ccp.category_type,
        'category_value', ccp.category_value,
        'preference_score', ccp.preference_score
      ) ORDER BY ccp.preference_score DESC), '[]'::jsonb)
      FROM character_category_preferences ccp
      WHERE ccp.character_id = p_userchar_id
        AND ccp.category_type = 'resource'
    )
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_character_preferences(TEXT) IS
'Returns granular preference data for powers, spells, equipment, attributes, and resources.
Only used by domains that need detailed preference info (equipment, abilities, attributes, battle).
Separate from get_full_character_data() to avoid bloating prompts for domains that dont need it.';

COMMIT;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (199, '199_create_get_character_preferences_function')
ON CONFLICT (version) DO NOTHING;
