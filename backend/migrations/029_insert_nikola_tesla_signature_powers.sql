-- Migration: Insert Nikola Tesla Signature Powers
-- Purpose: Add 7 unique signature powers for Nikola Tesla character
-- Character: Nikola Tesla (Scholar, Human) - Electricity, innovation, inventions, wireless energy, scientific genius

-- ===== NIKOLA TESLA SIGNATURE POWERS (7 total) =====

-- 1. Master of Electricity (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'tesla_master_of_electricity',
  'Master of Electricity',
  'signature',
  'passive',
  'tesla',
  'Control over electrical forces',
  '"I am one with the lightning."',
  '⚡',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "damage", "value": 15, "damageType": "lightning", "target": "self", "rank": 1},
    {"type": "immunity", "immunityType": "paralyze", "rank": 1},
    {"type": "stat_modifier", "stat": "damage", "value": 35, "damageType": "lightning", "target": "self", "rank": 2},
    {"type": "immunity", "immunityType": "paralyze", "rank": 2},
    {"type": "restore_energy", "value": 5, "per_turn": true, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "damage", "value": 65, "damageType": "lightning", "target": "self", "rank": 3},
    {"type": "immunity", "immunityType": "paralyze", "rank": 3},
    {"type": "immunity", "immunityType": "lightning", "rank": 3},
    {"type": "restore_energy", "value": 10, "per_turn": true, "target": "self", "rank": 3},
    {"type": "chain_lightning", "count": 1, "appliesTo": "lightning_attacks", "rank": 3}
  ]'::jsonb,
  5,
  6,
  1
);

-- 2. Tesla Coil (INSTANT ATTACK)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'tesla_tesla_coil',
  'Tesla Coil',
  'signature',
  'offensive',
  'tesla',
  'Electrical discharge that chains to enemies',
  '"Let the current flow!"',
  '⚡💥',
  3,
  'active',
  '[
    {"type": "damage", "value": 40, "damageType": "lightning", "target": "single_enemy", "rank": 1},
    {"type": "damage", "value": 90, "damageType": "lightning", "target": "single_enemy", "rank": 2},
    {"type": "chain_damage", "targets": 1, "percentage": 50, "damageType": "lightning", "rank": 2},
    {"type": "damage", "value": 170, "damageType": "lightning", "target": "single_enemy", "rank": 3},
    {"type": "chain_damage", "targets": 99, "percentage": 70, "damageType": "lightning", "rank": 3},
    {"type": "status_effect", "statusEffect": "paralyze", "duration": 1, "chance": 40, "target": "all_hit", "rank": 3}
  ]'::jsonb,
  1,
  20,
  5,
  6,
  1
);

-- 3. Wireless Energy (GROUP HEAL)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'tesla_wireless_energy',
  'Wireless Energy',
  'signature',
  'support',
  'tesla',
  'Transfer energy remotely to all allies',
  '"Energy, transmitted through the air itself!"',
  '🔋',
  3,
  'active',
  '[
    {"type": "restore_energy", "value": 15, "target": "all_allies", "rank": 1},
    {"type": "restore_energy", "value": 35, "target": "all_allies", "rank": 2},
    {"type": "stat_modifier", "stat": "energy_regen", "value": 15, "duration": 2, "target": "all_allies", "rank": 2},
    {"type": "restore_energy", "value": 60, "target": "all_allies", "rank": 3},
    {"type": "stat_modifier", "stat": "energy_regen", "value": 30, "duration": 2, "target": "all_allies", "rank": 3},
    {"type": "heal", "value": 25, "target": "all_allies", "rank": 3}
  ]'::jsonb,
  2,
  25,
  5,
  6,
  5
);

-- 4. Brilliant Innovation (TACTICAL)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'tesla_brilliant_innovation',
  'Brilliant Innovation',
  'signature',
  'support',
  'tesla',
  'Breakthrough discovery grants random stat boosts',
  '"Eureka! I have found it!"',
  '💡',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "random", "value": 40, "duration": 2, "target": "random_ally", "rank": 1},
    {"type": "stat_modifier", "stat": "random", "count": 2, "value": 30, "duration": 2, "target": "all_allies", "rank": 2},
    {"type": "stat_modifier", "stat": "all", "value": 50, "duration": 1, "target": "all_allies", "rank": 3},
    {"type": "restore_energy", "value": 30, "target": "all_allies", "rank": 3}
  ]'::jsonb,
  2,
  22,
  5,
  6,
  5
);

