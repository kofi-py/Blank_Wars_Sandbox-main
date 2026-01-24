-- Migration: Insert Human Species Spells
-- Purpose: Add 5 unique spells for human species
-- Theme: Versatility, adaptability, determination, human spirit, innovation

-- 1. Second Wind (Uncommon - Heal/Buff)
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  species, mana_cost, cooldown_turns, required_level,
  effects, icon, animation
) VALUES (
  'human_second_wind',
  'Second Wind',
  'Human resilience pushes you forward. Heal 40 HP and gain 25% speed for 3 turns.',
  'I''m not done yet!',
  'species',
  'species',
  'human',
  30,
  4,
  1,
  '[
    {"type": "heal", "value": 40, "target": "self"},
    {"type": "stat_modifier", "stat": "speed", "value": 25, "percent": true, "duration": 3, "target": "self"},
    {"type": "purge", "purgeType": "debuff", "count": 1, "target": "self"}
  ]'::jsonb,
  '💨',
  'wind_surge'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Tactical Adaptation (Rare - Utility)
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  species, mana_cost, cooldown_turns, required_level,
  effects, icon, animation
) VALUES (
  'human_tactical_adaptation',
  'Tactical Adaptation',
  'Adapt to the situation. Copy one random buff from an enemy or ally and apply it to yourself.',
  'We learn. We adapt. We overcome.',
  'species',
  'species',
  'human',
  45,
  5,
  3,
  '[
    {"type": "special", "specialType": "copy_random_buff", "source": "any_character", "target": "self"},
    {"type": "stat_modifier", "stat": "evasion", "value": 20, "duration": 3, "target": "self"}
  ]'::jsonb,
  '🎲',
  'adapt'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Indomitable Will (Rare - Defensive)
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  species, mana_cost, cooldown_turns, required_level,
  effects, icon, animation
) VALUES (
  'human_indomitable_will',
  'Indomitable Will',
  'Refuse to give up. Immune to crowd control and gain 30% damage reduction for 4 turns.',
  'My will is unbreakable.',
  'species',
  'species',
  'human',
  50,
  5,
  5,
  '[
    {"type": "immunity", "immunityType": "cc", "duration": 4, "target": "self"},
    {"type": "damage_reduction", "value": 30, "percent": true, "duration": 4, "target": "self"},
    {"type": "stat_modifier", "stat": "defense", "value": 25, "duration": 4, "target": "self"}
  ]'::jsonb,
  '🛡️',
  'iron_will'
)
ON CONFLICT (id) DO NOTHING;

-- 4. Innovation (Epic - Support)
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  species, mana_cost, cooldown_turns, required_level,
  effects, icon, animation
) VALUES (
  'human_innovation',
  'Innovation',
  'Human ingenuity creates opportunity. Reduce all cooldowns for all allies by 1 turn and grant 30% attack for 3 turns.',
  'We find a way.',
  'species',
  'species',
  'human',
  65,
  6,
  7,
  '[
    {"type": "special", "specialType": "reduce_all_cooldowns", "value": 1, "target": "all_allies"},
    {"type": "stat_modifier", "stat": "attack", "value": 30, "percent": true, "duration": 3, "target": "all_allies"},
    {"type": "stat_modifier", "stat": "magic_attack", "value": 30, "percent": true, "duration": 3, "target": "all_allies"}
  ]'::jsonb,
  '💡',
  'lightbulb'
)
ON CONFLICT (id) DO NOTHING;

-- 5. Undying Spirit (Legendary - Ultimate)
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  species, mana_cost, cooldown_turns, charges_per_battle, required_level,
  effects, icon, animation
) VALUES (
  'human_undying_spirit',
  'Undying Spirit',
  'The human spirit cannot be extinguished. If you would die, instead survive with 1 HP, heal 50% max HP over 3 turns, and gain massive stat boosts.',
  'Humanity endures.',
  'species',
  'species',
  'human',
  90,
  0,
  1,
  10,
  '[
    {"type": "special", "specialType": "survive_lethal_damage", "heal_percent": 50, "duration": 3},
    {"type": "stat_modifier", "stat": "all", "value": 50, "percent": true, "duration": 3, "target": "self"},
    {"type": "immunity", "immunityType": "debuff", "duration": 3, "target": "self"},
    {"type": "regen", "value": 20, "duration": 3, "target": "self"}
  ]'::jsonb,
  '✨',
  'phoenix_rebirth'
)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE spell_definitions IS 'Added human species spells - versatile and adaptable fighters';
