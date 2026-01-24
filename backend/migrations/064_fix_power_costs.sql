/**
 * Migration 064: Fix Power Costs to Match Spell System
 *
 * Powers currently have incorrect costs that don't match the intended tiered system.
 * This migration updates all power costs to match the spell system:
 *
 * Tier        | Unlock | Rank 2 | Rank 3
 * ------------|--------|--------|-------
 * Skill       |   1    |   3    |   5
 * Ability     |   3    |   5    |   7
 * Species     |   5    |   7    |   9
 * Signature   |   7    |   9    |  11
 */

BEGIN;

-- Update Skill tier powers (currently 1/1/5, should be 1/3/5)
UPDATE power_definitions
SET
  unlock_cost = 1,
  rank_up_cost = 3,
  rank_up_cost_r3 = 5
WHERE tier = 'skill';

-- Update Ability tier powers (currently 2/1/7, should be 3/5/7)
UPDATE power_definitions
SET
  unlock_cost = 3,
  rank_up_cost = 5,
  rank_up_cost_r3 = 7
WHERE tier = 'ability';

-- Update Species tier powers (currently 3/2/9, should be 5/7/9)
UPDATE power_definitions
SET
  unlock_cost = 5,
  rank_up_cost = 7,
  rank_up_cost_r3 = 9
WHERE tier = 'species';

-- Update Signature tier powers (currently 5/3/11, should be 7/9/11)
UPDATE power_definitions
SET
  unlock_cost = 7,
  rank_up_cost = 9,
  rank_up_cost_r3 = 11
WHERE tier = 'signature';

-- Verify the changes
DO $$
DECLARE
  power_count INTEGER;
BEGIN
  -- Check that all powers now have correct costs
  SELECT COUNT(*) INTO power_count
  FROM power_definitions
  WHERE
    (tier = 'skill' AND (unlock_cost != 1 OR rank_up_cost != 3 OR rank_up_cost_r3 != 5))
    OR (tier = 'ability' AND (unlock_cost != 3 OR rank_up_cost != 5 OR rank_up_cost_r3 != 7))
    OR (tier = 'species' AND (unlock_cost != 5 OR rank_up_cost != 7 OR rank_up_cost_r3 != 9))
    OR (tier = 'signature' AND (unlock_cost != 7 OR rank_up_cost != 9 OR rank_up_cost_r3 != 11));

  IF power_count > 0 THEN
    RAISE EXCEPTION 'Migration failed: % powers still have incorrect costs', power_count;
  END IF;

  RAISE NOTICE 'Successfully updated all power costs to match tiered system';
END $$;

COMMIT;
