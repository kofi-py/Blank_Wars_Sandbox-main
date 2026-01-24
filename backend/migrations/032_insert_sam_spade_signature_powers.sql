-- Migration: Insert Sam Spade Signature Powers
-- Purpose: Add 7 unique signature powers for Sam Spade character
-- Character: Sam Spade (Warrior, Human) - Hard-boiled private detective from The Maltese Falcon

-- ===== SAM SPADE SIGNATURE POWERS (7 total) =====

-- 1. Cold Read (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'sam_spade_cold_read',
  'Cold Read',
  'signature',
  'passive',
  'sam_spade',
  'Years of detective work honed his instincts',
  '"I can read a liar from across the room."',
  '🔍',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "attack", "value": 15, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "speed", "value": 10, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "critical_chance", "value": 10, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "attack", "value": 35, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "speed", "value": 25, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "critical_chance", "value": 25, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "attack", "value": 65, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "speed", "value": 50, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "critical_chance", "value": 50, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "critical_damage", "value": 30, "target": "self", "rank": 3}
  ]'::jsonb,
  5,
  6,
  1
);

-- 2. Haymaker (INSTANT ATTACK)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'sam_spade_haymaker',
  'Haymaker',
  'signature',
  'offensive',
  'sam_spade',
  'A devastating right hook learned in back alleys',
  '"When you''re slapped, you''ll take it and like it."',
  '👊',
  3,
  'active',
  '[
    {"type": "damage", "value": 40, "damageType": "physical", "target": "single_enemy", "rank": 1},
    {"type": "damage", "value": 90, "damageType": "physical", "target": "single_enemy", "rank": 2},
    {"type": "status_effect", "statusEffect": "stun", "duration": 1, "chance": 30, "rank": 2},
    {"type": "damage", "value": 170, "damageType": "physical", "target": "single_enemy", "rank": 3},
    {"type": "status_effect", "statusEffect": "stun", "duration": 2, "chance": 70, "rank": 3},
    {"type": "turn_priority", "value": -100, "duration": 1, "target": "single_enemy", "rank": 3}
  ]'::jsonb,
  1,
  18,
  5,
  6,
  1
);

-- 3. Snub-Nose Special (INSTANT ATTACK)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'sam_spade_snub_nose_special',
  'Snub-Nose Special',
  'signature',
  'offensive',
  'sam_spade',
  'Quick draw with his .38 revolver',
  '"I don''t mind a reasonable amount of trouble."',
  '🔫',
  3,
  'active',
  '[
    {"type": "damage", "value": 35, "damageType": "physical", "target": "single_enemy", "rank": 1},
    {"type": "stat_modifier", "stat": "accuracy", "value": 30, "duration": 0, "appliesTo": "this_attack", "rank": 1},
    {"type": "damage", "value": 80, "damageType": "physical", "target": "single_enemy", "rank": 2},
    {"type": "special", "specialType": "cannot_miss", "rank": 2},
    {"type": "stat_modifier", "stat": "defense", "value": -20, "duration": 1, "target": "single_enemy", "rank": 2},
    {"type": "damage", "value": 155, "damageType": "physical", "target": "single_enemy", "rank": 3},
    {"type": "special", "specialType": "cannot_miss", "rank": 3},
    {"type": "stat_modifier", "stat": "defense", "value": -50, "duration": 2, "target": "single_enemy", "rank": 3},
    {"type": "status_effect", "statusEffect": "disarm", "duration": 1, "rank": 3}
  ]'::jsonb,
  1,
  20,
  5,
  6,
  1
);

-- 4. Tail Job (OFFENSIVE BUFF - Self)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'sam_spade_tail_job',
  'Tail Job',
  'signature',
  'offensive',
  'sam_spade',
  'Shadow a target through the San Francisco fog',
  '"I''ve been tailing guys since you were in diapers."',
  '🌫️',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "speed", "value": 30, "duration": 2, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "evasion", "value": 20, "duration": 2, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "speed", "value": 65, "duration": 2, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "evasion", "value": 45, "duration": 2, "target": "self", "rank": 2},
    {"type": "turn_priority", "value": 999, "duration": 0, "appliesTo": "this_turn", "rank": 2},
    {"type": "stat_modifier", "stat": "speed", "value": 120, "duration": 2, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "evasion", "value": 80, "duration": 2, "target": "self", "rank": 3},
    {"type": "turn_priority", "value": 999, "duration": 0, "appliesTo": "this_turn", "rank": 3},
    {"type": "extra_action", "count": 1, "rank": 3}
  ]'::jsonb,
  2,
  25,
  5,
  6,
  5
);

