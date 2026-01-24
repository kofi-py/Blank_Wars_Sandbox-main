-- Migration 177: Update gameplan_adherence to use renamed columns
-- The formula was created before columns were renamed in migration 169
-- Old: morale, stress_level, fatigue_level, max_health
-- New: current_morale, current_stress, current_fatigue, current_max_health

BEGIN;

-- Drop the old generated column (depends on old column names)
ALTER TABLE user_characters DROP COLUMN IF EXISTS gameplan_adherence;

-- Recreate with new column names
ALTER TABLE user_characters
ADD COLUMN gameplan_adherence INTEGER GENERATED ALWAYS AS (
  GREATEST(0, LEAST(100, ROUND(
    (COALESCE(current_training, 75) * 0.20) +
    (COALESCE(current_mental_health, 85) * 0.15) +
    (COALESCE(current_team_player, 70) * 0.20) +
    -- Inlined coach_trust calculation
    (LEAST(100, GREATEST(0, ROUND(
      50
      + CASE WHEN COALESCE(financial_personality->>'spending_style', 'moderate') = 'strategic' THEN 10 ELSE 0 END
      + CASE WHEN COALESCE(financial_personality->>'spending_style', 'moderate') = 'impulsive' THEN -10 ELSE 0 END
      + (COALESCE((financial_personality->>'financial_wisdom')::numeric, 50) - 50) * 0.2
    ))) * 0.20) +
    (COALESCE(current_morale, 80) * 0.10) -
    ((COALESCE(current_ego, 50) - 50) * 0.20) -
    (COALESCE(current_stress, 0) * 0.15) -
    (COALESCE(current_fatigue, 0) * 0.10) -
    ((1.0 - (COALESCE(current_health, current_max_health)::numeric / NULLIF(COALESCE(current_max_health, 100), 0))) * 25)
  )))
) STORED;

-- Recreate index
CREATE INDEX idx_user_characters_gameplan_adherence ON user_characters(gameplan_adherence);

-- Now safe to drop the legacy max_health column from user_characters
ALTER TABLE user_characters DROP COLUMN IF EXISTS max_health;

COMMIT;
