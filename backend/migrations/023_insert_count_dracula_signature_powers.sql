-- Migration: Insert Count Dracula Signature Powers
-- Purpose: Add 7 unique signature powers for Count Dracula character
-- Character: Count Dracula (Mystic, Vampire) - Blood magic, transformation, lifesteal

-- ===== COUNT DRACULA SIGNATURE POWERS (7 total) =====

-- 1. Blood Feast (INSTANT ATTACK)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'dracula_blood_feast',
  'Blood Feast',
  'signature',
  'offensive',
  'dracula',
  'Drain life from enemy to heal yourself',
  '"Your blood is mine."',
  '🩸',
  3,
  'active',
  '[
    {"type": "damage", "value": 25, "damageType": "dark", "target": "single_enemy", "rank": 1},
    {"type": "lifesteal", "value": 100, "rank": 1},
    {"type": "damage", "value": 60, "damageType": "dark", "target": "single_enemy", "rank": 2},
    {"type": "lifesteal", "value": 150, "rank": 2},
    {"type": "damage", "value": 110, "damageType": "dark", "target": "single_enemy", "rank": 3},
    {"type": "lifesteal", "value": 200, "rank": 3},
    {"type": "max_hp_steal", "value": 5, "target": "single_enemy", "rank": 3}
  ]'::jsonb,
  1,
  18,
  5,
  6,
  1
);

-- 2. Bat Form (DEFENSIVE BUFF - Self)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'dracula_bat_form',
  'Bat Form',
  'signature',
  'defensive',
  'dracula',
  'Transform into swarm of bats',
  '"I become the night."',
  '🦇',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "evasion", "value": 30, "duration": 1, "target": "self", "rank": 1},
    {"type": "special", "specialType": "can_fly", "duration": 1, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "evasion", "value": 60, "duration": 2, "target": "self", "rank": 2},
    {"type": "special", "specialType": "can_fly", "duration": 2, "target": "self", "rank": 2},
    {"type": "special", "specialType": "immune_to_melee", "duration": 2, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "evasion", "value": 90, "duration": 1, "target": "self", "rank": 3},
    {"type": "special", "specialType": "can_fly", "duration": 1, "target": "self", "rank": 3},
    {"type": "special", "specialType": "untargetable", "duration": 1, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "speed", "value": 40, "duration": 1, "target": "self", "rank": 3}
  ]'::jsonb,
  1,
  20,
  5,
  6,
  1
);

-- 3. Lord of the Night (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'dracula_lord_of_the_night',
  'Lord of the Night',
  'signature',
  'passive',
  'dracula',
  'Master vampire with constant lifesteal and healing',
  '"I have walked this earth for centuries."',
  '🌙',
  3,
  'passive',
  '[
    {"type": "lifesteal", "value": 15, "appliesTo": "all_attacks", "rank": 1},
    {"type": "stat_modifier", "stat": "max_hp", "value": 10, "target": "self", "rank": 1},
    {"type": "lifesteal", "value": 30, "appliesTo": "all_attacks", "rank": 2},
    {"type": "stat_modifier", "stat": "max_hp", "value": 20, "target": "self", "rank": 2},
    {"type": "immunity", "immunityType": "holy", "rank": 2},
    {"type": "lifesteal", "value": 50, "appliesTo": "all_attacks", "rank": 3},
    {"type": "stat_modifier", "stat": "max_hp", "value": 35, "target": "self", "rank": 3},
    {"type": "immunity", "immunityType": "holy", "rank": 3},
    {"type": "immunity", "immunityType": "dark", "rank": 3},
    {"type": "regen", "value": 5, "target": "self", "rank": 3}
  ]'::jsonb,
  5,
  6,
  1
);

-- 4. Hypnotic Gaze (DEBUFF - Single Target)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'dracula_hypnotic_gaze',
  'Hypnotic Gaze',
  'signature',
  'support',
  'dracula',
  'Mesmerize foes with your eyes',
  '"Look into my eyes..."',
  '😵',
  3,
  'active',
  '[
    {"type": "status_effect", "statusEffect": "charm", "duration": 1, "chance": 30, "rank": 1},
    {"type": "status_effect", "statusEffect": "charm", "duration": 2, "chance": 55, "rank": 2},
    {"type": "stat_modifier", "stat": "accuracy", "value": -25, "duration": 2, "target": "single_enemy", "failsafe": true, "rank": 2},
    {"type": "status_effect", "statusEffect": "charm", "duration": 1, "chance": 85, "rank": 3},
    {"type": "status_effect", "statusEffect": "confusion", "duration": 2, "failsafe": true, "rank": 3}
  ]'::jsonb,
  2,
  22,
  5,
  6,
  5
);

