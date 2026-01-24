-- Migration: Insert Appliance Archetype Powers
-- Purpose: Add 7 archetype powers for appliance class

-- ===== APPLIANCE ARCHETYPE POWERS (7 total) =====

-- 1. AI Assistant (GROUP BUFF)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'appliance_ai_assistant',
  'AI Assistant',
  'ability',
  'support',
  'appliance',
  'Strategic analysis provides accuracy and critical hit bonuses to all allies',
  '"Analyzing combat patterns... Optimal strike zones identified!"',
  '🤖',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "accuracy", "value": 20, "duration": 1, "target": "all_allies", "rank": 1},
    {"type": "stat_modifier", "stat": "critical_chance", "value": 15, "duration": 1, "target": "all_allies", "rank": 1},
    {"type": "stat_modifier", "stat": "accuracy", "value": 40, "duration": 2, "target": "all_allies", "rank": 2},
    {"type": "stat_modifier", "stat": "critical_chance", "value": 30, "duration": 2, "target": "all_allies", "rank": 2},
    {"type": "stat_modifier", "stat": "critical_damage", "value": 20, "duration": 2, "target": "all_allies", "rank": 2},
    {"type": "stat_modifier", "stat": "accuracy", "value": 70, "duration": 2, "target": "all_allies", "rank": 3},
    {"type": "stat_modifier", "stat": "critical_chance", "value": 50, "duration": 2, "target": "all_allies", "rank": 3},
    {"type": "stat_modifier", "stat": "critical_damage", "value": 40, "duration": 2, "target": "all_allies", "rank": 3},
    {"type": "special", "specialType": "cannot_miss", "duration": 2, "target": "all_allies", "rank": 3}
  ]'::jsonb,
  1,
  18,
  2,
  4,
  1
);

-- 2. Maintenance Mode (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'appliance_maintenance_mode',
  'Maintenance Mode',
  'ability',
  'passive',
  'appliance',
  'Self-repair systems provide regeneration and increased max HP',
  '"Running diagnostics... All systems nominal. Self-repair protocols active."',
  '🛠️',
  3,
  'passive',
  '[
    {"type": "regen", "value": 3, "target": "self", "rank": 1},
    {"type": "immunity", "immunityType": "poison", "rank": 1},
    {"type": "immunity", "immunityType": "disease", "rank": 1},
    {"type": "regen", "value": 6, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "max_hp", "value": 10, "target": "self", "rank": 2},
    {"type": "regen", "value": 10, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "max_hp", "value": 20, "target": "self", "rank": 3},
    {"type": "immunity", "immunityType": "bleed", "rank": 3}
  ]'::jsonb,
  2,
  4,
  1
);

-- 3. Helpful Alert (TACTICAL - Single Ally)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'appliance_helpful_alert',
  'Helpful Alert',
  'ability',
  'support',
  'appliance',
  'Warning system grants an ally evasion and counter-attack capability',
  '"Incoming threat detected! Evasive maneuvers recommended!"',
  '📢',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "evasion", "value": 25, "duration": 3, "target": "single_ally", "rank": 1},
    {"type": "stat_modifier", "stat": "evasion", "value": 50, "duration": 6, "target": "single_ally", "rank": 2},
    {"type": "counter_attack", "chance": 30, "duration": 6, "target": "single_ally", "rank": 2},
    {"type": "stat_modifier", "stat": "evasion", "value": 80, "duration": 1, "target": "single_ally", "rank": 3},
    {"type": "counter_attack", "chance": 60, "duration": 1, "target": "single_ally", "rank": 3},
    {"type": "special", "specialType": "cannot_be_crit", "duration": 1, "target": "single_ally", "rank": 3}
  ]'::jsonb,
  1,
  12,
  2,
  4,
  1
);

