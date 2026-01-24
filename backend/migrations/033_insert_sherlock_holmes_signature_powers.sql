-- Migration: Insert Sherlock Holmes Signature Powers
-- Purpose: Add 7 unique signature powers for Sherlock Holmes character
-- Character: Sherlock Holmes (Scholar, Human) - Deduction, observation, intellect, investigation

-- ===== SHERLOCK HOLMES SIGNATURE POWERS (7 total) =====

-- 1. The Science of Deduction (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'holmes_science_of_deduction',
  'The Science of Deduction',
  'signature',
  'passive',
  'holmes',
  'Analytical mind reveals enemy weaknesses',
  '"Elementary. I see everything."',
  '🔍',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "intelligence", "value": 15, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "accuracy", "value": 12, "target": "self", "rank": 1},
    {"type": "special", "specialType": "see_enemy_hp", "rank": 1},
    {"type": "stat_modifier", "stat": "intelligence", "value": 35, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "accuracy", "value": 28, "target": "self", "rank": 2},
    {"type": "special", "specialType": "see_enemy_hp_energy", "rank": 2},
    {"type": "conditional", "condition": "enemy_hp_below", "threshold": 50, "effects": [
      {"type": "stat_modifier", "stat": "damage", "value": 15, "target": "self"}
    ], "rank": 2},
    {"type": "stat_modifier", "stat": "intelligence", "value": 65, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "accuracy", "value": 50, "target": "self", "rank": 3},
    {"type": "special", "specialType": "see_all_enemy_stats", "rank": 3},
    {"type": "conditional", "condition": "enemy_hp_below", "threshold": 50, "effects": [
      {"type": "stat_modifier", "stat": "damage", "value": 40, "target": "self"}
    ], "rank": 3},
    {"type": "immunity", "immunityType": "confusion", "rank": 3}
  ]'::jsonb,
  5,
  6,
  1
);

-- 2. Calculated Strike (INSTANT ATTACK)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'holmes_calculated_strike',
  'Calculated Strike',
  'signature',
  'offensive',
  'holmes',
  'Precision attack that exploits weaknesses',
  '"I know exactly where to strike."',
  '🎯',
  3,
  'active',
  '[
    {"type": "damage", "value": 35, "damageType": "physical", "target": "single_enemy", "rank": 1},
    {"type": "special", "specialType": "cannot_miss", "rank": 1},
    {"type": "damage", "value": 80, "damageType": "physical", "target": "single_enemy", "rank": 2},
    {"type": "special", "specialType": "cannot_miss", "rank": 2},
    {"type": "conditional", "condition": "enemy_has_debuff", "effects": [
      {"type": "damage", "value": 50, "damageType": "physical", "target": "single_enemy"}
    ], "rank": 2},
    {"type": "damage", "value": 155, "damageType": "physical", "target": "single_enemy", "rank": 3},
    {"type": "special", "specialType": "cannot_miss", "rank": 3},
    {"type": "special", "specialType": "force_critical", "rank": 3},
    {"type": "damage_per_debuff", "value": 100, "target": "single_enemy", "rank": 3}
  ]'::jsonb,
  1,
  18,
  5,
  6,
  1
);

-- 3. Case Files (CONDITIONAL PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'holmes_case_files',
  'Case Files',
  'signature',
  'passive',
  'holmes',
  'Learn from observation - gain power over time',
  '"I have studied this adversary thoroughly."',
  '📖',
  3,
  'passive',
  '[
    {"type": "after_observing", "turns": 1, "effects": [
      {"type": "stat_modifier", "stat": "damage", "value": 20, "duration": 99, "target": "self"}
    ], "rank": 1},
    {"type": "after_observing", "turns": 1, "effects": [
      {"type": "stat_modifier", "stat": "damage", "value": 45, "duration": 99, "target": "self"},
      {"type": "stat_modifier", "stat": "defense", "value": 30, "duration": 99, "target": "self"}
    ], "rank": 2},
    {"type": "after_observing", "turns": 1, "effects": [
      {"type": "stat_modifier", "stat": "damage", "value": 80, "duration": 99, "target": "self"},
      {"type": "stat_modifier", "stat": "defense", "value": 60, "duration": 99, "target": "self"},
      {"type": "stat_modifier", "stat": "evasion", "value": 40, "duration": 99, "target": "self"},
      {"type": "stat_modifier", "stat": "defense", "value": -40, "ignorePercent": true, "appliesTo": "attacks_on_observed_enemy", "duration": 99}
    ], "rank": 3}
  ]'::jsonb,
  5,
  6,
  1
);

