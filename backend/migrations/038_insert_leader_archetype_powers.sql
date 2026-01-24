-- Migration: Insert Leader Archetype Powers
-- Purpose: Add 7 ability-tier powers for Leader archetype
-- Archetype: Leader - Rally team, strategic commands, protective orders

-- ===== LEADER ARCHETYPE POWERS (7 total) =====

-- 1. Inspiring Speech - Rally team morale (GROUP BUFF)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'leader_inspiring_speech',
  'Inspiring Speech',
  'ability',
  'support',
  'leader',
  'Inspire allies with rousing words',
  'Together, we are unstoppable!',
  '📣',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "all", "value": 12, "duration": 1, "target": "all_allies", "rank": 1},
    {"type": "stat_modifier", "stat": "all", "value": 25, "duration": 2, "target": "all_allies", "rank": 2},
    {"type": "stat_modifier", "stat": "all", "value": 40, "duration": 2, "target": "all_allies", "rank": 3},
    {"type": "purge", "purgeType": "debuff", "count": 1, "target": "all_allies", "rank": 3}
  ]'::jsonb,
  1,
  15,
  2,
  4,
  1
);

-- 2. Tactical Command - Coordinate team attacks (GROUP BUFF)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'leader_tactical_command',
  'Tactical Command',
  'ability',
  'support',
  'leader',
  'Coordinate focused fire on single target',
  'Focus fire! Take them down!',
  '🎯',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "damage", "value": 15, "duration": 1, "condition": "attacking_same_target", "target": "all_allies", "rank": 1},
    {"type": "stat_modifier", "stat": "damage", "value": 30, "duration": 2, "condition": "attacking_same_target", "target": "all_allies", "rank": 2},
    {"type": "stat_modifier", "stat": "damage", "value": 50, "duration": 2, "condition": "attacking_same_target", "target": "all_allies", "rank": 3},
    {"type": "stat_modifier", "stat": "critical_chance", "value": 30, "duration": 2, "condition": "attacking_same_target", "target": "all_allies", "rank": 3}
  ]'::jsonb,
  1,
  15,
  2,
  4,
  1
);

-- 3. Protective Order - Redirect damage from allies (DEFENSIVE BUFF - Self)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'leader_protective_order',
  'Protective Order',
  'ability',
  'defensive',
  'leader',
  'Absorb damage meant for allies',
  'I will protect you.',
  '🛡️',
  3,
  'active',
  '[
    {"type": "special", "specialType": "absorb_ally_damage", "value": 15, "duration": 1, "target": "self", "rank": 1},
    {"type": "special", "specialType": "absorb_ally_damage", "value": 30, "duration": 2, "target": "self", "rank": 2},
    {"type": "special", "specialType": "absorb_ally_damage", "value": 50, "duration": 2, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "defense", "value": 25, "duration": 2, "condition": "while_protecting", "target": "self", "rank": 3}
  ]'::jsonb,
  1,
  10,
  2,
  4,
  1
);

-- 4. Lead by Example - Personal performance inspires (CONDITIONAL GROUP BUFF)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'leader_lead_by_example',
  'Lead by Example',
  'ability',
  'support',
  'leader',
  'When you excel, allies are inspired',
  'Follow my lead!',
  '⚔️',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "damage", "value": 15, "duration": 6, "trigger": "on_crit_or_kill", "target": "all_allies", "rank": 1},
    {"type": "stat_modifier", "stat": "damage", "value": 30, "duration": 1, "trigger": "on_crit_or_kill", "target": "all_allies", "rank": 2},
    {"type": "stat_modifier", "stat": "critical_chance", "value": 20, "duration": 1, "trigger": "on_crit_or_kill", "target": "all_allies", "rank": 2},
    {"type": "stat_modifier", "stat": "damage", "value": 50, "duration": 2, "trigger": "on_crit_or_kill", "target": "all_allies", "rank": 3},
    {"type": "stat_modifier", "stat": "critical_chance", "value": 35, "duration": 2, "trigger": "on_crit_or_kill", "target": "all_allies", "rank": 3},
    {"type": "stat_modifier", "stat": "speed", "value": 20, "duration": 2, "trigger": "on_crit_or_kill", "target": "all_allies", "rank": 3}
  ]'::jsonb,
  1,
  15,
  2,
  4,
  5
);

-- 5. Commander's Presence - Team performs better (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'leader_commanders_presence',
  'Commander''s Presence',
  'ability',
  'passive',
  'leader',
  'Your presence strengthens allies',
  'A true leader inspires greatness.',
  '🎖️',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "all", "value": 7, "target": "all_allies", "rank": 1},
    {"type": "stat_modifier", "stat": "all", "value": 15, "target": "all_allies", "rank": 2},
    {"type": "stat_modifier", "stat": "all", "value": 25, "target": "all_allies", "rank": 3},
    {"type": "stat_modifier", "stat": "damage", "value": 12, "duration": 6, "condition": "when_you_damage_enemy", "target": "all_allies_vs_that_enemy", "rank": 3}
  ]'::jsonb,
  2,
  4,
  5
);

-- 6. Defensive Regroup - Rally defensive formation (CONDITIONAL GROUP BUFF)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'leader_defensive_regroup',
  'Defensive Regroup',
  'ability',
  'defensive',
  'leader',
  'Rally team defenses when ally is injured',
  'Hold the line! Protect each other!',
  '🔰',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "damage_taken", "value": -15, "duration": 1, "trigger": "ally_below_50_hp", "target": "all_allies", "rank": 1},
    {"type": "stat_modifier", "stat": "damage_taken", "value": -30, "duration": 2, "trigger": "ally_below_60_hp", "target": "all_allies", "rank": 2},
    {"type": "stat_modifier", "stat": "damage_taken", "value": -50, "duration": 2, "trigger": "ally_below_70_hp", "target": "all_allies", "rank": 3},
    {"type": "stat_modifier", "stat": "defense", "value": 30, "duration": 2, "target": "all_allies", "rank": 3}
  ]'::jsonb,
  1,
  20,
  3,
  5,
  10
);

-- 7. Royal Authority - Force enemies to focus on you (TAUNT)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'leader_royal_authority',
  'Royal Authority',
  'ability',
  'defensive',
  'leader',
  'Command enemies to attack you',
  'Face me, cowards!',
  '👑',
  3,
  'active',
  '[
    {"type": "special", "specialType": "taunt", "duration": 3, "target": "all_enemies", "rank": 1},
    {"type": "stat_modifier", "stat": "defense", "value": 10, "duration": 3, "target": "self", "rank": 1},
    {"type": "special", "specialType": "taunt", "duration": 6, "target": "all_enemies", "rank": 2},
    {"type": "stat_modifier", "stat": "defense", "value": 30, "duration": 6, "target": "self", "rank": 2},
    {"type": "special", "specialType": "taunt", "duration": 1, "target": "all_enemies", "rank": 3},
    {"type": "stat_modifier", "stat": "defense", "value": 50, "duration": 1, "target": "self", "rank": 3},
    {"type": "special", "specialType": "reflect_damage", "value": 25, "duration": 1, "rank": 3}
  ]'::jsonb,
  1,
  20,
  3,
  5,
  10
);
