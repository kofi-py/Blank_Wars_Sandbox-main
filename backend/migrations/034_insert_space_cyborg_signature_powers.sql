-- Migration: Insert Space Cyborg Signature Powers
-- Purpose: Add 7 unique signature powers for Space Cyborg character
-- Character: Space Cyborg (Tank, Cyborg) - Cybernetic enhancements, space technology, mechanical durability

-- ===== SPACE CYBORG SIGNATURE POWERS (7 total) =====

-- 1. Cybernetic Body (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'cyborg_cybernetic_body',
  'Cybernetic Body',
  'signature',
  'passive',
  'space_cyborg',
  'Mechanical enhancements provide durability',
  '"Flesh is weak. Metal is eternal."',
  '🤖',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "max_hp", "value": 20, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "defense", "value": 15, "target": "self", "rank": 1},
    {"type": "immunity", "immunityType": "poison", "rank": 1},
    {"type": "immunity", "immunityType": "disease", "rank": 1},
    {"type": "stat_modifier", "stat": "max_hp", "value": 40, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "defense", "value": 35, "target": "self", "rank": 2},
    {"type": "immunity", "immunityType": "poison", "rank": 2},
    {"type": "immunity", "immunityType": "disease", "rank": 2},
    {"type": "immunity", "immunityType": "bleed", "rank": 2},
    {"type": "stat_modifier", "stat": "max_hp", "value": 70, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "defense", "value": 65, "target": "self", "rank": 3},
    {"type": "immunity", "immunityType": "poison", "rank": 3},
    {"type": "immunity", "immunityType": "disease", "rank": 3},
    {"type": "immunity", "immunityType": "bleed", "rank": 3},
    {"type": "immunity", "immunityType": "burn", "rank": 3},
    {"type": "regen", "value": 5, "target": "self", "rank": 3}
  ]'::jsonb,
  5,
  6,
  1
);

-- 2. Rocket Fist (INSTANT ATTACK)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'cyborg_rocket_fist',
  'Rocket Fist',
  'signature',
  'offensive',
  'space_cyborg',
  'Explosive punch that ignores defense',
  '"Rocket... PUNCH!"',
  '🚀',
  3,
  'active',
  '[
    {"type": "damage", "value": 45, "damageType": "physical", "target": "single_enemy", "rank": 1},
    {"type": "stat_modifier", "stat": "defense", "value": -20, "ignorePercent": true, "rank": 1},
    {"type": "damage", "value": 100, "damageType": "physical", "target": "single_enemy", "rank": 2},
    {"type": "stat_modifier", "stat": "defense", "value": -50, "ignorePercent": true, "rank": 2},
    {"type": "turn_priority", "value": -50, "duration": 1, "target": "single_enemy", "rank": 2},
    {"type": "damage", "value": 190, "damageType": "physical", "target": "single_enemy", "rank": 3},
    {"type": "stat_modifier", "stat": "defense", "value": -80, "ignorePercent": true, "rank": 3},
    {"type": "turn_priority", "value": -100, "duration": 1, "target": "single_enemy", "rank": 3},
    {"type": "aoe_splash", "percentage": 30, "target": "adjacent_enemies", "rank": 3}
  ]'::jsonb,
  1,
  20,
  5,
  6,
  1
);

-- 3. Reactive Armor (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'cyborg_reactive_armor',
  'Reactive Armor',
  'signature',
  'passive',
  'space_cyborg',
  'Defensive plating that reflects damage',
  '"My armor adapts to all threats."',
  '🛡️',
  3,
  'passive',
  '[
    {"type": "damage_reduction", "value": 10, "target": "self", "rank": 1},
    {"type": "reflect", "value": 10, "target": "self", "rank": 1},
    {"type": "damage_reduction", "value": 20, "target": "self", "rank": 2},
    {"type": "reflect", "value": 20, "target": "self", "rank": 2},
    {"type": "damage_reduction", "value": 35, "target": "self", "rank": 3},
    {"type": "reflect", "value": 35, "target": "self", "rank": 3},
    {"type": "on_damaged", "effects": [
      {"type": "stat_modifier", "stat": "defense", "value": 15, "duration": 2, "target": "self", "stacks": true}
    ], "rank": 3}
  ]'::jsonb,
  5,
  6,
  1
);

