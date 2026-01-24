-- Migration: Insert Dire Wolf Species Powers
-- Purpose: Add 7 species-tier powers for Dire_wolf species
-- Species: Dire_wolf - Primal predator, pack hunter, savage beast

-- ===== DIRE WOLF SPECIES POWERS (7 total) =====

-- 1. Alpha Predator - Apex hunter (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'dire_wolf_alpha_predator',
  'Alpha Predator',
  'species',
  'passive',
  'dire_wolf',
  'Natural predator instincts enhance combat',
  'I am the apex predator.',
  '🐺',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "physical_attack", "value": 12, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "critical_chance", "value": 8, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "physical_attack", "value": 25, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "critical_chance", "value": 18, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "physical_attack", "value": 45, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "critical_chance", "value": 30, "target": "self", "rank": 3}
  ]'::jsonb,
  2,
  4,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 2. Pack Tactics - Stronger with allies (CONDITIONAL PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'dire_wolf_pack_tactics',
  'Pack Tactics',
  'species',
  'passive',
  'dire_wolf',
  'Fight better alongside packmates',
  'The pack hunts as one.',
  '🐾',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "damage", "value": 10, "condition": "ally_nearby", "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "damage", "value": 22, "condition": "ally_nearby", "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "accuracy", "value": 15, "condition": "ally_nearby", "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "damage", "value": 40, "condition": "ally_nearby", "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "accuracy", "value": 30, "condition": "ally_nearby", "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "critical_chance", "value": 20, "condition": "ally_nearby", "target": "self", "rank": 3}
  ]'::jsonb,
  2,
  4,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 3. Savage Bite - Vicious tearing attack (INSTANT ATTACK)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'dire_wolf_savage_bite',
  'Savage Bite',
  'species',
  'offensive',
  'dire_wolf',
  'Tear into enemy with powerful jaws',
  'Fangs that rend flesh.',
  '🦷',
  3,
  'active',
  '[
    {"type": "damage", "value": 30, "damageType": "physical", "target": "single_enemy", "rank": 1},
    {"type": "status_effect", "statusEffect": "bleed", "value": 10, "duration": 3, "rank": 1},
    {"type": "damage", "value": 70, "damageType": "physical", "target": "single_enemy", "rank": 2},
    {"type": "status_effect", "statusEffect": "bleed", "value": 20, "duration": 4, "rank": 2},
    {"type": "damage", "value": 130, "damageType": "physical", "target": "single_enemy", "rank": 3},
    {"type": "status_effect", "statusEffect": "bleed", "value": 35, "duration": 6, "rank": 3},
    {"type": "stat_modifier", "stat": "healing_received", "value": -30, "duration": 2, "target": "enemy", "rank": 3}
  ]'::jsonb,
  1,
  20,
  2,
  4,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 4. Primal Speed - Enhanced movement (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'dire_wolf_primal_speed',
  'Primal Speed',
  'species',
  'passive',
  'dire_wolf',
  'Natural agility and speed',
  'Swift as the wind.',
  '💨',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "speed", "value": 10, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "speed", "value": 22, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "speed", "value": 40, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "evasion", "value": 15, "target": "self", "rank": 3}
  ]'::jsonb,
  2,
  4,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 5. Howl of the Wild - Terrify and rally (DEBUFF - All Enemies + BUFF - All Allies)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'dire_wolf_howl_of_the_wild',
  'Howl of the Wild',
  'species',
  'support',
  'dire_wolf',
  'Primal howl terrifies foes and rallies allies',
  'Hear my call!',
  '🌙',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "attack", "value": -12, "duration": 1, "target": "all_enemies", "rank": 1},
    {"type": "stat_modifier", "stat": "attack", "value": 12, "duration": 1, "target": "all_allies", "rank": 1},
    {"type": "stat_modifier", "stat": "attack", "value": -25, "duration": 2, "target": "all_enemies", "rank": 2},
    {"type": "stat_modifier", "stat": "attack", "value": 25, "duration": 2, "target": "all_allies", "rank": 2},
    {"type": "status_effect", "statusEffect": "fear", "chance": 20, "duration": 3, "target": "all_enemies", "rank": 2},
    {"type": "stat_modifier", "stat": "attack", "value": -40, "duration": 2, "target": "all_enemies", "rank": 3},
    {"type": "stat_modifier", "stat": "attack", "value": 40, "duration": 2, "target": "all_allies", "rank": 3},
    {"type": "status_effect", "statusEffect": "fear", "chance": 40, "duration": 6, "target": "all_enemies", "rank": 3}
  ]'::jsonb,
  1,
  20,
  2,
  4,
  5
)
ON CONFLICT (id) DO NOTHING;

-- 6. Thick Fur - Natural armor (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'dire_wolf_thick_fur',
  'Thick Fur',
  'species',
  'passive',
  'dire_wolf',
  'Dense fur provides protection',
  'My hide is my armor.',
  '🛡️',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "physical_defense", "value": 8, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "physical_defense", "value": 18, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "physical_defense", "value": 30, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "elemental_resistance", "value": 20, "target": "self", "rank": 3}
  ]'::jsonb,
  2,
  4,
  5
)
ON CONFLICT (id) DO NOTHING;

-- 7. Blood Frenzy - Rage when wounded (CONDITIONAL PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'dire_wolf_blood_frenzy',
  'Blood Frenzy',
  'species',
  'passive',
  'dire_wolf',
  'Become more dangerous when injured',
  'Pain makes me stronger.',
  '🩸',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "attack_speed", "value": 15, "condition": "hp_below_50", "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "damage", "value": 12, "condition": "hp_below_50", "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "attack_speed", "value": 30, "condition": "hp_below_50", "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "damage", "value": 25, "condition": "hp_below_50", "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "attack_speed", "value": 50, "condition": "hp_below_50", "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "damage", "value": 45, "condition": "hp_below_50", "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "lifesteal", "value": 25, "condition": "hp_below_50", "target": "self", "rank": 3}
  ]'::jsonb,
  3,
  5,
  10
)
ON CONFLICT (id) DO NOTHING;
