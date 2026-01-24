-- Migration 092: Fix gameplan_adherence generated column to remove 100 cap
-- Now uses uncapped formula: training*0.4 + mental_health*0.3 + team_player*0.2 + (100-ego)*0.1

-- Step 1: Drop the existing generated column
ALTER TABLE user_characters DROP COLUMN IF EXISTS gameplan_adherence;

-- Step 2: Recreate without the LEAST(100,...) cap
ALTER TABLE user_characters
ADD COLUMN gameplan_adherence INTEGER
GENERATED ALWAYS AS (
  GREATEST(0, ROUND(
    current_training * 0.4 +
    current_mental_health * 0.3 +
    current_team_player * 0.2 +
    (100 - current_ego) * 0.1
  ))
) STORED;

-- Step 3: Add constraint (only lower bound, no upper bound)
ALTER TABLE user_characters
ADD CONSTRAINT user_characters_gameplan_adherence_check CHECK (gameplan_adherence >= 0);

COMMENT ON COLUMN user_characters.gameplan_adherence IS 'Auto-calculated from psych stats. No upper cap - allows characters to exceed 100 through modifiers and bonuses';
