-- Migration: Insert Fenrir Signature Powers
-- Purpose: Add 7 unique signature powers for Fenrir character
-- Character: Fenrir (Beast, Dire_wolf) - Legendary wolf, primal fury, pack tactics, Norse mythology

-- ===== FENRIR SIGNATURE POWERS (7 total) =====

-- 1. Alpha's Roar (DEBUFF - All Enemies)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'fenrir_alphas_roar',
  'Alpha''s Roar',
  'signature',
  'support',
  'fenrir',
  'Terrifying howl that weakens all enemies',
  '"My howl strikes terror into the hearts of gods."',
  '🐺',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "attack", "value": -15, "duration": 1, "target": "all_enemies", "rank": 1},
    {"type": "stat_modifier", "stat": "accuracy", "value": -15, "duration": 1, "target": "all_enemies", "rank": 1},
    {"type": "stat_modifier", "stat": "attack", "value": -35, "duration": 2, "target": "all_enemies", "rank": 2},
    {"type": "stat_modifier", "stat": "accuracy", "value": -35, "duration": 2, "target": "all_enemies", "rank": 2},
    {"type": "status_effect", "statusEffect": "fear", "duration": 2, "chance": 25, "target": "all_enemies", "rank": 2},
    {"type": "stat_modifier", "stat": "attack", "value": -60, "duration": 1, "target": "all_enemies", "rank": 3},
    {"type": "stat_modifier", "stat": "accuracy", "value": -60, "duration": 1, "target": "all_enemies", "rank": 3},
    {"type": "status_effect", "statusEffect": "fear", "duration": 1, "chance": 70, "target": "all_enemies", "rank": 3}
  ]'::jsonb,
  1,
  18,
  5,
  6,
  1
);

-- 2. Ragnarok Bite (INSTANT ATTACK)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'fenrir_ragnarok_bite',
  'Ragnarok Bite',
  'signature',
  'offensive',
  'fenrir',
  'Legendary jaws that crush and bleed',
  '"The gods themselves fear my bite."',
  '🦷',
  3,
  'active',
  '[
    {"type": "damage", "value": 40, "damageType": "physical", "target": "single_enemy", "rank": 1},
    {"type": "status_effect", "statusEffect": "bleed", "duration": 1, "damage_per_turn": 20, "rank": 1},
    {"type": "damage", "value": 90, "damageType": "physical", "target": "single_enemy", "rank": 2},
    {"type": "status_effect", "statusEffect": "bleed", "duration": 2, "damage_per_turn": 35, "rank": 2},
    {"type": "stat_modifier", "stat": "healing_received", "value": -30, "duration": 2, "target": "single_enemy", "rank": 2},
    {"type": "damage", "value": 170, "damageType": "physical", "target": "single_enemy", "rank": 3},
    {"type": "status_effect", "statusEffect": "bleed", "duration": 1, "damage_per_turn": 60, "rank": 3},
    {"type": "status_effect", "statusEffect": "grievous_wound", "duration": 1, "rank": 3},
    {"type": "max_hp_reduction", "value": 15, "target": "single_enemy", "rank": 3}
  ]'::jsonb,
  1,
  20,
  5,
  6,
  1
);

-- 3. Child of Prophecy (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'fenrir_child_of_prophecy',
  'Child of Prophecy',
  'signature',
  'passive',
  'fenrir',
  'Destined to end the gods',
  '"I am the harbinger of Ragnarok."',
  '🌑',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "damage", "value": 15, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "max_hp", "value": 10, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "damage", "value": 35, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "max_hp", "value": 20, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "critical_chance", "value": 15, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "damage", "value": 65, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "max_hp", "value": 35, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "critical_chance", "value": 30, "target": "self", "rank": 3},
    {"type": "conditional", "condition": "enemy_species_is", "species": "deity", "effects": [
      {"type": "stat_modifier", "stat": "damage", "value": 50, "target": "self"}
    ], "rank": 3}
  ]'::jsonb,
  5,
  6,
  1
);

-- 4. Fenrir's Hunt (OFFENSIVE BUFF - Self)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'fenrir_hunt',
  'Fenrir''s Hunt',
  'signature',
  'offensive',
  'fenrir',
  'Relentless pursuit of prey',
  '"Nothing escapes the wolf."',
  '🏃',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "speed", "value": 25, "duration": 1, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "damage", "value": 20, "duration": 1, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "speed", "value": 55, "duration": 2, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "damage", "value": 45, "duration": 2, "target": "self", "rank": 2},
    {"type": "apply_on_hit", "statusEffect": "bleed", "duration": 2, "rank": 2},
    {"type": "stat_modifier", "stat": "speed", "value": 100, "duration": 1, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "damage", "value": 85, "duration": 1, "target": "self", "rank": 3},
    {"type": "apply_on_hit", "statusEffect": "bleed", "duration": 1, "rank": 3},
    {"type": "extra_action", "count": 1, "rank": 3}
  ]'::jsonb,
  1,
  22,
  5,
  6,
  5
);

