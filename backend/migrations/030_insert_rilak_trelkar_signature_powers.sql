-- Migration: Insert Rilak Trelkar Signature Powers
-- Purpose: Add 7 unique signature powers for Rilak Trelkar character
-- Character: Rilak Trelkar (Scholar, Zeta_reticulan_grey) - Alien scholar, telepathy, advanced technology, analytical mind

-- ===== RILAK TRELKAR SIGNATURE POWERS (7 total) =====

-- 1. Telepathic Mind (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'rilak_telepathic_mind',
  'Telepathic Mind',
  'signature',
  'passive',
  'rilak_trelkar',
  'Mental communication and superior insight',
  '"Your thoughts are an open book to me."',
  '🧠',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "intelligence", "value": 12, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "accuracy", "value": 10, "target": "self", "rank": 1},
    {"type": "immunity", "immunityType": "confusion", "rank": 1},
    {"type": "stat_modifier", "stat": "intelligence", "value": 28, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "accuracy", "value": 25, "target": "self", "rank": 2},
    {"type": "immunity", "immunityType": "confusion", "rank": 2},
    {"type": "immunity", "immunityType": "charm", "rank": 2},
    {"type": "special", "specialType": "see_enemy_cooldowns", "rank": 2},
    {"type": "stat_modifier", "stat": "intelligence", "value": 50, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "accuracy", "value": 45, "target": "self", "rank": 3},
    {"type": "immunity", "immunityType": "confusion", "rank": 3},
    {"type": "immunity", "immunityType": "charm", "rank": 3},
    {"type": "immunity", "immunityType": "psychic", "rank": 3},
    {"type": "special", "specialType": "see_all_enemy_info", "rank": 3}
  ]'::jsonb,
  5,
  6,
  1
);

-- 2. Psychic Blast (INSTANT ATTACK)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'rilak_psychic_blast',
  'Psychic Blast',
  'signature',
  'offensive',
  'rilak_trelkar',
  'Mental attack that ignores physical armor',
  '"Feel the power of my mind."',
  '💭',
  3,
  'active',
  '[
    {"type": "damage", "value": 35, "damageType": "psychic", "target": "single_enemy", "rank": 1},
    {"type": "special", "specialType": "ignore_physical_armor", "rank": 1},
    {"type": "damage", "value": 80, "damageType": "psychic", "target": "single_enemy", "rank": 2},
    {"type": "special", "specialType": "ignore_physical_armor", "rank": 2},
    {"type": "status_effect", "statusEffect": "confusion", "duration": 2, "chance": 30, "rank": 2},
    {"type": "damage", "value": 155, "damageType": "psychic", "target": "single_enemy", "rank": 3},
    {"type": "special", "specialType": "ignore_physical_armor", "rank": 3},
    {"type": "special", "specialType": "ignore_magical_armor", "rank": 3},
    {"type": "status_effect", "statusEffect": "confusion", "duration": 2, "chance": 70, "rank": 3},
    {"type": "stat_modifier", "stat": "attack", "value": -25, "duration": 2, "target": "single_enemy", "rank": 3}
  ]'::jsonb,
  1,
  18,
  5,
  6,
  1
);

-- 3. Advanced Technology (TACTICAL)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'rilak_advanced_technology',
  'Advanced Technology',
  'signature',
  'support',
  'rilak_trelkar',
  'Alien gadgets provide random beneficial effects',
  '"Our technology is beyond your comprehension."',
  '🛸',
  3,
  'active',
  '[
    {"type": "random_beneficial", "options": [
      {"type": "shield", "value": 20, "target": "single_ally"},
      {"type": "heal", "value": 25, "target": "single_ally"},
      {"type": "stat_modifier", "stat": "all", "value": 30, "duration": 2, "target": "single_ally"}
    ], "rank": 1},
    {"type": "random_beneficial", "count": 2, "options": [
      {"type": "shield", "value": 30, "target": "random_ally"},
      {"type": "heal", "value": 35, "target": "random_ally"},
      {"type": "stat_modifier", "stat": "all", "value": 40, "duration": 2, "target": "random_ally"}
    ], "rank": 2},
    {"type": "shield", "value": 30, "target": "all_allies", "rank": 3},
    {"type": "heal", "value": 30, "target": "all_allies", "rank": 3},
    {"type": "stat_modifier", "stat": "all", "value": 40, "duration": 2, "target": "all_allies", "rank": 3}
  ]'::jsonb,
  1,
  20,
  5,
  6,
  1
);

