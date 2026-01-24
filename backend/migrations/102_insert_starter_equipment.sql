-- Migration 101: Insert Starter Equipment
-- Adds missing starter equipment required by databaseAdapter.ts for new character creation

BEGIN;

-- WARRIOR STARTER
INSERT INTO equipment (id, name, description, slot, equipment_type, rarity, required_level, equipment_tier, restriction_type, archetype, stats, effects, shop_price, icon)
VALUES
('iron_sword', 'Iron Sword', 'A standard iron sword for new warriors', 'weapon', 'sword', 'common', 1, 'universal', 'class', 'warrior',
 '{"attack": 10, "strength": 2}', '[]', 100, '⚔️')
ON CONFLICT (id) DO NOTHING;

INSERT INTO equipment (id, name, description, slot, equipment_type, rarity, required_level, equipment_tier, restriction_type, archetype, stats, effects, shop_price, icon)
VALUES
('leather_vest', 'Leather Vest', 'Basic protection for agile fighters', 'armor', 'light_armor', 'common', 1, 'universal', 'class', 'warrior',
 '{"defense": 5, "agility": 2}', '[]', 80, '🦺')
ON CONFLICT (id) DO NOTHING;

-- MAGE STARTER
INSERT INTO equipment (id, name, description, slot, equipment_type, rarity, required_level, equipment_tier, restriction_type, archetype, stats, effects, shop_price, icon)
VALUES
('wooden_staff_generic', 'Wooden Staff', 'A simple staff for channeling magic', 'weapon', 'staff', 'common', 1, 'universal', 'class', 'mage',
 '{"attack": 5, "intelligence": 5}', '[{"type": "mana_regen", "value": 1}]', 100, '🪵')
ON CONFLICT (id) DO NOTHING;

INSERT INTO equipment (id, name, description, slot, equipment_type, rarity, required_level, equipment_tier, restriction_type, archetype, stats, effects, shop_price, icon)
VALUES
('enchanted_robes_generic', 'Enchanted Robes', 'Simple robes with a faint magical aura', 'armor', 'cloth_armor', 'common', 1, 'universal', 'class', 'mage',
 '{"defense": 3, "intelligence": 3, "mana": 10}', '[]', 80, '👘')
ON CONFLICT (id) DO NOTHING;

-- ASSASSIN STARTER
INSERT INTO equipment (id, name, description, slot, equipment_type, rarity, required_level, equipment_tier, restriction_type, archetype, stats, effects, shop_price, icon)
VALUES
('rusty_sword_generic', 'Rusty Sword', 'An old sword, but still sharp enough', 'weapon', 'sword', 'common', 1, 'universal', 'class', 'assassin',
 '{"attack": 8, "agility": 2}', '[{"type": "critical_chance", "value": 5}]', 50, '🗡️')
ON CONFLICT (id) DO NOTHING;

INSERT INTO equipment (id, name, description, slot, equipment_type, rarity, required_level, equipment_tier, restriction_type, archetype, stats, effects, shop_price, icon)
VALUES
('cloak_shadows_generic', 'Shadow Cloak', 'A dark cloak that helps blend in', 'armor', 'light_armor', 'common', 1, 'universal', 'class', 'assassin',
 '{"defense": 4, "agility": 3}', '[{"type": "stealth", "value": 5}]', 90, '🧥')
ON CONFLICT (id) DO NOTHING;

-- TANK STARTER
INSERT INTO equipment (id, name, description, slot, equipment_type, rarity, required_level, equipment_tier, restriction_type, archetype, stats, effects, shop_price, icon)
VALUES
('iron_mace_generic', 'Iron Mace', 'A heavy mace for crushing armor', 'weapon', 'mace', 'common', 1, 'universal', 'class', 'tank',
 '{"attack": 12, "strength": 3}', '[]', 110, '🔨')
ON CONFLICT (id) DO NOTHING;

INSERT INTO equipment (id, name, description, slot, equipment_type, rarity, required_level, equipment_tier, restriction_type, archetype, stats, effects, shop_price, icon)
VALUES
('chain_mail_generic', 'Chain Mail', 'Interlinked iron rings for solid defense', 'armor', 'heavy_armor', 'common', 1, 'universal', 'class', 'tank',
 '{"defense": 15, "health": 20}', '[]', 150, '⛓️')
ON CONFLICT (id) DO NOTHING;

-- LEADER STARTER
INSERT INTO equipment (id, name, description, slot, equipment_type, rarity, required_level, equipment_tier, restriction_type, archetype, stats, effects, shop_price, icon)
VALUES
('steel_sword_generic', 'Steel Sword', 'A well-crafted sword for a commander', 'weapon', 'sword', 'common', 1, 'universal', 'class', 'leader',
 '{"attack": 15, "charisma": 5}', '[]', 200, '⚔️')
ON CONFLICT (id) DO NOTHING;

-- MYSTIC STARTER
INSERT INTO equipment (id, name, description, slot, equipment_type, rarity, required_level, equipment_tier, restriction_type, archetype, stats, effects, shop_price, icon)
VALUES
('crystal_staff_generic', 'Crystal Staff', 'A staff tipped with a focusing crystal', 'weapon', 'staff', 'common', 1, 'universal', 'class', 'mystic',
 '{"attack": 8, "wisdom": 5}', '[{"type": "spell_power", "value": 5}]', 150, '🔮')
ON CONFLICT (id) DO NOTHING;

-- SCHOLAR STARTER
INSERT INTO equipment (id, name, description, slot, equipment_type, rarity, required_level, equipment_tier, restriction_type, archetype, stats, effects, shop_price, icon)
VALUES
('arcane_staff_generic', 'Arcane Staff', 'A staff inscribed with runes', 'weapon', 'staff', 'common', 1, 'universal', 'class', 'scholar',
 '{"attack": 6, "intelligence": 8}', '[{"type": "mana_max", "value": 20}]', 140, '📜')
ON CONFLICT (id) DO NOTHING;

-- TRICKSTER/BEAST STARTER
INSERT INTO equipment (id, name, description, slot, equipment_type, rarity, required_level, equipment_tier, restriction_type, archetype, stats, effects, shop_price, icon)
VALUES
('wooden_club_generic', 'Wooden Club', 'A sturdy piece of wood', 'weapon', 'mace', 'common', 1, 'universal', 'class', 'trickster',
 '{"attack": 10, "strength": 2}', '[]', 40, '🪵')
ON CONFLICT (id) DO NOTHING;

-- MAGICAL_APPLIANCE STARTER (Uses Tank generic gear)
-- DETECTIVE STARTER (Uses Assassin generic gear)
-- BEASTMASTER STARTER (Uses Beast/Trickster generic gear)
-- SYSTEM STARTER (Uses Mage generic gear)

-- Handle conflicts just in case
INSERT INTO equipment (id, name, description, slot, equipment_type, rarity, required_level, equipment_tier, restriction_type, archetype, stats, effects, shop_price, icon)
VALUES
('small_health_potion', 'Small Health Potion', 'Restores 50 HP', 'consumable', 'potion', 'common', 1, 'universal', 'generic', NULL,
 '{"health_restore": 50}', '[]', 25, '🧪')
ON CONFLICT (id) DO NOTHING;

COMMIT;
