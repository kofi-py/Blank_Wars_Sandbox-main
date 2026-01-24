-- Migration 012: Seed Archetype & Species Equipment Examples
-- Creates sample equipment for Tier 2 (Archetype) and Tier 3 (Species)

BEGIN;

-- ============================================================================
-- TIER 2: ARCHETYPE-SPECIFIC EQUIPMENT
-- ============================================================================

-- WARRIOR EQUIPMENT
INSERT INTO equipment (id, name, description, restriction_type, slot, equipment_type, rarity, required_level, equipment_tier, archetype, stats, effects, shop_price, icon)
VALUES
('warrior_platemail', 'Warrior''s Platemail', 'Heavy armor forged for warriors, provides exceptional defense', 'generic', 'armor', 'heavy_armor', 'uncommon', 5, 'archetype', 'warrior',
 '{"defense": 25, "health": 50}', '[{"type": "damage_reduction", "value": 10}]', 500, '🛡️'),

('warrior_greatsword', 'Warrior''s Greatsword', 'A massive two-handed blade requiring warrior strength', 'generic', 'weapon', 'greatsword', 'uncommon', 5, 'archetype', 'warrior',
 '{"attack": 35, "strength": 10}', '[{"type": "cleave", "value": 15}]', 600, '⚔️');

-- MAGE EQUIPMENT
INSERT INTO equipment (id, name, description, restriction_type, slot, equipment_type, rarity, required_level, equipment_tier, archetype, stats, effects, shop_price, icon)
VALUES
('mage_arcane_robes', 'Mage''s Arcane Robes', 'Enchanted robes that amplify magical power', 'class', 'armor', 'cloth_armor', 'uncommon', 5, 'archetype', 'mage',
 '{"defense": 10, "intelligence": 20, "mana": 50}', '[{"type": "spell_power", "value": 15}]', 550, '👘'),

('mage_spellcasting_staff', 'Mage''s Spellcasting Staff', 'A staff channeling raw magical energy', 'class', 'weapon', 'staff', 'uncommon', 5, 'archetype', 'mage',
 '{"attack": 20, "intelligence": 15}', '[{"type": "spell_damage", "value": 20}, {"type": "mana_regeneration", "value": 5}]', 700, '🪄');

-- ASSASSIN EQUIPMENT
INSERT INTO equipment (id, name, description, restriction_type, slot, equipment_type, rarity, required_level, equipment_tier, archetype, stats, effects, shop_price, icon)
VALUES
('assassin_shadow_garb', 'Assassin''s Shadow Garb', 'Light armor that blends with darkness', 'class', 'armor', 'light_armor', 'uncommon', 5, 'archetype', 'assassin',
 '{"defense": 15, "agility": 20}', '[{"type": "stealth", "value": 25}, {"type": "evasion", "value": 10}]', 500, '🥷'),

('assassin_twin_daggers', 'Assassin''s Twin Daggers', 'Perfectly balanced blades for quick strikes', 'class', 'weapon', 'dual_daggers', 'uncommon', 5, 'archetype', 'assassin',
 '{"attack": 30, "agility": 15}', '[{"type": "critical_chance", "value": 20}, {"type": "backstab_damage", "value": 50}]', 650, '🗡️');

-- TANK EQUIPMENT
INSERT INTO equipment (id, name, description, restriction_type, slot, equipment_type, rarity, required_level, equipment_tier, archetype, stats, effects, shop_price, icon)
VALUES
('tank_fortress_armor', 'Tank''s Fortress Armor', 'Impenetrable armor designed to protect allies', 'class', 'armor', 'heavy_armor', 'uncommon', 5, 'archetype', 'tank',
 '{"defense": 35, "health": 100}', '[{"type": "damage_reduction", "value": 15}, {"type": "taunt_power", "value": 20}]', 700, '🛡️'),

('tank_tower_shield', 'Tank''s Tower Shield', 'A massive shield that can block entire attacks', 'class', 'weapon', 'shield', 'uncommon', 5, 'archetype', 'tank',
 '{"defense": 30, "health": 50}', '[{"type": "block_chance", "value": 25}, {"type": "ally_protection", "value": 15}]', 600, '🛡️');

-- ============================================================================
-- TIER 3: SPECIES-SPECIFIC EQUIPMENT
-- ============================================================================

