-- Migration: Insert Merlin Signature Powers
-- Purpose: Add 7 unique signature powers for Merlin character
-- Character: Merlin (Mage, Human_magical) - Legendary wizard, prophecy, shape-shifting, ancient magic

-- ===== MERLIN SIGNATURE POWERS (7 total) =====

-- 1. Arcane Mastery (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'merlin_arcane_mastery',
  'Arcane Mastery',
  'signature',
  'passive',
  'merlin',
  'Supreme magical knowledge and power',
  '"I have studied the arcane arts for centuries."',
  '🔮',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "magic_attack", "value": 15, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "magic_defense", "value": 10, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "magic_attack", "value": 35, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "magic_defense", "value": 25, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "magical_resistance", "value": -20, "ignorePercent": true, "appliesTo": "magic_attacks", "rank": 2},
    {"type": "stat_modifier", "stat": "magic_attack", "value": 65, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "magic_defense", "value": 45, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "magical_resistance", "value": -40, "ignorePercent": true, "appliesTo": "magic_attacks", "rank": 3},
    {"type": "stat_modifier", "stat": "damage", "value": 15, "damageType": "elemental", "target": "self", "rank": 3}
  ]'::jsonb,
  5,
  6,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 2. Arcane Bolt (INSTANT ATTACK)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'merlin_arcane_bolt',
  'Arcane Bolt',
  'signature',
  'offensive',
  'merlin',
  'Pure magical energy projectile',
  '"Arcane forces, heed my call!"',
  '⚡',
  3,
  'active',
  '[
    {"type": "damage", "value": 35, "damageType": "arcane", "target": "single_enemy", "rank": 1},
    {"type": "damage", "value": 80, "damageType": "arcane", "target": "single_enemy", "rank": 2},
    {"type": "status_effect", "statusEffect": "confusion", "duration": 1, "chance": 30, "rank": 2},
    {"type": "damage", "value": 155, "damageType": "arcane", "target": "single_enemy", "rank": 3},
    {"type": "status_effect", "statusEffect": "confusion", "duration": 2, "chance": 70, "rank": 3},
    {"type": "special", "specialType": "ignore_shields", "rank": 3}
  ]'::jsonb,
  1,
  18,
  5,
  6,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 3. Shape-Shift (DEFENSIVE BUFF - Self)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'merlin_shape_shift',
  'Shape-Shift',
  'signature',
  'defensive',
  'merlin',
  'Transform into animal forms for evasion',
  '"I am many, I am one."',
  '🦅',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "evasion", "value": 25, "duration": 1, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "speed", "value": 20, "duration": 1, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "evasion", "value": 55, "duration": 2, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "speed", "value": 45, "duration": 2, "target": "self", "rank": 2},
    {"type": "special", "specialType": "can_fly", "duration": 2, "rank": 2},
    {"type": "stat_modifier", "stat": "evasion", "value": 90, "duration": 2, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "speed", "value": 80, "duration": 2, "target": "self", "rank": 3},
    {"type": "special", "specialType": "can_fly", "duration": 2, "rank": 3},
    {"type": "special", "specialType": "immune_to_melee", "duration": 2, "rank": 3}
  ]'::jsonb,
  1,
  20,
  5,
  6,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 4. Prophecy (TACTICAL)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'merlin_prophecy',
  'Prophecy',
  'signature',
  'support',
  'merlin',
  'Foresee the future - guarantee hits and critical strikes',
  '"I have seen the future. Victory is certain."',
  '🔭',
  3,
  'active',
  '[
    {"type": "special", "specialType": "cannot_miss", "count": 2, "appliesTo": "ally_attacks", "rank": 1},
    {"type": "special", "specialType": "cannot_miss", "count": 3, "appliesTo": "ally_attacks", "rank": 2},
    {"type": "stat_modifier", "stat": "damage", "value": 30, "count": 3, "appliesTo": "ally_attacks", "rank": 2},
    {"type": "special", "specialType": "cannot_miss", "duration": 1, "target": "all_allies", "rank": 3},
    {"type": "stat_modifier", "stat": "damage", "value": 60, "duration": 1, "target": "all_allies", "rank": 3},
    {"type": "special", "specialType": "force_critical", "duration": 1, "target": "all_allies", "rank": 3}
  ]'::jsonb,
  2,
  25,
  5,
  6,
  5
)
ON CONFLICT (id) DO NOTHING;

