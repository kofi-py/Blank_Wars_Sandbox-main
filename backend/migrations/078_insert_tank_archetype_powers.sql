-- Migration: Insert Tank Archetype Powers
-- Purpose: Add 7 ability-tier powers for Tank archetype
-- Archetype: Tank - High defense, protect allies, absorb damage

-- ===== TANK ARCHETYPE POWERS (7 total) =====

-- 1. Fortified Defense - Enhanced defensive stance (DEFENSIVE BUFF - Self)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'tank_fortified_defense',
  'Fortified Defense',
  'ability',
  'defensive',
  'tank',
  'Increase defenses to withstand attacks',
  'I am an immovable wall.',
  '🛡️',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "defense", "value": 20, "duration": 1, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "defense", "value": 45, "duration": 2, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "defense", "value": 80, "duration": 2, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "damage_taken", "value": -25, "duration": 2, "target": "self", "rank": 3}
  ]'::jsonb,
  1,
  10,
  2,
  4,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 2. Iron Body - Shrug off physical damage (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'tank_iron_body',
  'Iron Body',
  'ability',
  'passive',
  'tank',
  'Natural toughness reduces all damage',
  'My body is forged steel.',
  '⚙️',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "damage_taken", "value": -7, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "damage_taken", "value": -15, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "damage_taken", "value": -25, "target": "self", "rank": 3},
    {"type": "immunity", "immunityType": "critical_hits", "rank": 3}
  ]'::jsonb,
  2,
  4,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 3. Shield Ally - Protect teammate (DEFENSIVE BUFF - Ally)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'tank_shield_ally',
  'Shield Ally',
  'ability',
  'defensive',
  'tank',
  'Intercept attacks meant for ally',
  'I will take the hit.',
  '🤝',
  3,
  'active',
  '[
    {"type": "special", "specialType": "intercept_damage", "value": 30, "duration": 1, "target": "single_ally", "rank": 1},
    {"type": "special", "specialType": "intercept_damage", "value": 50, "duration": 2, "target": "single_ally", "rank": 2},
    {"type": "special", "specialType": "intercept_damage", "value": 75, "duration": 2, "target": "single_ally", "rank": 3},
    {"type": "stat_modifier", "stat": "defense", "value": 30, "duration": 2, "condition": "while_intercepting", "target": "self", "rank": 3}
  ]'::jsonb,
  1,
  15,
  2,
  4,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 4. Counter Strike - Punish attackers (CONDITIONAL PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'tank_counter_strike',
  'Counter Strike',
  'ability',
  'passive',
  'tank',
  'Strike back when hit',
  'Every blow you land, I return.',
  '⚡',
  3,
  'passive',
  '[
    {"type": "special", "specialType": "counter_attack", "chance": 15, "damage_percent": 40, "rank": 1},
    {"type": "special", "specialType": "counter_attack", "chance": 30, "damage_percent": 60, "rank": 2},
    {"type": "special", "specialType": "counter_attack", "chance": 50, "damage_percent": 90, "rank": 3},
    {"type": "status_effect", "statusEffect": "slow", "chance": 20, "duration": 3, "on_counter": true, "rank": 3}
  ]'::jsonb,
  2,
  4,
  5
)
ON CONFLICT (id) DO NOTHING;

-- 5. Indomitable Will - Resist control effects (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'tank_indomitable_will',
  'Indomitable Will',
  'ability',
  'passive',
  'tank',
  'Mental fortitude resists control',
  'My will cannot be broken.',
  '🧠',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "cc_resistance", "value": 15, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "cc_resistance", "value": 30, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "cc_resistance", "value": 50, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "cc_duration", "value": -40, "target": "self", "rank": 3}
  ]'::jsonb,
  2,
  4,
  5
)
ON CONFLICT (id) DO NOTHING;

-- 6. Shield Bash - Stun enemy with shield strike (INSTANT ATTACK)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'tank_shield_bash',
  'Shield Bash',
  'ability',
  'offensive',
  'tank',
  'Powerful shield strike with stun',
  'Taste my shield!',
  '🛡️',
  3,
  'active',
  '[
    {"type": "damage", "value": 15, "damageType": "physical", "target": "single_enemy", "rank": 1},
    {"type": "status_effect", "statusEffect": "stun", "chance": 15, "duration": 3, "rank": 1},
    {"type": "damage", "value": 40, "damageType": "physical", "target": "single_enemy", "rank": 2},
    {"type": "status_effect", "statusEffect": "stun", "chance": 35, "duration": 6, "rank": 2},
    {"type": "damage", "value": 75, "damageType": "physical", "target": "single_enemy", "rank": 3},
    {"type": "status_effect", "statusEffect": "stun", "chance": 60, "duration": 1, "rank": 3},
    {"type": "stat_modifier", "stat": "defense", "value": -30, "duration": 2, "target": "enemy", "rank": 3}
  ]'::jsonb,
  1,
  20,
  3,
  5,
  10
)
ON CONFLICT (id) DO NOTHING;

-- 7. Last Stand - Fight harder when hurt (CONDITIONAL PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'tank_last_stand',
  'Last Stand',
  'ability',
  'passive',
  'tank',
  'Gain power when near death',
  'I fight until my last breath.',
  '💀',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "all", "value": 15, "condition": "hp_below_30", "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "all", "value": 30, "condition": "hp_below_35", "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "all", "value": 50, "condition": "hp_below_40", "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "lifesteal", "value": 30, "condition": "hp_below_40", "target": "self", "rank": 3}
  ]'::jsonb,
  3,
  5,
  10
)
ON CONFLICT (id) DO NOTHING;