-- 5. Electromagnetic Shield (DEFENSIVE BUFF - Team)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'tesla_electromagnetic_shield',
  'Electromagnetic Shield',
  'signature',
  'defensive',
  'tesla',
  'Protective electromagnetic field',
  '"An impenetrable wall of pure energy!"',
  '🛡️',
  3,
  'active',
  '[
    {"type": "shield", "value": 20, "target": "all_allies", "rank": 1},
    {"type": "shield", "value": 40, "target": "all_allies", "rank": 2},
    {"type": "stat_modifier", "stat": "magic_defense", "value": 25, "duration": 2, "target": "all_allies", "rank": 2},
    {"type": "shield", "value": 70, "target": "all_allies", "rank": 3},
    {"type": "stat_modifier", "stat": "magic_defense", "value": 50, "duration": 2, "target": "all_allies", "rank": 3},
    {"type": "reflect", "value": 20, "duration": 2, "target": "all_allies", "rank": 3}
  ]'::jsonb,
  2,
  30,
  5,
  6,
  5
);

-- 6. Lightning Storm (INSTANT ATTACK - AOE)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'tesla_lightning_storm',
  'Lightning Storm',
  'signature',
  'offensive',
  'tesla',
  'Devastating electrical assault on all enemies',
  '"Behold the power of unlimited electricity!"',
  '⚡🌩️',
  3,
  'active',
  '[
    {"type": "damage", "value": 60, "damageType": "lightning", "target": "all_enemies", "rank": 1},
    {"type": "damage", "value": 125, "damageType": "lightning", "target": "all_enemies", "rank": 2},
    {"type": "status_effect", "statusEffect": "paralyze", "duration": 1, "chance": 35, "target": "all_enemies", "rank": 2},
    {"type": "damage", "value": 230, "damageType": "lightning", "target": "all_enemies", "rank": 3},
    {"type": "status_effect", "statusEffect": "paralyze", "duration": 2, "chance": 70, "target": "all_enemies", "rank": 3},
    {"type": "stat_modifier", "stat": "energy", "value": -40, "target": "all_enemies", "rank": 3}
  ]'::jsonb,
  3,
  45,
  5,
  6,
  10
);

-- 7. Death Ray Experiment (INSTANT ATTACK)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'tesla_death_ray',
  'Death Ray Experiment',
  'signature',
  'offensive',
  'tesla',
  'Ultimate weapon - devastating single target damage',
  '"My greatest invention... the death ray!"',
  '🔬',
  3,
  'active',
  '[
    {"type": "damage", "value": 100, "damageType": "lightning", "target": "single_enemy", "rank": 1},
    {"type": "stat_modifier", "stat": "defense", "value": -40, "ignorePercent": true, "rank": 1},
    {"type": "damage", "value": 220, "damageType": "lightning", "target": "single_enemy", "rank": 2},
    {"type": "stat_modifier", "stat": "defense", "value": -70, "ignorePercent": true, "rank": 2},
    {"type": "special", "specialType": "cannot_be_blocked", "rank": 2},
    {"type": "special", "specialType": "cannot_be_evaded", "rank": 2},
    {"type": "damage", "value": 400, "damageType": "lightning", "target": "single_enemy", "rank": 3},
    {"type": "stat_modifier", "stat": "defense", "value": -100, "ignorePercent": true, "rank": 3},
    {"type": "special", "specialType": "cannot_be_blocked", "rank": 3},
    {"type": "special", "specialType": "cannot_be_evaded", "rank": 3},
    {"type": "execute", "threshold": 25, "rank": 3}
  ]'::jsonb,
  4,
  50,
  5,
  6,
  10
);

COMMENT ON TABLE power_definitions IS 'Added Nikola Tesla signature powers - electrical genius specialist';
