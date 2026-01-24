-- Migration 010: Update Power Costs for 4-Pool System
-- Sets proper unlock_cost and rank_up_cost for all power tiers

BEGIN;

-- ============================================================================
-- ADD RANK UP COST COLUMN
-- ============================================================================
ALTER TABLE power_definitions ADD COLUMN IF NOT EXISTS rank_up_cost INTEGER DEFAULT 1;

-- ============================================================================
-- UPDATE COSTS FOR EACH TIER
-- ============================================================================

-- SKILLS: Unlock 1 point, Rank up 1 point per rank
UPDATE power_definitions
SET unlock_cost = 1, rank_up_cost = 1
WHERE tier = 'skill';

-- ABILITIES (Archetype): Unlock 2 points, Rank up 1 point per rank
UPDATE power_definitions
SET unlock_cost = 2, rank_up_cost = 1
WHERE tier = 'ability';

-- SPECIES POWERS: Unlock 3 points, Rank up 2 points per rank
UPDATE power_definitions
SET unlock_cost = 3, rank_up_cost = 2
WHERE tier = 'species';

-- SIGNATURE POWERS: Unlock 5 points, Rank up 3 points per rank
UPDATE power_definitions
SET unlock_cost = 5, rank_up_cost = 3
WHERE tier = 'signature';

-- ============================================================================
-- UPDATE ACHILLES SIGNATURE POWERS UNLOCK LEVELS
-- ============================================================================
-- Set unlock levels for Achilles' signature powers based on design
UPDATE power_definitions
SET unlock_level = 1
WHERE id = 'achilles_heel'; -- Always present from birth (curse)

UPDATE power_definitions
SET unlock_level = 10
WHERE id = 'wrath_of_achilles'; -- First major signature unlock

UPDATE power_definitions
SET unlock_level = 15, unlock_challenge = 'take_1000_damage_without_dying'
WHERE id = 'invulnerability'; -- Challenge-based unlock

UPDATE power_definitions
SET unlock_level = 18, unlock_challenge = 'win_25_1v1_duels'
WHERE id = 'heros_challenge'; -- Challenge-based unlock

UPDATE power_definitions
SET unlock_level = 20, unlock_challenge = 'die_in_battle_then_win_10_battles'
WHERE id = 'legend_never_dies'; -- Challenge-based unlock

-- ============================================================================
-- ADD COMMENTS
-- ============================================================================
COMMENT ON COLUMN power_definitions.unlock_cost IS 'Points required to unlock this power (varies by tier: skill=1, ability=2, species=3, signature=5)';
COMMENT ON COLUMN power_definitions.rank_up_cost IS 'Points required to rank up per rank (varies by tier: skill=1, ability=1, species=2, signature=3)';

COMMIT;
