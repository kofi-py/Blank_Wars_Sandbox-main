-- Migration: Insert Scholar Archetype Powers
-- Purpose: Add 7 ability-tier powers for Scholar archetype
-- Archetype: Scholar - Tactical genius, quick learning, innovation

-- ===== SCHOLAR ARCHETYPE POWERS (7 total) =====

-- 1. Tactical Mind - Enhanced strategic thinking (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'scholar_tactical_mind',
  'Tactical Mind',
  'ability',
  'passive',
  'scholar',
  'Superior intellect improves performance',
  'Knowledge is power.',
  '🧠',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "accuracy", "value": 10, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "accuracy", "value": 22, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "accuracy", "value": 40, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "critical_chance", "value": 15, "target": "self", "rank": 3}
  ]'::jsonb,
  2,
  4,
  1
);

-- 2. Quick Study - Learn faster (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'scholar_quick_study',
  'Quick Study',
  'ability',
  'passive',
  'scholar',
  'Accelerated learning and adaptation',
  'I absorb knowledge like a sponge.',
  '📚',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "experience_gain", "value": 10, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "experience_gain", "value": 22, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "experience_gain", "value": 40, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "skill_gain", "value": 35, "target": "self", "rank": 3}
  ]'::jsonb,
  2,
  4,
  1
);

-- 3. Knowledge Application - Use knowledge in combat (OFFENSIVE BUFF - Self)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'scholar_knowledge_application',
  'Knowledge Application',
  'ability',
  'offensive',
  'scholar',
  'Apply tactical knowledge to attacks',
  'Theory becomes practice.',
  '🎓',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "damage", "value": 15, "duration": 0, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "accuracy", "value": 15, "duration": 0, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "damage", "value": 35, "duration": 2, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "accuracy", "value": 30, "duration": 2, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "damage", "value": 65, "duration": 2, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "accuracy", "value": 50, "duration": 2, "target": "self", "rank": 3},
    {"type": "armor_penetration", "value": 30, "duration": 2, "rank": 3}
  ]'::jsonb,
  1,
  15,
  2,
  4,
  1
);

-- 4. Improved Equipment - Better gear usage (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'scholar_improved_equipment',
  'Improved Equipment',
  'ability',
  'passive',
  'scholar',
  'Optimize equipment effectiveness',
  'Every tool, perfectly utilized.',
  '⚙️',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "equipment_effectiveness", "value": 10, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "equipment_effectiveness", "value": 22, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "equipment_effectiveness", "value": 40, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "equipment_cost", "value": -25, "target": "self", "rank": 3}
  ]'::jsonb,
  2,
  4,
  5
);

-- 5. Tactical Analysis - Identify enemy weaknesses (DEBUFF - Single Target)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'scholar_tactical_analysis',
  'Tactical Analysis',
  'ability',
  'debuff',
  'scholar',
  'Analyze enemy to expose weaknesses',
  'I see your every flaw.',
  '🔍',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "damage_taken", "value": 15, "duration": 1, "target": "single_enemy", "rank": 1},
    {"type": "stat_modifier", "stat": "damage_taken", "value": 35, "duration": 2, "target": "single_enemy", "rank": 2},
    {"type": "stat_modifier", "stat": "defense", "value": -20, "duration": 2, "target": "single_enemy", "rank": 2},
    {"type": "stat_modifier", "stat": "damage_taken", "value": 65, "duration": 2, "target": "single_enemy", "rank": 3},
    {"type": "stat_modifier", "stat": "defense", "value": -40, "duration": 2, "target": "single_enemy", "rank": 3},
    {"type": "special", "specialType": "reveal_stats", "duration": 2, "rank": 3}
  ]'::jsonb,
  1,
  15,
  2,
  4,
  5
);

-- 6. Rapid Innovation - Reduce cooldowns (UTILITY)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'scholar_rapid_innovation',
  'Rapid Innovation',
  'ability',
  'utility',
  'scholar',
  'Accelerate ability recovery',
  'Innovation knows no limits.',
  '⚡',
  3,
  'active',
  '[
    {"type": "special", "specialType": "reduce_cooldowns", "value": 1, "target": "self", "rank": 1},
    {"type": "special", "specialType": "reduce_cooldowns", "value": 1, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "energy_regen", "value": 20, "duration": 2, "target": "self", "rank": 2},
    {"type": "special", "specialType": "reduce_cooldowns", "value": 2, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "energy_regen", "value": 40, "duration": 2, "target": "self", "rank": 3}
  ]'::jsonb,
  1,
  20,
  3,
  5,
  10
);

-- 7. Resourcefulness - Better resource management (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'scholar_resourcefulness',
  'Resourcefulness',
  'ability',
  'passive',
  'scholar',
  'Efficient use of all resources',
  'Waste nothing, maximize everything.',
  '♻️',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "gold_find", "value": 12, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "item_find", "value": 8, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "gold_find", "value": 25, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "item_find", "value": 18, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "gold_find", "value": 45, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "item_find", "value": 30, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "item_quality", "value": 20, "target": "self", "rank": 3}
  ]'::jsonb,
  3,
  5,
  10
);
