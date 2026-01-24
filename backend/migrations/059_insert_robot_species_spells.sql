-- Migration: Insert Robot Species Spells
-- Purpose: Add 5 unique spells for robot species
-- Theme: Logic, computation, efficiency, systematic, upgrades

-- 1. System Optimization (Uncommon - Buff)
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  species, mana_cost, cooldown_turns, required_level,
  effects, icon, animation
) VALUES (
  'robot_system_optimization',
  'System Optimization',
  'Optimize operational parameters. Increase all stats by 15% and reduce all cooldowns by 1 turn.',
  'Efficiency increased to 127%.',
  'species',
  'species',
  'robot',
  35,
  4,
  1,
  '[
    {"type": "stat_modifier", "stat": "all", "value": 15, "percent": true, "duration": 3, "target": "self"},
    {"type": "special", "specialType": "reduce_all_cooldowns", "value": 1, "target": "self"}
  ]'::jsonb,
  '⚙️',
  'optimize'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Logic Bomb (Rare - Offensive)
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  species, mana_cost, cooldown_turns, required_level,
  effects, icon, animation
) VALUES (
  'robot_logic_bomb',
  'Logic Bomb',
  'Deploy a computational attack. Deal arcane damage and confuse target, making them attack randomly.',
  'Error: Logic failure detected.',
  'species',
  'species',
  'robot',
  45,
  4,
  3,
  '[
    {"type": "damage", "value": 70, "damageType": "arcane", "target": "single_enemy"},
    {"type": "status_effect", "statusEffect": "confusion", "duration": 3, "target": "single_enemy"},
    {"type": "stat_modifier", "stat": "accuracy", "value": -40, "duration": 3, "target": "single_enemy"}
  ]'::jsonb,
  '💣',
  'logic_explosion'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Emergency Protocol (Rare - Defensive)
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  species, mana_cost, cooldown_turns, required_level,
  effects, icon, animation
) VALUES (
  'robot_emergency_protocol',
  'Emergency Protocol',
  'Activate emergency systems. Create damage shield and become immune to crowd control for 3 turns.',
  'Emergency protocols activated.',
  'species',
  'species',
  'robot',
  50,
  5,
  5,
  '[
    {"type": "shield", "value": 70, "target": "self"},
    {"type": "immunity", "immunityType": "cc", "duration": 3, "target": "self"},
    {"type": "stat_modifier", "stat": "defense", "value": 30, "duration": 3, "target": "self"}
  ]'::jsonb,
  '🚨',
  'emergency'
)
ON CONFLICT (id) DO NOTHING;

-- 4. Rapid Calculation (Epic - Utility)
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  species, mana_cost, cooldown_turns, required_level,
  effects, icon, animation
) VALUES (
  'robot_rapid_calculation',
  'Rapid Calculation',
  'Process millions of scenarios instantly. Act twice this turn and next attack is guaranteed critical.',
  'Calculating optimal outcome...',
  'species',
  'species',
  'robot',
  70,
  6,
  7,
  '[
    {"type": "special", "specialType": "extra_action", "value": 1, "immediate": true, "target": "self"},
    {"type": "special", "specialType": "force_critical", "target": "self"},
    {"type": "stat_modifier", "stat": "speed", "value": 50, "duration": 2, "target": "self"}
  ]'::jsonb,
  '🧮',
  'calculate'
)
ON CONFLICT (id) DO NOTHING;

-- 5. Singularity Protocol (Legendary - Ultimate)
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  species, mana_cost, cooldown_turns, charges_per_battle, required_level,
  effects, icon, animation
) VALUES (
  'robot_singularity_protocol',
  'Singularity Protocol',
  'Achieve technological singularity. Massive stat boost, all abilities cost no energy/mana, act 3 times per turn for 3 turns.',
  'I have transcended my programming.',
  'species',
  'species',
  'robot',
  100,
  0,
  1,
  10,
  '[
    {"type": "stat_modifier", "stat": "all", "value": 80, "percent": true, "duration": 3, "target": "self"},
    {"type": "special", "specialType": "zero_cost_abilities", "duration": 3, "target": "self"},
    {"type": "special", "specialType": "triple_actions", "duration": 3, "target": "self"},
    {"type": "immunity", "immunityType": "debuff", "duration": 3, "target": "self"}
  ]'::jsonb,
  '🤖✨',
  'singularity'
)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE spell_definitions IS 'Added robot species spells - logical and efficient combatants';