-- 4. Analytical Scan (DEBUFF - Single Target)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'rilak_analytical_scan',
  'Analytical Scan',
  'signature',
  'support',
  'rilak_trelkar',
  'Study enemy weaknesses to massively amplify damage',
  '"Analyzing... weakness identified."',
  '🔍',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "defense", "value": -25, "duration": 2, "target": "single_enemy", "rank": 1},
    {"type": "stat_modifier", "stat": "damage_taken", "value": 15, "duration": 2, "target": "single_enemy", "rank": 1},
    {"type": "stat_modifier", "stat": "defense", "value": -50, "duration": 2, "target": "single_enemy", "rank": 2},
    {"type": "stat_modifier", "stat": "damage_taken", "value": 35, "duration": 2, "target": "single_enemy", "rank": 2},
    {"type": "special", "specialType": "reveal_weak_point", "appliesTo": "next_ally_attack", "rank": 2},
    {"type": "stat_modifier", "stat": "defense", "value": -80, "duration": 2, "target": "single_enemy", "rank": 3},
    {"type": "stat_modifier", "stat": "damage_taken", "value": 70, "duration": 2, "target": "single_enemy", "rank": 3},
    {"type": "special", "specialType": "force_critical", "duration": 1, "appliesTo": "ally_attacks_on_target", "rank": 3}
  ]'::jsonb,
  2,
  25,
  5,
  6,
  5
);

-- 5. Mind Control (DEBUFF - Single Target)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'rilak_mind_control',
  'Mind Control',
  'signature',
  'support',
  'rilak_trelkar',
  'Dominate enemy psyche - make them attack allies',
  '"Your mind is mine to control."',
  '🌀',
  3,
  'active',
  '[
    {"type": "status_effect", "statusEffect": "charm", "duration": 1, "chance": 30, "rank": 1},
    {"type": "status_effect", "statusEffect": "charm", "duration": 2, "chance": 60, "rank": 2},
    {"type": "status_effect", "statusEffect": "confusion", "duration": 2, "failsafe": true, "rank": 2},
    {"type": "status_effect", "statusEffect": "charm", "duration": 2, "chance": 90, "rank": 3},
    {"type": "stat_modifier", "stat": "all", "value": -40, "duration": 2, "target": "single_enemy", "failsafe": true, "rank": 3}
  ]'::jsonb,
  2,
  30,
  5,
  6,
  5
);

-- 6. Genetic Enhancement (GROUP BUFF)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'rilak_genetic_enhancement',
  'Genetic Enhancement',
  'signature',
  'support',
  'rilak_trelkar',
  'Evolve ally capabilities through advanced science',
  '"Allow me to optimize your genetic structure."',
  '🧬',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "max_hp", "value": 20, "duration": 2, "target": "all_allies", "rank": 1},
    {"type": "stat_modifier", "stat": "damage", "value": 20, "duration": 2, "target": "all_allies", "rank": 1},
    {"type": "stat_modifier", "stat": "max_hp", "value": 45, "duration": 2, "target": "all_allies", "rank": 2},
    {"type": "stat_modifier", "stat": "damage", "value": 45, "duration": 2, "target": "all_allies", "rank": 2},
    {"type": "stat_modifier", "stat": "speed", "value": 30, "duration": 2, "target": "all_allies", "rank": 2},
    {"type": "heal", "value": 30, "target": "all_allies", "rank": 2},
    {"type": "stat_modifier", "stat": "max_hp", "value": 80, "duration": 2, "target": "all_allies", "rank": 3},
    {"type": "stat_modifier", "stat": "damage", "value": 80, "duration": 2, "target": "all_allies", "rank": 3},
    {"type": "stat_modifier", "stat": "speed", "value": 60, "duration": 2, "target": "all_allies", "rank": 3},
    {"type": "heal", "value": 60, "target": "all_allies", "rank": 3},
    {"type": "regen", "value": 5, "duration": 2, "target": "all_allies", "rank": 3}
  ]'::jsonb,
  3,
  40,
  5,
  6,
  10
);

-- 7. Zeta Protocol (INSTANT EFFECT)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'rilak_zeta_protocol',
  'Zeta Protocol',
  'signature',
  'ultimate',
  'rilak_trelkar',
  'Ultimate alien technology - multiple powerful effects',
  '"Initiating Zeta Protocol. Stand clear."',
  '👽',
  3,
  'active',
  '[
    {"type": "choice", "options": [
      {"type": "damage", "value": 100, "damageType": "psychic", "target": "all_enemies"},
      {"type": "heal", "value": 40, "target": "all_allies"},
      {"type": "stat_modifier", "stat": "all", "value": 50, "duration": 1, "target": "all_allies"}
    ], "rank": 1},
    {"type": "choice", "options": [
      {"type": "damage", "value": 200, "damageType": "psychic", "target": "all_enemies", "bonus": {"type": "status_effect", "statusEffect": "confusion", "duration": 2}},
      {"type": "heal", "value": 70, "target": "all_allies", "bonus": {"type": "purge", "purgeType": "debuff", "count": 99}},
      {"type": "stat_modifier", "stat": "all", "value": 90, "duration": 2, "target": "all_allies"}
    ], "rank": 2},
    {"type": "damage", "value": 150, "damageType": "psychic", "target": "all_enemies", "rank": 3},
    {"type": "heal", "value": 50, "target": "all_allies", "rank": 3},
    {"type": "stat_modifier", "stat": "all", "value": 70, "duration": 2, "target": "all_allies", "rank": 3},
    {"type": "cooldown_reset", "count": 99, "target": "all_allies", "rank": 3}
  ]'::jsonb,
  4,
  50,
  5,
  6,
  10
);

COMMENT ON TABLE power_definitions IS 'Added Rilak Trelkar signature powers - alien scholar specialist';
