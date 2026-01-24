-- Migration: Insert Sun Wukong Signature Powers
-- Purpose: Add 7 unique signature powers for Sun Wukong character
-- Character: Sun Wukong (Trickster, Deity) - Monkey King, shapeshifting, immortality, Ruyi Jingu Bang staff

-- ===== SUN WUKONG SIGNATURE POWERS (7 total) =====

-- 1. Monkey King (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'wukong_monkey_king',
  'Monkey King',
  'signature',
  'passive',
  'sun_wukong',
  'Legendary immortal with multiple lives',
  '"I have seven times seventy transformations and  immortality!"',
  '👑',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "all", "value": 15, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "evasion", "value": 10, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "all", "value": 35, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "evasion", "value": 25, "target": "self", "rank": 2},
    {"type": "death_save", "hp_percent": 1, "per_battle": 1, "rank": 2},
    {"type": "stat_modifier", "stat": "all", "value": 65, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "evasion", "value": 50, "target": "self", "rank": 3},
    {"type": "death_save", "hp_percent": 30, "per_battle": 1, "rank": 3},
    {"type": "immunity", "immunityType": "execute", "rank": 3}
  ]'::jsonb,
  5,
  6,
  1
);

-- 2. Ruyi Jingu Bang (INSTANT ATTACK)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'wukong_ruyi_jingu_bang',
  'Ruyi Jingu Bang',
  'signature',
  'offensive',
  'sun_wukong',
  'Legendary staff that extends to hit all',
  '"My staff obeys my will!"',
  '🏮',
  3,
  'active',
  '[
    {"type": "damage", "value": 45, "damageType": "physical", "target": "single_enemy", "rank": 1},
    {"type": "damage", "value": 100, "damageType": "physical", "target": "single_enemy", "rank": 2},
    {"type": "aoe_splash", "percentage": 50, "target": "all_other_enemies", "rank": 2},
    {"type": "damage", "value": 190, "damageType": "physical", "target": "single_enemy", "rank": 3},
    {"type": "damage", "value": 100, "damageType": "physical", "target": "all_other_enemies", "rank": 3},
    {"type": "status_effect", "statusEffect": "stun", "duration": 1, "target": "primary_target", "rank": 3}
  ]'::jsonb,
  1,
  20,
  5,
  6,
  1
);

-- 3. 72 Transformations (DEFENSIVE BUFF - Self)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'wukong_72_transformations',
  '72 Transformations',
  'signature',
  'defensive',
  'sun_wukong',
  'Shapeshifting mastery for evasion',
  '"I can become anything!"',
  '🐵',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "evasion", "value": 35, "duration": 2, "target": "self", "rank": 1},
    {"type": "special", "specialType": "avoid_next_attack", "rank": 1},
    {"type": "stat_modifier", "stat": "evasion", "value": 70, "duration": 2, "target": "self", "rank": 2},
    {"type": "special", "specialType": "avoid_next_attacks", "count": 2, "rank": 2},
    {"type": "copy_buff", "count": 1, "from": "random_enemy", "to": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "evasion", "value": 100, "duration": 2, "target": "self", "rank": 3},
    {"type": "special", "specialType": "untargetable", "duration": 1, "rank": 3},
    {"type": "copy_buff", "count": 99, "from": "all_enemies", "to": "self", "rank": 3},
    {"type": "purge", "purgeType": "debuff", "count": 1, "target": "self", "rank": 3}
  ]'::jsonb,
  2,
  22,
  5,
  6,
  1
);

-- 4. Cloud Somersault (TACTICAL)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'wukong_cloud_somersault',
  'Cloud Somersault',
  'signature',
  'offensive',
  'sun_wukong',
  'Lightning movement - attack and evade',
  '"I travel 108,000 li in a single leap!"',
  '☁️',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "speed", "value": 50, "duration": 0, "appliesTo": "this_turn", "rank": 1},
    {"type": "damage", "value": 35, "damageType": "physical", "target": "single_enemy", "rank": 1},
    {"type": "stat_modifier", "stat": "evasion", "value": 40, "duration": 1, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "speed", "value": 100, "duration": 0, "appliesTo": "this_turn", "rank": 2},
    {"type": "multi_hit", "hits": 2, "damage": 40, "damageType": "physical", "target": "single_enemy", "rank": 2},
    {"type": "stat_modifier", "stat": "evasion", "value": 70, "duration": 2, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "speed", "value": 200, "duration": 0, "appliesTo": "this_turn", "rank": 3},
    {"type": "multi_hit", "hits": 3, "damage": 55, "damageType": "physical", "target": "single_enemy", "rank": 3},
    {"type": "damage", "value": 60, "damageType": "physical", "target": "all_other_enemies", "rank": 3},
    {"type": "special", "specialType": "untargetable", "duration": 1, "rank": 3}
  ]'::jsonb,
  2,
  25,
  5,
  6,
  5
);

