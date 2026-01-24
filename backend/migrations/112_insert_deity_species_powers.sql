-- Migration: Insert Deity Species Powers
-- Purpose: Add 7 species-tier powers for Deity species
-- Species: Deity - Divine power, immortality, godly magic, worship

-- ===== DEITY SPECIES POWERS (7 total) =====

-- 1. Divine Power - Godly might (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'deity_divine_power',
  'Divine Power',
  'species',
  'passive',
  'deity',
  'Divine essence empowers all actions',
  'I am a god.',
  '⚡',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "all", "value": 10, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "all", "value": 22, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "all", "value": 40, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "max_hp", "value": 15, "target": "self", "rank": 3}
  ]'::jsonb,
  2,
  4,
  1
) ON CONFLICT (id) DO NOTHING;

-- 2. Immortal - Cannot truly die (CONDITIONAL PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'deity_immortal',
  'Immortal',
  'species',
  'passive',
  'deity',
  'Death is merely an inconvenience',
  'I cannot die.',
  '💀',
  3,
  'passive',
  '[
    {"type": "special", "specialType": "revive_on_death", "chance": 20, "hp_percent": 25, "rank": 1},
    {"type": "special", "specialType": "revive_on_death", "chance": 40, "hp_percent": 40, "rank": 2},
    {"type": "special", "specialType": "revive_on_death", "chance": 65, "hp_percent": 60, "rank": 3},
    {"type": "stat_modifier", "stat": "damage_reduction", "value": 30, "duration": 2, "condition": "after_revive", "rank": 3}
  ]'::jsonb,
  2,
  4,
  1
) ON CONFLICT (id) DO NOTHING;

-- 3. Holy Magic - Divine spellcasting (INSTANT ATTACK)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'deity_holy_magic',
  'Holy Magic',
  'species',
  'offensive',
  'deity',
  'Channel divine magic against foes',
  'Feel the wrath of heaven.',
  '☀️',
  3,
  'active',
  '[
    {"type": "damage", "value": 30, "damageType": "holy", "target": "single_enemy", "rank": 1},
    {"type": "damage", "value": 70, "damageType": "holy", "target": "single_enemy", "rank": 2},
    {"type": "damage_bonus", "value": 50, "condition": "vs_undead_or_demon", "rank": 2},
    {"type": "damage", "value": 130, "damageType": "holy", "target": "single_enemy", "rank": 3},
    {"type": "damage_bonus", "value": 100, "condition": "vs_undead_or_demon", "rank": 3},
    {"type": "heal", "value": 15, "target": "self", "rank": 3}
  ]'::jsonb,
  1,
  20,
  2,
  4,
  1
) ON CONFLICT (id) DO NOTHING;

-- 4. Divine Aura - Presence inspires allies (PASSIVE AURA)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'deity_divine_aura',
  'Divine Aura',
  'species',
  'passive',
  'deity',
  'Godly presence empowers nearby allies',
  'Bask in my divine glory.',
  '✨',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "all", "value": 5, "target": "all_allies", "rank": 1},
    {"type": "stat_modifier", "stat": "all", "value": 12, "target": "all_allies", "rank": 2},
    {"type": "stat_modifier", "stat": "all", "value": 20, "target": "all_allies", "rank": 3},
    {"type": "immunity", "immunityType": "fear", "target": "all_allies", "rank": 3}
  ]'::jsonb,
  2,
  4,
  5
) ON CONFLICT (id) DO NOTHING;

-- 5. Smite - Devastating holy strike (INSTANT ATTACK)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'deity_smite',
  'Smite',
  'species',
  'offensive',
  'deity',
  'Call down divine judgment',
  'Be smitten by divine power!',
  '⚡',
  3,
  'active',
  '[
    {"type": "damage", "value": 50, "damageType": "holy", "target": "single_enemy", "rank": 1},
    {"type": "special", "specialType": "ignore_armor", "value": 30, "rank": 1},
    {"type": "damage", "value": 110, "damageType": "holy", "target": "single_enemy", "rank": 2},
    {"type": "special", "specialType": "ignore_armor", "value": 50, "rank": 2},
    {"type": "status_effect", "statusEffect": "stun", "chance": 25, "duration": 3, "rank": 2},
    {"type": "damage", "value": 200, "damageType": "holy", "target": "single_enemy", "rank": 3},
    {"type": "special", "specialType": "ignore_armor", "value": 100, "rank": 3},
    {"type": "status_effect", "statusEffect": "stun", "chance": 50, "duration": 6, "rank": 3}
  ]'::jsonb,
  1,
  30,
  2,
  4,
  5
) ON CONFLICT (id) DO NOTHING;

-- 6. Divine Judgment - Punish the wicked (DEBUFF - All Enemies)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'deity_divine_judgment',
  'Divine Judgment',
  'species',
  'debuff',
  'deity',
  'Curse enemies with divine wrath',
  'You are judged and found wanting.',
  '⚖️',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "attack", "value": -15, "duration": 1, "target": "all_enemies", "rank": 1},
    {"type": "stat_modifier", "stat": "defense", "value": -15, "duration": 1, "target": "all_enemies", "rank": 1},
    {"type": "stat_modifier", "stat": "attack", "value": -30, "duration": 2, "target": "all_enemies", "rank": 2},
    {"type": "stat_modifier", "stat": "defense", "value": -30, "duration": 2, "target": "all_enemies", "rank": 2},
    {"type": "status_effect", "statusEffect": "fear", "chance": 25, "duration": 3, "rank": 2},
    {"type": "stat_modifier", "stat": "attack", "value": -50, "duration": 2, "target": "all_enemies", "rank": 3},
    {"type": "stat_modifier", "stat": "defense", "value": -50, "duration": 2, "target": "all_enemies", "rank": 3},
    {"type": "status_effect", "statusEffect": "fear", "chance": 50, "duration": 6, "rank": 3}
  ]'::jsonb,
  1,
  25,
  3,
  5,
  10
) ON CONFLICT (id) DO NOTHING;

-- 7. Celestial Blessing - Heal and protect (HEAL + BUFF - Self or Ally)
INSERT INTO power_definitions (
  id, name, tier, category, species, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'deity_celestial_blessing',
  'Celestial Blessing',
  'species',
  'heal',
  'deity',
  'Grant divine blessing',
  'Receive my blessing.',
  '🙏',
  3,
  'active',
  '[
    {"type": "heal", "value": 20, "target": "self_or_ally", "rank": 1},
    {"type": "stat_modifier", "stat": "defense", "value": 15, "duration": 2, "target": "blessed_target", "rank": 1},
    {"type": "heal", "value": 40, "target": "self_or_ally", "rank": 2},
    {"type": "stat_modifier", "stat": "defense", "value": 30, "duration": 2, "target": "blessed_target", "rank": 2},
    {"type": "purge", "purgeType": "debuff", "count": 2, "target": "blessed_target", "rank": 2},
    {"type": "heal", "value": 65, "target": "self_or_ally", "rank": 3},
    {"type": "stat_modifier", "stat": "defense", "value": 50, "duration": 2, "target": "blessed_target", "rank": 3},
    {"type": "purge", "purgeType": "debuff", "count": 99, "target": "blessed_target", "rank": 3},
    {"type": "immunity", "immunityType": "debuff", "duration": 2, "target": "blessed_target", "rank": 3}
  ]'::jsonb,
  1,
  20,
  3,
  5,
  10
) ON CONFLICT (id) DO NOTHING;