-- 4. Programmed Efficiency (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'appliance_programmed_efficiency',
  'Programmed Efficiency',
  'ability',
  'passive',
  'appliance',
  'Optimized systems reduce cooldowns and power costs',
  '"Efficiency optimization: 47% improvement over baseline performance."',
  '🎯',
  3,
  'passive',
  '[
    {"type": "cooldown_reduction", "value": 1, "target": "self", "rank": 1},
    {"type": "cost_reduction", "value": 10, "target": "self", "rank": 1},
    {"type": "cooldown_reduction", "value": 2, "target": "self", "rank": 2},
    {"type": "cost_reduction", "value": 15, "target": "self", "rank": 2},
    {"type": "cooldown_reduction", "value": 3, "target": "self", "rank": 3},
    {"type": "cost_reduction", "value": 20, "target": "self", "rank": 3}
  ]'::jsonb,
  2,
  4,
  5
);

-- 5. Battery Share (GROUP HEAL)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'appliance_battery_share',
  'Battery Share',
  'ability',
  'support',
  'appliance',
  'Energy transfer - sacrifice HP to restore energy and heal allies',
  '"Redirecting power reserves to team... Worth it!"',
  '🔋',
  3,
  'active',
  '[
    {"type": "self_damage", "value": 15, "target": "self", "rank": 1},
    {"type": "restore_energy", "value": 20, "target": "all_allies", "rank": 1},
    {"type": "self_damage", "value": 20, "target": "self", "rank": 2},
    {"type": "restore_energy", "value": 35, "target": "all_allies", "rank": 2},
    {"type": "heal", "value": 15, "target": "all_allies", "rank": 2},
    {"type": "self_damage", "value": 25, "target": "self", "rank": 3},
    {"type": "restore_energy", "value": 55, "target": "all_allies", "rank": 3},
    {"type": "heal", "value": 30, "target": "all_allies", "rank": 3},
    {"type": "stat_modifier", "stat": "energy_regen", "value": 15, "duration": 2, "target": "all_allies", "rank": 3}
  ]'::jsonb,
  2,
  0,
  2,
  4,
  5
);

-- 6. Universal Adapter (TACTICAL)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'appliance_universal_adapter',
  'Universal Adapter',
  'ability',
  'support',
  'appliance',
  'Flexible utility - copy and spread buffs across the team',
  '"Compatibility mode engaged. Adapting to all available protocols."',
  '⚙️',
  3,
  'active',
  '[
    {"type": "copy_buff", "count": 1, "duration": 6, "from": "single_ally", "to": "single_ally", "rank": 1},
    {"type": "copy_buff", "count": 1, "duration": 1, "from": "single_ally", "to": "all_allies", "rank": 2},
    {"type": "copy_buff", "count": 99, "duration": 2, "from": "single_ally", "to": "all_allies", "rank": 3}
  ]'::jsonb,
  2,
  20,
  3,
  5,
  10
);

-- 7. Training Partner (PASSIVE - Off-Battlefield)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'appliance_training_partner',
  'Training Partner',
  'ability',
  'passive',
  'appliance',
  'Dedicated practice companion - characters who train with this character gain permanent stat boosts',
  '"Training session 47 complete. Your improvement rate is impressive!"',
  '🏋️',
  3,
  'passive',
  '[
    {"type": "training_bonus", "stat": "primary", "value": 10, "sessions_required": 3, "rank": 1},
    {"type": "training_bonus", "stat": "primary", "value": 20, "sessions_required": 3, "rank": 2},
    {"type": "training_bonus", "stat": "secondary", "value": 15, "sessions_required": 3, "rank": 2},
    {"type": "training_bonus", "stat": "primary", "value": 35, "sessions_required": 3, "rank": 3},
    {"type": "training_bonus", "stat": "secondary", "value": 25, "sessions_required": 3, "rank": 3},
    {"type": "training_bonus", "bonusType": "skill_point", "value": 1, "sessions_required": 3, "rank": 3}
  ]'::jsonb,
  3,
  5,
  10
);
