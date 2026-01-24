-- Migration: Insert Trickster Archetype Powers
-- Purpose: Add 7 ability-tier powers for Trickster archetype
-- Archetype: Trickster - Misdirection, illusions, unpredictability

-- ===== TRICKSTER ARCHETYPE POWERS (7 total) =====

-- 1. Misdirection - Confuse enemies (DEBUFF - Single Target)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'trickster_misdirection',
  'Misdirection',
  'ability',
  'debuff',
  'trickster',
  'Confuse enemy with deceptive moves',
  'Look here, not there!',
  '🎭',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "accuracy", "value": -10, "duration": 3, "target": "single_enemy", "rank": 1},
    {"type": "stat_modifier", "stat": "accuracy", "value": -25, "duration": 6, "target": "single_enemy", "rank": 2},
    {"type": "stat_modifier", "stat": "evasion", "value": -15, "duration": 6, "target": "single_enemy", "rank": 2},
    {"type": "stat_modifier", "stat": "accuracy", "value": -45, "duration": 1, "target": "single_enemy", "rank": 3},
    {"type": "stat_modifier", "stat": "evasion", "value": -30, "duration": 1, "target": "single_enemy", "rank": 3},
    {"type": "status_effect", "statusEffect": "confusion", "chance": 25, "duration": 3, "rank": 3}
  ]'::jsonb,
  1,
  12,
  2,
  4,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 2. Sleight of Hand - Steal/manipulate (TACTICAL)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'trickster_sleight_of_hand',
  'Sleight of Hand',
  'ability',
  'utility',
  'trickster',
  'Steal buffs or resources from enemy',
  'What''s yours is mine.',
  '🤲',
  3,
  'active',
  '[
    {"type": "special", "specialType": "steal_buff", "count": 1, "from": "single_enemy", "to": "self", "rank": 1},
    {"type": "special", "specialType": "steal_buffs", "count": 2, "from": "single_enemy", "to": "self", "rank": 2},
    {"type": "special", "specialType": "steal_energy", "value": 15, "from": "single_enemy", "to": "self", "rank": 2},
    {"type": "special", "specialType": "steal_buffs", "count": 99, "from": "single_enemy", "to": "self", "rank": 3},
    {"type": "special", "specialType": "steal_energy", "value": 30, "from": "single_enemy", "to": "self", "rank": 3},
    {"type": "special", "specialType": "copy_random_ability", "duration": 2, "rank": 3}
  ]'::jsonb,
  1,
  15,
  2,
  4,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 3. Lucky Break - Random chance for big effects (CONDITIONAL PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'trickster_lucky_break',
  'Lucky Break',
  'ability',
  'passive',
  'trickster',
  'Luck can turn the tide',
  'Fortune favors the bold.',
  '🎲',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "luck", "value": 10, "target": "self", "rank": 1},
    {"type": "special", "specialType": "lucky_dodge", "chance": 5, "rank": 1},
    {"type": "stat_modifier", "stat": "luck", "value": 22, "target": "self", "rank": 2},
    {"type": "special", "specialType": "lucky_dodge", "chance": 10, "rank": 2},
    {"type": "special", "specialType": "lucky_crit", "chance": 10, "rank": 2},
    {"type": "stat_modifier", "stat": "luck", "value": 40, "target": "self", "rank": 3},
    {"type": "special", "specialType": "lucky_dodge", "chance": 18, "rank": 3},
    {"type": "special", "specialType": "lucky_crit", "chance": 18, "rank": 3},
    {"type": "special", "specialType": "lucky_double_effect", "chance": 8, "rank": 3}
  ]'::jsonb,
  2,
  4,
  1
)
ON CONFLICT (id) DO NOTHING;

