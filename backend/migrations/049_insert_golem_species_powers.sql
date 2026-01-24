-- Migration: Insert Golem Species Powers
-- Purpose: Add 7 species-tier powers for Golem species
-- Species: Golem - Construct, stone/earth, immense durability, slow but powerful

-- ===== GOLEM SPECIES POWERS (7 total) =====

-- 1. Stone Body - Incredible durability (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'golem_stone_body',
  'Stone Body',
  'species',
  'passive',
  'golem',
  'Body of living stone resists damage',
  'I am stone incarnate.',
  '🗿',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "max_hp", "value": 15, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "physical_defense", "value": 12, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "max_hp", "value": 30, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "physical_defense", "value": 25, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "max_hp", "value": 50, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "physical_defense", "value": 45, "target": "self", "rank": 3}
  ]'::jsonb,
  2,
  4,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 2. Immunity to Flesh Wounds - Construct nature (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'golem_immunity_to_flesh_wounds',
  'Immunity to Flesh Wounds',
  'species',
  'passive',
  'golem',
  'No blood, no organs, no weakness',
  'I have no flesh to wound.',
  '🛡️',
  3,
  'passive',
  '[
    {"type": "immunity", "immunityType": "bleed", "rank": 1},
    {"type": "immunity", "immunityType": "poison", "rank": 1},
    {"type": "immunity", "immunityType": "bleed", "rank": 2},
    {"type": "immunity", "immunityType": "poison", "rank": 2},
    {"type": "immunity", "immunityType": "disease", "rank": 2},
    {"type": "immunity", "immunityType": "bleed", "rank": 3},
    {"type": "immunity", "immunityType": "poison", "rank": 3},
    {"type": "immunity", "immunityType": "disease", "rank": 3},
    {"type": "immunity", "immunityType": "critical_hits", "rank": 3}
  ]'::jsonb,
  2,
  4,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 3. Crushing Blow - Devastating strike (INSTANT ATTACK)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'golem_crushing_blow',
  'Crushing Blow',
  'species',
  'offensive',
  'golem',
  'Massive strike with overwhelming force',
  'Feel the weight of stone.',
  '👊',
  3,
  'active',
  '[
    {"type": "damage", "value": 40, "damageType": "physical", "target": "single_enemy", "rank": 1},
    {"type": "special", "specialType": "ignore_armor", "value": 20, "rank": 1},
    {"type": "damage", "value": 90, "damageType": "physical", "target": "single_enemy", "rank": 2},
    {"type": "special", "specialType": "ignore_armor", "value": 40, "rank": 2},
    {"type": "status_effect", "statusEffect": "stun", "chance": 25, "duration": 3, "rank": 2},
    {"type": "damage", "value": 160, "damageType": "physical", "target": "single_enemy", "rank": 3},
    {"type": "special", "specialType": "ignore_armor", "value": 60, "rank": 3},
    {"type": "status_effect", "statusEffect": "stun", "chance": 50, "duration": 6, "rank": 3}
  ]'::jsonb,
  1,
  25,
  2,
  4,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 4. Slow but Steady - Methodical advance (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'golem_slow_but_steady',
  'Slow but Steady',
  'species',
  'passive',
  'golem',
  'Cannot be rushed, cannot be stopped',
  'I move with purpose.',
  '🐢',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "speed", "value": -10, "target": "self", "rank": 1},
    {"type": "immunity", "immunityType": "slow", "rank": 1},
    {"type": "stat_modifier", "stat": "damage", "value": 12, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "speed", "value": -10, "target": "self", "rank": 2},
    {"type": "immunity", "immunityType": "slow", "rank": 2},
    {"type": "stat_modifier", "stat": "damage", "value": 25, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "speed", "value": -10, "target": "self", "rank": 3},
    {"type": "immunity", "immunityType": "slow", "rank": 3},
    {"type": "immunity", "immunityType": "stun", "rank": 3},
    {"type": "stat_modifier", "stat": "damage", "value": 45, "target": "self", "rank": 3}
  ]'::jsonb,
  2,
  4,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 5. Earthen Regeneration - Repair from earth (HEAL - Self)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'golem_earthen_regeneration',
  'Earthen Regeneration',
  'species',
  'heal',
  'golem',
  'Draw power from earth to repair',
  'The earth sustains me.',
  '🌍',
  3,
  'active',
  '[
    {"type": "heal", "value": 20, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "defense", "value": 15, "duration": 2, "target": "self", "rank": 1},
    {"type": "heal", "value": 40, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "defense", "value": 30, "duration": 2, "target": "self", "rank": 2},
    {"type": "purge", "purgeType": "debuff", "count": 1, "target": "self", "rank": 2},
    {"type": "heal", "value": 65, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "defense", "value": 50, "duration": 2, "target": "self", "rank": 3},
    {"type": "purge", "purgeType": "debuff", "count": 99, "target": "self", "rank": 3}
  ]'::jsonb,
  1,
  20,
  2,
  4,
  5
)
ON CONFLICT (id) DO NOTHING;

-- 6. Immovable Object - Cannot be moved (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'golem_immovable_object',
  'Immovable Object',
  'species',
  'passive',
  'golem',
  'Rooted like a mountain',
  'I cannot be moved.',
  '⛰️',
  3,
  'passive',
  '[
    {"type": "immunity", "immunityType": "knockback", "rank": 1},
    {"type": "stat_modifier", "stat": "damage_taken", "value": -5, "target": "self", "rank": 1},
    {"type": "immunity", "immunityType": "knockback", "rank": 2},
    {"type": "immunity", "immunityType": "forced_movement", "rank": 2},
    {"type": "stat_modifier", "stat": "damage_taken", "value": -10, "target": "self", "rank": 2},
    {"type": "immunity", "immunityType": "knockback", "rank": 3},
    {"type": "immunity", "immunityType": "forced_movement", "rank": 3},
    {"type": "stat_modifier", "stat": "damage_taken", "value": -18, "target": "self", "rank": 3},
    {"type": "special", "specialType": "reflect_knockback", "value": 40, "rank": 3}
  ]'::jsonb,
  2,
  4,
  5
)
ON CONFLICT (id) DO NOTHING;

-- 7. Titanic Strength - Overwhelming power (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'golem_titanic_strength',
  'Titanic Strength',
  'species',
  'passive',
  'golem',
  'Strength beyond mortal limits',
  'My strength is limitless.',
  '💪',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "physical_attack", "value": 12, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "physical_attack", "value": 25, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "critical_damage", "value": 30, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "physical_attack", "value": 45, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "critical_damage", "value": 60, "target": "self", "rank": 3}
  ]'::jsonb,
  3,
  5,
  10
)
ON CONFLICT (id) DO NOTHING;
