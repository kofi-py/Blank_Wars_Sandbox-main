-- Update gameplan_adherence to use comprehensive weighted formula
-- Old formula: training + (mental_health * 0.4) + (team_player * 0.3) + ((100 - ego) * 0.2)
-- New formula incorporates: training, mental_health, team_player, coach_trust, morale, ego, stress, fatigue, HP%
--
-- Weights:
--   Positive factors: training (20%), mental_health (15%), team_player (20%), coach_trust (20%), morale (10%)
--   Negative factors: ego deviation from 50 (20%), stress (15%), fatigue (10%), HP% missing (up to 25)
--
-- Key changes:
--   - Ego: (ego - 50) * 0.20 means ego 50 = neutral, higher = penalty, lower = bonus
--   - Stress/fatigue: direct penalties
--   - HP%: low health = up to 25 point penalty

BEGIN;

-- Drop the old generated column
ALTER TABLE user_characters DROP COLUMN IF EXISTS gameplan_adherence;

-- Add the new generated column with comprehensive formula
-- Note: coach_trust_level is itself generated, so we inline its formula here
ALTER TABLE user_characters
ADD COLUMN gameplan_adherence INTEGER GENERATED ALWAYS AS (
  GREATEST(0, LEAST(100, ROUND(
    (COALESCE(current_training, 75) * 0.20) +
    (COALESCE(current_mental_health, 85) * 0.15) +
    (COALESCE(current_team_player, 70) * 0.20) +
    -- Inlined coach_trust calculation (can't reference generated columns)
    (LEAST(100, GREATEST(0, ROUND(
      50
      + CASE WHEN COALESCE(financial_personality->>'spending_style', 'moderate') = 'strategic' THEN 10 ELSE 0 END
      + CASE WHEN COALESCE(financial_personality->>'spending_style', 'moderate') = 'impulsive' THEN -10 ELSE 0 END
      + (COALESCE((financial_personality->>'financial_wisdom')::numeric, 50) - 50) * 0.2
    ))) * 0.20) +
    (COALESCE(morale, 80) * 0.10) -
    ((COALESCE(current_ego, 50) - 50) * 0.20) -
    (COALESCE(stress_level, 0) * 0.15) -
    (COALESCE(fatigue_level, 0) * 0.10) -
    ((1.0 - (COALESCE(current_health, max_health)::numeric / NULLIF(COALESCE(max_health, 100), 0))) * 25)
  )))
) STORED;

-- Recreate index for adherence lookups
DROP INDEX IF EXISTS idx_user_characters_gameplan_adherence;
CREATE INDEX idx_user_characters_gameplan_adherence ON user_characters(gameplan_adherence);

-- Record migration
INSERT INTO migration_log (version, name) VALUES (146, '146_update_gameplan_adherence_formula') ON CONFLICT (version) DO NOTHING;

COMMIT;
