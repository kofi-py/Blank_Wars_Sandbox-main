-- Migration 151: Remove ALL COALESCE fallbacks from gameplan_adherence formula
-- If columns are NULL, the formula returns NULL - exposes bad data

BEGIN;

-- Drop the old generated column with fallbacks
ALTER TABLE user_characters DROP COLUMN IF EXISTS gameplan_adherence;

-- Add the new generated column with NO fallbacks
ALTER TABLE user_characters
ADD COLUMN gameplan_adherence INTEGER GENERATED ALWAYS AS (
  GREATEST(0, LEAST(100, ROUND(
    (current_training * 0.20) +
    (current_mental_health * 0.15) +
    (current_team_player * 0.18) +
    (current_communication * 0.12) +
    (LEAST(100, GREATEST(0, ROUND(
      50
      + CASE WHEN financial_personality->>'spending_style' = 'strategic' THEN 10 ELSE 0 END
      + CASE WHEN financial_personality->>'spending_style' = 'impulsive' THEN -10 ELSE 0 END
      + ((financial_personality->>'financial_wisdom')::numeric - 50) * 0.2
    ))) * 0.18) +
    (morale * 0.10) -
    ((current_ego - 50) * 0.18) -
    (stress_level * 0.14) -
    (fatigue_level * 0.10) -
    ((1.0 - (current_health::numeric / max_health)) * 25)
  )))
) STORED;

-- Recreate index
DROP INDEX IF EXISTS idx_user_characters_gameplan_adherence;
CREATE INDEX idx_user_characters_gameplan_adherence ON user_characters(gameplan_adherence);

-- Record migration
INSERT INTO migration_log (version, name) VALUES (151, '151_remove_adherence_fallbacks') ON CONFLICT (version) DO NOTHING;

COMMIT;
