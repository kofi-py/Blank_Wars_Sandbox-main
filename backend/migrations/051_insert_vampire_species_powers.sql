-- Migration: Insert Vampire Species Powers
-- Purpose: Add 7 species-tier powers for Vampire species
-- Species: Vampire - Undead bloodsucker, immortal, seduction, weakness to sunlight

-- ===== VAMPIRE SPECIES POWERS (7 total) =====

-- 1. Blood Drinker - Feed on life essence (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'vampire_blood_drinker',
  'Blood Drinker',
  'species',
  'passive',
  'vampire',
  'Drain life from attacks',
  'Your blood sustains me.',
  '🩸',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "lifesteal", "value": 10, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "lifesteal", "value": 22, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "lifesteal", "value": 40, "target": "self", "rank": 3},
    {"type": "special", "specialType": "overheal_as_shield", "value": 25, "rank": 3}
  ]'::jsonb,
  2,
  4,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 2. Undead Nature - Not truly alive (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'vampire_undead_nature',
  'Undead Nature',
  'species',
  'passive',
  'vampire',
  'Immune to effects that target the living',
  'I am beyond death.',
  '💀',
  3,
  'passive',
  '[
    {"type": "immunity", "immunityType": "poison", "rank": 1},
    {"type": "immunity", "immunityType": "disease", "rank": 1},
    {"type": "immunity", "immunityType": "poison", "rank": 2},
    {"type": "immunity", "immunityType": "disease", "rank": 2},
    {"type": "stat_modifier", "stat": "healing_received", "value": -30, "target": "self", "rank": 2},
    {"type": "immunity", "immunityType": "poison", "rank": 3},
    {"type": "immunity", "immunityType": "disease", "rank": 3},
    {"type": "stat_modifier", "stat": "healing_received", "value": -50, "target": "self", "rank": 3},
    {"type": "special", "specialType": "lifesteal_heals_double", "rank": 3}
  ]'::jsonb,
  2,
  4,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 3. Vampiric Bite - Drain life directly (INSTANT ATTACK)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'vampire_vampiric_bite',
  'Vampiric Bite',
  'species',
  'offensive',
  'vampire',
  'Bite enemy to drain health',
  'I thirst for your blood.',
  '🦷',
  3,
  'active',
  '[
    {"type": "damage", "value": 20, "damageType": "physical", "target": "single_enemy", "rank": 1},
    {"type": "heal", "value": 20, "target": "self", "rank": 1},
    {"type": "damage", "value": 50, "damageType": "physical", "target": "single_enemy", "rank": 2},
    {"type": "heal", "value": 50, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "max_hp", "value": 8, "duration": 999, "target": "self", "rank": 2},
    {"type": "damage", "value": 90, "damageType": "physical", "target": "single_enemy", "rank": 3},
    {"type": "heal", "value": 90, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "max_hp", "value": 15, "duration": 999, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "max_hp", "value": -15, "duration": 999, "target": "enemy", "rank": 3}
  ]'::jsonb,
  1,
  20,
  2,
  4,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 4. Mesmerize - Hypnotic gaze (DEBUFF - Single Target)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'vampire_mesmerize',
  'Mesmerize',
  'species',
  'debuff',
  'vampire',
  'Entrance enemy with hypnotic stare',
  'Look into my eyes.',
  '👁️',
  3,
  'active',
  '[
    {"type": "status_effect", "statusEffect": "charm", "chance": 20, "duration": 3, "target": "single_enemy", "rank": 1},
    {"type": "status_effect", "statusEffect": "charm", "chance": 40, "duration": 6, "target": "single_enemy", "rank": 2},
    {"type": "stat_modifier", "stat": "accuracy", "value": -25, "duration": 2, "target": "enemy", "rank": 2},
    {"type": "status_effect", "statusEffect": "charm", "chance": 65, "duration": 1, "target": "single_enemy", "rank": 3},
    {"type": "stat_modifier", "stat": "accuracy", "value": -50, "duration": 2, "target": "enemy", "rank": 3},
    {"type": "special", "specialType": "charmed_attacks_allies", "rank": 3}
  ]'::jsonb,
  1,
  20,
  2,
  4,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 5. Night Creature - Power of darkness (CONDITIONAL PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'vampire_night_creature',
  'Night Creature',
  'species',
  'passive',
  'vampire',
  'Stronger at night, weaker in sunlight',
  'The night is mine.',
  '🌙',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "all", "value": 15, "condition": "night", "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "all", "value": -10, "condition": "daylight", "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "all", "value": 30, "condition": "night", "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "all", "value": -15, "condition": "daylight", "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "all", "value": 50, "condition": "night", "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "regeneration", "value": 8, "condition": "night", "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "all", "value": -20, "condition": "daylight", "target": "self", "rank": 3}
  ]'::jsonb,
  2,
  4,
  5
)
ON CONFLICT (id) DO NOTHING;

-- 6. Bat Form - Transform into swarm of bats (DEFENSIVE BUFF - Self)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'vampire_bat_form',
  'Bat Form',
  'species',
  'defensive',
  'vampire',
  'Transform to avoid damage',
  'I become the night.',
  '🦇',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "evasion", "value": 30, "duration": 1, "target": "self", "rank": 1},
    {"type": "special", "specialType": "dodge_physical_attacks", "chance": 40, "duration": 1, "rank": 1},
    {"type": "stat_modifier", "stat": "evasion", "value": 60, "duration": 2, "target": "self", "rank": 2},
    {"type": "special", "specialType": "dodge_physical_attacks", "chance": 60, "duration": 2, "rank": 2},
    {"type": "stat_modifier", "stat": "speed", "value": 30, "duration": 2, "rank": 2},
    {"type": "stat_modifier", "stat": "evasion", "value": 90, "duration": 2, "target": "self", "rank": 3},
    {"type": "special", "specialType": "dodge_physical_attacks", "chance": 80, "duration": 2, "rank": 3},
    {"type": "stat_modifier", "stat": "speed", "value": 60, "duration": 2, "rank": 3},
    {"type": "special", "specialType": "untargetable", "duration": 3, "rank": 3}
  ]'::jsonb,
  1,
  20,
  2,
  4,
  5
)
ON CONFLICT (id) DO NOTHING;

-- 7. Immortal Resilience - Cheat death (CONDITIONAL PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'vampire_immortal_resilience',
  'Immortal Resilience',
  'species',
  'passive',
  'vampire',
  'Refuse to die',
  'Death cannot claim me.',
  '⚰️',
  3,
  'passive',
  '[
    {"type": "special", "specialType": "revive_on_death", "chance": 15, "hp_percent": 20, "rank": 1},
    {"type": "special", "specialType": "revive_on_death", "chance": 30, "hp_percent": 35, "rank": 2},
    {"type": "special", "specialType": "revive_on_death", "chance": 50, "hp_percent": 55, "rank": 3},
    {"type": "stat_modifier", "stat": "lifesteal", "value": 50, "duration": 2, "condition": "after_revive", "rank": 3}
  ]'::jsonb,
  3,
  5,
  10
)
ON CONFLICT (id) DO NOTHING;
