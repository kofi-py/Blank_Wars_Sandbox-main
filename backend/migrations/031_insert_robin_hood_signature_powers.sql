-- Migration: Insert Robin Hood Signature Powers
-- Purpose: Add 7 unique signature powers for Robin Hood character
-- Character: Robin Hood (Trickster, Human) - Master archer, steal from rich, help the poor, Sherwood Forest

-- ===== ROBIN HOOD SIGNATURE POWERS (7 total) =====

-- 1. Master Archer (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'robin_master_archer',
  'Master Archer',
  'signature',
  'passive',
  'robin_hood',
  'Unmatched bow skill and precision',
  '"I never miss my mark."',
  '🏹',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "accuracy", "value": 15, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "damage", "value": 10, "damageType": "ranged", "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "accuracy", "value": 35, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "damage", "value": 25, "damageType": "ranged", "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "critical_chance", "value": 15, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "accuracy", "value": 65, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "damage", "value": 50, "damageType": "ranged", "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "critical_chance", "value": 35, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "defense", "value": -30, "ignorePercent": true, "appliesTo": "ranged_attacks", "rank": 3}
  ]'::jsonb,
  5,
  6,
  1
);

-- 2. Precision Shot (INSTANT ATTACK)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'robin_precision_shot',
  'Precision Shot',
  'signature',
  'offensive',
  'robin_hood',
  'Perfect aim that never misses',
  '"Bullseye, every time."',
  '🎯',
  3,
  'active',
  '[
    {"type": "damage", "value": 40, "damageType": "physical", "target": "single_enemy", "rank": 1},
    {"type": "special", "specialType": "cannot_miss", "rank": 1},
    {"type": "damage", "value": 90, "damageType": "physical", "target": "single_enemy", "rank": 2},
    {"type": "special", "specialType": "cannot_miss", "rank": 2},
    {"type": "stat_modifier", "stat": "critical_chance", "value": 50, "duration": 0, "appliesTo": "this_attack", "rank": 2},
    {"type": "damage", "value": 170, "damageType": "physical", "target": "single_enemy", "rank": 3},
    {"type": "special", "specialType": "cannot_miss", "rank": 3},
    {"type": "special", "specialType": "force_critical", "rank": 3},
    {"type": "stat_modifier", "stat": "defense", "value": -50, "ignorePercent": true, "rank": 3}
  ]'::jsonb,
  1,
  18,
  5,
  6,
  1
);

-- 3. Steal from the Rich (TACTICAL)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'robin_steal_from_rich',
  'Steal from the Rich',
  'signature',
  'support',
  'robin_hood',
  'Rob enemy resources and redistribute to allies',
  '"From the rich to the poor!"',
  '💰',
  3,
  'active',
  '[
    {"type": "steal_buff", "count": 1, "from": "single_enemy", "to": "random_ally", "rank": 1},
    {"type": "steal_buff", "count": 2, "from": "single_enemy", "to": "random_ally", "rank": 2},
    {"type": "stat_modifier", "stat": "energy", "value": -20, "target": "single_enemy", "rank": 2},
    {"type": "steal_buff", "count": 99, "from": "single_enemy", "to": "all_allies", "rank": 3},
    {"type": "stat_modifier", "stat": "energy", "value": -50, "target": "single_enemy", "rank": 3},
    {"type": "max_hp_steal", "value": 10, "duration": 99, "target": "single_enemy", "rank": 3}
  ]'::jsonb,
  2,
  22,
  5,
  6,
  5
);

-- 4. Forest Ambush (INSTANT ATTACK)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'robin_forest_ambush',
  'Forest Ambush',
  'signature',
  'offensive',
  'robin_hood',
  'Attack from hiding with massive evasion boost',
  '"You never saw me coming."',
  '🌳',
  3,
  'active',
  '[
    {"type": "damage", "value": 50, "damageType": "physical", "target": "single_enemy", "rank": 1},
    {"type": "stat_modifier", "stat": "evasion", "value": 30, "duration": 1, "target": "self", "rank": 1},
    {"type": "damage", "value": 110, "damageType": "physical", "target": "single_enemy", "rank": 2},
    {"type": "stat_modifier", "stat": "evasion", "value": 60, "duration": 2, "target": "self", "rank": 2},
    {"type": "special", "specialType": "untargetable", "duration": 1, "appliesTo": "next_enemy_attack", "rank": 2},
    {"type": "damage", "value": 200, "damageType": "physical", "target": "single_enemy", "rank": 3},
    {"type": "stat_modifier", "stat": "evasion", "value": 90, "duration": 2, "target": "self", "rank": 3},
    {"type": "special", "specialType": "untargetable", "duration": 1, "rank": 3},
    {"type": "stat_modifier", "stat": "damage", "value": 80, "duration": 1, "appliesTo": "next_attack", "target": "self", "rank": 3}
  ]'::jsonb,
  2,
  25,
  5,
  6,
  5
);

