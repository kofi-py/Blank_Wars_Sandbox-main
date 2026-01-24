-- Migration: Fix Achilles Signature Powers
-- Purpose: Replace incorrect Achilles powers with correct 7 from design
-- Character: Achilles (Warrior, Human) - Greek hero, invulnerability, legendary warrior

-- ===== ACHILLES SIGNATURE POWERS (7 total) =====

-- 1. Achilles' Invulnerability - Nearly impervious to harm (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'achilles_invulnerability',
  'Achilles'' Invulnerability',
  'signature',
  'passive',
  'achilles',
  'Nearly impervious to harm',
  '"I am untouchable in battle."',
  '🛡️',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "damage_taken", "value": -8, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "damage_taken", "value": -18, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "damage_taken", "value": -30, "target": "self", "rank": 3},
    {"type": "immunity", "immunityType": "critical_hits", "rank": 3}
  ]'::jsonb,
  5,
  6,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 2. Legendary Warrior - Unmatched combat skill (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'achilles_legendary_warrior',
  'Legendary Warrior',
  'signature',
  'passive',
  'achilles',
  'Unmatched combat skill',
  '"None can match my prowess in battle."',
  '⚔️',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "physical_attack", "value": 10, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "physical_attack", "value": 22, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "physical_attack", "value": 40, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "lifesteal", "value": 15, "target": "self", "rank": 3}
  ]'::jsonb,
  5,
  6,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 3. Spear of Peleus - Achilles' legendary spear (INSTANT ATTACK)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'achilles_spear_of_peleus',
  'Spear of Peleus',
  'signature',
  'offensive',
  'achilles',
  'Strike with legendary spear',
  '"My spear never fails."',
  '🗡️',
  3,
  'active',
  '[
    {"type": "damage", "value": 30, "damageType": "physical", "target": "single_enemy", "rank": 1},
    {"type": "special", "specialType": "cannot_be_blocked", "rank": 1},
    {"type": "damage", "value": 70, "damageType": "physical", "target": "single_enemy", "rank": 2},
    {"type": "special", "specialType": "cannot_be_blocked", "rank": 2},
    {"type": "damage", "value": 130, "damageType": "physical", "target": "single_enemy", "rank": 3},
    {"type": "special", "specialType": "cannot_be_blocked", "rank": 3},
    {"type": "special", "specialType": "pierce_through_to_second_target", "rank": 3}
  ]'::jsonb,
  1,
  20,
  5,
  6,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 4. Wrath of Achilles - Legendary fury (OFFENSIVE BUFF - Self)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'achilles_wrath',
  'Wrath of Achilles',
  'signature',
  'offensive',
  'achilles',
  'Channel legendary fury',
  '"Feel my wrath!"',
  '😤',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "damage", "value": 25, "duration": 0, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "speed", "value": 20, "duration": 0, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "damage", "value": 55, "duration": 2, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "speed", "value": 40, "duration": 2, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "damage", "value": 100, "duration": 2, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "speed", "value": 70, "duration": 2, "target": "self", "rank": 3},
    {"type": "special", "specialType": "attacks_cannot_miss", "duration": 2, "rank": 3}
  ]'::jsonb,
  1,
  25,
  5,
  6,
  5
)
ON CONFLICT (id) DO NOTHING;

-- 5. Swift-Footed - Legendary speed (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'achilles_swift_footed',
  'Swift-Footed',
  'signature',
  'passive',
  'achilles',
  'Legendary speed',
  '"Swift as the wind."',
  '🏃',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "speed", "value": 12, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "speed", "value": 25, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "speed", "value": 45, "target": "self", "rank": 3},
    {"type": "special", "specialType": "attack_twice_per_turn", "rank": 3}
  ]'::jsonb,
  5,
  6,
  5
)
ON CONFLICT (id) DO NOTHING;

-- 6. Divine Heritage - Son of the sea goddess Thetis (DEFENSIVE BUFF - Self)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'achilles_divine_heritage',
  'Divine Heritage',
  'signature',
  'defensive',
  'achilles',
  'Divine protection from goddess mother',
  '"My mother protects me."',
  '🏛️',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "defense", "value": 20, "duration": 1, "target": "self", "rank": 1},
    {"type": "heal", "value": 10, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "defense", "value": 45, "duration": 2, "target": "self", "rank": 2},
    {"type": "heal", "value": 20, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "defense", "value": 75, "duration": 2, "target": "self", "rank": 3},
    {"type": "heal", "value": 35, "target": "self", "rank": 3},
    {"type": "purge", "purgeType": "debuff", "count": 99, "target": "self", "rank": 3}
  ]'::jsonb,
  1,
  25,
  5,
  6,
  10
)
ON CONFLICT (id) DO NOTHING;

-- 7. Hero's Stand - Fight until the last breath (CONDITIONAL PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'achilles_heros_stand',
  'Hero''s Stand',
  'signature',
  'passive',
  'achilles',
  'Fight harder when near death',
  '"I will not fall!"',
  '🛡️',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "all", "value": 40, "condition": "hp_below_20", "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "all", "value": 70, "condition": "hp_below_25", "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "all", "value": 120, "condition": "hp_below_30", "target": "self", "rank": 3},
    {"type": "special", "specialType": "cannot_die", "duration": 6, "min_hp": 1, "rank": 3}
  ]'::jsonb,
  5,
  6,
  10
);
