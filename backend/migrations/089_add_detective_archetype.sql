-- Migration 089: Add Detective Archetype Powers
-- Detective archetype already has 3 spells in production
-- This migration adds 7 detective archetype powers following standard archetype pattern

-- Step 0: update constraints to allow 'detective'
ALTER TABLE characters DROP CONSTRAINT IF EXISTS characters_archetype_check;
ALTER TABLE characters ADD CONSTRAINT characters_archetype_check
  CHECK (archetype IN ('warrior', 'scholar', 'trickster', 'beast', 'leader', 'mage', 'mystic', 'tank', 'assassin', 'appliance', 'system', 'detective'));

-- Step 1: Update characters to detective archetype
UPDATE characters
SET archetype = 'detective'
WHERE id IN ('holmes', 'sam_spade');

-- Step 2: Insert Detective Archetype Powers (7 total)
INSERT INTO power_definitions (
  id,
  name,
  description,
  tier,
  archetype,
  unlock_level,
  power_type,
  effects,
  cooldown,
  energy_cost,
  max_rank,
  rank_up_cost,
  rank_up_cost_r3
) VALUES
-- Level 3 Powers
(
  'detective_deductive_reasoning',
  'Deductive Reasoning',
  'Analyze patterns to improve accuracy and critical thinking',
  'ability',
  'detective',
  3,
  'passive',
  '[{"rank": 1, "stat": "accuracy", "type": "stat_modifier", "value": 10, "target": "self"}, {"rank": 2, "stat": "accuracy", "type": "stat_modifier", "value": 22, "target": "self"}, {"rank": 3, "stat": "accuracy", "type": "stat_modifier", "value": 40, "target": "self"}, {"rank": 3, "stat": "critical_chance", "type": "stat_modifier", "value": 15, "target": "self"}]'::jsonb,
  0,
  0,
  3,
  1,
  7
),
(
  'detective_crime_scene_analysis',
  'Crime Scene Analysis',
  'Study enemy to expose vulnerabilities and weaknesses',
  'ability',
  'detective',
  3,
  'active',
  '[{"rank": 1, "stat": "damage_taken", "type": "stat_modifier", "value": 15, "target": "single_enemy", "duration": 1}, {"rank": 2, "stat": "damage_taken", "type": "stat_modifier", "value": 30, "target": "single_enemy", "duration": 2}, {"rank": 2, "stat": "defense", "type": "stat_modifier", "value": -20, "target": "single_enemy", "duration": 2}, {"rank": 3, "stat": "damage_taken", "type": "stat_modifier", "value": 55, "target": "single_enemy", "duration": 2}, {"rank": 3, "stat": "defense", "type": "stat_modifier", "value": -35, "target": "single_enemy", "duration": 2}, {"rank": 3, "type": "special", "duration": 2, "specialType": "reveal_stats"}]'::jsonb,
  3,
  15,
  3,
  1,
  7
),
-- Level 5 Powers
(
  'detective_pattern_recognition',
  'Pattern Recognition',
  'Predict enemy attacks through pattern analysis',
  'ability',
  'detective',
  5,
  'passive',
  '[{"rank": 1, "stat": "evasion", "type": "stat_modifier", "value": 10, "target": "self"}, {"rank": 2, "stat": "evasion", "type": "stat_modifier", "value": 20, "target": "self"}, {"rank": 2, "type": "special", "value": 15, "specialType": "counter_chance"}, {"rank": 3, "stat": "evasion", "type": "stat_modifier", "value": 35, "target": "self"}, {"rank": 3, "type": "special", "value": 30, "specialType": "counter_chance"}]'::jsonb,
  0,
  0,
  3,
  1,
  7
),
(
  'detective_interrogation_tactics',
  'Interrogation Tactics',
  'Apply psychological pressure to weaken enemy resolve',
  'ability',
  'detective',
  5,
  'active',
  '[{"rank": 1, "stat": "attack", "type": "stat_modifier", "value": -15, "target": "single_enemy", "duration": 2}, {"rank": 2, "stat": "attack", "type": "stat_modifier", "value": -30, "target": "single_enemy", "duration": 2}, {"rank": 2, "stat": "defense", "type": "stat_modifier", "value": -20, "target": "single_enemy", "duration": 2}, {"rank": 3, "stat": "attack", "type": "stat_modifier", "value": -50, "target": "single_enemy", "duration": 3}, {"rank": 3, "stat": "defense", "type": "stat_modifier", "value": -35, "target": "single_enemy", "duration": 3}, {"rank": 3, "stat": "accuracy", "type": "stat_modifier", "value": -25, "target": "single_enemy", "duration": 3}]'::jsonb,
  4,
  20,
  3,
  1,
  7
),
-- Level 7 Powers
(
  'detective_evidence_collection',
  'Evidence Collection',
  'Thorough investigation yields better rewards and knowledge',
  'ability',
  'detective',
  7,
  'passive',
  '[{"rank": 1, "stat": "gold_find", "type": "stat_modifier", "value": 12, "target": "self"}, {"rank": 1, "stat": "experience_gain", "type": "stat_modifier", "value": 8, "target": "self"}, {"rank": 2, "stat": "gold_find", "type": "stat_modifier", "value": 25, "target": "self"}, {"rank": 2, "stat": "experience_gain", "type": "stat_modifier", "value": 18, "target": "self"}, {"rank": 3, "stat": "gold_find", "type": "stat_modifier", "value": 45, "target": "self"}, {"rank": 3, "stat": "experience_gain", "type": "stat_modifier", "value": 35, "target": "self"}, {"rank": 3, "stat": "item_find", "type": "stat_modifier", "value": 20, "target": "self"}]'::jsonb,
  0,
  0,
  3,
  1,
  7
),
(
  'detective_trap_detection',
  'Trap Detection',
  'Anticipate and avoid enemy attacks',
  'ability',
  'detective',
  7,
  'active',
  '[{"rank": 1, "type": "damage_block", "value": 40, "target": "self", "duration": 1}, {"rank": 2, "type": "damage_block", "value": 65, "target": "self", "duration": 1}, {"rank": 2, "type": "damage_reflect", "value": 25, "target": "enemy"}, {"rank": 3, "type": "damage_block", "value": 100, "target": "self", "duration": 1}, {"rank": 3, "type": "damage_reflect", "value": 50, "target": "enemy"}, {"rank": 3, "type": "special", "duration": 1, "specialType": "next_attack_guaranteed_crit"}]'::jsonb,
  5,
  25,
  3,
  1,
  7
),
-- Level 10 Power
(
  'detective_case_solved',
  'Case Solved',
  'Deliver decisive finishing blow when enemy is weakened',
  'ability',
  'detective',
  10,
  'active',
  '[{"rank": 1, "type": "damage", "value": 120, "target": "single_enemy", "damageType": "physical", "condition": "hp_below_50"}, {"rank": 2, "type": "damage", "value": 200, "target": "single_enemy", "damageType": "physical", "condition": "hp_below_40"}, {"rank": 2, "type": "armor_penetration", "value": 30}, {"rank": 3, "type": "damage", "value": 350, "target": "single_enemy", "damageType": "physical", "condition": "hp_below_30"}, {"rank": 3, "type": "armor_penetration", "value": 60}, {"rank": 3, "type": "special", "specialType": "execute_threshold_15"}]'::jsonb,
  6,
  35,
  3,
  1,
  7
)
ON CONFLICT (id) DO NOTHING;
