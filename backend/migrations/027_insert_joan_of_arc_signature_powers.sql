-- Migration: Insert Joan of Arc Signature Powers
-- Purpose: Add 7 unique signature powers for Joan of Arc character
-- Character: Joan of Arc (Leader, Human) - Divine warrior, holy inspiration, martyr, battlefield commander

-- ===== JOAN OF ARC SIGNATURE POWERS (7 total) =====

-- 1. Divine Strike (INSTANT ATTACK)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'joan_divine_strike',
  'Divine Strike',
  'signature',
  'offensive',
  'joan',
  'Holy blessed attack - devastating against undead',
  '"By God''s will, I strike you down!"',
  '⚔️',
  3,
  'active',
  '[
    {"type": "damage", "value": 35, "damageType": "holy", "target": "single_enemy", "rank": 1},
    {"type": "conditional", "condition": "enemy_type_is", "types": ["undead", "demon"], "effects": [
      {"type": "damage", "value": 80, "damageType": "holy", "target": "single_enemy"}
    ], "rank": 1},
    {"type": "damage", "value": 80, "damageType": "holy", "target": "single_enemy", "rank": 2},
    {"type": "conditional", "condition": "enemy_type_is", "types": ["undead", "demon"], "effects": [
      {"type": "damage", "value": 150, "damageType": "holy", "target": "single_enemy"}
    ], "rank": 2},
    {"type": "purge", "purgeType": "buff", "count": 1, "target": "single_enemy", "rank": 2},
    {"type": "damage", "value": 155, "damageType": "holy", "target": "single_enemy", "rank": 3},
    {"type": "conditional", "condition": "enemy_type_is", "types": ["undead", "demon"], "effects": [
      {"type": "damage", "value": 250, "damageType": "holy", "target": "single_enemy"}
    ], "rank": 3},
    {"type": "purge", "purgeType": "buff", "count": 99, "target": "single_enemy", "rank": 3},
    {"type": "special", "specialType": "cannot_be_blocked", "rank": 3}
  ]'::jsonb,
  1,
  18,
  5,
  6,
  1
);

-- 2. Faith Unbroken (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'joan_faith_unbroken',
  'Faith Unbroken',
  'signature',
  'passive',
  'joan',
  'Divine protection and unwavering faith',
  '"My faith is my shield."',
  '✝️',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "defense", "value": 15, "target": "self", "rank": 1},
    {"type": "immunity", "immunityType": "fear", "rank": 1},
    {"type": "stat_modifier", "stat": "defense", "value": 35, "target": "self", "rank": 2},
    {"type": "immunity", "immunityType": "fear", "rank": 2},
    {"type": "immunity", "immunityType": "charm", "rank": 2},
    {"type": "stat_modifier", "stat": "damage", "value": 20, "damageType": "holy", "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "defense", "value": 60, "target": "self", "rank": 3},
    {"type": "immunity", "immunityType": "fear", "rank": 3},
    {"type": "immunity", "immunityType": "charm", "rank": 3},
    {"type": "immunity", "immunityType": "confusion", "rank": 3},
    {"type": "stat_modifier", "stat": "damage", "value": 45, "damageType": "holy", "target": "self", "rank": 3},
    {"type": "regen", "value": 5, "target": "self", "rank": 3}
  ]'::jsonb,
  5,
  6,
  1
);

-- 3. Banner of Orleans (GROUP BUFF)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'joan_banner_of_orleans',
  'Banner of Orleans',
  'signature',
  'support',
  'joan',
  'Rallying standard that inspires all allies',
  '"Follow me! God is with us!"',
  '🛡️',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "defense", "value": 18, "duration": 1, "target": "all_allies", "rank": 1},
    {"type": "stat_modifier", "stat": "morale", "value": 15, "duration": 1, "target": "all_allies", "rank": 1},
    {"type": "stat_modifier", "stat": "defense", "value": 40, "duration": 2, "target": "all_allies", "rank": 2},
    {"type": "stat_modifier", "stat": "morale", "value": 35, "duration": 2, "target": "all_allies", "rank": 2},
    {"type": "purge", "purgeType": "debuff", "count": 1, "target": "all_allies", "rank": 2},
    {"type": "stat_modifier", "stat": "defense", "value": 75, "duration": 1, "target": "all_allies", "rank": 3},
    {"type": "stat_modifier", "stat": "morale", "value": 65, "duration": 1, "target": "all_allies", "rank": 3},
    {"type": "purge", "purgeType": "debuff", "count": 99, "target": "all_allies", "rank": 3},
    {"type": "shield", "value": 25, "target": "all_allies", "rank": 3}
  ]'::jsonb,
  1,
  20,
  5,
  6,
  1
);

