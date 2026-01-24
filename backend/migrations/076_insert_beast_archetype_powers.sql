-- Migration: Insert Beast Archetype Powers
-- Purpose: Add 7 ability-tier powers for Beast archetype
-- Archetype: Beast - Primal fury, natural armor, pack tactics

-- ===== BEAST ARCHETYPE POWERS (7 total) =====

-- 1. Primal Fury - Tap into animalistic rage (INSTANT ATTACK)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'beast_primal_fury',
  'Primal Fury',
  'ability',
  'offensive',
  'beast',
  'Unleash primal rage in a devastating strike',
  'Raw, untamed power.',
  '🐺',
  3,
  'active',
  '[
    {"type": "damage", "value": 25, "damageType": "physical", "target": "single_enemy", "rank": 1},
    {"type": "damage", "value": 55, "damageType": "physical", "target": "single_enemy", "rank": 2},
    {"type": "damage", "value": 90, "damageType": "physical", "target": "single_enemy", "rank": 3},
    {"type": "status_effect", "statusEffect": "fear", "chance": 20, "duration": 3, "rank": 3}
  ]'::jsonb,
  1,
  10,
  2,
  4,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 2. Natural Armor - Thick hide provides protection (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'beast_natural_armor',
  'Natural Armor',
  'ability',
  'passive',
  'beast',
  'Natural toughness reduces physical damage',
  'Hide like iron, claws like steel.',
  '🦴',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "physical_defense", "value": 7, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "physical_defense", "value": 15, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "physical_defense", "value": 25, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "critical_damage_taken", "value": -30, "target": "self", "rank": 3}
  ]'::jsonb,
  2,
  4,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 3. Predator's Instinct - Enhanced senses detect weaknesses (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'beast_predators_instinct',
  'Predator''s Instinct',
  'ability',
  'passive',
  'beast',
  'Hunter''s instinct to find weaknesses',
  'The hunter always finds its prey.',
  '👃',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "critical_chance", "value": 7, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "critical_chance", "value": 15, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "critical_chance", "value": 25, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "critical_damage", "value": 40, "target": "self", "rank": 3}
  ]'::jsonb,
  2,
  4,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 4. Savage Bite - Vicious attack causing bleeding (INSTANT ATTACK)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'beast_savage_bite',
  'Savage Bite',
  'ability',
  'offensive',
  'beast',
  'Tear into enemy with vicious bite',
  'Fangs that rend flesh and bone.',
  '🩸',
  3,
  'active',
  '[
    {"type": "damage", "value": 0, "damageType": "physical", "target": "single_enemy", "rank": 1},
    {"type": "status_effect", "statusEffect": "bleed", "value": 10, "duration": 3, "rank": 1},
    {"type": "damage", "value": 30, "damageType": "physical", "target": "single_enemy", "rank": 2},
    {"type": "status_effect", "statusEffect": "bleed", "value": 20, "duration": 4, "rank": 2},
    {"type": "damage", "value": 60, "damageType": "physical", "target": "single_enemy", "rank": 3},
    {"type": "status_effect", "statusEffect": "bleed", "value": 35, "duration": 6, "rank": 3},
    {"type": "stat_modifier", "stat": "healing_received", "value": -25, "duration": 2, "target": "enemy", "rank": 3}
  ]'::jsonb,
  1,
  15,
  2,
  4,
  5
)
ON CONFLICT (id) DO NOTHING;

-- 5. Pack Hunter - Fight better alongside allies (OFFENSIVE BUFF - Self)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'beast_pack_hunter',
  'Pack Hunter',
  'ability',
  'offensive',
  'beast',
  'Gain strength when allies are nearby',
  'The pack hunts as one.',
  '🏃',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "damage", "value": 15, "duration": 0, "condition": "ally_nearby", "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "damage", "value": 35, "duration": 2, "condition": "ally_nearby", "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "damage", "value": 60, "duration": 2, "condition": "ally_nearby", "target": "self", "rank": 3},
    {"type": "special", "specialType": "share_damage_as_healing", "value": 15, "to_nearby_ally": true, "rank": 3}
  ]'::jsonb,
  1,
  12,
  2,
  4,
  5
)
ON CONFLICT (id) DO NOTHING;

-- 6. Intimidating Roar - Terrify enemies (DEBUFF - All Enemies)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'beast_intimidating_roar',
  'Intimidating Roar',
  'ability',
  'debuff',
  'beast',
  'Terrifying roar weakens enemy resolve',
  'A roar that shakes the soul.',
  '😤',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "attack", "value": -12, "duration": 1, "target": "all_enemies", "rank": 1},
    {"type": "stat_modifier", "stat": "attack", "value": -25, "duration": 2, "target": "all_enemies", "rank": 2},
    {"type": "stat_modifier", "stat": "defense", "value": -25, "duration": 2, "target": "all_enemies", "rank": 2},
    {"type": "stat_modifier", "stat": "attack", "value": -40, "duration": 2, "target": "all_enemies", "rank": 3},
    {"type": "stat_modifier", "stat": "defense", "value": -40, "duration": 2, "target": "all_enemies", "rank": 3},
    {"type": "stat_modifier", "stat": "speed", "value": -40, "duration": 2, "target": "all_enemies", "rank": 3},
    {"type": "status_effect", "statusEffect": "fear", "chance": 30, "duration": 3, "rank": 3}
  ]'::jsonb,
  1,
  20,
  3,
  5,
  10
)
ON CONFLICT (id) DO NOTHING;

-- 7. Territorial Dominance - Gain strength when defending (CONDITIONAL PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'beast_territorial_dominance',
  'Territorial Dominance',
  'ability',
  'passive',
  'beast',
  'Fight harder when healthy and defending territory',
  'This is MY domain.',
  '🌲',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "all", "value": 10, "condition": "hp_above_70", "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "all", "value": 20, "condition": "hp_above_60", "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "all", "value": 35, "condition": "hp_above_50", "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "lifesteal", "value": 15, "condition": "hp_above_50", "target": "self", "rank": 3}
  ]'::jsonb,
  3,
  5,
  10
)
ON CONFLICT (id) DO NOTHING;
