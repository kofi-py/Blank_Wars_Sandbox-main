-- Migration: Insert Remaining Human Species Powers
-- Purpose: Add 3 remaining species-tier powers for Human (already has 4, needs 7 total)
-- Species: Human - Adaptability, determination, resilience

-- ===== HUMAN SPECIES POWERS (3 remaining) =====

-- 5. Perseverance - Never give up (CONDITIONAL PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'human_perseverance',
  'Perseverance',
  'species',
  'passive',
  'human',
  'Fight harder when injured',
  'Humanity''s greatest strength is our refusal to quit.',
  '💪',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "all", "value": 8, "condition": "hp_below_50", "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "all", "value": 18, "condition": "hp_below_50", "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "all", "value": 30, "condition": "hp_below_50", "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "lifesteal", "value": 15, "condition": "hp_below_50", "target": "self", "rank": 3}
  ]'::jsonb,
  2,
  4,
  5
)
ON CONFLICT (id) DO NOTHING;

-- 6. Resourcefulness - Make the most of what you have (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'human_resourcefulness',
  'Resourcefulness',
  'species',
  'passive',
  'human',
  'Efficient use of resources and equipment',
  'Humans make do with what they have.',
  '⚙️',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "equipment_effectiveness", "value": 8, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "equipment_effectiveness", "value": 18, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "equipment_effectiveness", "value": 30, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "energy_cost_reduction", "value": 15, "target": "self", "rank": 3}
  ]'::jsonb,
  2,
  4,
  5
)
ON CONFLICT (id) DO NOTHING;

-- 7. Indomitable Will - Resist control (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'human_indomitable_will',
  'Indomitable Will',
  'species',
  'passive',
  'human',
  'Strong willpower resists mental control',
  'The human spirit cannot be broken.',
  '🧠',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "cc_resistance", "value": 12, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "cc_resistance", "value": 25, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "cc_resistance", "value": 45, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "cc_duration", "value": -35, "target": "self", "rank": 3}
  ]'::jsonb,
  3,
  5,
  10
)
ON CONFLICT (id) DO NOTHING;