-- 5. Staff of Power (OFFENSIVE BUFF - Self)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'merlin_staff_of_power',
  'Staff of Power',
  'signature',
  'offensive',
  'merlin',
  'Channel immense magic through ancient staff',
  '"By the power of my staff!"',
  '🌟',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "magic_attack", "value": 30, "duration": 1, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "magic_attack", "value": 65, "duration": 2, "target": "self", "rank": 2},
    {"type": "special", "specialType": "attacks_hit_all", "duration": 2, "rank": 2},
    {"type": "stat_modifier", "stat": "magic_attack", "value": 120, "duration": 2, "target": "self", "rank": 3},
    {"type": "special", "specialType": "attacks_hit_all", "duration": 2, "rank": 3},
    {"type": "apply_on_hit", "statusEffect": "random_debuff", "duration": 2, "rank": 3}
  ]'::jsonb,
  2,
  30,
  5,
  6,
  5
)
ON CONFLICT (id) DO NOTHING;

-- 6. Time Reversal (INSTANT HEAL)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'merlin_time_reversal',
  'Time Reversal',
  'signature',
  'support',
  'merlin',
  'Undo recent events - heal and reset cooldowns',
  '"Time bends to my will."',
  '🌀',
  3,
  'active',
  '[
    {"type": "heal", "value": 30, "target": "self", "rank": 1},
    {"type": "restore_energy", "value": 25, "target": "self", "rank": 1},
    {"type": "heal", "value": 60, "target": "self", "rank": 2},
    {"type": "restore_energy", "value": 50, "target": "self", "rank": 2},
    {"type": "cooldown_reset", "count": 1, "target": "self", "rank": 2},
    {"type": "heal", "value": 100, "target": "self", "rank": 3},
    {"type": "restore_energy", "value": 80, "target": "self", "rank": 3},
    {"type": "cooldown_reset", "count": 99, "target": "self", "rank": 3},
    {"type": "purge", "purgeType": "debuff", "count": 99, "target": "self", "rank": 3}
  ]'::jsonb,
  4,
  40,
  5,
  6,
  10
)
ON CONFLICT (id) DO NOTHING;

-- 7. Merlin's Wrath (INSTANT ATTACK - AOE)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'merlin_wrath',
  'Merlin''s Wrath',
  'signature',
  'offensive',
  'merlin',
  'Ultimate magical assault',
  '"Witness the fury of ancient magic!"',
  '🧙‍♂️',
  3,
  'active',
  '[
    {"type": "damage", "value": 70, "damageType": "arcane", "target": "all_enemies", "rank": 1},
    {"type": "damage", "value": 145, "damageType": "arcane", "target": "all_enemies", "rank": 2},
    {"type": "stat_modifier", "stat": "magic_defense", "value": -30, "duration": 2, "target": "all_enemies", "rank": 2},
    {"type": "damage", "value": 270, "damageType": "arcane", "target": "all_enemies", "rank": 3},
    {"type": "stat_modifier", "stat": "magic_defense", "value": -60, "duration": 2, "target": "all_enemies", "rank": 3},
    {"type": "status_effect", "statusEffect": "stun", "duration": 1, "chance": 50, "target": "all_enemies", "rank": 3},
    {"type": "purge", "purgeType": "buff", "count": 99, "target": "all_enemies", "rank": 3}
  ]'::jsonb,
  4,
  50,
  5,
  6,
  10
);

COMMENT ON TABLE power_definitions IS 'Added Merlin signature powers - legendary wizard specialist';
