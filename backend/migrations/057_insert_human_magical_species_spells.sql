-- Migration: Insert Human (Magical) Species Spells
-- Purpose: Add 5 unique spells for human_magical species
-- Theme: Arcane mastery, mana manipulation, spellweaving, magical bloodline

-- 1. Arcane Channeling (Uncommon - Mana/Buff)
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  species, mana_cost, cooldown_turns, required_level,
  effects, icon, animation
) VALUES (
  'human_magical_arcane_channeling',
  'Arcane Channeling',
  'Channel pure arcane energy. Restore 30 mana and increase magic attack by 25% for 3 turns.',
  'Magic flows through my veins.',
  'species',
  'species',
  'human_magical',
  25,
  3,
  1,
  '[
    {"type": "special", "specialType": "restore_mana", "value": 30, "target": "self"},
    {"type": "stat_modifier", "stat": "magic_attack", "value": 25, "percent": true, "duration": 3, "target": "self"}
  ]'::jsonb,
  '🔮',
  'arcane_glow'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Spellweave (Rare - Offensive)
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  species, mana_cost, cooldown_turns, required_level,
  effects, icon, animation
) VALUES (
  'human_magical_spellweave',
  'Spellweave',
  'Weave multiple elements together. Deal arcane, fire, and lightning damage to all enemies.',
  'Elements bend to my will.',
  'species',
  'species',
  'human_magical',
  50,
  4,
  3,
  '[
    {"type": "damage", "value": 35, "damageType": "arcane", "target": "all_enemies"},
    {"type": "damage", "value": 35, "damageType": "fire", "target": "all_enemies"},
    {"type": "damage", "value": 35, "damageType": "lightning", "target": "all_enemies"}
  ]'::jsonb,
  '⚡🔥',
  'elemental_weave'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Mana Shield (Rare - Defensive)
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  species, mana_cost, cooldown_turns, required_level,
  effects, icon, animation
) VALUES (
  'human_magical_mana_shield',
  'Mana Shield',
  'Convert mana into protective barrier. Create shield equal to 50% of your current mana and gain magic resistance.',
  'My mana protects me.',
  'species',
  'species',
  'human_magical',
  40,
  5,
  5,
  '[
    {"type": "shield", "value": 60, "scales_with": "current_mana", "percent": 50, "target": "self"},
    {"type": "stat_modifier", "stat": "magical_resistance", "value": 40, "duration": 4, "target": "self"}
  ]'::jsonb,
  '🛡️✨',
  'mana_barrier'
)
ON CONFLICT (id) DO NOTHING;

-- 4. Arcane Mastery (Epic - Buff)
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  species, mana_cost, cooldown_turns, required_level,
  effects, icon, animation
) VALUES (
  'human_magical_arcane_mastery',
  'Arcane Mastery',
  'Achieve perfect magical control. All spells cost 50% less mana and deal 40% more damage for 4 turns.',
  'I have mastered the arcane arts.',
  'species',
  'species',
  'human_magical',
  70,
  6,
  7,
  '[
    {"type": "special", "specialType": "reduce_mana_cost", "value": 50, "percent": true, "duration": 4, "target": "self"},
    {"type": "stat_modifier", "stat": "magic_attack", "value": 40, "percent": true, "duration": 4, "target": "self"},
    {"type": "stat_modifier", "stat": "magic_damage", "value": 40, "percent": true, "duration": 4, "target": "self"}
  ]'::jsonb,
  '🌟',
  'arcane_power'
)
ON CONFLICT (id) DO NOTHING;

-- 5. Reality Warp (Legendary - Ultimate)
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  species, mana_cost, cooldown_turns, charges_per_battle, required_level,
  effects, icon, animation
) VALUES (
  'human_magical_reality_warp',
  'Reality Warp',
  'Bend reality itself. Deal massive arcane damage to all enemies, steal all their buffs, and reset all your cooldowns.',
  'Reality is mine to command.',
  'species',
  'species',
  'human_magical',
  100,
  0,
  1,
  10,
  '[
    {"type": "damage", "value": 150, "damageType": "arcane", "target": "all_enemies"},
    {"type": "special", "specialType": "steal_all_buffs", "target": "all_enemies", "apply_to": "self"},
    {"type": "special", "specialType": "reset_all_cooldowns", "target": "self"},
    {"type": "purge", "purgeType": "debuff", "count": 99, "target": "self"}
  ]'::jsonb,
  '🌀',
  'reality_tear'
)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE spell_definitions IS 'Added human_magical species spells - arcane masters';
