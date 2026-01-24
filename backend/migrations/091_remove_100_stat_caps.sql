-- Migration 091: Remove 100 cap from stats to allow unlimited growth
-- Keeps lower bound of 0 but removes upper limit for scalability
-- Exception: win_percentage stays 0-100 as it's a percentage

-- Psych Stats - Remove 100 cap
ALTER TABLE user_characters DROP CONSTRAINT IF EXISTS user_characters_current_training_check;
ALTER TABLE user_characters ADD CONSTRAINT user_characters_current_training_check CHECK (current_training >= 0);

ALTER TABLE user_characters DROP CONSTRAINT IF EXISTS user_characters_current_mental_health_check;
ALTER TABLE user_characters ADD CONSTRAINT user_characters_current_mental_health_check CHECK (current_mental_health >= 0);

ALTER TABLE user_characters DROP CONSTRAINT IF EXISTS user_characters_current_team_player_check;
ALTER TABLE user_characters ADD CONSTRAINT user_characters_current_team_player_check CHECK (current_team_player >= 0);

ALTER TABLE user_characters DROP CONSTRAINT IF EXISTS user_characters_current_ego_check;
ALTER TABLE user_characters ADD CONSTRAINT user_characters_current_ego_check CHECK (current_ego >= 0);

ALTER TABLE user_characters DROP CONSTRAINT IF EXISTS user_characters_stress_level_check;
ALTER TABLE user_characters ADD CONSTRAINT user_characters_stress_level_check CHECK (stress_level >= 0);

ALTER TABLE user_characters DROP CONSTRAINT IF EXISTS user_characters_current_communication_check;
ALTER TABLE user_characters ADD CONSTRAINT user_characters_current_communication_check CHECK (current_communication >= 0);

ALTER TABLE user_characters DROP CONSTRAINT IF EXISTS user_characters_fatigue_level_check;
ALTER TABLE user_characters ADD CONSTRAINT user_characters_fatigue_level_check CHECK (fatigue_level >= 0);

ALTER TABLE user_characters DROP CONSTRAINT IF EXISTS user_characters_morale_check;
ALTER TABLE user_characters ADD CONSTRAINT user_characters_morale_check CHECK (morale >= 0);

-- Gameplan adherence - Remove cap (will now be calculated without LEAST(100,...))
ALTER TABLE user_characters DROP CONSTRAINT IF EXISTS user_characters_gameplan_adherence_check;
-- Don't add it back - will be regenerated when we fix the generated column

-- Win percentage stays 0-100 (it's a true percentage)
-- Already has correct constraint

-- Level bonus stats - Remove caps
ALTER TABLE user_characters DROP CONSTRAINT IF EXISTS user_characters_level_bonus_attack_check;
ALTER TABLE user_characters ADD CONSTRAINT user_characters_level_bonus_attack_check CHECK (level_bonus_attack >= 0);

ALTER TABLE user_characters DROP CONSTRAINT IF EXISTS user_characters_level_bonus_defense_check;
ALTER TABLE user_characters ADD CONSTRAINT user_characters_level_bonus_defense_check CHECK (level_bonus_defense >= 0);

ALTER TABLE user_characters DROP CONSTRAINT IF EXISTS user_characters_level_bonus_speed_check;
ALTER TABLE user_characters ADD CONSTRAINT user_characters_level_bonus_speed_check CHECK (level_bonus_speed >= 0);

ALTER TABLE user_characters DROP CONSTRAINT IF EXISTS user_characters_level_bonus_max_health_check;
ALTER TABLE user_characters ADD CONSTRAINT user_characters_level_bonus_max_health_check CHECK (level_bonus_max_health >= 0);

ALTER TABLE user_characters DROP CONSTRAINT IF EXISTS user_characters_level_bonus_special_check;
ALTER TABLE user_characters ADD CONSTRAINT user_characters_level_bonus_special_check CHECK (level_bonus_special >= 0);

-- Comment
COMMENT ON TABLE user_characters IS 'Character stats no longer capped at 100 - allows unlimited growth through archetype/species/individual modifiers + equipment + buffs';
