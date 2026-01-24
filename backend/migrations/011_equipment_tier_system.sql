-- Migration 011: Equipment 4-Tier System
-- Adds tier classification, archetype restrictions, and species restrictions to equipment
-- Aligns equipment system with power system tiers

BEGIN;

-- ============================================================================
-- ADD TIER AND RESTRICTION COLUMNS
-- ============================================================================

-- Add equipment tier column (parallel to power tiers)
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS equipment_tier TEXT DEFAULT 'universal'
  CHECK (equipment_tier IN ('universal', 'archetype', 'species', 'character'));

-- Add archetype restriction (for Tier 2: Archetype equipment)
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS archetype TEXT;

-- Add species restriction (for Tier 3: Species equipment)
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS species TEXT;

-- ============================================================================
-- UPDATE EXISTING EQUIPMENT TO SET TIERS
-- ============================================================================

-- TIER 4: Character-specific equipment (restriction_type = 'character')
UPDATE equipment
SET equipment_tier = 'character'
WHERE restriction_type = 'character' AND restriction_value IS NOT NULL;

-- TIER 1: Universal equipment (default, no restrictions)
UPDATE equipment
SET equipment_tier = 'universal'
WHERE restriction_type = 'generic' OR restriction_value IS NULL;

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_equipment_tier ON equipment(equipment_tier);
CREATE INDEX IF NOT EXISTS idx_equipment_archetype ON equipment(archetype);
CREATE INDEX IF NOT EXISTS idx_equipment_species ON equipment(species);

-- ============================================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN equipment.equipment_tier IS 'Equipment tier system: universal (anyone), archetype (role-specific), species (biology-specific), character (individual-specific)';
COMMENT ON COLUMN equipment.archetype IS 'If tier=archetype, which archetype can use this: warrior, mage, assassin, tank, scholar, trickster, leader, mystic, beast';
COMMENT ON COLUMN equipment.species IS 'If tier=species, which species can use this: human, vampire, deity, dire_wolf, cyborg, golem, human_magical, zeta_reticulan_grey';
COMMENT ON COLUMN equipment.restriction_value IS 'If tier=character, which character can use this: achilles, merlin, dracula, etc.';

-- ============================================================================
-- CREATE VIEW FOR EASY QUERYING
-- ============================================================================

CREATE OR REPLACE VIEW equipment_with_restrictions AS
SELECT
  e.id,
  e.name,
  e.slot,
  e.equipment_type,
  e.equipment_tier,
  e.rarity,
  e.required_level,
  e.archetype,
  e.species,
  e.restriction_value,
  e.stats,
  e.effects,
  e.shop_price,
  -- Helper columns for UI
  CASE
    WHEN e.equipment_tier = 'universal' THEN 'Anyone'
    WHEN e.equipment_tier = 'archetype' THEN COALESCE(e.archetype, 'ERROR: No archetype set')
    WHEN e.equipment_tier = 'species' THEN COALESCE(e.species, 'ERROR: No species set')
    WHEN e.equipment_tier = 'character' THEN COALESCE(e.restriction_value, 'ERROR: No character set')
  END as usable_by,
  CASE
    WHEN e.equipment_tier = 'universal' THEN 1
    WHEN e.equipment_tier = 'archetype' THEN 2
    WHEN e.equipment_tier = 'species' THEN 3
    WHEN e.equipment_tier = 'character' THEN 4
  END as tier_order
FROM equipment e;

COMMENT ON VIEW equipment_with_restrictions IS 'Convenient view showing equipment with computed restriction labels for UI display';

COMMIT;
