-- Migration 273: Add missing current_* stat columns to user_characters
-- These stats exist in the base characters table but were never tracked per-user-character

BEGIN;

-- =====================================================
-- 1. ADD NEW COLUMNS TO user_characters (nullable initially)
-- =====================================================

ALTER TABLE user_characters
ADD COLUMN IF NOT EXISTS current_strength INTEGER,
ADD COLUMN IF NOT EXISTS current_endurance INTEGER,
ADD COLUMN IF NOT EXISTS current_accuracy INTEGER,
ADD COLUMN IF NOT EXISTS current_evasion INTEGER,
ADD COLUMN IF NOT EXISTS current_critical_chance INTEGER,
ADD COLUMN IF NOT EXISTS current_critical_damage INTEGER,
ADD COLUMN IF NOT EXISTS current_charisma INTEGER,
ADD COLUMN IF NOT EXISTS current_battle_focus INTEGER;

-- =====================================================
-- 2. BACKFILL EXISTING ROWS FROM BASE CHARACTER VALUES
-- =====================================================

UPDATE user_characters uc
SET
  current_strength = c.strength,
  current_endurance = c.endurance,
  current_accuracy = c.accuracy,
  current_evasion = c.evasion,
  current_critical_chance = c.critical_chance,
  current_critical_damage = c.critical_damage,
  current_charisma = c.charisma,
  current_battle_focus = c.battle_focus
FROM characters c
WHERE uc.character_id = c.id;

-- =====================================================
-- 3. ADD NOT NULL CONSTRAINTS (will fail if any base character is missing values)
-- =====================================================

ALTER TABLE user_characters
ALTER COLUMN current_strength SET NOT NULL,
ALTER COLUMN current_endurance SET NOT NULL,
ALTER COLUMN current_accuracy SET NOT NULL,
ALTER COLUMN current_evasion SET NOT NULL,
ALTER COLUMN current_critical_chance SET NOT NULL,
ALTER COLUMN current_critical_damage SET NOT NULL,
ALTER COLUMN current_charisma SET NOT NULL,
ALTER COLUMN current_battle_focus SET NOT NULL;

-- =====================================================
-- 4. DROP FAKE STAT current_special (no source column, was mapped to strength incorrectly)
-- =====================================================

ALTER TABLE user_characters DROP COLUMN IF EXISTS current_special;

-- =====================================================
-- 5. UPDATE THE TRIGGER FUNCTION TO INITIALIZE NEW COLUMNS
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
    current_confidence = c.confidence_level,
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

COMMIT;

-- =====================================================
-- 6. LOG MIGRATION
-- =====================================================

INSERT INTO migration_log (version, name)
VALUES (273, '273_add_missing_current_stat_columns')
ON CONFLICT (version) DO NOTHING;
