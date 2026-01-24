-- Migration 121: Populate Archetype Attribute Modifiers
-- Part of Stat System Overhaul - November 2025
-- Extracted ONLY from migration 093_apply_archetype_stat_modifiers.sql
-- Maps old current_* fields to new attribute system

BEGIN;

-- =====================================================
-- BASIC TIER ARCHETYPES (120 point budget)
-- =====================================================

-- WARRIOR
INSERT INTO archetype_attribute_modifiers (archetype, attribute_name, modifier, notes) VALUES
  ('warrior', 'attack', 10, 'Basic Tier'),
  ('warrior', 'defense', 10, 'Basic Tier'),
  ('warrior', 'speed', 5, 'Basic Tier'),
  ('warrior', 'magic_attack', 5, 'Basic Tier - from current_special'),
  ('warrior', 'endurance', 10, 'Basic Tier - from current_max_health +10')
ON CONFLICT (archetype, attribute_name) DO UPDATE SET
  modifier = EXCLUDED.modifier,
  notes = EXCLUDED.notes;

-- BEAST
INSERT INTO archetype_attribute_modifiers (archetype, attribute_name, modifier, notes) VALUES
  ('beast', 'attack', 15, 'Basic Tier'),
  ('beast', 'defense', 5, 'Basic Tier'),
  ('beast', 'speed', 10, 'Basic Tier'),
  ('beast', 'magic_attack', 5, 'Basic Tier - from current_special'),
  ('beast', 'endurance', 10, 'Basic Tier - from current_max_health +10')
ON CONFLICT (archetype, attribute_name) DO UPDATE SET
  modifier = EXCLUDED.modifier,
  notes = EXCLUDED.notes;

-- TANK
INSERT INTO archetype_attribute_modifiers (archetype, attribute_name, modifier, notes) VALUES
  ('tank', 'attack', 10, 'Basic Tier'),
  ('tank', 'defense', 20, 'Basic Tier'),
  ('tank', 'speed', -25, 'Basic Tier - heavy armor penalty'),
  ('tank', 'magic_attack', -5, 'Basic Tier - from current_special'),
  ('tank', 'endurance', 15, 'Basic Tier - from current_max_health +15')
ON CONFLICT (archetype, attribute_name) DO UPDATE SET
  modifier = EXCLUDED.modifier,
  notes = EXCLUDED.notes;

-- ASSASSIN
INSERT INTO archetype_attribute_modifiers (archetype, attribute_name, modifier, notes) VALUES
  ('assassin', 'attack', 10, 'Basic Tier'),
  ('assassin', 'defense', -10, 'Basic Tier - light armor'),
  ('assassin', 'speed', 20, 'Basic Tier'),
  ('assassin', 'magic_attack', 10, 'Basic Tier - from current_special'),
  ('assassin', 'endurance', 5, 'Basic Tier - from current_max_health +5')
ON CONFLICT (archetype, attribute_name) DO UPDATE SET
  modifier = EXCLUDED.modifier,
  notes = EXCLUDED.notes;

-- =====================================================
-- ADVANCED TIER ARCHETYPES (135 point budget)
-- =====================================================

-- MAGE
INSERT INTO archetype_attribute_modifiers (archetype, attribute_name, modifier, notes) VALUES
  ('mage', 'attack', -10, 'Advanced Tier'),
  ('mage', 'defense', -15, 'Advanced Tier'),
  ('mage', 'speed', -5, 'Advanced Tier'),
  ('mage', 'magic_attack', -10, 'Advanced Tier - from current_special'),
  ('mage', 'endurance', -20, 'Advanced Tier - from current_max_health -20')
ON CONFLICT (archetype, attribute_name) DO UPDATE SET
  modifier = EXCLUDED.modifier,
  notes = EXCLUDED.notes;

-- SCHOLAR
INSERT INTO archetype_attribute_modifiers (archetype, attribute_name, modifier, notes) VALUES
  ('scholar', 'attack', -15, 'Advanced Tier'),
  ('scholar', 'defense', -10, 'Advanced Tier'),
  ('scholar', 'speed', -10, 'Advanced Tier'),
  ('scholar', 'magic_attack', -10, 'Advanced Tier - from current_special'),
  ('scholar', 'endurance', -10, 'Advanced Tier - from current_max_health -10')
ON CONFLICT (archetype, attribute_name) DO UPDATE SET
  modifier = EXCLUDED.modifier,
  notes = EXCLUDED.notes;