-- 4. Power Core Overload (OFFENSIVE BUFF - Self)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'cyborg_power_core_overload',
  'Power Core Overload',
  'signature',
  'offensive',
  'space_cyborg',
  'Energy surge through all systems',
  '"WARNING: Power levels critical!"',
  '⚡',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "attack", "value": 30, "duration": 2, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "damage", "value": 25, "duration": 2, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "attack", "value": 65, "duration": 2, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "damage", "value": 55, "duration": 2, "target": "self", "rank": 2},
    {"type": "damage_type_conversion", "to": "lightning", "duration": 2, "rank": 2},
    {"type": "stat_modifier", "stat": "attack", "value": 120, "duration": 2, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "damage", "value": 100, "duration": 2, "target": "self", "rank": 3},
    {"type": "damage_type_conversion", "to": "lightning", "duration": 2, "rank": 3},
    {"type": "aoe_splash", "percentage": 20, "appliesTo": "all_attacks", "duration": 2, "rank": 3}
  ]'::jsonb,
  2,
  25,
  5,
  6,
  5
);

-- 5. Self-Repair Protocol (INSTANT HEAL)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'cyborg_self_repair',
  'Self-Repair Protocol',
  'signature',
  'defensive',
  'space_cyborg',
  'Mechanical healing systems',
  '"Initiating self-repair sequence."',
  '🔧',
  3,
  'active',
  '[
    {"type": "heal", "value": 30, "target": "self", "rank": 1},
    {"type": "heal", "value": 60, "target": "self", "rank": 2},
    {"type": "purge", "purgeType": "debuff", "count": 2, "target": "self", "rank": 2},
    {"type": "heal", "value": 100, "target": "self", "rank": 3},
    {"type": "purge", "purgeType": "debuff", "count": 99, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "defense", "value": 40, "duration": 2, "target": "self", "rank": 3},
    {"type": "shield", "value": 30, "target": "self", "rank": 3}
  ]'::jsonb,
  2,
  30,
  5,
  6,
  5
);

-- 6. Space Technology (INSTANT ATTACK - AOE)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'cyborg_space_technology',
  'Space Technology',
  'signature',
  'offensive',
  'space_cyborg',
  'Advanced weaponry hits all enemies',
  '"Deploying advanced weapon systems."',
  '🌌',
  3,
  'active',
  '[
    {"type": "damage", "value": 65, "damageType": "physical", "target": "all_enemies", "rank": 1},
    {"type": "damage", "value": 135, "damageType": "physical", "target": "all_enemies", "rank": 2},
    {"type": "stat_modifier", "stat": "defense", "value": -30, "duration": 2, "target": "all_enemies", "rank": 2},
    {"type": "damage", "value": 250, "damageType": "physical", "target": "all_enemies", "rank": 3},
    {"type": "stat_modifier", "stat": "defense", "value": -60, "duration": 2, "target": "all_enemies", "rank": 3},
    {"type": "status_effect", "statusEffect": "disarm", "duration": 1, "target": "all_enemies", "rank": 3},
    {"type": "stat_modifier", "stat": "attack", "value": -30, "duration": 2, "target": "all_enemies", "rank": 3}
  ]'::jsonb,
  3,
  45,
  5,
  6,
  10
);

-- 7. Terminator Protocol (OFFENSIVE BUFF - Self)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'cyborg_terminator_protocol',
  'Terminator Protocol',
  'signature',
  'offensive',
  'space_cyborg',
  'Ultimate combat mode - become unstoppable',
  '"TERMINATING TARGET."',
  '🤖💥',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "all", "value": 40, "duration": 2, "target": "self", "rank": 1},
    {"type": "immunity", "immunityType": "cc", "duration": 2, "rank": 1},
    {"type": "stat_modifier", "stat": "all", "value": 85, "duration": 2, "target": "self", "rank": 2},
    {"type": "immunity", "immunityType": "cc", "duration": 2, "rank": 2},
    {"type": "immunity", "immunityType": "debuff", "duration": 2, "rank": 2},
    {"type": "lifesteal", "value": 30, "duration": 2, "appliesTo": "all_attacks", "rank": 2},
    {"type": "stat_modifier", "stat": "all", "value": 160, "duration": 2, "target": "self", "rank": 3},
    {"type": "damage_immunity", "duration": 1, "target": "self", "rank": 3},
    {"type": "immunity", "immunityType": "cc", "duration": 2, "rank": 3},
    {"type": "immunity", "immunityType": "debuff", "duration": 2, "rank": 3},
    {"type": "lifesteal", "value": 60, "duration": 2, "appliesTo": "all_attacks", "rank": 3},
    {"type": "special", "specialType": "attacks_hit_all", "duration": 2, "rank": 3},
    {"type": "reflect", "value": 50, "duration": 2, "rank": 3}
  ]'::jsonb,
  4,
  50,
  5,
  6,
  10
);

COMMENT ON TABLE power_definitions IS 'Added Space Cyborg signature powers - cybernetic tank specialist';
