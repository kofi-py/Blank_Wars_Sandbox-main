-- Migration 214: Remove fake stats from system user_characters
-- Fixes the mistake in migration 212 where fake stats were added

BEGIN;

-- Set ALL stats to NULL for system user_characters
UPDATE user_characters
SET 
  -- Combat stats
  current_attack = NULL,
  current_defense = NULL,
  current_speed = NULL,
  current_dexterity = NULL,
  current_intelligence = NULL,
  current_wisdom = NULL,
  current_spirit = NULL,
  current_special = NULL,
  current_magic_attack = NULL,
  current_magic_defense = NULL,

  current_mana = NULL,
  current_max_mana = NULL,
  current_energy = NULL,
  current_max_energy = NULL,
  current_fire_resistance = NULL,
  current_cold_resistance = NULL,
  current_lightning_resistance = NULL,
  current_toxic_resistance = NULL,
  current_elemental_resistance = NULL,
  current_max_health = NULL,
  -- Psychological stats (NOT NULL columns use 0)
  current_health = 0,
  current_mental_health = 0,
  current_ego = 0,
  current_team_player = 0,
  current_training = 0,
  current_stress = NULL,
  current_fatigue = NULL,
  current_morale = NULL,
  current_confidence = NULL,

  bond_level = NULL,

  current_communication = NULL,
  -- Other stats from migration 212
  level = NULL,
  experience = NULL,
  equipment = NULL,
  is_injured = NULL,
  total_battles = NULL,
  total_wins = NULL
WHERE id LIKE 'system_%';

COMMIT;
