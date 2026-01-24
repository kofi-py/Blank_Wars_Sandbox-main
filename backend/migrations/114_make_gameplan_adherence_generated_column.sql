-- Migration 090: Make gameplan_adherence a generated column
-- This ensures adherence automatically updates when psych stats change
-- Formula matches frontend: training + (mental_health * 0.4) + (team_player * 0.3) + ((100 - ego) * 0.2)

-- Step 1: Drop the existing gameplan_adherence column
ALTER TABLE user_characters DROP COLUMN IF EXISTS gameplan_adherence;

-- Step 2: Add it back as a generated column that auto-calculates
ALTER TABLE user_characters
ADD COLUMN gameplan_adherence INTEGER
GENERATED ALWAYS AS (
  LEAST(100, GREATEST(0, ROUND(
    current_training +
    (current_mental_health * 0.4) +
    (current_team_player * 0.3) +
    ((100 - current_ego) * 0.2)
  )))
) STORED;

-- Step 3: Add check constraint to ensure 0-100 range
-- Step 3: Add check constraint to ensure 0-100 range
ALTER TABLE user_characters DROP CONSTRAINT IF EXISTS user_characters_gameplan_adherence_check;
ALTER TABLE user_characters
ADD CONSTRAINT user_characters_gameplan_adherence_check
CHECK (gameplan_adherence >= 0 AND gameplan_adherence <= 100);
