-- Migration 290: Fix registration failures and remove illegal sleeping defaults
--
-- Problems fixed:
-- 1. characters.confidence column missing
-- 2. initialize_user_character_stats trigger references c.confidence_level (wrong column name)
-- 3. sleeping_arrangement has illegal database default 'bunk_bed'
-- 4. gameplay_mood_modifiers has illegal database default
--
-- Note: After this migration, databaseAdapter.ts MUST be updated to:
-- - Determine sleeping_arrangement BEFORE INSERT
-- - Include sleeping_arrangement and gameplay_mood_modifiers in INSERT
-- - Claim bed in room_beds AFTER INSERT

BEGIN;

-- =====================================================
-- 1. ADD confidence COLUMN TO characters TABLE
-- =====================================================

ALTER TABLE characters ADD COLUMN IF NOT EXISTS confidence INTEGER;

-- =====================================================
-- 2. POPULATE confidence VALUES
-- Use mental_health as proxy (conceptually similar stat)
-- =====================================================

UPDATE characters
SET confidence = COALESCE(mental_health, 50)
WHERE confidence IS NULL;

-- =====================================================
-- 3. SET NOT NULL CONSTRAINT
-- =====================================================

ALTER TABLE characters ALTER COLUMN confidence SET NOT NULL;

-- =====================================================
-- 4. FIX initialize_user_character_stats TRIGGER
-- Change c.confidence_level to c.confidence
-- =====================================================

CREATE OR REPLACE FUNCTION public.initialize_user_character_stats()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE user_characters uc
  SET
    current_attack = c.attack,
    current_defense = c.defense,
    current_speed = c.speed,
    current_max_health = c.max_health,
    current_max_energy = c.max_energy,
    current_max_mana = c.max_mana,
    current_training = c.training,
    current_team_player = c.team_player,
    current_ego = c.ego,
    current_mental_health = c.mental_health,
    current_communication = c.communication,
    current_morale = c.morale,
    current_stress = c.stress,
    current_fatigue = c.fatigue,
    current_confidence = c.confidence,
    current_health = c.max_health,
    current_energy = c.max_energy,
    current_mana = c.max_mana,
    current_strength = c.strength,
    current_endurance = c.endurance,
    current_accuracy = c.accuracy,
    current_evasion = c.evasion,
    current_critical_chance = c.critical_chance,
    current_critical_damage = c.critical_damage,
    current_charisma = c.charisma,
    current_battle_focus = c.battle_focus
  FROM characters c
  WHERE uc.id = NEW.id AND uc.character_id = c.id;

  RETURN NEW;
END;
$function$;

-- =====================================================
-- 6. REMOVE ILLEGAL DATABASE DEFAULTS
-- These must be set explicitly in application code
-- =====================================================

ALTER TABLE user_characters ALTER COLUMN sleeping_arrangement DROP DEFAULT;
ALTER TABLE user_characters ALTER COLUMN gameplay_mood_modifiers DROP DEFAULT;

-- =====================================================
-- 7. LOG MIGRATION
-- Inside transaction: logs on success, rolls back with migration on failure
-- =====================================================

INSERT INTO migration_log (version, name)
VALUES (290, '290_fix_registration_and_sleeping_defaults')
ON CONFLICT (version) DO NOTHING;

COMMIT;
