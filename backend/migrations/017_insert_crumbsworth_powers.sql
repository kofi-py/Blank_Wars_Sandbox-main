-- Migration: Insert Crumbsworth (Toaster Species + Appliance Archetype + Signature) Powers
-- Purpose: Add all 21 powers for the Crumbsworth character

-- ===== TOASTER SPECIES POWERS (7 total) =====

ALTER TABLE power_definitions ADD COLUMN IF NOT EXISTS rank_up_cost INTEGER DEFAULT 0;

-- 1. Heating Elements (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'toaster_heating_elements',
  'Heating Elements',
  'species',
  'passive',
  'toaster',
  'Internal heat generation provides fire damage bonuses and immunity to heat-based effects',
  'The coils glow with intense heat, ready to toast... or roast.',
  '🔥',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "fire_damage", "value": 10, "rank": 1},
    {"type": "immunity", "immunityType": "burn", "rank": 1},
    {"type": "stat_modifier", "stat": "fire_damage", "value": 22, "rank": 2},
    {"type": "stat_modifier", "stat": "attack", "value": 8, "rank": 2},
    {"type": "stat_modifier", "stat": "fire_damage", "value": 40, "rank": 3},
    {"type": "stat_modifier", "stat": "attack", "value": 15, "rank": 3},
    {"type": "immunity", "immunityType": "heat_damage", "rank": 3}
  ]'::jsonb,
  3,
  5,
  1
);

-- 2. Toast Projectile (INSTANT ATTACK)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'toaster_toast_projectile',
  'Toast Projectile',
  'species',
  'offensive',
  'toaster',
  'Launch toasted bread at enemies, dealing fire damage with a chance to burn',
  '"Fresh toast, coming right up! ...Wait, that came out wrong."',
  '🍞',
  3,
  'active',
  '[
    {"type": "damage", "value": 25, "damageType": "fire", "target": "single_enemy", "rank": 1},
    {"type": "damage", "value": 60, "damageType": "fire", "target": "single_enemy", "rank": 2},
    {"type": "status_effect", "statusEffect": "burn", "duration": 3, "damage_per_turn": 15, "chance": 25, "rank": 2},
    {"type": "damage", "value": 110, "damageType": "fire", "target": "single_enemy", "rank": 3},
    {"type": "status_effect", "statusEffect": "burn", "duration": 4, "damage_per_turn": 25, "chance": 50, "rank": 3}
  ]'::jsonb,
  1,
  15,
  3,
  5,
  1
);

-- 3. Electrical Core (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'toaster_electrical_core',
  'Electrical Core',
  'species',
  'passive',
  'toaster',
  'Powered by electricity, gain increased mana and immunity to electrical effects',
  'Runs on 120V AC. Do not immerse in water.',
  '⚡',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "max_mana", "value": 15, "rank": 1},
    {"type": "stat_modifier", "stat": "mana_regen", "value": 8, "rank": 1},
    {"type": "immunity", "immunityType": "lightning", "rank": 1},
    {"type": "stat_modifier", "stat": "max_mana", "value": 30, "rank": 2},
    {"type": "stat_modifier", "stat": "mana_regen", "value": 15, "rank": 2},
    {"type": "stat_modifier", "stat": "max_mana", "value": 50, "rank": 3},
    {"type": "stat_modifier", "stat": "mana_regen", "value": 25, "rank": 3},
    {"type": "aura", "auraType": "mana_regen", "value": 10, "target": "allies", "rank": 3}
  ]'::jsonb,
  3,
  5,
  1
);