-- 5. Blood Frenzy (CONDITIONAL PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'fenrir_blood_frenzy',
  'Blood Frenzy',
  'signature',
  'passive',
  'fenrir',
  'Killing fuels rage and power',
  '"Blood makes me stronger!"',
  '🩸',
  3,
  'passive',
  '[
    {"type": "on_kill", "effects": [
      {"type": "stat_modifier", "stat": "damage", "value": 20, "duration": 2, "target": "self", "stacks": true},
      {"type": "stat_modifier", "stat": "speed", "value": 15, "duration": 2, "target": "self", "stacks": true}
    ], "rank": 1},
    {"type": "on_kill", "effects": [
      {"type": "stat_modifier", "stat": "damage", "value": 45, "duration": 1, "target": "self", "stacks": true},
      {"type": "stat_modifier", "stat": "speed", "value": 35, "duration": 1, "target": "self", "stacks": true},
      {"type": "lifesteal", "value": 20, "duration": 1, "target": "self", "stacks": true}
    ], "rank": 2},
    {"type": "on_kill", "effects": [
      {"type": "stat_modifier", "stat": "damage", "value": 80, "duration": 2, "target": "self", "stacks": true},
      {"type": "stat_modifier", "stat": "speed", "value": 60, "duration": 2, "target": "self", "stacks": true},
      {"type": "lifesteal", "value": 40, "duration": 2, "target": "self", "stacks": true},
      {"type": "heal", "value": 30, "target": "self"}
    ], "rank": 3}
  ]'::jsonb,
  5,
  6,
  5
);

-- 6. Break the Chains (INSTANT EFFECT)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'fenrir_break_the_chains',
  'Break the Chains',
  'signature',
  'defensive',
  'fenrir',
  'Shatter all restraints and gain power',
  '"No chains can hold me!"',
  '⛓️',
  3,
  'active',
  '[
    {"type": "purge", "purgeType": "debuff", "count": 99, "target": "self", "rank": 1},
    {"type": "purge", "purgeType": "cc", "count": 99, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "all", "value": 30, "duration": 1, "target": "self", "rank": 1},
    {"type": "purge", "purgeType": "debuff", "count": 99, "target": "self", "rank": 2},
    {"type": "purge", "purgeType": "cc", "count": 99, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "all", "value": 65, "duration": 2, "target": "self", "rank": 2},
    {"type": "immunity", "immunityType": "cc", "duration": 2, "rank": 2},
    {"type": "purge", "purgeType": "debuff", "count": 99, "target": "self", "rank": 3},
    {"type": "purge", "purgeType": "cc", "count": 99, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "all", "value": 120, "duration": 1, "target": "self", "rank": 3},
    {"type": "immunity", "immunityType": "cc", "duration": 1, "rank": 3},
    {"type": "immunity", "immunityType": "debuff", "duration": 1, "rank": 3},
    {"type": "heal", "value": 50, "target": "self", "rank": 3}
  ]'::jsonb,
  3,
  30,
  5,
  6,
  10
);

-- 7. Ragnarok Unleashed (INSTANT ATTACK - AOE)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'fenrir_ragnarok_unleashed',
  'Ragnarok Unleashed',
  'signature',
  'offensive',
  'fenrir',
  'End of days - devastating attack on all enemies',
  '"I bring the end of all things!"',
  '🌋',
  3,
  'active',
  '[
    {"type": "damage", "value": 80, "damageType": "physical", "target": "all_enemies", "rank": 1},
    {"type": "status_effect", "statusEffect": "bleed", "duration": 2, "target": "all_enemies", "rank": 1},
    {"type": "damage", "value": 160, "damageType": "physical", "target": "all_enemies", "rank": 2},
    {"type": "status_effect", "statusEffect": "bleed", "duration": 2, "target": "all_enemies", "rank": 2},
    {"type": "status_effect", "statusEffect": "fear", "duration": 2, "target": "all_enemies", "rank": 2},
    {"type": "damage", "value": 300, "damageType": "physical", "target": "all_enemies", "rank": 3},
    {"type": "status_effect", "statusEffect": "bleed", "duration": 1, "target": "all_enemies", "rank": 3},
    {"type": "status_effect", "statusEffect": "fear", "duration": 1, "target": "all_enemies", "rank": 3},
    {"type": "max_hp_reduction", "value": 20, "target": "all_enemies", "rank": 3},
    {"type": "stat_modifier", "stat": "all", "value": 100, "duration": 2, "target": "self", "rank": 3}
  ]'::jsonb,
  4,
  50,
  5,
  6,
  10
);

COMMENT ON TABLE power_definitions IS 'Added Fenrir signature powers - legendary wolf of Norse mythology';
