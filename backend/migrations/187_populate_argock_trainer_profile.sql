-- Migration: 187 - Populate Argock Trainer Profile
-- Description: Completes Argock's character profile with missing fields (like migration 184 did for therapists)
-- Created: 2025-12-07

BEGIN;

-- Update Argock with complete profile
UPDATE characters
SET
  title = 'Head Trainer of BlankWars',
  conversation_style = 'Barks orders in short, aggressive bursts. Uses gym slang and military drill sergeant cadence. Never wastes words - maximum 2 sentences. Calls out weakness immediately then gives specific actionable fix. Tough love wrapped in insults.',
  conversation_topics = ARRAY[
    'Combat training techniques',
    'Physical conditioning and endurance',
    'Battle strategy and tactics',
    'Weakness identification and correction',
    'Mental toughness and discipline',
    'Fighter performance analysis',
    'Equipment and form correction'
  ]::text[],
  personality_traits = ARRAY[
    'Gruff and direct',
    'Brutally honest',
    'Experienced veteran',
    'Tough-love motivator',
    'Zero tolerance for excuses',
    'Secretly caring beneath harsh exterior',
    'Observant of fighter potential'
  ]::text[],
  -- Ensure stat columns are set (in case old base_* columns were used)
  max_health = COALESCE(max_health, 999),
  attack = COALESCE(attack, 999),
  defense = COALESCE(defense, 999),
  speed = COALESCE(speed, 999),
  magic_attack = COALESCE(magic_attack, 999),
  magic_defense = COALESCE(magic_defense, 999),
  dexterity = COALESCE(dexterity, 999),
  intelligence = COALESCE(intelligence, 80),
  wisdom = COALESCE(wisdom, 90),
  elemental_resistance = COALESCE(elemental_resistance, 50)
WHERE id = 'argock';

-- Verify the update
DO $$
DECLARE
  argock_record RECORD;
BEGIN
  SELECT id, name, title, conversation_style, personality_traits
  INTO argock_record
  FROM characters
  WHERE id = 'argock';

  IF argock_record.id IS NULL THEN
    RAISE EXCEPTION 'Argock character not found - run migration 069 first';
  END IF;

  IF argock_record.title IS NULL THEN
    RAISE EXCEPTION 'Failed to update Argock title';
  END IF;

  IF argock_record.conversation_style IS NULL THEN
    RAISE EXCEPTION 'Failed to update Argock conversation_style';
  END IF;

  IF argock_record.personality_traits IS NULL OR array_length(argock_record.personality_traits::text[], 1) = 0 THEN
    RAISE EXCEPTION 'Failed to update Argock personality_traits';
  END IF;

  RAISE NOTICE 'Successfully updated Argock trainer profile: title=%, traits=%',
    argock_record.title,
    array_length(argock_record.personality_traits::text[], 1)::text;
END $$;

COMMIT;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (187, '187_populate_argock_trainer_profile')
ON CONFLICT (version) DO NOTHING;
