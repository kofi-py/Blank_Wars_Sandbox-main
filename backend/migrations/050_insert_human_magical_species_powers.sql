-- Migration: Insert Human Magical Species Powers
-- Purpose: Add 7 species-tier powers for Human_magical species
-- Species: Human_magical - Humans born with innate magic, sorcery, mana affinity

-- ===== HUMAN MAGICAL SPECIES POWERS (7 total) =====

-- 1. Innate Magic - Born with magical power (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'human_magical_innate_magic',
  'Innate Magic',
  'species',
  'passive',
  'human_magical',
  'Natural magical talent enhances spells',
  'Magic flows through my blood.',
  '✨',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "magic_attack", "value": 12, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "magic_attack", "value": 25, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "magic_attack", "value": 45, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "spell_critical_chance", "value": 15, "target": "self", "rank": 3}
  ]'::jsonb,
  2,
  4,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 2. Expanded Mana Pool - Greater magical reserves (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'human_magical_expanded_mana_pool',
  'Expanded Mana Pool',
  'species',
  'passive',
  'human_magical',
  'Larger reserves of magical energy',
  'My mana is boundless.',
  '💧',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "max_mana", "value": 15, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "max_mana", "value": 30, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "mana_regen", "value": 15, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "max_mana", "value": 50, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "mana_regen", "value": 30, "target": "self", "rank": 3}
  ]'::jsonb,
  2,
  4,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 3. Spellweaving - Enhanced spellcasting (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'human_magical_spellweaving',
  'Spellweaving',
  'species',
  'passive',
  'human_magical',
  'Cast spells more efficiently',
  'I weave magic effortlessly.',
  '🧵',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "spell_cost_reduction", "value": 8, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "spell_cost_reduction", "value": 18, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "spell_cost_reduction", "value": 30, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "spell_cast_speed", "value": 20, "target": "self", "rank": 3}
  ]'::jsonb,
  2,
  4,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 4. Arcane Surge - Burst of magical power (OFFENSIVE BUFF - Self)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'human_magical_arcane_surge',
  'Arcane Surge',
  'species',
  'offensive',
  'human_magical',
  'Channel raw arcane energy',
  'Arcane power unleashed!',
  '⚡',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "magic_attack", "value": 20, "duration": 0, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "magic_attack", "value": 45, "duration": 2, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "spell_critical_chance", "value": 25, "duration": 2, "rank": 2},
    {"type": "stat_modifier", "stat": "magic_attack", "value": 80, "duration": 2, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "spell_critical_chance", "value": 50, "duration": 2, "rank": 3},
    {"type": "special", "specialType": "next_spell_instant", "rank": 3}
  ]'::jsonb,
  1,
  20,
  2,
  4,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 5. Mana Shield - Magical barrier (DEFENSIVE BUFF - Self)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'human_magical_mana_shield',
  'Mana Shield',
  'species',
  'defensive',
  'human_magical',
  'Convert mana into protective shield',
  'My mana protects me.',
  '🔮',
  3,
  'active',
  '[
    {"type": "special", "specialType": "absorb_damage", "value": 20, "duration": 1, "mana_cost_per_damage": 1, "rank": 1},
    {"type": "special", "specialType": "absorb_damage", "value": 40, "duration": 2, "mana_cost_per_damage": 1, "rank": 2},
    {"type": "stat_modifier", "stat": "magic_defense", "value": 20, "duration": 2, "rank": 2},
    {"type": "special", "specialType": "absorb_damage", "value": 70, "duration": 2, "mana_cost_per_damage": 1, "rank": 3},
    {"type": "stat_modifier", "stat": "magic_defense", "value": 40, "duration": 2, "rank": 3},
    {"type": "special", "specialType": "reflect_spell_chance", "value": 25, "duration": 2, "rank": 3}
  ]'::jsonb,
  1,
  15,
  2,
  4,
  5
)
ON CONFLICT (id) DO NOTHING;

-- 6. Magical Resistance - Resist hostile magic (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'human_magical_magical_resistance',
  'Magical Resistance',
  'species',
  'passive',
  'human_magical',
  'Innate resistance to magic',
  'Magic cannot easily harm me.',
  '🛡️',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "magic_defense", "value": 10, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "magic_defense", "value": 22, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "magic_defense", "value": 40, "target": "self", "rank": 3},
    {"type": "special", "specialType": "spell_damage_reduction", "value": 15, "rank": 3}
  ]'::jsonb,
  2,
  4,
  5
)
ON CONFLICT (id) DO NOTHING;

-- 7. Mana Burn - Drain enemy mana (INSTANT ATTACK)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'human_magical_mana_burn',
  'Mana Burn',
  'species',
  'offensive',
  'human_magical',
  'Drain magical energy from enemy',
  'Your power is mine.',
  '🔥',
  3,
  'active',
  '[
    {"type": "damage", "value": 15, "damageType": "magic", "target": "single_enemy", "rank": 1},
    {"type": "special", "specialType": "drain_mana", "value": 15, "target": "single_enemy", "rank": 1},
    {"type": "damage", "value": 40, "damageType": "magic", "target": "single_enemy", "rank": 2},
    {"type": "special", "specialType": "drain_mana", "value": 30, "target": "single_enemy", "rank": 2},
    {"type": "stat_modifier", "stat": "magic_attack", "value": -20, "duration": 2, "target": "enemy", "rank": 2},
    {"type": "damage", "value": 75, "damageType": "magic", "target": "single_enemy", "rank": 3},
    {"type": "special", "specialType": "drain_mana", "value": 50, "target": "single_enemy", "rank": 3},
    {"type": "stat_modifier", "stat": "magic_attack", "value": -40, "duration": 2, "target": "enemy", "rank": 3},
    {"type": "special", "specialType": "restore_mana_to_self", "value": 30, "rank": 3}
  ]'::jsonb,
  1,
  25,
  3,
  5,
  10
)
ON CONFLICT (id) DO NOTHING;
