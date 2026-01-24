-- Migration 203: Add spells column to ai_characters and populate all combat data

BEGIN;

-- Add spells column
ALTER TABLE ai_characters ADD COLUMN IF NOT EXISTS spells text DEFAULT '[]'::text;

-- Populate spells from spell_definitions
UPDATE ai_characters ac
SET spells = (
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'id', sd.id,
        'name', sd.name,
        'cooldown_turns', sd.cooldown_turns,
        'mana_cost', sd.mana_cost,
        'tier', sd.tier,
        'effects', sd.effects
      )
    ),
    '[]'::json
  )::text
  FROM spell_definitions sd
  WHERE sd.character_id = ac.character_id
);

-- Update personality_traits from characters table
UPDATE ai_characters ac
SET personality_traits = (
  SELECT COALESCE(c.personality_traits::text, '[]')
  FROM characters c
  WHERE c.id = ac.character_id
);

COMMIT;