-- TRICKSTER
INSERT INTO archetype_attribute_modifiers (archetype, attribute_name, modifier, notes) VALUES
  ('trickster', 'attack', 5, 'Advanced Tier'),
  ('trickster', 'defense', 5, 'Advanced Tier'),
  ('trickster', 'speed', 15, 'Advanced Tier'),
  ('trickster', 'magic_attack', 5, 'Advanced Tier - from current_special'),
  ('trickster', 'endurance', 5, 'Advanced Tier - from current_max_health +5')
ON CONFLICT (archetype, attribute_name) DO UPDATE SET
  modifier = EXCLUDED.modifier,
  notes = EXCLUDED.notes;

-- DETECTIVE
INSERT INTO archetype_attribute_modifiers (archetype, attribute_name, modifier, notes) VALUES
  ('detective', 'attack', 5, 'Advanced Tier'),
  ('detective', 'defense', 5, 'Advanced Tier'),
  ('detective', 'speed', 10, 'Advanced Tier'),
  ('detective', 'magic_attack', 10, 'Advanced Tier - from current_special'),
  ('detective', 'endurance', 5, 'Advanced Tier - from current_max_health +5')
ON CONFLICT (archetype, attribute_name) DO UPDATE SET
  modifier = EXCLUDED.modifier,
  notes = EXCLUDED.notes;

-- =====================================================
-- ELITE TIER ARCHETYPES (150 point budget)
-- =====================================================

-- LEADER
INSERT INTO archetype_attribute_modifiers (archetype, attribute_name, modifier, notes) VALUES
  ('leader', 'attack', -5, 'Elite Tier'),
  ('leader', 'defense', -15, 'Elite Tier'),
  ('leader', 'speed', -5, 'Elite Tier'),
  ('leader', 'magic_attack', 0, 'Elite Tier - from current_special'),
  ('leader', 'endurance', -15, 'Elite Tier - from current_max_health -15')
ON CONFLICT (archetype, attribute_name) DO UPDATE SET
  modifier = EXCLUDED.modifier,
  notes = EXCLUDED.notes;

-- BEASTMASTER
INSERT INTO archetype_attribute_modifiers (archetype, attribute_name, modifier, notes) VALUES
  ('beastmaster', 'attack', -15, 'Elite Tier'),
  ('beastmaster', 'defense', -15, 'Elite Tier'),
  ('beastmaster', 'speed', -10, 'Elite Tier'),
  ('beastmaster', 'magic_attack', -10, 'Elite Tier - from current_special'),
  ('beastmaster', 'endurance', -10, 'Elite Tier - from current_max_health -10')
ON CONFLICT (archetype, attribute_name) DO UPDATE SET
  modifier = EXCLUDED.modifier,
  notes = EXCLUDED.notes;

-- MAGICAL_APPLIANCE
INSERT INTO archetype_attribute_modifiers (archetype, attribute_name, modifier, notes) VALUES
  ('magical_appliance', 'attack', -10, 'Elite Tier'),
  ('magical_appliance', 'defense', -10, 'Elite Tier'),
  ('magical_appliance', 'speed', 0, 'Elite Tier'),
  ('magical_appliance', 'magic_attack', -10, 'Elite Tier - from current_special'),
  ('magical_appliance', 'endurance', -10, 'Elite Tier - from current_max_health -10')
ON CONFLICT (archetype, attribute_name) DO UPDATE SET
  modifier = EXCLUDED.modifier,
  notes = EXCLUDED.notes;

-- MYSTIC
INSERT INTO archetype_attribute_modifiers (archetype, attribute_name, modifier, notes) VALUES
  ('mystic', 'attack', -15, 'Elite Tier'),
  ('mystic', 'defense', -15, 'Elite Tier'),
  ('mystic', 'speed', -10, 'Elite Tier'),
  ('mystic', 'magic_attack', -10, 'Elite Tier - from current_special'),
  ('mystic', 'endurance', 10, 'Elite Tier - from current_max_health +10')
ON CONFLICT (archetype, attribute_name) DO UPDATE SET
  modifier = EXCLUDED.modifier,
  notes = EXCLUDED.notes;

COMMIT;

-- Verification
SELECT 'Total archetype modifiers: ' || COUNT(*) FROM archetype_attribute_modifiers;
SELECT archetype, COUNT(*) as modifier_count
FROM archetype_attribute_modifiers
GROUP BY archetype
ORDER BY archetype;
