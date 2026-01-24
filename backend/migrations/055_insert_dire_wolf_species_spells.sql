-- Migration: Insert Dire Wolf Species Spells
-- Purpose: Add 5 unique spells for dire_wolf species
-- Theme: Pack tactics, hunting instincts, primal rage, tracking

-- 1. Pack Howl (Uncommon - Buff)
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  species, mana_cost, cooldown_turns, required_level,
  effects, icon, animation
) VALUES (
  'dire_wolf_pack_howl',
  'Pack Howl',
  'Rally your pack with a powerful howl. Increase all allies'' attack by 20% and speed by 15% for 3 turns.',
  'The hunt begins.',
  'species',
  'species',
  'dire_wolf',
  35,
  3,
  1,
  '[
    {"type": "stat_modifier", "stat": "attack", "value": 20, "percent": true, "duration": 3, "target": "all_allies"},
    {"type": "stat_modifier", "stat": "speed", "value": 15, "percent": true, "duration": 3, "target": "all_allies"}
  ]'::jsonb,
  '🐺',
  'howl'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Hunter's Mark (Rare - Debuff)
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  species, mana_cost, cooldown_turns, required_level,
  effects, icon, animation
) VALUES (
  'dire_wolf_hunters_mark',
  'Hunter''s Mark',
  'Mark your prey for the kill. Target takes 50% more damage from all sources for 4 turns.',
  'You cannot escape the hunt.',
  'species',
  'species',
  'dire_wolf',
  50,
  4,
  3,
  '[
    {"type": "status_effect", "statusEffect": "marked", "duration": 4, "target": "single_enemy"},
    {"type": "stat_modifier", "stat": "defense", "value": -50, "percent": true, "duration": 4, "target": "single_enemy"}
  ]'::jsonb,
  '🎯',
  'mark'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Blood Frenzy (Rare - Self Buff)
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  species, mana_cost, cooldown_turns, required_level,
  effects, icon, animation
) VALUES (
  'dire_wolf_blood_frenzy',
  'Blood Frenzy',
  'Enter a primal rage. Gain 40% attack, 30% lifesteal, and attack twice per turn for 3 turns.',
  'The scent of blood drives me wild.',
  'species',
  'species',
  'dire_wolf',
  55,
  5,
  5,
  '[
    {"type": "stat_modifier", "stat": "attack", "value": 40, "percent": true, "duration": 3, "target": "self"},
    {"type": "lifesteal", "value": 30, "duration": 3, "target": "self"},
    {"type": "special", "specialType": "attack_twice_per_turn", "duration": 3, "target": "self"}
  ]'::jsonb,
  '🩸',
  'frenzy'
)
ON CONFLICT (id) DO NOTHING;

-- 4. Predator's Ambush (Epic - Offensive)
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  species, mana_cost, cooldown_turns, required_level,
  effects, icon, animation
) VALUES (
  'dire_wolf_predators_ambush',
  'Predator''s Ambush',
  'Strike from the shadows with deadly precision. Deal massive physical damage with guaranteed critical hit and apply bleed.',
  'They never see me coming.',
  'species',
  'species',
  'dire_wolf',
  70,
  5,
  7,
  '[
    {"type": "damage", "value": 120, "damageType": "physical", "target": "single_enemy", "guaranteed_crit": true},
    {"type": "status_effect", "statusEffect": "bleed", "duration": 5, "damage_per_turn": 15, "target": "single_enemy"},
    {"type": "special", "specialType": "ignore_armor", "percent": 50}
  ]'::jsonb,
  '🗡️',
  'ambush'
)
ON CONFLICT (id) DO NOTHING;

-- 5. Alpha's Dominance (Legendary - Ultimate)
INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  species, mana_cost, cooldown_turns, charges_per_battle, required_level,
  effects, icon, animation
) VALUES (
  'dire_wolf_alphas_dominance',
  'Alpha''s Dominance',
  'Assert your dominance as the alpha. Gain massive stat boosts, pack members heal and gain strength, enemies cower in fear.',
  'I am the alpha. All others submit.',
  'species',
  'species',
  'dire_wolf',
  100,
  0,
  1,
  10,
  '[
    {"type": "stat_modifier", "stat": "all", "value": 60, "percent": true, "duration": 4, "target": "self"},
    {"type": "heal", "value": 50, "target": "all_allies"},
    {"type": "stat_modifier", "stat": "attack", "value": 30, "percent": true, "duration": 4, "target": "all_allies"},
    {"type": "status_effect", "statusEffect": "fear", "duration": 2, "target": "all_enemies"},
    {"type": "immunity", "immunityType": "cc", "duration": 4, "target": "self"}
  ]'::jsonb,
  '👑🐺',
  'alpha_roar'
)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE spell_definitions IS 'Added dire_wolf species spells - pack hunter specialist';
