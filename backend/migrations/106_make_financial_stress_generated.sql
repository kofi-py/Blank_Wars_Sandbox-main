-- Migration 106: Make financial_stress a generated column
-- Auto-calculates from financial personality traits
-- Formula: Higher luxury desire + low financial wisdom = more stress

BEGIN;

-- Step 1: Drop existing column
ALTER TABLE user_characters DROP COLUMN IF EXISTS financial_stress;

-- Step 2: Add as generated column with calculation
ALTER TABLE user_characters
ADD COLUMN financial_stress INTEGER
GENERATED ALWAYS AS (
  LEAST(100, GREATEST(0, ROUND(
    -- Get luxury_desire from financial_personality JSON (default 50)
    (COALESCE((financial_personality->>'luxury_desire')::numeric, 50) * 0.2) +
    -- Penalty for low financial wisdom
    CASE 
      WHEN COALESCE((financial_personality->>'financial_wisdom')::numeric, 50) < 30 THEN 10
      ELSE 0
    END +
    -- Conservative spenders stress more about having no money
    CASE
      WHEN COALESCE(financial_personality->>'spending_style', 'moderate') = 'conservative' THEN 15
      ELSE 0
    END
  )))
) STORED;

-- Step 3: Add constraint
ALTER TABLE user_characters
ADD CONSTRAINT user_characters_financial_stress_check
CHECK (financial_stress >= 0 AND financial_stress <= 100);

-- Record migration
INSERT INTO migration_log (version, name) VALUES (106, '106_make_financial_stress_generated') ON CONFLICT (version) DO NOTHING;

COMMIT;
