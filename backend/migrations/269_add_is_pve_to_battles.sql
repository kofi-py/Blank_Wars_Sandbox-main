-- Add is_pve boolean column to battles table
-- This explicitly indicates whether battle is against AI (true) or human (false)

-- Add the column (nullable first for backfill)
ALTER TABLE battles ADD COLUMN IF NOT EXISTS is_pve BOOLEAN;

-- Backfill existing rows based on which opponent column is set
UPDATE battles SET is_pve = (opponent_ai_coach_id IS NOT NULL);

-- Make it NOT NULL now that all rows have values
ALTER TABLE battles ALTER COLUMN is_pve SET NOT NULL;

-- Add CHECK constraint enforcing consistency
ALTER TABLE battles DROP CONSTRAINT IF EXISTS check_is_pve_consistency;
ALTER TABLE battles ADD CONSTRAINT check_is_pve_consistency CHECK (
  (is_pve = true AND opponent_ai_coach_id IS NOT NULL AND opponent_user_id IS NULL)
  OR
  (is_pve = false AND opponent_user_id IS NOT NULL AND opponent_ai_coach_id IS NULL)
);

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (269, '269_add_is_pve_to_battles')
ON CONFLICT (version) DO NOTHING;
