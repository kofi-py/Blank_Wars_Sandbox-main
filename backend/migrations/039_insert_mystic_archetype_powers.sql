-- Migration: Insert Mystic Archetype Powers
-- Purpose: Add 7 ability-tier powers for Mystic archetype
-- Archetype: Mystic - Dark magic, curses, life drain, mystical powers

-- ===== MYSTIC ARCHETYPE POWERS (7 total) =====

-- 1. Dark Magic - Channel mystical forces (INSTANT ATTACK)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'mystic_dark_magic',
  'Dark Magic',
  'ability',
  'offensive',
  'mystic',
  'Unleash shadow magic against enemies',
  'Darkness consumes all.',
  '🌙',
  3,
  'active',
  '[
    {"type": "damage", "value": 25, "damageType": "dark", "target": "single_enemy", "rank": 1},
    {"type": "damage", "value": 55, "damageType": "dark", "target": "single_enemy", "rank": 2},
    {"type": "damage", "value": 95, "damageType": "dark", "target": "single_enemy", "rank": 3},
    {"type": "armor_penetration", "value": 35, "armorType": "magic_defense", "rank": 3}
  ]'::jsonb,
  1,
  15,
  2,
  4,
  1
);

-- 2. Arcane Shield - Mystical barrier (DEFENSIVE BUFF - Self)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'mystic_arcane_shield',
  'Arcane Shield',
  'ability',
  'defensive',
  'mystic',
  'Protective magical barrier',
  'Magic shields me from harm.',
  '🔮',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "magic_defense", "value": 15, "duration": 1, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "magic_defense", "value": 35, "duration": 2, "target": "self", "rank": 2},
    {"type": "special", "specialType": "reflect_spell_chance", "value": 15, "duration": 2, "rank": 2},
    {"type": "stat_modifier", "stat": "magic_defense", "value": 60, "duration": 2, "target": "self", "rank": 3},
    {"type": "special", "specialType": "reflect_spell_chance", "value": 35, "duration": 2, "rank": 3}
  ]'::jsonb,
  1,
  10,
  2,
  4,
  1
);

-- 3. Life Drain - Steal health from enemies (OFFENSIVE BUFF - Self)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'mystic_life_drain',
  'Life Drain',
  'ability',
  'offensive',
  'mystic',
  'Drain life force from your attacks',
  'Your life becomes mine.',
  '👻',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "lifesteal", "value": 8, "duration": 0, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "lifesteal", "value": 25, "duration": 2, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "lifesteal", "value": 40, "duration": 2, "target": "self", "rank": 3},
    {"type": "special", "specialType": "steal_max_hp", "value": 8, "per_attack": true, "rank": 3}
  ]'::jsonb,
  1,
  12,
  2,
  4,
  1
);

-- 4. Curse - Debilitating curse on enemy (DEBUFF - Single Target)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'mystic_curse',
  'Curse',
  'ability',
  'debuff',
  'mystic',
  'Weaken enemy with dark curse',
  'You are cursed.',
  '🌀',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "attack", "value": -12, "duration": 1, "target": "single_enemy", "rank": 1},
    {"type": "stat_modifier", "stat": "defense", "value": -12, "duration": 1, "target": "single_enemy", "rank": 1},
    {"type": "stat_modifier", "stat": "attack", "value": -25, "duration": 2, "target": "single_enemy", "rank": 2},
    {"type": "stat_modifier", "stat": "defense", "value": -25, "duration": 2, "target": "single_enemy", "rank": 2},
    {"type": "stat_modifier", "stat": "speed", "value": -25, "duration": 2, "target": "single_enemy", "rank": 2},
    {"type": "stat_modifier", "stat": "attack", "value": -40, "duration": 2, "target": "single_enemy", "rank": 3},
    {"type": "stat_modifier", "stat": "defense", "value": -40, "duration": 2, "target": "single_enemy", "rank": 3},
    {"type": "stat_modifier", "stat": "speed", "value": -40, "duration": 2, "target": "single_enemy", "rank": 3},
    {"type": "stat_modifier", "stat": "magic_attack", "value": -40, "duration": 2, "target": "single_enemy", "rank": 3},
    {"type": "special", "specialType": "prevent_healing", "duration": 2, "rank": 3}
  ]'::jsonb,
  1,
  15,
  2,
  4,
  5
);

