-- Migration: Insert Genghis Khan Signature Powers
-- Purpose: Add 7 unique signature powers for Genghis Khan character
-- Character: Genghis Khan (Leader, Human) - Military genius, cavalry tactics, empire builder, ruthless conqueror

-- ===== GENGHIS KHAN SIGNATURE POWERS (7 total) =====

-- 1. Cavalry Charge (INSTANT ATTACK)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'genghis_cavalry_charge',
  'Cavalry Charge',
  'signature',
  'offensive',
  'genghis_khan',
  'Mounted assault with devastating speed',
  '"The thunder of hooves precedes our victory."',
  '🏇',
  3,
  'active',
  '[
    {"type": "damage", "value": 40, "damageType": "physical", "target": "single_enemy", "rank": 1},
    {"type": "stat_modifier", "stat": "speed", "value": 30, "duration": 0, "appliesTo": "this_turn", "target": "self", "rank": 1},
    {"type": "damage", "value": 90, "damageType": "physical", "target": "single_enemy", "rank": 2},
    {"type": "stat_modifier", "stat": "speed", "value": 60, "duration": 0, "appliesTo": "this_turn", "target": "self", "rank": 2},
    {"type": "special", "specialType": "ignore_evasion", "rank": 2},
    {"type": "damage", "value": 170, "damageType": "physical", "target": "single_enemy", "rank": 3},
    {"type": "stat_modifier", "stat": "speed", "value": 100, "duration": 0, "appliesTo": "this_turn", "target": "self", "rank": 3},
    {"type": "special", "specialType": "ignore_evasion", "rank": 3},
    {"type": "special", "specialType": "ignore_defense", "value": 50, "rank": 3},
    {"type": "special", "specialType": "cannot_be_countered", "rank": 3}
  ]'::jsonb,
  1,
  18,
  5,
  6,
  1
);

-- 2. Master Tactician (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'genghis_master_tactician',
  'Master Tactician',
  'signature',
  'passive',
  'genghis_khan',
  'Brilliant military mind enhances self and allies',
  '"I conquer not with strength alone, but with strategy."',
  '⚔️',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "all", "value": 12, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "damage", "value": 8, "target": "all_allies", "rank": 1},
    {"type": "stat_modifier", "stat": "all", "value": 28, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "damage", "value": 18, "target": "all_allies", "rank": 2},
    {"type": "stat_modifier", "stat": "accuracy", "value": 15, "target": "all_allies", "rank": 2},
    {"type": "stat_modifier", "stat": "all", "value": 50, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "damage", "value": 35, "target": "all_allies", "rank": 3},
    {"type": "stat_modifier", "stat": "accuracy", "value": 30, "target": "all_allies", "rank": 3},
    {"type": "stat_modifier", "stat": "speed", "value": 20, "target": "all_allies", "rank": 3}
  ]'::jsonb,
  5,
  6,
  1
);

-- 3. Ruthless Command (GROUP BUFF)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'genghis_ruthless_command',
  'Ruthless Command',
  'signature',
  'support',
  'genghis_khan',
  'Inspire through fear and authority',
  '"Attack without mercy!"',
  '🗡️',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "attack", "value": 20, "duration": 1, "target": "all_allies", "rank": 1},
    {"type": "stat_modifier", "stat": "attack", "value": 45, "duration": 2, "target": "all_allies", "rank": 2},
    {"type": "stat_modifier", "stat": "critical_chance", "value": 30, "duration": 2, "target": "all_allies", "rank": 2},
    {"type": "stat_modifier", "stat": "attack", "value": 85, "duration": 1, "target": "all_allies", "rank": 3},
    {"type": "stat_modifier", "stat": "critical_chance", "value": 60, "duration": 1, "target": "all_allies", "rank": 3},
    {"type": "stat_modifier", "stat": "critical_damage", "value": 40, "duration": 1, "target": "all_allies", "rank": 3}
  ]'::jsonb,
  1,
  20,
  5,
  6,
  1
);

-- 4. Mongol Horde (INSTANT ATTACK - AOE)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'genghis_mongol_horde',
  'Mongol Horde',
  'signature',
  'offensive',
  'genghis_khan',
  'Overwhelming numbers crush all enemies',
  '"We are legion. You are alone."',
  '🎯',
  3,
  'active',
  '[
    {"type": "damage", "value": 50, "damageType": "physical", "target": "all_enemies", "rank": 1},
    {"type": "damage", "value": 100, "damageType": "physical", "target": "all_enemies", "rank": 2},
    {"type": "stat_modifier", "stat": "damage", "value": 30, "duration": 0, "appliesTo": "allies_next_attack", "target": "all_allies", "rank": 2},
    {"type": "damage", "value": 180, "damageType": "physical", "target": "all_enemies", "rank": 3},
    {"type": "stat_modifier", "stat": "damage", "value": 70, "duration": 0, "appliesTo": "allies_next_attack", "target": "all_allies", "rank": 3},
    {"type": "special", "specialType": "cannot_miss", "appliesTo": "allies_next_attack", "rank": 3}
  ]'::jsonb,
  2,
  30,
  5,
  6,
  5
);

