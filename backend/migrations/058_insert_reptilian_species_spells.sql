-- Migration: Insert Reptilian Species Spells
-- Purpose: Add 5 unique spells for reptilian species
-- Theme: Venom, scales, cold-blooded, ancient predator, regeneration

-- 1. Venomous Bite (Uncommon - DoT)
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  species, mana_cost, cooldown_turns, required_level,
  effects, icon, animation
) VALUES (
  'reptilian_venomous_bite',
  'Venomous Bite',
  'Inject deadly venom. Deal poison damage and apply poison that deals 12 damage per turn for 5 turns.',
  'My venom is lethal.',
  'species',
  'species',
  'reptilian',
  30,
  3,
  1,
  '[
    {"type": "damage", "value": 25, "damageType": "poison", "target": "single_enemy"},
    {"type": "status_effect", "statusEffect": "poison", "duration": 5, "damage_per_turn": 12, "target": "single_enemy"}
  ]'::jsonb,
  '🐍',
  'poison_bite'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Shed Scales (Rare - Defensive)
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  species, mana_cost, cooldown_turns, required_level,
  effects, icon, animation
) VALUES (
  'reptilian_shed_scales',
  'Shed Scales',
  'Shed old scales to reveal tougher ones. Remove all debuffs, heal 35 HP, and gain 40% defense for 4 turns.',
  'New scales, new strength.',
  'species',
  'species',
  'reptilian',
  45,
  5,
  3,
  '[
    {"type": "purge", "purgeType": "debuff", "count": 99, "target": "self"},
    {"type": "heal", "value": 35, "target": "self"},
    {"type": "stat_modifier", "stat": "defense", "value": 40, "percent": true, "duration": 4, "target": "self"},
    {"type": "damage_reduction", "value": 20, "duration": 4, "target": "self"}
  ]'::jsonb,
  '🦎',
  'scale_shed'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Cold-Blooded Strike (Rare - Offensive)
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  species, mana_cost, cooldown_turns, required_level,
  effects, icon, animation
) VALUES (
  'reptilian_cold_blooded_strike',
  'Cold-Blooded Strike',
  'Strike with predatory precision. Deal physical damage with 80% chance to slow enemy and reduce their accuracy.',
  'Patience. Then strike.',
  'species',
  'species',
  'reptilian',
  50,
  4,
  5,
  '[
    {"type": "damage", "value": 85, "damageType": "physical", "target": "single_enemy"},
    {"type": "status_effect", "statusEffect": "slow", "duration": 3, "chance": 80, "target": "single_enemy"},
    {"type": "stat_modifier", "stat": "accuracy", "value": -30, "duration": 3, "target": "single_enemy"}
  ]'::jsonb,
  '❄️🗡️',
  'cold_strike'
)
ON CONFLICT (id) DO NOTHING;

-- 4. Regenerative Scales (Epic - Healing)
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  species, mana_cost, cooldown_turns, required_level,
  effects, icon, animation
) VALUES (
  'reptilian_regenerative_scales',
  'Regenerative Scales',
  'Activate reptilian regeneration. Heal 50 HP immediately and regenerate 15 HP per turn for 5 turns.',
  'My body heals itself.',
  'species',
  'species',
  'reptilian',
  65,
  6,
  7,
  '[
    {"type": "heal", "value": 50, "target": "self"},
    {"type": "regen", "value": 15, "duration": 5, "target": "self"},
    {"type": "stat_modifier", "stat": "max_hp", "value": 20, "duration": 5, "target": "self"}
  ]'::jsonb,
  '💚',
  'regenerate'
)
ON CONFLICT (id) DO NOTHING;

-- 5. Ancient Predator (Legendary - Ultimate)
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  species, mana_cost, cooldown_turns, charges_per_battle, required_level,
  effects, icon, animation
) VALUES (
  'reptilian_ancient_predator',
  'Ancient Predator',
  'Awaken your ancient instincts. Gain massive attack, apply venom to all attacks, and attacks never miss for 4 turns.',
  'I am the apex predator.',
  'species',
  'species',
  'reptilian',
  95,
  0,
  1,
  10,
  '[
    {"type": "stat_modifier", "stat": "attack", "value": 70, "percent": true, "duration": 4, "target": "self"},
    {"type": "special", "specialType": "attacks_apply_poison", "damage_per_turn": 15, "duration": 4, "target": "self"},
    {"type": "special", "specialType": "attacks_cannot_miss", "duration": 4, "target": "self"},
    {"type": "stat_modifier", "stat": "critical_chance", "value": 30, "duration": 4, "target": "self"}
  ]'::jsonb,
  '🦖',
  'apex_roar'
)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE spell_definitions IS 'Added reptilian species spells - venomous predators';
