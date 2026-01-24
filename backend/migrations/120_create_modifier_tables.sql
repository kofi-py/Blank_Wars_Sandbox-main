-- Migration 120: Create Modifier Tables for 4-Tier Attribute System
-- Part of Stat System Overhaul - November 2025
-- Creates the infrastructure for: Universal → Archetype → Species → Signature modifiers

BEGIN;

-- =====================================================
-- TIER 1: UNIVERSAL ATTRIBUTE BASE
-- =====================================================
-- All attributes start at base 50 for all characters

CREATE TABLE IF NOT EXISTS universal_attribute_base (
  attribute_name VARCHAR(50) PRIMARY KEY,
  base_value INTEGER NOT NULL DEFAULT 50,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Populate universal base values
INSERT INTO universal_attribute_base (attribute_name, base_value, description) VALUES
  -- Former combat stats (now attributes)
  ('attack', 50, 'Physical attack power and combat technique'),
  ('defense', 50, 'Physical defensive ability'),
  ('speed', 50, 'Movement speed and initiative'),
  ('magic_attack', 50, 'Magical damage output'),
  ('magic_defense', 50, 'Magical resistance'),

  -- Original attributes
  ('strength', 50, 'Raw physical power, damage modifier'),
  ('dexterity', 50, 'Agility, accuracy, evasion, critical chance'),
  ('intelligence', 50, 'Magical power and spell effectiveness'),
  ('wisdom', 50, 'Insight and magical resistance modifier'),
  ('charisma', 50, 'Social influence and inspiration'),
  ('spirit', 50, 'Spiritual power and special abilities'),

  -- New attribute
  ('endurance', 50, 'Physical toughness, resistance, and stamina')
ON CONFLICT (attribute_name) DO NOTHING;

-- =====================================================
-- TIER 2: ARCHETYPE ATTRIBUTE MODIFIERS
-- =====================================================
-- Class-based bonuses/penalties applied to all characters of that archetype

CREATE TABLE IF NOT EXISTS archetype_attribute_modifiers (
  archetype VARCHAR(50) NOT NULL,
  attribute_name VARCHAR(50) NOT NULL,
  modifier INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (archetype, attribute_name)
);

CREATE INDEX IF NOT EXISTS idx_archetype_modifiers_archetype ON archetype_attribute_modifiers(archetype);
CREATE INDEX IF NOT EXISTS idx_archetype_modifiers_attribute ON archetype_attribute_modifiers(attribute_name);

-- =====================================================
-- TIER 3: SPECIES ATTRIBUTE MODIFIERS
-- =====================================================
-- Racial/species bonuses applied to all characters of that species

CREATE TABLE IF NOT EXISTS species_attribute_modifiers (
  species VARCHAR(50) NOT NULL,
  attribute_name VARCHAR(50) NOT NULL,
  modifier INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (species, attribute_name)
);

CREATE INDEX IF NOT EXISTS idx_species_modifiers_species ON species_attribute_modifiers(species);
CREATE INDEX IF NOT EXISTS idx_species_modifiers_attribute ON species_attribute_modifiers(attribute_name);

-- =====================================================
-- TIER 4: SIGNATURE/INDIVIDUAL ATTRIBUTE MODIFIERS
-- =====================================================
-- Character-specific legendary traits and unique bonuses

CREATE TABLE IF NOT EXISTS signature_attribute_modifiers (
  character_id VARCHAR(50) NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  attribute_name VARCHAR(50) NOT NULL,
  modifier INTEGER NOT NULL,
  source VARCHAR(100) NOT NULL,  -- 'legendary_warrior', 'swift_footed', etc.
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (character_id, attribute_name, source)
);

CREATE INDEX IF NOT EXISTS idx_signature_modifiers_character ON signature_attribute_modifiers(character_id);
CREATE INDEX IF NOT EXISTS idx_signature_modifiers_attribute ON signature_attribute_modifiers(attribute_name);

COMMIT;

-- Verification
SELECT 'Universal base count: ' || COUNT(*) FROM universal_attribute_base;
SELECT 'Created modifier tables successfully' AS status;
