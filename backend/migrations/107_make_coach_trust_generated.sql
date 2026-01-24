-- Migration 106: Make coach_trust_level a generated column
-- Auto-calculates from financial personality traits
-- Formula: Strategic spenders trust more, impulsive trust less, wisdom affects trust

-- Step 1: Drop existing column
ALTER TABLE user_characters DROP COLUMN IF EXISTS coach_trust_level;

-- Step 2: Add as generated column with calculation
ALTER TABLE user_characters
ADD COLUMN coach_trust_level INTEGER
GENERATED ALWAYS AS (
  LEAST(100, GREATEST(0, ROUND(
    50 + -- Base neutral trust
    -- Strategic characters trust competence
    CASE
      WHEN COALESCE(financial_personality->>'spending_style', 'moderate') = 'strategic' THEN 10
      ELSE 0
    END +
    -- Impulsive characters trust less initially
    CASE
      WHEN COALESCE(financial_personality->>'spending_style', 'moderate') = 'impulsive' THEN -10
      ELSE 0
    END +
    -- Higher wisdom = more open to guidance
    ((COALESCE((financial_personality->>'financial_wisdom')::numeric, 50) - 50) * 0.2)
  )))
) STORED;

-- Step 3: Add constraint
ALTER TABLE user_characters
ADD CONSTRAINT user_characters_coach_trust_check
CHECK (coach_trust_level >= 0 AND coach_trust_level <= 100);