-- 4. Martyr's Resolve (DEFENSIVE BUFF - Team)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'joan_martyrs_resolve',
  'Martyr''s Resolve',
  'signature',
  'defensive',
  'joan',
  'Sacrifice for others - take damage meant for allies',
  '"I will bear your suffering."',
  '🕊️',
  3,
  'active',
  '[
    {"type": "damage_redirect", "percentage": 20, "duration": 1, "from": "all_allies", "to": "self", "rank": 1},
    {"type": "damage_redirect", "percentage": 40, "duration": 2, "from": "all_allies", "to": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "defense", "value": 30, "duration": 2, "target": "self", "rank": 2},
    {"type": "damage_redirect", "percentage": 70, "duration": 1, "from": "all_allies", "to": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "defense", "value": 70, "duration": 1, "target": "self", "rank": 3},
    {"type": "reflect", "value": 30, "duration": 1, "target": "self", "rank": 3},
    {"type": "regen", "value": 10, "duration": 1, "target": "all_allies", "rank": 3}
  ]'::jsonb,
  2,
  25,
  5,
  6,
  5
);

-- 5. Trial by Fire (INSTANT ATTACK - AOE)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'joan_trial_by_fire',
  'Trial by Fire',
  'signature',
  'offensive',
  'joan',
  'Purifying flames that cleanse and burn',
  '"Let holy fire purge the wicked!"',
  '🔥',
  3,
  'active',
  '[
    {"type": "damage", "value": 45, "damageType": "holy", "target": "all_enemies", "rank": 1},
    {"type": "purge", "purgeType": "buff", "count": 1, "target": "all_enemies", "rank": 1},
    {"type": "damage", "value": 95, "damageType": "holy", "target": "all_enemies", "rank": 2},
    {"type": "purge", "purgeType": "buff", "count": 2, "target": "all_enemies", "rank": 2},
    {"type": "status_effect", "statusEffect": "burn", "duration": 2, "chance": 30, "rank": 2},
    {"type": "damage", "value": 175, "damageType": "holy", "target": "all_enemies", "rank": 3},
    {"type": "purge", "purgeType": "buff", "count": 99, "target": "all_enemies", "rank": 3},
    {"type": "status_effect", "statusEffect": "burn", "duration": 2, "chance": 70, "rank": 3},
    {"type": "stat_modifier", "stat": "healing_received", "value": -100, "duration": 2, "target": "all_enemies", "rank": 3}
  ]'::jsonb,
  2,
  30,
  5,
  6,
  5
);

-- 6. Miracle of God (GROUP HEAL)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'joan_miracle_of_god',
  'Miracle of God',
  'signature',
  'support',
  'joan',
  'Divine intervention - massive healing and resurrection',
  '"Through God''s grace, we are saved!"',
  '🙏',
  3,
  'active',
  '[
    {"type": "heal", "value": 25, "target": "all_allies", "rank": 1},
    {"type": "purge", "purgeType": "debuff", "count": 1, "target": "all_allies", "rank": 1},
    {"type": "heal", "value": 55, "target": "all_allies", "rank": 2},
    {"type": "purge", "purgeType": "debuff", "count": 2, "target": "all_allies", "rank": 2},
    {"type": "stat_modifier", "stat": "all", "value": 30, "duration": 2, "target": "all_allies", "rank": 2},
    {"type": "heal", "value": 90, "target": "all_allies", "rank": 3},
    {"type": "purge", "purgeType": "debuff", "count": 99, "target": "all_allies", "rank": 3},
    {"type": "stat_modifier", "stat": "all", "value": 65, "duration": 1, "target": "all_allies", "rank": 3},
    {"type": "revive", "hp_percent": 40, "target": "fallen_ally", "rank": 3}
  ]'::jsonb,
  3,
  40,
  5,
  6,
  10
);

-- 7. Saint's Ascension (OFFENSIVE BUFF - Self)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'joan_saints_ascension',
  'Saint''s Ascension',
  'signature',
  'offensive',
  'joan',
  'Blessed transformation - become a holy warrior',
  '"I am God''s sword made flesh!"',
  '👼',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "all", "value": 35, "duration": 1, "target": "self", "rank": 1},
    {"type": "damage_type_conversion", "to": "holy", "duration": 1, "rank": 1},
    {"type": "stat_modifier", "stat": "all", "value": 75, "duration": 2, "target": "self", "rank": 2},
    {"type": "damage_type_conversion", "to": "holy", "duration": 2, "rank": 2},
    {"type": "special", "specialType": "can_fly", "duration": 2, "rank": 2},
    {"type": "immunity", "immunityType": "dark", "duration": 2, "rank": 2},
    {"type": "stat_modifier", "stat": "all", "value": 140, "duration": 1, "target": "self", "rank": 3},
    {"type": "damage_type_conversion", "to": "holy", "duration": 1, "rank": 3},
    {"type": "special", "specialType": "can_fly", "duration": 1, "rank": 3},
    {"type": "damage_immunity", "duration": 1, "target": "self", "rank": 3},
    {"type": "lifesteal", "value": 40, "duration": 1, "appliesTo": "all_attacks", "healAllies": true, "rank": 3},
    {"type": "purge", "purgeType": "buff", "count": 99, "target": "all_enemies", "rank": 3}
  ]'::jsonb,
  4,
  45,
  5,
  6,
  10
);

COMMENT ON TABLE power_definitions IS 'Added Joan of Arc signature powers - holy warrior leader specialist';
