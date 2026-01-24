-- Migration: Insert Mage Archetype Powers
-- Purpose: Add 7 ability-tier powers for Mage archetype
-- Archetype: Mage - All PASSIVE powers for magical enhancement

-- ===== MAGE ARCHETYPE POWERS (7 total - ALL PASSIVE) =====

-- 1. Arcane Mastery - Increase magic damage (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'mage_arcane_mastery',
  'Arcane Mastery',
  'ability',
  'passive',
  'mage',
  'Master of arcane forces',
  'Magic flows through my veins.',
  '✨',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "magic_attack", "value": 12, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "magic_attack", "value": 25, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "magic_attack", "value": 45, "target": "self", "rank": 3},
    {"type": "armor_penetration", "value": 20, "armorType": "magic_defense", "rank": 3}
  ]'::jsonb,
  2,
  4,
  1
);

-- 2. Mana Efficiency - Reduce spell costs (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'mage_mana_efficiency',
  'Mana Efficiency',
  'ability',
  'passive',
  'mage',
  'Cast spells with less energy',
  'Every drop of mana counts.',
  '💧',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "spell_cost_reduction", "value": 8, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "spell_cost_reduction", "value": 18, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "spell_cost_reduction", "value": 30, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "max_mana", "value": 20, "target": "self", "rank": 3}
  ]'::jsonb,
  2,
  4,
  1
);

-- 3. Spell Penetration - Pierce magic resistance (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'mage_spell_penetration',
  'Spell Penetration',
  'ability',
  'passive',
  'mage',
  'Magic pierces enemy defenses',
  'No defense can stop true magic.',
  '🔮',
  3,
  'passive',
  '[
    {"type": "armor_penetration", "value": 10, "armorType": "magic_defense", "rank": 1},
    {"type": "armor_penetration", "value": 22, "armorType": "magic_defense", "rank": 2},
    {"type": "armor_penetration", "value": 40, "armorType": "magic_defense", "rank": 3},
    {"type": "special", "specialType": "spell_cannot_be_resisted", "chance": 15, "rank": 3}
  ]'::jsonb,
  2,
  4,
  1
);

-- 4. Mental Fortitude - Resist magical attacks (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'mage_mental_fortitude',
  'Mental Fortitude',
  'ability',
  'passive',
  'mage',
  'Strong mind resists hostile magic',
  'My mind is my fortress.',
  '🧠',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "magic_defense", "value": 10, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "magic_defense", "value": 22, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "magic_defense", "value": 40, "target": "self", "rank": 3},
    {"type": "special", "specialType": "spell_reflect_chance", "value": 12, "rank": 3}
  ]'::jsonb,
  2,
  4,
  5
);

-- 5. Analytical Combat - Learn from enemies (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'mage_analytical_combat',
  'Analytical Combat',
  'ability',
  'passive',
  'mage',
  'Gain bonuses vs enemies you''ve studied',
  'I learn from every battle.',
  '📖',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "damage", "value": 10, "condition": "vs_canonical_defeated_before", "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "damage", "value": 22, "condition": "vs_canonical_defeated_before", "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "damage", "value": 40, "condition": "vs_canonical_defeated_before", "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "evasion", "value": 25, "condition": "vs_canonical_defeated_before", "target": "self", "rank": 3}
  ]'::jsonb,
  2,
  4,
  5
);

-- 6. Spell Focus - Increased critical spell chance (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'mage_spell_focus',
  'Spell Focus',
  'ability',
  'passive',
  'mage',
  'Focus magic for devastating spells',
  'Precision and power combined.',
  '🎯',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "spell_critical_chance", "value": 8, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "spell_critical_chance", "value": 18, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "spell_critical_chance", "value": 32, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "spell_critical_damage", "value": 50, "target": "self", "rank": 3}
  ]'::jsonb,
  3,
  5,
  10
);

-- 7. Elemental Affinity - Enhanced elemental magic (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'mage_elemental_affinity',
  'Elemental Affinity',
  'ability',
  'passive',
  'mage',
  'Mastery of elemental forces',
  'Fire, ice, lightning - all obey me.',
  '🌟',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "elemental_damage", "value": 10, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "elemental_damage", "value": 22, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "elemental_damage", "value": 40, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "elemental_resistance", "value": 25, "target": "self", "rank": 3}
  ]'::jsonb,
  3,
  5,
  10
);