-- 4. Carb Loading (GROUP HEAL)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'toaster_carb_loading',
  'Carb Loading',
  'species',
  'support',
  'toaster',
  'Energy restoration through carbohydrates - heal and restore energy to all allies',
  '"Carbs are the ultimate power source! Science says so!"',
  '🥖',
  3,
  'active',
  '[
    {"type": "heal", "value": 15, "target": "all_allies", "rank": 1},
    {"type": "restore_energy", "value": 15, "target": "all_allies", "rank": 1},
    {"type": "heal", "value": 35, "target": "all_allies", "rank": 2},
    {"type": "restore_energy", "value": 30, "target": "all_allies", "rank": 2},
    {"type": "heal", "value": 60, "target": "all_allies", "rank": 3},
    {"type": "restore_energy", "value": 50, "target": "all_allies", "rank": 3},
    {"type": "stat_modifier", "stat": "stamina", "value": 20, "duration": 2, "target": "all_allies", "rank": 3}
  ]'::jsonb,
  2,
  25,
  3,
  5,
  5
);

-- 5. Power Surge (OFFENSIVE BUFF - Self)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'toaster_power_surge',
  'Power Surge',
  'species',
  'offensive',
  'toaster',
  'Overload heating elements for massive fire damage, but take recoil damage',
  '"Maximum browning level achieved! Warning: Smoke may occur!"',
  '🔌',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "fire_damage", "value": 30, "duration": 0, "target": "self", "rank": 1},
    {"type": "recoil", "value": 5, "rank": 1},
    {"type": "stat_modifier", "stat": "fire_damage", "value": 65, "duration": 2, "target": "self", "rank": 2},
    {"type": "recoil", "value": 8, "rank": 2},
    {"type": "stat_modifier", "stat": "fire_damage", "value": 110, "duration": 2, "target": "self", "rank": 3},
    {"type": "recoil", "value": 10, "rank": 3},
    {"type": "apply_on_hit", "statusEffect": "burn", "rank": 3}
  ]'::jsonb,
  1,
  20,
  3,
  5,
  5
);

-- 6. Burnt Offering (INSTANT ATTACK - AOE)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'toaster_burnt_offering',
  'Burnt Offering',
  'species',
  'offensive',
  'toaster',
  'Overdrive attack that damages all enemies with fire',
  '"Oops, left it in too long. Your problem now!"',
  '🍞💥',
  3,
  'active',
  '[
    {"type": "damage", "value": 60, "damageType": "fire", "target": "all_enemies", "rank": 1},
    {"type": "damage", "value": 120, "damageType": "fire", "target": "all_enemies", "rank": 2},
    {"type": "status_effect", "statusEffect": "burn", "duration": 3, "chance": 30, "rank": 2},
    {"type": "damage", "value": 200, "damageType": "fire", "target": "all_enemies", "rank": 3},
    {"type": "status_effect", "statusEffect": "burn", "duration": 4, "chance": 60, "rank": 3},
    {"type": "stat_modifier", "stat": "attack", "value": -20, "duration": 2, "target": "all_enemies", "rank": 3}
  ]'::jsonb,
  3,
  40,
  4,
  6,
  10
);

-- 7. Emergency Reboot (DEFENSIVE BUFF - Self)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'toaster_emergency_reboot',
  'Emergency Reboot',
  'species',
  'defensive',
  'toaster',
  'System restart protocol - remove debuffs, heal, and restore energy',
  '"Rebooting... Please wait... Toast functions temporarily offline."',
  '🛡️',
  3,
  'active',
  '[
    {"type": "purge", "purgeType": "debuff", "count": 1, "target": "self", "rank": 1},
    {"type": "heal", "value": 12, "target": "self", "rank": 1},
    {"type": "purge", "purgeType": "debuff", "count": 2, "target": "self", "rank": 2},
    {"type": "heal", "value": 28, "target": "self", "rank": 2},
    {"type": "restore_energy", "value": 20, "target": "self", "rank": 2},
    {"type": "purge", "purgeType": "debuff", "count": 99, "target": "self", "rank": 3},
    {"type": "heal", "value": 50, "target": "self", "rank": 3},
    {"type": "restore_energy", "value": 35, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "defense", "value": 25, "duration": 2, "target": "self", "rank": 3}
  ]'::jsonb,
  2,
  25,
  4,
  6,
  10
);

-- Continue with part 2 (Appliance Archetype powers)...
