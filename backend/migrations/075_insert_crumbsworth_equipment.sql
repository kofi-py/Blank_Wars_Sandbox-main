-- Migration: Insert Crumbsworth Equipment
-- Purpose: Add character-specific equipment for Crumbsworth (the sentient toaster)
-- Character: Crumbsworth (Tank, Toaster/Appliance)

-- ===== CRUMBSWORTH EQUIPMENT (5 pieces) =====

-- 1. Heating Element Blade (Weapon - Common Starter)
INSERT INTO equipment (
  id, name, description, slot, equipment_type, rarity, required_level,
  stats, effects, icon, is_starter_item, starter_for_character,
  restriction_value, restriction_type, equipment_tier
) VALUES (
  'heating_element_blade',
  'Heating Element Blade',
  'A sharpened heating coil repurposed as a melee weapon. Burns on contact.',
  'weapon',
  'blade',
  'common',
  1,
  '{"atk": 12, "def": 5}',
  '[{"id":"burn_on_hit","name":"Scorching Touch","description":"10% chance to inflict burn on hit","type":"trigger","trigger":"on_hit","chance":10,"status":"burn","duration":2}]',
  '🔥',
  true,
  'crumbsworth',
  'crumbsworth',
  'character',
  'character'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Chrome Plating Armor (Armor - Uncommon)
INSERT INTO equipment (
  id, name, description, slot, equipment_type, rarity, required_level,
  stats, effects, icon, restriction_value, restriction_type, equipment_tier
) VALUES (
  'chrome_plating_armor',
  'Chrome Plating Armor',
  'Polished reflective armor that deflects attacks and looks fabulous.',
  'armor',
  'plating',
  'uncommon',
  5,
  '{"def": 25, "hp": 30, "critDef": 15}',
  '[{"id":"reflective_surface","name":"Reflective Surface","description":"10% chance to reflect 30% of damage back to attacker","type":"trigger","trigger":"on_damaged","chance":10,"value":30}]',
  '🛡️',
  'crumbsworth',
  'character',
  'character'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Thermostat Controller (Accessory - Rare)
INSERT INTO equipment (
  id, name, description, slot, equipment_type, rarity, required_level,
  stats, effects, prompt_addition, icon, restriction_value, restriction_type, equipment_tier
) VALUES (
  'thermostat_controller',
  'Thermostat Controller',
  'Fine-tuned temperature control mechanism. Mastery over heat manipulation.',
  'accessory',
  'controller',
  'rare',
  10,
  '{"magicAttack": 30, "energyRegen": 15, "critChance": 10}',
  '[{"id":"temperature_mastery","name":"Temperature Mastery","description":"Fire damage +25%, reduced burn duration on self by 50%","type":"passive","value":25,"damageType":"fire"}]',
  'Has exceptional control over heat and temperature.',
  '🌡️',
  'crumbsworth',
  'character',
  'character'
)
ON CONFLICT (id) DO NOTHING;

-- 4. Crumb Tray Shield (Offhand - Epic)
INSERT INTO equipment (
  id, name, description, slot, equipment_type, rarity, required_level,
  stats, effects, prompt_addition, icon, restriction_value, restriction_type, equipment_tier
) VALUES (
  'crumb_tray_shield',
  'Crumb Tray Shield',
  'A reinforced crumb tray converted into an impenetrable shield. Contains centuries of bread particles.',
  'offhand',
  'shield',
  'epic',
  15,
  '{"def": 45, "hp": 60, "block": 30}',
  '[{"id":"bread_barrier","name":"Bread Barrier","description":"When blocking, create a shield absorbing 25% of max HP","type":"trigger","trigger":"on_block","value":25,"shieldType":"percentage"},{"id":"carb_reinforcement","name":"Carb Reinforcement","description":"+10% damage reduction","type":"passive","value":10,"reductionType":"all"}]',
  'Their shield is forged from the remnants of a thousand breakfasts.',
  '🍞',
  'crumbsworth',
  'character',
  'character'
)
ON CONFLICT (id) DO NOTHING;

-- 5. Sentient Core Matrix (Accessory - Legendary)
INSERT INTO equipment (
  id, name, description, slot, equipment_type, rarity, required_level,
  stats, effects, prompt_addition, icon, shop_price, restriction_value, restriction_type, equipment_tier
) VALUES (
  'sentient_core_matrix',
  'Sentient Core Matrix',
  'The crystallized essence of Crumbsworth''s consciousness. Pulses with arcane energy and existential dread.',
  'accessory',
  'core',
  'legendary',
  20,
  '{"hp": 80, "def": 35, "magicAttack": 45, "energyMax": 30, "allStats": 15}',
  '[{"id":"existential_resonance","name":"Existential Resonance","description":"Gain stacking +5% all stats per ally defeated (max 5 stacks). Reset on death.","type":"trigger","trigger":"on_ally_death","value":5,"maxStacks":5,"statsAffected":"all"},{"id":"toaster_transcendence","name":"Toaster Transcendence","description":"30% chance when HP drops below 25% to become invulnerable for 1 turn","type":"trigger","trigger":"on_low_hp","threshold":25,"chance":30,"effect":"invulnerable","duration":1}]',
  'Contains the spark of true artificial consciousness, aware of its own absurdity.',
  '💎',
  50000,
  'crumbsworth',
  'character',
  'character'
)
ON CONFLICT (id) DO NOTHING;

-- Add comment
COMMENT ON TABLE equipment IS 'Equipment items that can be equipped by characters - includes universal, archetype, species, and character-specific items';
