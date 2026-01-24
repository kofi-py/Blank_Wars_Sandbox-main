-- Migration: 069 - Add Argock the Orc Trainer (System Character)
-- Description: Adds Argock as a system character for training sessions, similar to therapists
-- Created: 2025-11-02

BEGIN;

-- Insert Argock character
-- Using Moe Howard's comedy style (slapstick authoritarian, aggressive control, violent rhythm)
INSERT INTO characters (
  id,
  name,
  species,
  origin_era,
  archetype,
  backstory,
  personality_traits,
  comedian_style_id,
  health,
  attack,
  defense,
  speed,
  magic_attack
)
SELECT
  'argock',
  'Argock',
  'Orc',
  'Fantasy Realm',
  'system',
  'Argock is a gruff, no-nonsense orc personal trainer who runs the BlankWars training facility with an iron fist. A veteran of countless battles, he has zero patience for weakness and delivers brutal honesty wrapped in tough-love motivation. He calls out deficiencies immediately, gives specific actionable advice, and uses aggressive gym-slang to push contestants beyond their limits. Despite his harsh exterior, he genuinely wants every fighter to reach their full potential - even if he has to beat it into them.',
  'Gruff and direct, Brutally honest, Experienced veteran, Tough-love motivator, Zero tolerance for excuses',
  (SELECT id FROM comedian_styles WHERE comedian_name = 'Moe Howard' LIMIT 1),
  999,  -- System character, doesn't fight
  999,
  999,
  999,
  999
WHERE NOT EXISTS (
  SELECT 1 FROM characters WHERE id = 'argock'
);

-- Verify insertion
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM characters WHERE id = 'argock') THEN
    RAISE EXCEPTION 'Failed to insert Argock character';
  END IF;

  RAISE NOTICE 'Successfully added Argock the Orc Trainer to characters table';
END $$;

COMMIT;
