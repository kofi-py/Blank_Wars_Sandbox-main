-- Migration 122: Unlock Universal Power and Spell
-- Purpose: Ensure all characters have access to basic universal power (Strength) and spell (Minor Heal)
-- Uses REAL database entries only - NO fake data creation

BEGIN;

-- 1. Unlock 'strength' power for ALL characters who don't have it
INSERT INTO character_powers (character_id, power_id, unlocked, unlocked_at, unlocked_by)
SELECT id, 'strength', true, NOW(), 'migration_universal_unlock'
FROM user_characters
WHERE id NOT IN (
  SELECT character_id FROM character_powers WHERE power_id = 'strength'
);

-- 2. Unlock 'universal_minor_heal' spell for ALL characters who don't have it
INSERT INTO character_spells (character_id, spell_id, unlocked, unlocked_at, unlocked_by)
SELECT id, 'universal_minor_heal', true, NOW(), 'migration_universal_unlock'
FROM user_characters
WHERE id NOT IN (
  SELECT character_id FROM character_spells WHERE spell_id = 'universal_minor_heal'
);

COMMIT;
