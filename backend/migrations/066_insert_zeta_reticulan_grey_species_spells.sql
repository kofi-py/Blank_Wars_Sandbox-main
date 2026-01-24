-- Migration: 066 - Insert Zeta Reticulan Grey Species Spells
-- Purpose: Add 5 unique spells for zeta_reticulan_grey species
-- Theme: Psychic powers, telepathy, mind control, alien technology, probing

-- 1. Telepathic Assault (Uncommon - Offensive)
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  species, mana_cost, cooldown_turns, required_level,
  effects, icon, animation
) VALUES (
  'grey_telepathic_assault',
  'Telepathic Assault',
  'Attack target''s mind directly. Deal psychic damage and reduce their magic defense by 25% for 3 turns.',
  'Your thoughts betray you.',
  'species',
  'species',
  'zeta_reticulan_grey',
  30,
  3,
  1,
  '[
    {"type": "damage", "value": 45, "damageType": "psychic", "target": "single_enemy"},
    {"type": "stat_modifier", "stat": "magic_defense", "value": -25, "percent": true, "duration": 3, "target": "single_enemy"}
  ]'::jsonb,
  '🧠',
  'mind_blast'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Mind Probe (Rare - Utility/Debuff)
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  species, mana_cost, cooldown_turns, required_level,
  effects, icon, animation
) VALUES (
  'grey_mind_probe',
  'Mind Probe',
  'Probe enemy mind to expose weaknesses. Reveal all buffs/debuffs and make target take 40% more damage for 4 turns.',
  'Let me see inside your mind.',
  'species',
  'species',
  'zeta_reticulan_grey',
  45,
  5,
  3,
  '[
    {"type": "special", "specialType": "reveal_all_effects", "target": "single_enemy"},
    {"type": "stat_modifier", "stat": "defense", "value": -40, "percent": true, "duration": 4, "target": "single_enemy"},
    {"type": "stat_modifier", "stat": "magic_defense", "value": -40, "percent": true, "duration": 4, "target": "single_enemy"}
  ]'::jsonb,
  '👁️',
  'probe'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Psychic Barrier (Rare - Defensive)
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  species, mana_cost, cooldown_turns, required_level,
  effects, icon, animation
) VALUES (
  'grey_psychic_barrier',
  'Psychic Barrier',
  'Create telekinetic shield. Gain damage shield and reflect 40% of psychic damage back to attacker.',
  'My mind is my shield.',
  'species',
  'species',
  'zeta_reticulan_grey',
  50,
  4,
  5,
  '[
    {"type": "shield", "value": 60, "target": "self"},
    {"type": "reflect", "value": 40, "damageType": "psychic", "duration": 4, "target": "self"},
    {"type": "immunity", "immunityType": "psychic", "duration": 4, "target": "self"}
  ]'::jsonb,
  '🛸',
  'barrier'
)
ON CONFLICT (id) DO NOTHING;

-- 4. Mind Control (Epic - Control)
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  species, mana_cost, cooldown_turns, required_level,
  effects, icon, animation
) VALUES (
  'grey_mind_control',
  'Mind Control',
  'Dominate enemy mind completely. Force target to attack their ally, then they are stunned for 2 turns.',
  'You will obey.',
  'species',
  'species',
  'zeta_reticulan_grey',
  70,
  6,
  7,
  '[
    {"type": "status_effect", "statusEffect": "charm", "duration": 1, "target": "single_enemy"},
    {"type": "special", "specialType": "force_attack_ally", "target": "single_enemy"},
    {"type": "status_effect", "statusEffect": "stun", "duration": 2, "target": "single_enemy"}
  ]'::jsonb,
  '👽',
  'mind_control'
)
ON CONFLICT (id) DO NOTHING;

-- 5. Alien Abduction (Legendary - Ultimate)
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  species, mana_cost, cooldown_turns, charges_per_battle, required_level,
  effects, icon, animation
) VALUES (
  'grey_alien_abduction',
  'Alien Abduction',
  'Summon UFO to abduct enemy. Remove target from battle for 2 turns, when they return they are confused and weakened.',
  'You are coming with us.',
  'species',
  'species',
  'zeta_reticulan_grey',
  100,
  0,
  1,
  10,
  '[
    {"type": "special", "specialType": "remove_from_battle", "duration": 2, "target": "single_enemy"},
    {"type": "status_effect", "statusEffect": "confusion", "duration": 3, "apply_on_return": true, "target": "single_enemy"},
    {"type": "stat_modifier", "stat": "all", "value": -40, "percent": true, "duration": 4, "apply_on_return": true, "target": "single_enemy"},
    {"type": "damage", "value": 100, "damageType": "psychic", "apply_on_return": true, "target": "single_enemy"}
  ]'::jsonb,
  '🛸👽',
  'abduction'
)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE spell_definitions IS 'Added zeta_reticulan_grey species spells - psychic alien specialists';
