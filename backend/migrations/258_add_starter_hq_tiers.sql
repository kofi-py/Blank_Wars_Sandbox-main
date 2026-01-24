-- Migration 258: Add starter HQ tier options
-- Purpose: Add 'your_parents_basement' and 'radioactive_roach_motel' as starter tier options
-- Context: Users should randomly get one of three low-tier starter HQs

BEGIN;

-- Drop existing tier_id CHECK constraint
ALTER TABLE user_headquarters
DROP CONSTRAINT user_headquarters_tier_id_check;

-- Add new CHECK constraint with full tier progression
ALTER TABLE user_headquarters
ADD CONSTRAINT user_headquarters_tier_id_check
CHECK (tier_id = ANY (ARRAY[
  -- Starter hovels (random assignment)
  'your_parents_basement'::text,
  'radioactive_roach_motel'::text,
  'hobo_camp'::text,
  -- Progression tiers
  'spartan_apartment'::text,
  'basic_house'::text,
  'condo'::text,
  'mansion'::text,
  'compound'::text,
  'super_yacht'::text,
  'moon_base'::text
]));

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (258, '258_add_starter_hq_tiers')
ON CONFLICT (version) DO NOTHING;

COMMIT;