-- VAMPIRE EQUIPMENT
INSERT INTO equipment (id, name, description, restriction_type, slot, equipment_type, rarity, required_level, equipment_tier, species, stats, effects, shop_price, icon)
VALUES
('vampire_cloak_of_night', 'Vampire''s Cloak of Night', 'Ancient cloak that draws power from darkness', 'class', 'armor', 'cloak', 'rare', 8, 'species', 'vampire',
 '{"defense": 20, "agility": 15, "intelligence": 10}', '[{"type": "life_drain", "value": 10}, {"type": "night_vision", "value": 100}, {"type": "shadow_form", "duration": 3}]', 1200, '🦇'),

('vampire_blood_blade', 'Vampire''s Blood Blade', 'Crimson sword that feeds on enemy life force', 'class', 'weapon', 'sword', 'rare', 8, 'species', 'vampire',
 '{"attack": 40, "agility": 10}', '[{"type": "life_steal", "value": 15}, {"type": "blood_frenzy", "value": 20}]', 1500, '🩸');

-- CYBORG EQUIPMENT
INSERT INTO equipment (id, name, description, restriction_type, slot, equipment_type, rarity, required_level, equipment_tier, species, stats, effects, shop_price, icon)
VALUES
('cyborg_neural_interface', 'Cyborg Neural Interface', 'Advanced AI integration system', 'class', 'armor', 'tech_armor', 'rare', 8, 'species', 'cyborg',
 '{"defense": 25, "intelligence": 20}', '[{"type": "system_overclock", "value": 25}, {"type": "analysis_mode", "value": 15}, {"type": "self_repair", "value": 10}]', 1400, '🤖'),

('cyborg_plasma_cannon', 'Cyborg Plasma Cannon', 'Integrated energy weapon system', 'class', 'weapon', 'energy_weapon', 'rare', 8, 'species', 'cyborg',
 '{"attack": 45, "intelligence": 15}', '[{"type": "plasma_damage", "value": 30}, {"type": "emp_burst", "value": 20}]', 1600, '🔫');

-- DEITY EQUIPMENT
INSERT INTO equipment (id, name, description, restriction_type, slot, equipment_type, rarity, required_level, equipment_tier, species, stats, effects, shop_price, icon)
VALUES
('deity_celestial_robes', 'Deity''s Celestial Robes', 'Divine garments woven from starlight', 'class', 'armor', 'divine_armor', 'rare', 10, 'species', 'deity',
 '{"defense": 30, "intelligence": 25, "charisma": 20}', '[{"type": "divine_aura", "value": 20}, {"type": "celestial_protection", "value": 15}]', 2000, '✨'),

('deity_divine_scepter', 'Deity''s Divine Scepter', 'Staff channeling the power of the heavens', 'class', 'weapon', 'divine_weapon', 'rare', 10, 'species', 'deity',
 '{"attack": 50, "intelligence": 20}', '[{"type": "divine_smite", "value": 40}, {"type": "blessing_power", "value": 25}]', 2500, '👑');

-- DIRE WOLF EQUIPMENT (Beast-compatible)
INSERT INTO equipment (id, name, description, restriction_type, slot, equipment_type, rarity, required_level, equipment_tier, species, stats, effects, shop_price, icon)
VALUES
('beast_primal_hide', 'Beast''s Primal Hide', 'Natural armor that grows stronger in battle', 'class', 'armor', 'natural_armor', 'rare', 8, 'species', 'dire_wolf',
 '{"defense": 25, "strength": 15, "agility": 10}', '[{"type": "pack_tactics", "value": 20}, {"type": "natural_regeneration", "value": 5}]', 1300, '🐺'),

('beast_savage_claws', 'Beast''s Savage Claws', 'Enhanced natural weapons for primal fury', 'class', 'weapon', 'natural_weapon', 'rare', 8, 'species', 'dire_wolf',
 '{"attack": 45, "strength": 15}', '[{"type": "rending_strike", "value": 25}, {"type": "feral_rage", "value": 15}]', 1500, '🦷');

-- ============================================================================
-- UPDATE RARITY ALIGNMENT WITH TIERS
-- ============================================================================

-- Ensure rarity matches tier expectations
-- Tier 2 (Archetype) should be uncommon-rare
-- Tier 3 (Species) should be rare-epic

UPDATE equipment SET rarity = 'uncommon' WHERE equipment_tier = 'archetype' AND rarity = 'common';
UPDATE equipment SET rarity = 'rare' WHERE equipment_tier = 'species' AND rarity IN ('common', 'uncommon');

-- ============================================================================
-- ADD COMMENTS
-- ============================================================================

COMMENT ON TABLE equipment IS 'Equipment items with 4-tier system: universal (common), archetype (uncommon), species (rare), character (legendary)';

COMMIT;
