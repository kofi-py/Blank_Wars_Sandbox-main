-- Migration: Insert Billy the Kid Signature Powers
-- Purpose: Add 7 unique signature powers for Billy the Kid character
-- Character: Billy the Kid (Assassin, Human) - Gunslinger, quick draw, multi-shot, Western outlaw

-- ===== BILLY THE KID SIGNATURE POWERS (7 total) =====

-- 1. Quick Draw (INSTANT ATTACK)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'billy_quick_draw',
  'Quick Draw',
  'signature',
  'offensive',
  'billy_the_kid',
  'Lightning fast shot that always goes first',
  '"Fastest gun in the West."',
  '🔫',
  3,
  'active',
  '[
    {"type": "damage", "value": 30, "damageType": "physical", "target": "single_enemy", "rank": 1},
    {"type": "turn_priority", "value": 999, "duration": 0, "target": "self", "rank": 1},
    {"type": "damage", "value": 70, "damageType": "physical", "target": "single_enemy", "rank": 2},
    {"type": "turn_priority", "value": 999, "duration": 0, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "critical_chance", "value": 40, "duration": 0, "target": "self", "rank": 2},
    {"type": "damage", "value": 130, "damageType": "physical", "target": "single_enemy", "rank": 3},
    {"type": "turn_priority", "value": 999, "duration": 0, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "critical_chance", "value": 80, "duration": 0, "target": "self", "rank": 3},
    {"type": "special", "specialType": "cannot_be_dodged", "rank": 3}
  ]'::jsonb,
  1,
  15,
  5,
  6,
  1
);

-- 2. Gunslinger (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'billy_gunslinger',
  'Gunslinger',
  'signature',
  'passive',
  'billy_the_kid',
  'Natural marksman with exceptional accuracy and critical hits',
  '"Never miss a shot."',
  '🎯',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "accuracy", "value": 12, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "critical_chance", "value": 10, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "accuracy", "value": 28, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "critical_chance", "value": 25, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "defense", "value": -20, "ignorePercent": true, "appliesTo": "ranged_attacks", "rank": 2},
    {"type": "stat_modifier", "stat": "accuracy", "value": 50, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "critical_chance", "value": 45, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "defense", "value": -40, "ignorePercent": true, "appliesTo": "ranged_attacks", "rank": 3},
    {"type": "stat_modifier", "stat": "attack", "value": 15, "target": "self", "rank": 3}
  ]'::jsonb,
  5,
  6,
  1
);

-- 3. Double Tap (INSTANT ATTACK)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'billy_double_tap',
  'Double Tap',
  'signature',
  'offensive',
  'billy_the_kid',
  'Fire multiple rapid shots',
  '"One, two... they drop."',
  '🔫🔫',
  3,
  'active',
  '[
    {"type": "multi_hit", "hits": 2, "damage": 15, "damageType": "physical", "target": "single_enemy", "rank": 1},
    {"type": "multi_hit", "hits": 2, "damage": 40, "damageType": "physical", "target": "single_enemy", "rank": 2},
    {"type": "multi_hit", "hits": 3, "damage": 70, "damageType": "physical", "target": "single_enemy", "rank": 3}
  ]'::jsonb,
  1,
  20,
  5,
  6,
  1
);

-- 4. Tumbleweed Roll (DEFENSIVE BUFF - Self)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'billy_tumbleweed_roll',
  'Tumbleweed Roll',
  'signature',
  'defensive',
  'billy_the_kid',
  'Evasive maneuver with speed boost',
  '"Can''t hit what you can''t see."',
  '💨',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "evasion", "value": 40, "duration": 1, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "evasion", "value": 70, "duration": 2, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "speed", "value": 25, "duration": 2, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "evasion", "value": 100, "duration": 1, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "speed", "value": 50, "duration": 1, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "damage", "value": 80, "duration": 1, "appliesTo": "next_attack", "target": "self", "rank": 3}
  ]'::jsonb,
  1,
  18,
  5,
  6,
  5
);

-- 5. Lucky Shot (INSTANT ATTACK)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'billy_lucky_shot',
  'Lucky Shot',
  'signature',
  'offensive',
  'billy_the_kid',
  'Fortune favors the bold - random high damage',
  '"Feeling lucky, punk?"',
  '🎲',
  3,
  'active',
  '[
    {"type": "random_damage", "minDamage": 100, "maxDamage": 200, "chance": 30, "fallbackDamage": 100, "damageType": "physical", "target": "single_enemy", "rank": 1},
    {"type": "random_damage", "minDamage": 150, "maxDamage": 300, "chance": 50, "fallbackDamage": 150, "damageType": "physical", "target": "single_enemy", "rank": 2},
    {"type": "random_damage", "minDamage": 250, "maxDamage": 450, "chance": 70, "fallbackDamage": 250, "damageType": "physical", "target": "single_enemy", "rank": 3}
  ]'::jsonb,
  2,
  25,
  5,
  6,
  5
);

-- 6. Outlaw's Gambit (CONDITIONAL PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'billy_outlaws_gambit',
  'Outlaw''s Gambit',
  'signature',
  'passive',
  'billy_the_kid',
  'Risk for reward - gain power when wounded',
  '"Most dangerous when cornered."',
  '🤠',
  3,
  'passive',
  '[
    {"type": "conditional", "condition": "hp_below", "threshold": 40, "effects": [
      {"type": "stat_modifier", "stat": "damage", "value": 30, "target": "self"},
      {"type": "stat_modifier", "stat": "critical_chance", "value": 30, "target": "self"}
    ], "rank": 1},
    {"type": "conditional", "condition": "hp_below", "threshold": 50, "effects": [
      {"type": "stat_modifier", "stat": "damage", "value": 60, "target": "self"},
      {"type": "stat_modifier", "stat": "critical_chance", "value": 60, "target": "self"},
      {"type": "stat_modifier", "stat": "speed", "value": 20, "target": "self"}
    ], "rank": 2},
    {"type": "conditional", "condition": "hp_below", "threshold": 60, "effects": [
      {"type": "stat_modifier", "stat": "damage", "value": 100, "target": "self"},
      {"type": "stat_modifier", "stat": "critical_chance", "value": 100, "target": "self"},
      {"type": "stat_modifier", "stat": "speed", "value": 40, "target": "self"},
      {"type": "multi_hit", "hits": 2, "appliesTo": "all_attacks"}
    ], "rank": 3}
  ]'::jsonb,
  5,
  6,
  10
);

-- 7. Dead Eye (OFFENSIVE BUFF - Self)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'billy_dead_eye',
  'Dead Eye',
  'signature',
  'offensive',
  'billy_the_kid',
  'Perfect shots that never miss',
  '"Time slows. Every shot counts."',
  '🔫🔥',
  3,
  'active',
  '[
    {"type": "special", "specialType": "cannot_miss", "duration": 1, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "damage", "value": 25, "duration": 1, "target": "self", "rank": 1},
    {"type": "special", "specialType": "cannot_miss", "duration": 2, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "damage", "value": 55, "duration": 2, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "critical_damage", "value": 40, "duration": 2, "target": "self", "rank": 2},
    {"type": "special", "specialType": "cannot_miss", "duration": 1, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "damage", "value": 110, "duration": 1, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "critical_damage", "value": 80, "duration": 1, "target": "self", "rank": 3},
    {"type": "special", "specialType": "force_critical", "duration": 1, "target": "self", "rank": 3}
  ]'::jsonb,
  3,
  35,
  5,
  6,
  10
);

COMMENT ON TABLE power_definitions IS 'Added Billy the Kid signature powers - gunslinger specialist';
