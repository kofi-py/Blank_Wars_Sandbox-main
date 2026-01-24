-- Migration 149: Add current_communication to gameplan_adherence formula
-- Communication improves understanding of coach instructions = higher adherence
--
-- Updated weights:
--   Positive factors: training (20%), mental_health (15%), team_player (18%), coach_trust (18%), morale (10%), communication (12%)
--   Negative factors: ego deviation from 50 (18%), stress (14%), fatigue (10%), HP% missing (up to 25)

BEGIN;

-- Drop the old generated column
ALTER TABLE user_characters DROP COLUMN IF EXISTS gameplan_adherence;

-- Add the new generated column with communication included
ALTER TABLE user_characters
ADD COLUMN gameplan_adherence INTEGER GENERATED ALWAYS AS (
  GREATEST(0, LEAST(100, ROUND(
    (COALESCE(current_training, 75) * 0.20) +
    (COALESCE(current_mental_health, 85) * 0.15) +
    (COALESCE(current_team_player, 70) * 0.18) +
    (COALESCE(current_communication, 70) * 0.12) +
    -- Inlined coach_trust calculation (can't reference generated columns)
    (LEAST(100, GREATEST(0, ROUND(
      50
      + CASE WHEN COALESCE(financial_personality->>'spending_style', 'moderate') = 'strategic' THEN 10 ELSE 0 END
      + CASE WHEN COALESCE(financial_personality->>'spending_style', 'moderate') = 'impulsive' THEN -10 ELSE 0 END
      + (COALESCE((financial_personality->>'financial_wisdom')::numeric, 50) - 50) * 0.2
    ))) * 0.18) +
    (COALESCE(morale, 80) * 0.10) -
    ((COALESCE(current_ego, 50) - 50) * 0.18) -
    (COALESCE(stress_level, 0) * 0.14) -
    (COALESCE(fatigue_level, 0) * 0.10) -
    ((1.0 - (COALESCE(current_health, max_health)::numeric / NULLIF(COALESCE(max_health, 100), 0))) * 25)
  )))
) STORED;

-- Recreate index for adherence lookups
DROP INDEX IF EXISTS idx_user_characters_gameplan_adherence;
CREATE INDEX idx_user_characters_gameplan_adherence ON user_characters(gameplan_adherence);

-- Record migration
INSERT INTO migration_log (version, name) VALUES (149, '149_add_communication_to_adherence') ON CONFLICT (version) DO NOTHING;

COMMIT;
