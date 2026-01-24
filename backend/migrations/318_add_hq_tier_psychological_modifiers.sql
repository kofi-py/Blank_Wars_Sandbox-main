-- Migration 318: Add psychological modifiers to headquarters_tiers
-- These modifiers affect stress, morale, and fatigue based on living conditions

BEGIN;

DO $$
BEGIN
    RAISE NOTICE 'Migration 318: Adding psychological modifiers to headquarters_tiers...';
END $$;

-- Add psychological modifier columns to headquarters_tiers
ALTER TABLE headquarters_tiers
ADD COLUMN IF NOT EXISTS stress_modifier INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS morale_modifier INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS fatigue_modifier INTEGER DEFAULT 0;

-- Populate psychological modifiers for each tier
-- Pattern: Tier 0 (hovels) = heavy penalties, Tier 2 (basic_house) = neutral, higher = bonuses
UPDATE headquarters_tiers SET stress_modifier = 25, morale_modifier = -20, fatigue_modifier = 20 WHERE tier_id = 'hobo_camp';
UPDATE headquarters_tiers SET stress_modifier = 20, morale_modifier = -15, fatigue_modifier = 25 WHERE tier_id = 'radioactive_roach_motel';
UPDATE headquarters_tiers SET stress_modifier = 15, morale_modifier = -15, fatigue_modifier = 10 WHERE tier_id = 'your_parents_basement';
UPDATE headquarters_tiers SET stress_modifier = 5, morale_modifier = -5, fatigue_modifier = 5 WHERE tier_id = 'spartan_apartment';
UPDATE headquarters_tiers SET stress_modifier = 0, morale_modifier = 0, fatigue_modifier = 0 WHERE tier_id = 'basic_house';
UPDATE headquarters_tiers SET stress_modifier = -5, morale_modifier = 5, fatigue_modifier = -5 WHERE tier_id = 'condo';
UPDATE headquarters_tiers SET stress_modifier = -10, morale_modifier = 10, fatigue_modifier = -10 WHERE tier_id = 'mansion';
UPDATE headquarters_tiers SET stress_modifier = -15, morale_modifier = 15, fatigue_modifier = -15 WHERE tier_id = 'compound';
UPDATE headquarters_tiers SET stress_modifier = -20, morale_modifier = 20, fatigue_modifier = -20 WHERE tier_id = 'super_yacht';
UPDATE headquarters_tiers SET stress_modifier = -25, morale_modifier = 25, fatigue_modifier = -25 WHERE tier_id = 'moon_base';

-- Add 'hq_tier_effect' to the character_modifiers source_type constraint
ALTER TABLE character_modifiers DROP CONSTRAINT IF EXISTS character_modifiers_source_type_check;
ALTER TABLE character_modifiers ADD CONSTRAINT character_modifiers_source_type_check
CHECK (source_type IN (
  'point_allocation', 'battle_victory', 'item', 'buff', 'curse', 'training', 'event', 'other',
  'battle_defeat', 'battle_victory_morale', 'critical_injury', 'near_death',
  'teammate_death', 'team_morale_cascade', 'rivalry_dominance', 'rivalry_humiliation',
  'ptsd', 'trauma_decay', 'therapy', 'bond_boost',
  'hq_tier_effect'
));

-- Update the index for psychology lookups to include hq_tier_effect
DROP INDEX IF EXISTS idx_character_modifiers_psychology;
CREATE INDEX idx_character_modifiers_psychology ON character_modifiers (user_character_id, source_type)
WHERE source_type IN (
  'battle_defeat', 'battle_victory_morale', 'critical_injury', 'near_death',
  'teammate_death', 'team_morale_cascade', 'rivalry_dominance', 'rivalry_humiliation',
  'ptsd', 'trauma_decay', 'therapy', 'bond_boost', 'hq_tier_effect'
);

DO $$
BEGIN
    RAISE NOTICE 'Migration 318 complete: Added psychological modifiers to headquarters_tiers';
END $$;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (318, '318_add_hq_tier_psychological_modifiers')
ON CONFLICT (version) DO NOTHING;

COMMIT;