-- 5. Case Files (CONDITIONAL PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'sam_spade_case_files',
  'Case Files',
  'signature',
  'passive',
  'sam_spade',
  'Build evidence with each attack',
  '"Every clue adds up. Every punch tells a story."',
  '📁',
  3,
  'passive',
  '[
    {"type": "on_attack", "effects": [
      {"type": "stat_modifier", "stat": "attack", "value": 10, "duration": 99, "target": "self", "stacks": true, "max_stacks": 3}
    ], "rank": 1},
    {"type": "on_attack", "effects": [
      {"type": "stat_modifier", "stat": "attack", "value": 20, "duration": 99, "target": "self", "stacks": true, "max_stacks": 3},
      {"type": "stat_modifier", "stat": "critical_chance", "value": 15, "duration": 99, "target": "self", "stacks": true, "max_stacks": 3}
    ], "rank": 2},
    {"type": "on_attack", "effects": [
      {"type": "stat_modifier", "stat": "attack", "value": 35, "duration": 99, "target": "self", "stacks": true, "max_stacks": 5},
      {"type": "stat_modifier", "stat": "critical_chance", "value": 30, "duration": 99, "target": "self", "stacks": true, "max_stacks": 5},
      {"type": "stat_modifier", "stat": "critical_damage", "value": 15, "duration": 99, "target": "self", "stacks": true, "max_stacks": 5}
    ], "rank": 3}
  ]'::jsonb,
  5,
  6,
  5
);

-- 6. Third Degree (OFFENSIVE BUFF - Self)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'sam_spade_third_degree',
  'Third Degree',
  'signature',
  'offensive',
  'sam_spade',
  'Intense interrogation mode - relentless pressure',
  '"Talk. Or I''ll make you talk."',
  '💡',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "all", "value": 35, "duration": 2, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "all", "value": 75, "duration": 2, "target": "self", "rank": 2},
    {"type": "special", "specialType": "force_critical", "duration": 2, "rank": 2},
    {"type": "stat_modifier", "stat": "all", "value": 140, "duration": 2, "target": "self", "rank": 3},
    {"type": "special", "specialType": "force_critical", "duration": 2, "rank": 3},
    {"type": "multi_hit", "hits": 2, "appliesTo": "all_attacks", "duration": 2, "rank": 3}
  ]'::jsonb,
  3,
  40,
  5,
  6,
  10
);

-- 7. The Stuff Dreams Are Made Of (INSTANT ATTACK)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'sam_spade_stuff_of_dreams',
  'The Stuff Dreams Are Made Of',
  'signature',
  'offensive',
  'sam_spade',
  'Case-closing strike - massive rewards if this finishes the job',
  '"The, uh, stuff that dreams are made of."',
  '🦅',
  3,
  'active',
  '[
    {"type": "damage", "value": 100, "damageType": "physical", "target": "single_enemy", "rank": 1},
    {"type": "on_kill", "effects": [
      {"type": "heal", "value": 50, "target": "self"}
    ], "rank": 1},
    {"type": "damage", "value": 220, "damageType": "physical", "target": "single_enemy", "rank": 2},
    {"type": "on_kill", "effects": [
      {"type": "heal", "value": 100, "target": "self"},
      {"type": "stat_modifier", "stat": "all", "value": 50, "duration": 2, "target": "self"}
    ], "rank": 2},
    {"type": "damage", "value": 420, "damageType": "physical", "target": "single_enemy", "rank": 3},
    {"type": "special", "specialType": "force_critical", "rank": 3},
    {"type": "on_kill", "effects": [
      {"type": "heal", "value": 100, "target": "self"},
      {"type": "restore_energy", "value": 100, "target": "self"},
      {"type": "cooldown_reset", "count": 99, "target": "self"},
      {"type": "stat_modifier", "stat": "all", "value": 100, "duration": 99, "target": "self"}
    ], "rank": 3}
  ]'::jsonb,
  4,
  50,
  5,
  6,
  10
);

COMMENT ON TABLE power_definitions IS 'Added Sam Spade signature powers - hard-boiled detective specialist';
