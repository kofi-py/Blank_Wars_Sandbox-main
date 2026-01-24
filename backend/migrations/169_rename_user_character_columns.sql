-- Migration 169: Rename user_characters columns for consistency
-- All columns should have current_ prefix to indicate they are the
-- current state of the character instance (base + modifiers)
--
-- characters table = base/canonical stats
-- user_characters table = current_ stats (runtime state)

-- Rename max resource columns to current_max_*
ALTER TABLE user_characters RENAME COLUMN max_energy TO current_max_energy;
ALTER TABLE user_characters RENAME COLUMN max_mana TO current_max_mana;

-- max_health might already be named differently, check and handle
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'user_characters' AND column_name = 'max_health') THEN
    ALTER TABLE user_characters RENAME COLUMN max_health TO current_max_health;
  END IF;
END $$;

-- Rename psychological runtime state columns
ALTER TABLE user_characters RENAME COLUMN morale TO current_morale;
ALTER TABLE user_characters RENAME COLUMN stress_level TO current_stress;
ALTER TABLE user_characters RENAME COLUMN fatigue_level TO current_fatigue;
ALTER TABLE user_characters RENAME COLUMN confidence_level TO current_confidence;

-- Update indexes to use new column names
DROP INDEX IF EXISTS user_characters_new_current_energy_idx;
DROP INDEX IF EXISTS user_characters_new_current_mana_idx;
DROP INDEX IF EXISTS user_characters_new_current_mental_health_stress_level_fati_idx;

CREATE INDEX IF NOT EXISTS idx_uc_current_energy ON user_characters(current_energy);
CREATE INDEX IF NOT EXISTS idx_uc_current_mana ON user_characters(current_mana);
CREATE INDEX IF NOT EXISTS idx_uc_current_morale ON user_characters(current_morale);
CREATE INDEX IF NOT EXISTS idx_uc_current_stress ON user_characters(current_stress);
CREATE INDEX IF NOT EXISTS idx_uc_current_fatigue ON user_characters(current_fatigue);

COMMENT ON TABLE user_characters IS 'Character instances owned by users. All stat columns prefixed with current_ represent the current state (base from characters + modifiers from character_modifiers). Runtime state (health, energy, mana, morale, stress, fatigue) fluctuates during gameplay.';
