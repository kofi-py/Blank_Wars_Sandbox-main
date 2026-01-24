-- Migration: Insert Assassin Archetype Powers
-- Purpose: Add 7 ability-tier powers for Assassin archetype
-- Archetype: Assassin - Stealth, critical strikes, poison, infiltration

-- ===== ASSASSIN ARCHETYPE POWERS (7 total) =====

-- 1. Shadow Strike - Bonus damage from stealth/behind (INSTANT ATTACK)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'assassin_shadow_strike',
  'Shadow Strike',
  'ability',
  'offensive',
  'assassin',
  'Deal bonus damage when attacking from stealth or behind',
  'Strike from the shadows, unseen and deadly.',
  '🗡️',
  3,
  'active',
  '[
    {"type": "damage", "value": 25, "damageType": "physical", "target": "single_enemy", "rank": 1, "condition": "from_stealth_or_behind"},
    {"type": "damage", "value": 55, "damageType": "physical", "target": "single_enemy", "rank": 2, "condition": "from_stealth_or_behind"},
    {"type": "damage", "value": 90, "damageType": "physical", "target": "single_enemy", "rank": 3, "condition": "from_stealth_or_behind"},
    {"type": "armor_penetration", "value": 40, "rank": 3}
  ]'::jsonb,
  1,
  12,
  2,
  4,
  1
);

-- 2. Silent Movement - Increase evasion (DEFENSIVE BUFF - Self)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'assassin_silent_movement',
  'Silent Movement',
  'ability',
  'defensive',
  'assassin',
  'Move silently to avoid detection and attacks',
  'Like a ghost in the night.',
  '🏃',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "evasion", "value": 10, "duration": 1, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "evasion", "value": 25, "duration": 2, "target": "self", "rank": 2},
    {"type": "special", "specialType": "reduced_threat", "rank": 2},
    {"type": "stat_modifier", "stat": "evasion", "value": 45, "duration": 2, "target": "self", "rank": 3},
    {"type": "special", "specialType": "next_attack_from_stealth", "rank": 3}
  ]'::jsonb,
  1,
  10,
  2,
  4,
  1
);

-- 3. Poison Application - Apply poison damage (OFFENSIVE BUFF - Self)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'assassin_poison_application',
  'Poison Application',
  'ability',
  'offensive',
  'assassin',
  'Coat weapons with deadly poison',
  'A slow death by venom.',
  '💉',
  3,
  'active',
  '[
    {"type": "status_effect", "statusEffect": "poison", "value": 8, "duration": 3, "target": "on_hit", "rank": 1},
    {"type": "status_effect", "statusEffect": "poison", "value": 20, "duration": 3, "buff_duration": 2, "target": "on_hit", "rank": 2},
    {"type": "status_effect", "statusEffect": "poison", "value": 35, "duration": 4, "buff_duration": 2, "target": "on_hit", "rank": 3},
    {"type": "stat_modifier", "stat": "healing_received", "value": -30, "duration": 2, "target": "on_hit", "rank": 3}
  ]'::jsonb,
  1,
  10,
  2,
  4,
  1
);

-- 4. Disguise - Avoid being targeted (TACTICAL)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'assassin_disguise',
  'Disguise',
  'ability',
  'defensive',
  'assassin',
  'Blend in to avoid enemy targeting',
  'Hidden in plain sight.',
  '🎭',
  3,
  'active',
  '[
    {"type": "special", "specialType": "untargetable", "duration": 3, "rank": 1},
    {"type": "special", "specialType": "untargetable", "duration": 6, "rank": 2},
    {"type": "stat_modifier", "stat": "evasion", "value": 20, "duration": 2, "after_untargetable": true, "rank": 2},
    {"type": "special", "specialType": "untargetable", "duration": 1, "rank": 3},
    {"type": "stat_modifier", "stat": "evasion", "value": 40, "duration": 1, "after_untargetable": true, "rank": 3},
    {"type": "damage_multiplier", "value": 200, "on_next_attack": true, "rank": 3}
  ]'::jsonb,
  1,
  15,
  2,
  4,
  5
);

-- 5. Dual Wielding - Attack with two weapons (OFFENSIVE BUFF - Self)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'assassin_dual_wielding',
  'Dual Wielding',
  'ability',
  'offensive',
  'assassin',
  'Master two-weapon fighting',
  'Two blades, twice the lethality.',
  '🔪',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "attack_speed", "value": 20, "duration": 0, "target": "self", "rank": 1},
    {"type": "special", "specialType": "double_strike_chance", "value": 15, "rank": 1},
    {"type": "stat_modifier", "stat": "attack_speed", "value": 40, "duration": 2, "target": "self", "rank": 2},
    {"type": "special", "specialType": "double_strike_chance", "value": 30, "rank": 2},
    {"type": "stat_modifier", "stat": "attack_speed", "value": 60, "duration": 2, "target": "self", "rank": 3},
    {"type": "special", "specialType": "double_strike_chance", "value": 50, "rank": 3},
    {"type": "special", "specialType": "independent_crits", "rank": 3}
  ]'::jsonb,
  1,
  15,
  2,
  4,
  5
);

-- 6. Weak Point Detection - Exploit vulnerabilities (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'assassin_weak_point_detection',
  'Weak Point Detection',
  'ability',
  'passive',
  'assassin',
  'Detect and exploit enemy weaknesses',
  'Find the gap in every defense.',
  '👁️',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "critical_chance", "value": 12, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "critical_chance", "value": 25, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "critical_chance", "value": 40, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "critical_damage", "value": 70, "target": "self", "rank": 3}
  ]'::jsonb,
  3,
  5,
  10
);

-- 7. Smoke Bomb - Escape and reposition (TACTICAL)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'assassin_smoke_bomb',
  'Smoke Bomb',
  'ability',
  'defensive',
  'assassin',
  'Vanish in smoke to escape danger',
  'Gone in a puff of smoke.',
  '🌫️',
  3,
  'active',
  '[
    {"type": "special", "specialType": "untargetable", "duration": 2, "rank": 1},
    {"type": "special", "specialType": "reposition", "rank": 1},
    {"type": "special", "specialType": "untargetable", "duration": 4, "rank": 2},
    {"type": "stat_modifier", "stat": "evasion", "value": 30, "duration": 1, "after_untargetable": true, "rank": 2},
    {"type": "special", "specialType": "reposition", "rank": 2},
    {"type": "special", "specialType": "untargetable", "duration": 1, "rank": 3},
    {"type": "stat_modifier", "stat": "evasion", "value": 50, "duration": 2, "after_untargetable": true, "rank": 3},
    {"type": "special", "specialType": "next_attack_from_stealth", "rank": 3},
    {"type": "special", "specialType": "reposition", "rank": 3}
  ]'::jsonb,
  1,
  20,
  3,
  5,
  10
);
