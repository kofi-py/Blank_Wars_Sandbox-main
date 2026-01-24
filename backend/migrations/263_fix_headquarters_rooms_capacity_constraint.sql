-- Migration 263: Fix headquarters_rooms capacity constraint
-- Purpose: Allow capacity >= 0 instead of capacity > 0
-- Context: Rooms start with capacity=0, get incremented as beds are added
--          Hobo camp has 0 beds, so capacity=0 is valid
-- Impact: Fixes registration failures for new users

BEGIN;

-- Drop the old constraint that requires capacity > 0
ALTER TABLE headquarters_rooms
DROP CONSTRAINT IF EXISTS headquarters_rooms_capacity_check;

-- Add new constraint that allows capacity >= 0
ALTER TABLE headquarters_rooms
ADD CONSTRAINT headquarters_rooms_capacity_check
CHECK (capacity >= 0);

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (263, '263_fix_headquarters_rooms_capacity_constraint')
ON CONFLICT (version) DO NOTHING;

COMMIT;
