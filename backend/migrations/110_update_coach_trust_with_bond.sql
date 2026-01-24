-- Migration 109: Update coach_trust_level to incorporate bond_level
-- New formula: 60% bond + 25% performance + 15% personality
-- This makes the relationship more important than innate personality

-- Step 1: Drop existing generated column
ALTER TABLE user_characters DROP COLUMN IF EXISTS coach_trust_level;

-- Step 2: Add new generated column with bond-weighted formula
ALTER TABLE user_characters
ADD COLUMN coach_trust_level INTEGER
GENERATED ALWAYS AS (
  LEAST(100, GREATEST(0, ROUND(
    -- BOND (60% weight) - Most important factor
    (COALESCE(bond_level, 0) * 0.6) +
    
    -- PERFORMANCE (25% weight) - Proven results together
    (
      CASE
        WHEN COALESCE(total_battles, 0) = 0 THEN 12.5  -- No data, neutral
        ELSE (COALESCE(total_wins, 0)::numeric / NULLIF(COALESCE(total_battles, 0), 0) * 25)  -- Win rate * 25%
      END
    ) +
    
    -- PERSONALITY (15% weight) - Base personality traits
    (
      7.5 + -- Base neutral personality component
      -- Strategic characters trust competence
      CASE
        WHEN COALESCE(financial_personality->>'spending_style', 'moderate') = 'strategic' THEN 3
        ELSE 0
      END +
      -- Impulsive characters trust less initially
      CASE
        WHEN COALESCE(financial_personality->>'spending_style', 'moderate') = 'impulsive' THEN -3
        ELSE 0
      END +
      -- Higher wisdom = more open to guidance
      ((COALESCE((financial_personality->>'financial_wisdom')::numeric, 50) - 50) * 0.06)
    )
  )))
) STORED;

-- Step 3: Add constraint
ALTER TABLE user_characters
ADD CONSTRAINT user_characters_coach_trust_check
CHECK (coach_trust_level >= 0 AND coach_trust_level <= 100);

-- Documentation
COMMENT ON COLUMN user_characters.coach_trust_level IS 
  'Dynamic trust level: 60% bond + 25% performance (win rate) + 15% personality. Updates automatically as bond grows.';
