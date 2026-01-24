-- Migration 202: Populate AI character abilities from power_definitions
-- Each AI character gets their character-specific powers as JSON

BEGIN;

-- Update each AI character with their powers from power_definitions
UPDATE ai_characters ac
SET abilities = (
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'id', pd.id,
        'name', pd.name,
        'cooldown', pd.cooldown,
        'energy_cost', pd.energy_cost,
        'power_type', pd.power_type,
        'effects', pd.effects
      )
    ),
    '[]'::json
  )::text
  FROM power_definitions pd
  WHERE pd.character_id = ac.character_id
);

COMMIT;