-- 4. Illusory Copies - Create decoys (DEFENSIVE BUFF - Self)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'trickster_illusory_copies',
  'Illusory Copies',
  'ability',
  'defensive',
  'trickster',
  'Create illusions to avoid attacks',
  'Which one is the real me?',
  '👥',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "evasion", "value": 20, "duration": 1, "target": "self", "rank": 1},
    {"type": "special", "specialType": "mirror_images", "count": 1, "duration": 1, "rank": 1},
    {"type": "stat_modifier", "stat": "evasion", "value": 45, "duration": 2, "target": "self", "rank": 2},
    {"type": "special", "specialType": "mirror_images", "count": 2, "duration": 2, "rank": 2},
    {"type": "stat_modifier", "stat": "evasion", "value": 75, "duration": 2, "target": "self", "rank": 3},
    {"type": "special", "specialType": "mirror_images", "count": 3, "duration": 2, "rank": 3},
    {"type": "special", "specialType": "confuse_on_hit", "chance": 30, "rank": 3}
  ]'::jsonb,
  1,
  15,
  2,
  4,
  5
)
ON CONFLICT (id) DO NOTHING;

-- 5. Dirty Fighting - Underhanded tactics (OFFENSIVE BUFF - Self)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'trickster_dirty_fighting',
  'Dirty Fighting',
  'ability',
  'offensive',
  'trickster',
  'Fight without honor for advantage',
  'All is fair in love and war.',
  '🃏',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "damage", "value": 15, "duration": 0, "target": "self", "rank": 1},
    {"type": "special", "specialType": "apply_random_debuff", "chance": 20, "rank": 1},
    {"type": "stat_modifier", "stat": "damage", "value": 35, "duration": 2, "target": "self", "rank": 2},
    {"type": "special", "specialType": "apply_random_debuff", "chance": 40, "rank": 2},
    {"type": "stat_modifier", "stat": "critical_chance", "value": 20, "duration": 2, "rank": 2},
    {"type": "stat_modifier", "stat": "damage", "value": 65, "duration": 2, "target": "self", "rank": 3},
    {"type": "special", "specialType": "apply_random_debuff", "chance": 65, "rank": 3},
    {"type": "stat_modifier", "stat": "critical_chance", "value": 40, "duration": 2, "rank": 3},
    {"type": "special", "specialType": "ignore_armor", "value": 30, "rank": 3}
  ]'::jsonb,
  1,
  15,
  2,
  4,
  5
)
ON CONFLICT (id) DO NOTHING;

-- 6. Escape Artist - Always find a way out (TACTICAL)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'trickster_escape_artist',
  'Escape Artist',
  'ability',
  'defensive',
  'trickster',
  'Slip away from danger',
  'You can''t catch me!',
  '💨',
  3,
  'active',
  '[
    {"type": "special", "specialType": "untargetable", "duration": 2, "rank": 1},
    {"type": "purge", "purgeType": "debuff", "count": 1, "target": "self", "rank": 1},
    {"type": "special", "specialType": "untargetable", "duration": 4, "rank": 2},
    {"type": "purge", "purgeType": "debuff", "count": 2, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "speed", "value": 30, "duration": 2, "rank": 2},
    {"type": "special", "specialType": "untargetable", "duration": 1, "rank": 3},
    {"type": "purge", "purgeType": "debuff", "count": 99, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "speed", "value": 60, "duration": 2, "rank": 3},
    {"type": "special", "specialType": "swap_position_with_enemy", "rank": 3}
  ]'::jsonb,
  1,
  20,
  3,
  5,
  10
)
ON CONFLICT (id) DO NOTHING;

-- 7. Wild Card - Unpredictable power surge (OFFENSIVE BUFF - Self, Random)
INSERT INTO power_definitions (
  id, name, tier, category, archetype, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'trickster_wild_card',
  'Wild Card',
  'ability',
  'offensive',
  'trickster',
  'Random massive boost to random stat',
  'Chaos is my ally.',
  '🌪️',
  3,
  'active',
  '[
    {"type": "special", "specialType": "random_stat_boost", "value": 40, "duration": 0, "rank": 1},
    {"type": "special", "specialType": "random_stat_boost", "value": 80, "duration": 2, "rank": 2},
    {"type": "special", "specialType": "random_effect", "power": "medium", "rank": 2},
    {"type": "special", "specialType": "random_stat_boost", "value": 150, "duration": 2, "rank": 3},
    {"type": "special", "specialType": "random_effect", "power": "major", "rank": 3},
    {"type": "special", "specialType": "chaos_cascade", "rank": 3}
  ]'::jsonb,
  1,
  25,
  3,
  5,
  10
)
ON CONFLICT (id) DO NOTHING;