-- 5. Vampiric Regeneration (INSTANT HEAL)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'dracula_vampiric_regeneration',
  'Vampiric Regeneration',
  'signature',
  'defensive',
  'dracula',
  'Immortal healing powers',
  '"I cannot die."',
  '🧛',
  3,
  'active',
  '[
    {"type": "heal", "value": 25, "target": "self", "rank": 1},
    {"type": "heal", "value": 50, "target": "self", "rank": 2},
    {"type": "purge", "purgeType": "debuff", "count": 2, "target": "self", "rank": 2},
    {"type": "heal", "value": 80, "target": "self", "rank": 3},
    {"type": "purge", "purgeType": "debuff", "count": 99, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "max_hp", "value": 40, "duration": 2, "target": "self", "rank": 3}
  ]'::jsonb,
  2,
  25,
  5,
  6,
  5
);

-- 6. Blood Curse (DEBUFF - All Enemies)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'dracula_blood_curse',
  'Blood Curse',
  'signature',
  'offensive',
  'dracula',
  'Necromantic hex that drains all enemies',
  '"Your blood betrays you."',
  '💀',
  3,
  'active',
  '[
    {"type": "damage_over_time", "value": 15, "duration": 1, "damageType": "dark", "target": "all_enemies", "rank": 1},
    {"type": "stat_modifier", "stat": "healing_received", "value": -30, "duration": 1, "target": "all_enemies", "rank": 1},
    {"type": "damage_over_time", "value": 30, "duration": 2, "damageType": "dark", "target": "all_enemies", "rank": 2},
    {"type": "stat_modifier", "stat": "healing_received", "value": -60, "duration": 2, "target": "all_enemies", "rank": 2},
    {"type": "stat_modifier", "stat": "all", "value": -20, "duration": 2, "target": "all_enemies", "rank": 2},
    {"type": "damage_over_time", "value": 50, "duration": 1, "damageType": "dark", "target": "all_enemies", "rank": 3},
    {"type": "stat_modifier", "stat": "healing_received", "value": -100, "duration": 1, "target": "all_enemies", "rank": 3},
    {"type": "stat_modifier", "stat": "all", "value": -40, "duration": 1, "target": "all_enemies", "rank": 3},
    {"type": "lifesteal", "value": 100, "appliesTo": "curse_damage", "rank": 3}
  ]'::jsonb,
  3,
  40,
  5,
  6,
  10
);

-- 7. Prince of Darkness (OFFENSIVE BUFF - Self)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'dracula_prince_of_darkness',
  'Prince of Darkness',
  'signature',
  'offensive',
  'dracula',
  'Ultimate vampire transformation',
  '"Behold my true power!"',
  '🧛‍♂️',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "all", "value": 30, "duration": 1, "target": "self", "rank": 1},
    {"type": "lifesteal", "value": 20, "duration": 1, "appliesTo": "all_attacks", "rank": 1},
    {"type": "stat_modifier", "stat": "all", "value": 65, "duration": 2, "target": "self", "rank": 2},
    {"type": "lifesteal", "value": 40, "duration": 2, "appliesTo": "all_attacks", "rank": 2},
    {"type": "special", "specialType": "can_fly", "duration": 2, "target": "self", "rank": 2},
    {"type": "immunity", "immunityType": "cc", "duration": 2, "rank": 2},
    {"type": "stat_modifier", "stat": "all", "value": 120, "duration": 1, "target": "self", "rank": 3},
    {"type": "lifesteal", "value": 80, "duration": 1, "appliesTo": "all_attacks", "rank": 3},
    {"type": "special", "specialType": "can_fly", "duration": 1, "target": "self", "rank": 3},
    {"type": "damage_immunity", "duration": 1, "target": "self", "rank": 3},
    {"type": "special", "specialType": "attacks_hit_all", "duration": 1, "target": "self", "rank": 3},
    {"type": "max_hp_steal", "value": 10, "target": "all_enemies", "rank": 3}
  ]'::jsonb,
  5,
  50,
  5,
  6,
  10
);

COMMENT ON TABLE power_definitions IS 'Added Count Dracula signature powers - vampire lord specialist';