-- 5. Trickster's Gambit (DEBUFF - All Enemies)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'wukong_tricksters_gambit',
  'Trickster''s Gambit',
  'signature',
  'support',
  'sun_wukong',
  'Clever deception confuses all enemies',
  '"Fooled you!"',
  '🎭',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "accuracy", "value": -20, "duration": 2, "target": "all_enemies", "rank": 1},
    {"type": "stat_modifier", "stat": "accuracy", "value": -45, "duration": 2, "target": "all_enemies", "rank": 2},
    {"type": "status_effect", "statusEffect": "confusion", "duration": 1, "chance": 30, "target": "all_enemies", "rank": 2},
    {"type": "stat_modifier", "stat": "accuracy", "value": -80, "duration": 2, "target": "all_enemies", "rank": 3},
    {"type": "status_effect", "statusEffect": "confusion", "duration": 2, "chance": 70, "target": "all_enemies", "rank": 3},
    {"type": "steal_buff", "count": 1, "from": "all_enemies", "to": "self", "rank": 3}
  ]'::jsonb,
  2,
  30,
  5,
  6,
  5
);

-- 6. Clone Army (OFFENSIVE BUFF - Self)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'wukong_clone_army',
  'Clone Army',
  'signature',
  'offensive',
  'sun_wukong',
  'Summon duplicates - attacks hit multiple times',
  '"I am legion!"',
  '🐒',
  3,
  'active',
  '[
    {"type": "multi_hit", "hits": 2, "appliesTo": "next_attack", "rank": 1},
    {"type": "multi_hit", "hits": 3, "appliesTo": "next_attacks", "count": 2, "rank": 2},
    {"type": "stat_modifier", "stat": "damage", "value": 30, "appliesTo": "next_attacks", "count": 2, "rank": 2},
    {"type": "multi_hit", "hits": 4, "appliesTo": "all_attacks", "duration": 1, "rank": 3},
    {"type": "stat_modifier", "stat": "damage", "value": 70, "duration": 1, "target": "self", "rank": 3},
    {"type": "special", "specialType": "cannot_miss", "duration": 1, "rank": 3},
    {"type": "special", "specialType": "independent_crits", "duration": 1, "rank": 3}
  ]'::jsonb,
  3,
  35,
  5,
  6,
  10
);

-- 7. Havoc in Heaven (INSTANT ATTACK - AOE)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'wukong_havoc_in_heaven',
  'Havoc in Heaven',
  'signature',
  'offensive',
  'sun_wukong',
  'Divine rebellion - devastating assault on all',
  '"I fear neither Heaven nor Earth!"',
  '🌟',
  3,
  'active',
  '[
    {"type": "damage", "value": 80, "damageType": "physical", "target": "all_enemies", "rank": 1},
    {"type": "conditional", "condition": "enemy_species_is", "species": "deity", "effects": [
      {"type": "damage", "value": 50, "damageType": "physical", "target": "all_enemies"}
    ], "rank": 1},
    {"type": "damage", "value": 170, "damageType": "physical", "target": "all_enemies", "rank": 2},
    {"type": "conditional", "condition": "enemy_species_is", "species": "deity", "effects": [
      {"type": "damage", "value": 100, "damageType": "physical", "target": "all_enemies"}
    ], "rank": 2},
    {"type": "purge", "purgeType": "buff", "count": 99, "target": "all_enemies", "rank": 2},
    {"type": "damage", "value": 320, "damageType": "physical", "target": "all_enemies", "rank": 3},
    {"type": "conditional", "condition": "enemy_species_is", "species": "deity", "effects": [
      {"type": "damage", "value": 200, "damageType": "physical", "target": "all_enemies"}
    ], "rank": 3},
    {"type": "purge", "purgeType": "buff", "count": 99, "target": "all_enemies", "rank": 3},
    {"type": "steal_buff", "count": 99, "from": "all_enemies", "to": "self", "rank": 3},
    {"type": "status_effect", "statusEffect": "confusion", "duration": 2, "target": "all_enemies", "rank": 3}
  ]'::jsonb,
  4,
  50,
  5,
  6,
  10
);

COMMENT ON TABLE power_definitions IS 'Added Sun Wukong signature powers - legendary Monkey King deity trickster specialist';
