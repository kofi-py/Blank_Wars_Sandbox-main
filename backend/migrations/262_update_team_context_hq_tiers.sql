-- Migration 262: Update team_context HQ tiers
-- Purpose: Align team_context hq_tier with new 10-tier progression
-- Context: Replaces old spartan/basic/mansion/compound tiers with 10 new tiers

BEGIN;

-- Drop old constraint
ALTER TABLE team_context
DROP CONSTRAINT IF EXISTS team_context_hq_tier_check;

-- Add new constraint with all 10 tiers
ALTER TABLE team_context
ADD CONSTRAINT team_context_hq_tier_check
CHECK (hq_tier = ANY (ARRAY[
  'your_parents_basement'::text,
  'radioactive_roach_motel'::text,
  'hobo_camp'::text,
  'spartan_apartment'::text,
  'basic_house'::text,
  'condo'::text,
  'mansion'::text,
  'compound'::text,
  'super_yacht'::text,
  'moon_base'::text
]));

-- Update any existing team_context to use 'spartan_apartment' if they have the old names
-- Actually, spartan_apartment is still there, but others changed.
UPDATE team_context SET hq_tier = 'spartan_apartment' WHERE hq_tier = 'spartan_apartment';
UPDATE team_context SET hq_tier = 'basic_house' WHERE hq_tier = 'basic_house';
UPDATE team_context SET hq_tier = 'mansion' WHERE hq_tier = 'team_mansion';
UPDATE team_context SET hq_tier = 'compound' WHERE hq_tier = 'elite_compound';

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (262, '262_update_team_context_hq_tiers')
ON CONFLICT (version) DO NOTHING;

COMMIT;