-- 5. Merry Men (GROUP BUFF)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'robin_merry_men',
  'Merry Men',
  'signature',
  'support',
  'robin_hood',
  'Call for aid from your band of outlaws',
  '"To me, my merry men!"',
  '🎪',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "damage", "value": 18, "duration": 2, "target": "all_allies", "rank": 1},
    {"type": "stat_modifier", "stat": "speed", "value": 15, "duration": 2, "target": "all_allies", "rank": 1},
    {"type": "stat_modifier", "stat": "damage", "value": 40, "duration": 2, "target": "all_allies", "rank": 2},
    {"type": "stat_modifier", "stat": "speed", "value": 35, "duration": 2, "target": "all_allies", "rank": 2},
    {"type": "stat_modifier", "stat": "evasion", "value": 25, "duration": 2, "target": "all_allies", "rank": 2},
    {"type": "stat_modifier", "stat": "damage", "value": 75, "duration": 2, "target": "all_allies", "rank": 3},
    {"type": "stat_modifier", "stat": "speed", "value": 65, "duration": 2, "target": "all_allies", "rank": 3},
    {"type": "stat_modifier", "stat": "evasion", "value": 50, "duration": 2, "target": "all_allies", "rank": 3},
    {"type": "turn_priority", "value": 999, "duration": 0, "appliesTo": "this_turn", "target": "all_allies", "rank": 3}
  ]'::jsonb,
  2,
  30,
  5,
  6,
  5
);

-- 6. Arrow Volley (INSTANT ATTACK)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'robin_arrow_volley',
  'Arrow Volley',
  'signature',
  'offensive',
  'robin_hood',
  'Rapid fire multiple arrows',
  '"A storm of arrows!"',
  '🏹🏹🏹',
  3,
  'active',
  '[
    {"type": "multi_hit", "hits": 3, "damage": 30, "damageType": "physical", "target": "single_enemy", "rank": 1},
    {"type": "multi_hit", "hits": 4, "damage": 60, "damageType": "physical", "target": "single_enemy", "rank": 2},
    {"type": "multi_hit", "hits": 5, "damage": 100, "damageType": "physical", "target": "single_enemy", "rank": 3},
    {"type": "apply_on_hit", "statusEffect": "bleed", "chance": 40, "rank": 3}
  ]'::jsonb,
  3,
  35,
  5,
  6,
  10
);

-- 7. Shot Through the Crown (INSTANT ATTACK)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'robin_shot_through_crown',
  'Shot Through the Crown',
  'signature',
  'offensive',
  'robin_hood',
  'Legendary headshot - especially deadly against leaders',
  '"One perfect shot, and the tyrant falls."',
  '🎯👑',
  3,
  'active',
  '[
    {"type": "damage", "value": 120, "damageType": "physical", "target": "single_enemy", "rank": 1},
    {"type": "conditional", "condition": "enemy_archetype_is", "archetype": "leader", "effects": [
      {"type": "damage", "value": 100, "damageType": "physical", "target": "single_enemy"}
    ], "rank": 1},
    {"type": "damage", "value": 260, "damageType": "physical", "target": "single_enemy", "rank": 2},
    {"type": "conditional", "condition": "enemy_has_buffs", "effects": [
      {"type": "damage", "value": 150, "damageType": "physical", "target": "single_enemy"},
      {"type": "purge", "purgeType": "buff", "count": 99, "target": "single_enemy"}
    ], "rank": 2},
    {"type": "damage", "value": 480, "damageType": "physical", "target": "single_enemy", "rank": 3},
    {"type": "conditional", "condition": "target_hp_above", "threshold": 60, "effects": [
      {"type": "execute", "threshold": 20}
    ], "rank": 3},
    {"type": "special", "specialType": "force_critical", "rank": 3},
    {"type": "purge", "purgeType": "buff", "count": 99, "target": "single_enemy", "rank": 3},
    {"type": "status_effect", "statusEffect": "grievous_wound", "duration": 2, "rank": 3}
  ]'::jsonb,
  4,
  50,
  5,
  6,
  10
);

COMMENT ON TABLE power_definitions IS 'Added Robin Hood signature powers - master archer outlaw specialist';
