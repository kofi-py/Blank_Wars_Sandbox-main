-- Migration: Insert Cyborg Species Powers
-- Purpose: Add 7 species-tier powers for Cyborg species
-- Species: Cyborg - Machine-human hybrid, enhanced systems, technological integration

-- ===== CYBORG SPECIES POWERS (7 total) =====

-- 1. Cybernetic Enhancement - Machine superiority (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'cyborg_cybernetic_enhancement',
  'Cybernetic Enhancement',
  'species',
  'passive',
  'cyborg',
  'Machine parts enhance physical capabilities',
  'Flesh is weak. Steel is eternal.',
  '🦾',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "physical_attack", "value": 10, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "defense", "value": 8, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "physical_attack", "value": 22, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "defense", "value": 18, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "physical_attack", "value": 40, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "defense", "value": 30, "target": "self", "rank": 3}
  ]'::jsonb,
  2,
  4,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 2. Self-Repair Protocols - Automated healing (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'cyborg_self_repair',
  'Self-Repair Protocols',
  'species',
  'passive',
  'cyborg',
  'Nanomachines repair damage over time',
  'Initiating repair sequence.',
  '🔧',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "hp_regen_per_round", "value": 3, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "hp_regen_per_round", "value": 6, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "hp_regen_per_round", "value": 10, "target": "self", "rank": 3},
    {"type": "special", "specialType": "repair_faster_out_of_combat", "rank": 3}
  ]'::jsonb,
  2,
  4,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 3. Tactical HUD - Enhanced targeting (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'cyborg_tactical_hud',
  'Tactical HUD',
  'species',
  'passive',
  'cyborg',
  'Heads-up display improves accuracy',
  'Target acquired.',
  '🎯',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "accuracy", "value": 10, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "accuracy", "value": 22, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "accuracy", "value": 40, "target": "self", "rank": 3},
    {"type": "special", "specialType": "reveal_weak_points", "rank": 3}
  ]'::jsonb,
  2,
  4,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 4. Overclocking - Temporary power surge (OFFENSIVE BUFF - Self)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'cyborg_overclocking',
  'Overclocking',
  'species',
  'offensive',
  'cyborg',
  'Push systems beyond safe limits',
  'Maximum power!',
  '⚡',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "all", "value": 20, "duration": 0, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "all", "value": 45, "duration": 2, "target": "self", "rank": 2},
    {"type": "self_damage", "value": 5, "damageType": "current_hp_percent", "rank": 2},
    {"type": "stat_modifier", "stat": "all", "value": 80, "duration": 2, "target": "self", "rank": 3},
    {"type": "self_damage", "value": 10, "damageType": "current_hp_percent", "rank": 3},
    {"type": "stat_modifier", "stat": "speed", "value": 40, "duration": 2, "rank": 3}
  ]'::jsonb,
  1,
  20,
  2,
  4,
  5
)
ON CONFLICT (id) DO NOTHING;

-- 5. EMP Burst - Disable electronics (INSTANT ATTACK - AOE)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'cyborg_emp_burst',
  'EMP Burst',
  'species',
  'offensive',
  'cyborg',
  'Electromagnetic pulse disrupts enemies',
  'Systems offline.',
  '💥',
  3,
  'active',
  '[
    {"type": "damage", "value": 20, "damageType": "lightning", "target": "all_enemies", "rank": 1},
    {"type": "stat_modifier", "stat": "accuracy", "value": -15, "duration": 3, "target": "all_enemies", "rank": 1},
    {"type": "damage", "value": 50, "damageType": "lightning", "target": "all_enemies", "rank": 2},
    {"type": "stat_modifier", "stat": "accuracy", "value": -30, "duration": 6, "target": "all_enemies", "rank": 2},
    {"type": "damage", "value": 90, "damageType": "lightning", "target": "all_enemies", "rank": 3},
    {"type": "stat_modifier", "stat": "accuracy", "value": -50, "duration": 1, "target": "all_enemies", "rank": 3},
    {"type": "special", "specialType": "disable_tech_abilities", "duration": 2, "rank": 3}
  ]'::jsonb,
  1,
  25,
  2,
  4,
  5
)
ON CONFLICT (id) DO NOTHING;

-- 6. Synthetic Resilience - Machine toughness (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'cyborg_synthetic_resilience',
  'Synthetic Resilience',
  'species',
  'passive',
  'cyborg',
  'Mechanical parts resist damage',
  'I am more machine than flesh.',
  '🛡️',
  3,
  'passive',
  '[
    {"type": "immunity", "immunityType": "poison", "rank": 1},
    {"type": "immunity", "immunityType": "bleed", "rank": 1},
    {"type": "stat_modifier", "stat": "damage_taken", "value": -8, "target": "self", "rank": 2},
    {"type": "immunity", "immunityType": "poison", "rank": 2},
    {"type": "immunity", "immunityType": "bleed", "rank": 2},
    {"type": "stat_modifier", "stat": "damage_taken", "value": -15, "target": "self", "rank": 3},
    {"type": "immunity", "immunityType": "poison", "rank": 3},
    {"type": "immunity", "immunityType": "bleed", "rank": 3},
    {"type": "immunity", "immunityType": "disease", "rank": 3}
  ]'::jsonb,
  3,
  5,
  10
)
ON CONFLICT (id) DO NOTHING;

-- 7. Neural Interface - Enhanced reflexes (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'cyborg_neural_interface',
  'Neural Interface',
  'species',
  'passive',
  'cyborg',
  'Direct brain-computer connection',
  'Thought becomes action.',
  '🧠',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "speed", "value": 8, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "evasion", "value": 7, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "speed", "value": 18, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "evasion", "value": 15, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "speed", "value": 30, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "evasion", "value": 25, "target": "self", "rank": 3}
  ]'::jsonb,
  3,
  5,
  10
);
