-- Migration: Insert System Archetype Powers
-- Purpose: Add 7 ability-tier powers for System archetype
-- Archetype: System - AI, programs, digital abilities, technological warfare

-- ===== SYSTEM ARCHETYPE POWERS (7 total) =====

-- 1. System Override - Hack enemy systems (DEBUFF - Single Target)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'system_override',
  'System Override',
  'ability',
  'debuff',
  'system',
  'Hack and disable enemy systems',
  'Access denied... to you.',
  '💻',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "all", "value": -10, "duration": 1, "target": "single_enemy", "rank": 1},
    {"type": "stat_modifier", "stat": "all", "value": -22, "duration": 2, "target": "single_enemy", "rank": 2},
    {"type": "status_effect", "statusEffect": "confusion", "chance": 20, "duration": 3, "rank": 2},
    {"type": "stat_modifier", "stat": "all", "value": -40, "duration": 2, "target": "single_enemy", "rank": 3},
    {"type": "status_effect", "statusEffect": "confusion", "chance": 40, "duration": 6, "rank": 3},
    {"type": "special", "specialType": "disable_abilities", "count": 1, "duration": 2, "rank": 3}
  ]'::jsonb,
  1,
  15,
  2,
  4,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 2. Firewall - Defensive protocols (DEFENSIVE BUFF - Self)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'system_firewall',
  'Firewall',
  'ability',
  'defensive',
  'system',
  'Activate defensive protocols',
  'All threats blocked.',
  '🛡️',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "defense", "value": 15, "duration": 1, "target": "self", "rank": 1},
    {"type": "immunity", "immunityType": "debuff", "count": 1, "duration": 1, "rank": 1},
    {"type": "stat_modifier", "stat": "defense", "value": 35, "duration": 2, "target": "self", "rank": 2},
    {"type": "immunity", "immunityType": "debuff", "count": 2, "duration": 2, "rank": 2},
    {"type": "stat_modifier", "stat": "defense", "value": 60, "duration": 2, "target": "self", "rank": 3},
    {"type": "immunity", "immunityType": "debuff", "count": 99, "duration": 2, "rank": 3},
    {"type": "special", "specialType": "reflect_debuff", "chance": 40, "rank": 3}
  ]'::jsonb,
  1,
  10,
  2,
  4,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 3. Rapid Processing - Enhanced speed (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'system_rapid_processing',
  'Rapid Processing',
  'ability',
  'passive',
  'system',
  'Process information at digital speeds',
  'Faster than human thought.',
  '⚡',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "speed", "value": 10, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "speed", "value": 22, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "speed", "value": 40, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "cooldown_reduction", "value": 15, "target": "self", "rank": 3}
  ]'::jsonb,
  2,
  4,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 4. Data Analysis - Perfect information gathering (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'system_data_analysis',
  'Data Analysis',
  'ability',
  'passive',
  'system',
  'Analyze all combat data',
  'I see all variables.',
  '📊',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "accuracy", "value": 10, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "critical_chance", "value": 8, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "accuracy", "value": 22, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "critical_chance", "value": 18, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "accuracy", "value": 40, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "critical_chance", "value": 32, "target": "self", "rank": 3},
    {"type": "special", "specialType": "reveal_enemy_stats", "rank": 3}
  ]'::jsonb,
  2,
  4,
  5
)
ON CONFLICT (id) DO NOTHING;

-- 5. Virus Upload - Infect enemy with malware (INSTANT ATTACK + DOT)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'system_virus_upload',
  'Virus Upload',
  'ability',
  'offensive',
  'system',
  'Upload destructive code to enemy',
  'Malware deployed.',
  '🦠',
  3,
  'active',
  '[
    {"type": "damage", "value": 15, "damageType": "magic", "target": "single_enemy", "rank": 1},
    {"type": "special", "specialType": "damage_over_time", "value": 8, "duration": 6, "rank": 1},
    {"type": "damage", "value": 40, "damageType": "magic", "target": "single_enemy", "rank": 2},
    {"type": "special", "specialType": "damage_over_time", "value": 18, "duration": 1, "rank": 2},
    {"type": "stat_modifier", "stat": "defense", "value": -15, "duration": 2, "target": "enemy", "rank": 2},
    {"type": "damage", "value": 75, "damageType": "magic", "target": "single_enemy", "rank": 3},
    {"type": "special", "specialType": "damage_over_time", "value": 30, "duration": 2, "rank": 3},
    {"type": "stat_modifier", "stat": "all", "value": -25, "duration": 2, "target": "enemy", "rank": 3},
    {"type": "special", "specialType": "spread_to_allies", "chance": 30, "rank": 3}
  ]'::jsonb,
  1,
  20,
  2,
  4,
  5
)
ON CONFLICT (id) DO NOTHING;

-- 6. System Restore - Heal and cleanse (HEAL - Self)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'system_restore',
  'System Restore',
  'ability',
  'heal',
  'system',
  'Restore system to optimal state',
  'Restoring to last save point.',
  '💚',
  3,
  'active',
  '[
    {"type": "heal", "value": 15, "target": "self", "rank": 1},
    {"type": "purge", "purgeType": "debuff", "count": 1, "target": "self", "rank": 1},
    {"type": "heal", "value": 30, "target": "self", "rank": 2},
    {"type": "purge", "purgeType": "debuff", "count": 2, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "energy_regen", "value": 30, "duration": 2, "rank": 2},
    {"type": "heal", "value": 50, "target": "self", "rank": 3},
    {"type": "purge", "purgeType": "debuff", "count": 99, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "energy_regen", "value": 60, "duration": 2, "rank": 3},
    {"type": "special", "specialType": "reset_cooldown", "count": 1, "rank": 3}
  ]'::jsonb,
  1,
  25,
  3,
  5,
  10
)
ON CONFLICT (id) DO NOTHING;

-- 7. Network Connection - Connect to allies (PASSIVE AURA)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'system_network_connection',
  'Network Connection',
  'ability',
  'passive',
  'system',
  'Share processing power with allies',
  'Connected minds are stronger.',
  '🌐',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "all", "value": 5, "target": "all_allies", "rank": 1},
    {"type": "stat_modifier", "stat": "all", "value": 12, "target": "all_allies", "rank": 2},
    {"type": "special", "specialType": "share_buffs", "percent": 25, "target": "all_allies", "rank": 2},
    {"type": "stat_modifier", "stat": "all", "value": 20, "target": "all_allies", "rank": 3},
    {"type": "special", "specialType": "share_buffs", "percent": 50, "target": "all_allies", "rank": 3},
    {"type": "special", "specialType": "shared_vision", "rank": 3}
  ]'::jsonb,
  3,
  5,
  10
);