-- 5. Empire Builder (CONDITIONAL PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'genghis_empire_builder',
  'Empire Builder',
  'signature',
  'passive',
  'genghis_khan',
  'Each kill strengthens the conqueror',
  '"With every victory, my empire grows."',
  '🏛️',
  3,
  'passive',
  '[
    {"type": "on_kill", "effects": [
      {"type": "stat_modifier", "stat": "damage", "value": 25, "duration": 99, "target": "self", "stacks": true}
    ], "rank": 1},
    {"type": "on_kill", "effects": [
      {"type": "stat_modifier", "stat": "damage", "value": 45, "duration": 99, "target": "self", "stacks": true},
      {"type": "stat_modifier", "stat": "defense", "value": 30, "duration": 99, "target": "self", "stacks": true}
    ], "rank": 2},
    {"type": "on_kill", "effects": [
      {"type": "stat_modifier", "stat": "damage", "value": 75, "duration": 99, "target": "self", "stacks": true},
      {"type": "stat_modifier", "stat": "defense", "value": 50, "duration": 99, "target": "self", "stacks": true},
      {"type": "stat_modifier", "stat": "speed", "value": 35, "duration": 99, "target": "self", "stacks": true},
      {"type": "heal", "value": 25, "target": "self"}
    ], "rank": 3}
  ]'::jsonb,
  5,
  6,
  5
);

-- 6. Lightning Warfare (OFFENSIVE BUFF - Team)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'genghis_lightning_warfare',
  'Lightning Warfare',
  'signature',
  'support',
  'genghis_khan',
  'Swift decisive strikes - empower all allies',
  '"Strike fast. Strike hard. Victory is ours."',
  '🐎',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "speed", "value": 25, "duration": 1, "target": "all_allies", "rank": 1},
    {"type": "stat_modifier", "stat": "damage", "value": 20, "duration": 1, "target": "all_allies", "rank": 1},
    {"type": "stat_modifier", "stat": "speed", "value": 55, "duration": 2, "target": "all_allies", "rank": 2},
    {"type": "stat_modifier", "stat": "damage", "value": 45, "duration": 2, "target": "all_allies", "rank": 2},
    {"type": "turn_priority", "value": 999, "duration": 2, "target": "all_allies", "rank": 2},
    {"type": "stat_modifier", "stat": "speed", "value": 100, "duration": 1, "target": "all_allies", "rank": 3},
    {"type": "stat_modifier", "stat": "damage", "value": 85, "duration": 1, "target": "all_allies", "rank": 3},
    {"type": "extra_action", "count": 1, "target": "all_allies", "rank": 3}
  ]'::jsonb,
  3,
  40,
  5,
  6,
  10
);

-- 7. Khan's Dominion (OFFENSIVE BUFF - Self + Team)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'genghis_khans_dominion',
  'Khan''s Dominion',
  'signature',
  'support',
  'genghis_khan',
  'Supreme warlord - share power with your army',
  '"I am the Khan. All bow before me."',
  '👑',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "all", "value": 30, "duration": 1, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "all", "value": 20, "duration": 1, "target": "all_allies", "rank": 1},
    {"type": "stat_modifier", "stat": "all", "value": 65, "duration": 2, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "all", "value": 45, "duration": 2, "target": "all_allies", "rank": 2},
    {"type": "share_stats", "percentage": 20, "duration": 2, "target": "all_allies", "rank": 2},
    {"type": "stat_modifier", "stat": "all", "value": 120, "duration": 1, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "all", "value": 85, "duration": 1, "target": "all_allies", "rank": 3},
    {"type": "share_stats", "percentage": 50, "duration": 1, "target": "all_allies", "rank": 3},
    {"type": "special", "specialType": "cannot_miss", "duration": 1, "target": "all_allies", "rank": 3},
    {"type": "special", "specialType": "cannot_be_countered", "duration": 1, "target": "all_allies", "rank": 3}
  ]'::jsonb,
  4,
  50,
  5,
  6,
  10
);

COMMENT ON TABLE power_definitions IS 'Added Genghis Khan signature powers - military conqueror specialist';
