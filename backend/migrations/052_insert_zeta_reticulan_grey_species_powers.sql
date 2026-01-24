-- Migration: Insert Zeta Reticulan Grey Species Powers
-- Purpose: Add 7 species-tier powers for Zeta_reticulan_grey species
-- Species: Zeta_reticulan_grey - Alien Grey, telepathy, advanced technology, psychic abilities

-- ===== ZETA RETICULAN GREY SPECIES POWERS (7 total) =====

-- 1. Telepathy - Read and influence minds (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'zeta_telepathy',
  'Telepathy',
  'species',
  'passive',
  'zeta_reticulan_grey',
  'Psychic connection to all minds',
  'I hear your thoughts.',
  '🧠',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "psychic_damage", "value": 12, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "accuracy", "value": 8, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "psychic_damage", "value": 25, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "accuracy", "value": 18, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "psychic_damage", "value": 45, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "accuracy", "value": 30, "target": "self", "rank": 3}
  ]'::jsonb,
  2,
  4,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 2. Advanced Physiology - Alien biology (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'zeta_advanced_physiology',
  'Advanced Physiology',
  'species',
  'passive',
  'zeta_reticulan_grey',
  'Alien biology resists toxins',
  'My biology is beyond yours.',
  '👽',
  3,
  'passive',
  '[
    {"type": "immunity", "immunityType": "poison", "rank": 1},
    {"type": "immunity", "immunityType": "disease", "rank": 1},
    {"type": "stat_modifier", "stat": "max_mana", "value": 15, "target": "self", "rank": 1},
    {"type": "immunity", "immunityType": "poison", "rank": 2},
    {"type": "immunity", "immunityType": "disease", "rank": 2},
    {"type": "stat_modifier", "stat": "max_mana", "value": 30, "target": "self", "rank": 2},
    {"type": "immunity", "immunityType": "poison", "rank": 3},
    {"type": "immunity", "immunityType": "disease", "rank": 3},
    {"type": "stat_modifier", "stat": "max_mana", "value": 50, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "mana_regen", "value": 25, "target": "self", "rank": 3}
  ]'::jsonb,
  2,
  4,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 3. Mind Blast - Psychic attack (INSTANT ATTACK)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'zeta_mind_blast',
  'Mind Blast',
  'species',
  'offensive',
  'zeta_reticulan_grey',
  'Devastating mental assault',
  'Your mind shatters.',
  '💥',
  3,
  'active',
  '[
    {"type": "damage", "value": 30, "damageType": "psychic", "target": "single_enemy", "rank": 1},
    {"type": "special", "specialType": "ignore_physical_armor", "rank": 1},
    {"type": "damage", "value": 70, "damageType": "psychic", "target": "single_enemy", "rank": 2},
    {"type": "special", "specialType": "ignore_physical_armor", "rank": 2},
    {"type": "status_effect", "statusEffect": "confusion", "chance": 25, "duration": 3, "rank": 2},
    {"type": "damage", "value": 130, "damageType": "psychic", "target": "single_enemy", "rank": 3},
    {"type": "special", "specialType": "ignore_physical_armor", "rank": 3},
    {"type": "status_effect", "statusEffect": "confusion", "chance": 50, "duration": 6, "rank": 3}
  ]'::jsonb,
  1,
  20,
  2,
  4,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 4. Mental Domination - Control enemy (DEBUFF - Single Target)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'zeta_mental_domination',
  'Mental Domination',
  'species',
  'debuff',
  'zeta_reticulan_grey',
  'Seize control of enemy mind',
  'You are mine to control.',
  '🎭',
  3,
  'active',
  '[
    {"type": "status_effect", "statusEffect": "charm", "chance": 20, "duration": 3, "target": "single_enemy", "rank": 1},
    {"type": "status_effect", "statusEffect": "charm", "chance": 40, "duration": 6, "target": "single_enemy", "rank": 2},
    {"type": "special", "specialType": "controlled_attacks_enemies", "rank": 2},
    {"type": "status_effect", "statusEffect": "charm", "chance": 65, "duration": 1, "target": "single_enemy", "rank": 3},
    {"type": "special", "specialType": "controlled_attacks_enemies", "rank": 3},
    {"type": "special", "specialType": "copy_enemy_ability", "count": 1, "duration": 2, "rank": 3}
  ]'::jsonb,
  1,
  25,
  2,
  4,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 5. Psychic Shield - Mental barrier (DEFENSIVE BUFF - Self)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'zeta_psychic_shield',
  'Psychic Shield',
  'species',
  'defensive',
  'zeta_reticulan_grey',
  'Protect mind with psychic barrier',
  'My mind is shielded.',
  '🛡️',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "magic_defense", "value": 20, "duration": 1, "target": "self", "rank": 1},
    {"type": "immunity", "immunityType": "cc", "count": 1, "duration": 1, "rank": 1},
    {"type": "stat_modifier", "stat": "magic_defense", "value": 45, "duration": 2, "target": "self", "rank": 2},
    {"type": "immunity", "immunityType": "cc", "count": 2, "duration": 2, "rank": 2},
    {"type": "special", "specialType": "reflect_mental_attacks", "value": 30, "duration": 2, "rank": 2},
    {"type": "stat_modifier", "stat": "magic_defense", "value": 80, "duration": 2, "target": "self", "rank": 3},
    {"type": "immunity", "immunityType": "cc", "count": 99, "duration": 2, "rank": 3},
    {"type": "special", "specialType": "reflect_mental_attacks", "value": 60, "duration": 2, "rank": 3}
  ]'::jsonb,
  1,
  15,
  2,
  4,
  5
)
ON CONFLICT (id) DO NOTHING;

-- 6. Alien Technology - Advanced devices (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'zeta_alien_technology',
  'Alien Technology',
  'species',
  'passive',
  'zeta_reticulan_grey',
  'Access to superior technology',
  'Our technology is millennia beyond yours.',
  '🛸',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "equipment_effectiveness", "value": 12, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "equipment_effectiveness", "value": 25, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "all_damage", "value": 10, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "equipment_effectiveness", "value": 45, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "all_damage", "value": 20, "target": "self", "rank": 3},
    {"type": "special", "specialType": "tech_abilities_empowered", "value": 30, "rank": 3}
  ]'::jsonb,
  2,
  4,
  5
)
ON CONFLICT (id) DO NOTHING;

-- 7. Hive Mind - Connected consciousness (PASSIVE AURA)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'zeta_hive_mind',
  'Hive Mind',
  'species',
  'passive',
  'zeta_reticulan_grey',
  'Share thoughts with allies',
  'We are one mind.',
  '🌐',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "accuracy", "value": 5, "target": "all_allies", "rank": 1},
    {"type": "stat_modifier", "stat": "psychic_damage", "value": 8, "target": "all_allies", "rank": 1},
    {"type": "stat_modifier", "stat": "accuracy", "value": 12, "target": "all_allies", "rank": 2},
    {"type": "stat_modifier", "stat": "psychic_damage", "value": 18, "target": "all_allies", "rank": 2},
    {"type": "special", "specialType": "shared_vision", "rank": 2},
    {"type": "stat_modifier", "stat": "accuracy", "value": 20, "target": "all_allies", "rank": 3},
    {"type": "stat_modifier", "stat": "psychic_damage", "value": 30, "target": "all_allies", "rank": 3},
    {"type": "special", "specialType": "shared_vision", "rank": 3},
    {"type": "special", "specialType": "telepathic_coordination", "value": 15, "rank": 3}
  ]'::jsonb,
  3,
  5,
  10
)
ON CONFLICT (id) DO NOTHING;