-- 5. Mystical Enhancement - Enchant weapons with magic (OFFENSIVE BUFF - Self)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'mystic_mystical_enhancement',
  'Mystical Enhancement',
  'ability',
  'offensive',
  'mystic',
  'Imbue attacks with magical power',
  'Magic flows through my strikes.',
  '✨',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "all_damage", "value": 12, "duration": 0, "target": "self", "rank": 1},
    {"type": "special", "specialType": "magic_damage_type", "duration": 0, "rank": 1},
    {"type": "stat_modifier", "stat": "all_damage", "value": 30, "duration": 2, "target": "self", "rank": 2},
    {"type": "special", "specialType": "magic_damage_type", "duration": 2, "rank": 2},
    {"type": "special", "specialType": "bypass_physical_armor", "duration": 2, "rank": 2},
    {"type": "stat_modifier", "stat": "all_damage", "value": 55, "duration": 2, "target": "self", "rank": 3},
    {"type": "special", "specialType": "magic_damage_type", "duration": 2, "rank": 3},
    {"type": "special", "specialType": "bypass_physical_armor", "duration": 2, "rank": 3},
    {"type": "stat_modifier", "stat": "lifesteal", "value": 20, "duration": 2, "rank": 3}
  ]'::jsonb,
  1,
  15,
  2,
  4,
  5
);

-- 6. Dark Ritual - Sacrifice HP to gain power (OFFENSIVE BUFF - Self, Self-Damage)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'mystic_dark_ritual',
  'Dark Ritual',
  'ability',
  'offensive',
  'mystic',
  'Sacrifice health for immense power',
  'Blood fuels dark magic.',
  '🕯️',
  3,
  'active',
  '[
    {"type": "self_damage", "value": 10, "damageType": "current_hp_percent", "rank": 1},
    {"type": "stat_modifier", "stat": "damage", "value": 30, "duration": 0, "target": "self", "rank": 1},
    {"type": "self_damage", "value": 15, "damageType": "current_hp_percent", "rank": 2},
    {"type": "stat_modifier", "stat": "damage", "value": 60, "duration": 2, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "magic_attack", "value": 30, "duration": 2, "target": "self", "rank": 2},
    {"type": "self_damage", "value": 20, "damageType": "current_hp_percent", "rank": 3},
    {"type": "stat_modifier", "stat": "damage", "value": 100, "duration": 2, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "magic_attack", "value": 60, "duration": 2, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "speed", "value": 35, "duration": 2, "target": "self", "rank": 3}
  ]'::jsonb,
  1,
  20,
  3,
  5,
  10
);

-- 7. Ethereal Presence - Mystical aura makes you harder to hit (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'mystic_ethereal_presence',
  'Ethereal Presence',
  'ability',
  'passive',
  'mystic',
  'Mystic aura makes you elusive',
  'I am shadow, I am mist.',
  '🌑',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "evasion", "value": 8, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "enemy_accuracy", "value": -5, "target": "enemies_targeting_self", "rank": 1},
    {"type": "stat_modifier", "stat": "evasion", "value": 18, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "enemy_accuracy", "value": -12, "target": "enemies_targeting_self", "rank": 2},
    {"type": "stat_modifier", "stat": "evasion", "value": 30, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "enemy_accuracy", "value": -20, "target": "enemies_targeting_self", "rank": 3},
    {"type": "immunity", "immunityType": "critical_hits", "rank": 3}
  ]'::jsonb,
  3,
  5,
  10
);