-- 4. Elementary (DEBUFF - Single Target)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'holmes_elementary',
  'Elementary',
  'signature',
  'support',
  'holmes',
  'Solve the puzzle - expose all enemy weaknesses',
  '"Elementary, my dear Watson."',
  '🧩',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "defense", "value": -30, "duration": 2, "target": "single_enemy", "rank": 1},
    {"type": "special", "specialType": "reveal_next_action", "rank": 1},
    {"type": "stat_modifier", "stat": "defense", "value": -60, "duration": 2, "target": "single_enemy", "rank": 2},
    {"type": "special", "specialType": "reveal_next_actions", "count": 2, "rank": 2},
    {"type": "stat_modifier", "stat": "accuracy", "value": -25, "duration": 2, "target": "single_enemy", "rank": 2},
    {"type": "stat_modifier", "stat": "defense", "value": -100, "duration": 2, "target": "single_enemy", "rank": 3},
    {"type": "special", "specialType": "reveal_all_abilities", "rank": 3},
    {"type": "stat_modifier", "stat": "accuracy", "value": -50, "duration": 2, "target": "single_enemy", "rank": 3},
    {"type": "special", "specialType": "force_critical", "appliesTo": "next_ally_attack", "rank": 3}
  ]'::jsonb,
  2,
  25,
  5,
  6,
  5
);

-- 5. Master of Disguise (DEFENSIVE BUFF - Self)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'holmes_master_of_disguise',
  'Master of Disguise',
  'signature',
  'defensive',
  'holmes',
  'Misdirection and evasion',
  '"You were looking for someone else, I presume?"',
  '🕵️',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "evasion", "value": 40, "duration": 2, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "evasion", "value": 75, "duration": 2, "target": "self", "rank": 2},
    {"type": "redirect_attack", "chance": 50, "duration": 2, "rank": 2},
    {"type": "stat_modifier", "stat": "evasion", "value": 100, "duration": 1, "target": "self", "rank": 3},
    {"type": "special", "specialType": "untargetable", "duration": 1, "rank": 3},
    {"type": "copy_buff", "count": 1, "from": "random_enemy", "to": "self", "rank": 3}
  ]'::jsonb,
  2,
  22,
  5,
  6,
  5
);

-- 6. Poisoner's Knowledge (INSTANT ATTACK)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'holmes_poisoners_knowledge',
  'Poisoner''s Knowledge',
  'signature',
  'offensive',
  'holmes',
  'Venomous expertise - deadly poison attack',
  '"I know 243 ways to kill with poison."',
  '💉',
  3,
  'active',
  '[
    {"type": "damage", "value": 30, "damageType": "poison", "target": "single_enemy", "rank": 1},
    {"type": "status_effect", "statusEffect": "poison", "duration": 1, "damage_per_turn": 25, "rank": 1},
    {"type": "damage", "value": 70, "damageType": "poison", "target": "single_enemy", "rank": 2},
    {"type": "status_effect", "statusEffect": "poison", "duration": 2, "damage_per_turn": 45, "rank": 2},
    {"type": "status_effect", "statusEffect": "grievous_wound", "duration": 2, "rank": 2},
    {"type": "damage", "value": 140, "damageType": "poison", "target": "single_enemy", "rank": 3},
    {"type": "status_effect", "statusEffect": "poison", "duration": 3, "damage_per_turn": 75, "rank": 3},
    {"type": "status_effect", "statusEffect": "grievous_wound", "duration": 3, "rank": 3},
    {"type": "max_hp_reduction", "value": 15, "target": "single_enemy", "rank": 3}
  ]'::jsonb,
  2,
  30,
  5,
  6,
  10
);

-- 7. Brilliant Mind (OFFENSIVE BUFF - Self)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'holmes_brilliant_mind',
  'Brilliant Mind',
  'signature',
  'offensive',
  'holmes',
  'Intellectual superiority - perfect understanding',
  '"My mind is my greatest weapon."',
  '🧠',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "intelligence", "value": 40, "duration": 2, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "resistance", "value": -30, "ignorePercent": true, "appliesTo": "attacks", "duration": 2, "rank": 1},
    {"type": "stat_modifier", "stat": "intelligence", "value": 85, "duration": 2, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "resistance", "value": -60, "ignorePercent": true, "appliesTo": "attacks", "duration": 2, "rank": 2},
    {"type": "special", "specialType": "force_critical", "count": 2, "rank": 2},
    {"type": "stat_modifier", "stat": "intelligence", "value": 160, "duration": 2, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "resistance", "value": -100, "ignorePercent": true, "appliesTo": "attacks", "duration": 2, "rank": 3},
    {"type": "special", "specialType": "see_all_enemy_info", "duration": 2, "rank": 3},
    {"type": "special", "specialType": "force_critical", "duration": 2, "rank": 3},
    {"type": "damage_type_conversion", "to": "psychic", "duration": 2, "rank": 3}
  ]'::jsonb,
  4,
  45,
  5,
  6,
  10
);

COMMENT ON TABLE power_definitions IS 'Added Sherlock Holmes signature powers - detective scholar specialist';
