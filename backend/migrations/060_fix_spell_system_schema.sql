-- Migration: Fix Spell System Schema
-- Purpose: Remove obsolete tier column, add character_id for signature spells, delete system spells, fix durations
-- Date: 2025-10-27

-- ===== SCHEMA CHANGES =====

-- Drop obsolete restricted_to_class column (we use archetypes, not classes)
ALTER TABLE spell_definitions DROP COLUMN IF EXISTS restricted_to_class;

-- NOTE: tier column is NOT obsolete - it's required to match power_definitions pattern
-- tier indicates access level: universal/archetype/species/signature (NOT rarity levels)

-- Add character_id column for signature spells
ALTER TABLE spell_definitions ADD COLUMN IF NOT EXISTS character_id TEXT;

-- Create index for character_id
CREATE INDEX IF NOT EXISTS idx_spell_definitions_character ON spell_definitions(character_id) WHERE character_id IS NOT NULL;

-- Add max_rank column if it doesn't exist (for spell ranking system)
ALTER TABLE spell_definitions ADD COLUMN IF NOT EXISTS max_rank INTEGER DEFAULT 1;

-- ===== DATA CLEANUP =====

-- Delete system archetype spells (system characters are NPCs, not playable)
DELETE FROM spell_definitions WHERE archetype = 'system';

-- ===== FIX GHOST PROTOCOL (Assassin spell with old format) =====
UPDATE spell_definitions
SET effects = '[
  {"rank": 1, "type": "status_effect", "target": "self", "statusEffect": "invisible", "duration": 1, "nextAttackBonus": 150, "cooldown": 1, "manaCost": 40},
  {"rank": 2, "type": "status_effect", "target": "self", "statusEffect": "invisible", "duration": 2, "nextAttackBonus": 200, "cooldown": 2, "manaCost": 55},
  {"rank": 3, "type": "status_effect", "target": "self", "statusEffect": "invisible", "duration": 3, "nextAttackBonus": 300, "guaranteedCrit": true, "cooldown": 3, "manaCost": 70}
]'::jsonb
WHERE name = 'Ghost Protocol' AND archetype = 'assassin';

-- ===== FIX DURATIONS (Cap at 3 rounds since battles last 3 rounds) =====

-- Universal spells
UPDATE spell_definitions
SET effects = effects || '{"duration": 3}'::jsonb
WHERE name = 'Fortitude' AND category = 'universal'
  AND effects::text LIKE '%"duration": 4%';

-- Dire Wolf species spells
UPDATE spell_definitions
SET effects = '[
  {"type": "status_effect", "target": "single_enemy", "duration": 3, "statusEffect": "marked"},
  {"stat": "defense", "type": "stat_modifier", "value": -50, "target": "single_enemy", "percent": true, "duration": 3}
]'::jsonb
WHERE name = 'Hunter''s Mark' AND species = 'dire_wolf'
  AND effects::text LIKE '%"duration": 4%';

UPDATE spell_definitions
SET effects = '[
  {"type": "damage", "value": 120, "target": "single_enemy", "damageType": "physical", "guaranteed_crit": true},
  {"type": "status_effect", "target": "single_enemy", "duration": 3, "statusEffect": "bleed", "damage_per_turn": 15},
  {"type": "special", "percent": 50, "specialType": "ignore_armor"}
]'::jsonb
WHERE name = 'Predator''s Ambush' AND species = 'dire_wolf'
  AND effects::text LIKE '%"duration": 5%';

UPDATE spell_definitions
SET effects = '[
  {"stat": "all", "type": "stat_modifier", "value": 60, "target": "self", "percent": true, "duration": 3},
  {"type": "heal", "value": 50, "target": "all_allies"},
  {"stat": "attack", "type": "stat_modifier", "value": 30, "target": "all_allies", "percent": true, "duration": 3},
  {"type": "status_effect", "target": "all_enemies", "duration": 2, "statusEffect": "fear"},
  {"type": "immunity", "target": "self", "duration": 3, "immunityType": "cc"}
]'::jsonb
WHERE name = 'Alpha''s Dominance' AND species = 'dire_wolf'
  AND effects::text LIKE '%"duration": 4%';

-- Zeta Reticulan Grey species spells
UPDATE spell_definitions
SET effects = '[
  {"type": "special", "target": "single_enemy", "specialType": "reveal_all_effects"},
  {"stat": "defense", "type": "stat_modifier", "value": -40, "target": "single_enemy", "percent": true, "duration": 3},
  {"stat": "magic_defense", "type": "stat_modifier", "value": -40, "target": "single_enemy", "percent": true, "duration": 3}
]'::jsonb
WHERE name = 'Mind Probe' AND species = 'zeta_reticulan_grey'
  AND effects::text LIKE '%"duration": 4%';

UPDATE spell_definitions
SET effects = '[
  {"type": "shield", "value": 60, "target": "self"},
  {"type": "reflect", "value": 40, "target": "self", "duration": 3, "damageType": "psychic"},
  {"type": "immunity", "target": "self", "duration": 3, "immunityType": "psychic"}
]'::jsonb
WHERE name = 'Psychic Barrier' AND species = 'zeta_reticulan_grey'
  AND effects::text LIKE '%"duration": 4%';

UPDATE spell_definitions
SET effects = '[
  {"type": "special", "target": "single_enemy", "duration": 2, "specialType": "remove_from_battle"},
  {"type": "status_effect", "target": "single_enemy", "duration": 3, "statusEffect": "confusion", "apply_on_return": true},
  {"stat": "all", "type": "stat_modifier", "value": -40, "target": "single_enemy", "percent": true, "duration": 3, "apply_on_return": true},
  {"type": "damage", "value": 100, "target": "single_enemy", "damageType": "psychic", "apply_on_return": true}
]'::jsonb
WHERE name = 'Alien Abduction' AND species = 'zeta_reticulan_grey'
  AND effects::text LIKE '%"duration": 4%';

-- Human species spells
UPDATE spell_definitions
SET effects = '[
  {"type": "immunity", "target": "self", "duration": 3, "immunityType": "cc"},
  {"type": "damage_reduction", "value": 30, "target": "self", "percent": true, "duration": 3},
  {"stat": "defense", "type": "stat_modifier", "value": 25, "target": "self", "duration": 3}
]'::jsonb
WHERE name = 'Indomitable Will' AND species = 'human'
  AND effects::text LIKE '%"duration": 4%';

-- Human Magical species spells
UPDATE spell_definitions
SET effects = '[
  {"type": "shield", "value": 60, "target": "self", "percent": 50, "scales_with": "current_mana"},
  {"stat": "magical_resistance", "type": "stat_modifier", "value": 40, "target": "self", "duration": 3}
]'::jsonb
WHERE name = 'Mana Shield' AND species = 'human_magical'
  AND effects::text LIKE '%"duration": 4%';

UPDATE spell_definitions
SET effects = '[
  {"type": "special", "value": 50, "target": "self", "percent": true, "duration": 3, "specialType": "reduce_mana_cost"},
  {"stat": "magic_attack", "type": "stat_modifier", "value": 40, "target": "self", "percent": true, "duration": 3},
  {"stat": "magic_damage", "type": "stat_modifier", "value": 40, "target": "self", "percent": true, "duration": 3}
]'::jsonb
WHERE name = 'Arcane Mastery' AND species = 'human_magical'
  AND effects::text LIKE '%"duration": 4%';

-- Reptilian species spells
UPDATE spell_definitions
SET effects = '[
  {"type": "damage", "value": 25, "target": "single_enemy", "damageType": "poison"},
  {"type": "status_effect", "target": "single_enemy", "duration": 3, "statusEffect": "poison", "damage_per_turn": 12}
]'::jsonb
WHERE name = 'Venomous Bite' AND species = 'reptilian'
  AND effects::text LIKE '%"duration": 5%';

UPDATE spell_definitions
SET effects = '[
  {"type": "purge", "count": 99, "target": "self", "purgeType": "debuff"},
  {"type": "heal", "value": 35, "target": "self"},
  {"stat": "defense", "type": "stat_modifier", "value": 40, "target": "self", "percent": true, "duration": 3},
  {"type": "damage_reduction", "value": 20, "target": "self", "duration": 3}
]'::jsonb
WHERE name = 'Shed Scales' AND species = 'reptilian'
  AND effects::text LIKE '%"duration": 4%';

UPDATE spell_definitions
SET effects = '[
  {"type": "heal", "value": 50, "target": "self"},
  {"type": "regen", "value": 15, "target": "self", "duration": 3},
  {"stat": "max_hp", "type": "stat_modifier", "value": 20, "target": "self", "duration": 3}
]'::jsonb
WHERE name = 'Regenerative Scales' AND species = 'reptilian'
  AND effects::text LIKE '%"duration": 5%';

UPDATE spell_definitions
SET effects = '[
  {"stat": "attack", "type": "stat_modifier", "value": 70, "target": "self", "percent": true, "duration": 3},
  {"type": "special", "target": "self", "duration": 3, "specialType": "attacks_apply_poison", "damage_per_turn": 15},
  {"type": "special", "target": "self", "duration": 3, "specialType": "attacks_cannot_miss"},
  {"stat": "critical_chance", "type": "stat_modifier", "value": 30, "target": "self", "duration": 3}
]'::jsonb
WHERE name = 'Ancient Predator' AND species = 'reptilian'
  AND effects::text LIKE '%"duration": 4%';

-- Vampire, Cyborg, Toaster, Fairy, Golem species spells
UPDATE spell_definitions
SET effects = '{"target": "self", "duration": 3, "condition": "in_darkness", "healingPerTurnPercent": 15}'::jsonb
WHERE name = 'Immortal Regeneration' AND species = 'vampire'
  AND effects::text LIKE '%"duration": 5%';

UPDATE spell_definitions
SET effects = '{"target": "self", "duration": 3, "resistanceAdaptive": 50}'::jsonb
WHERE name = 'Adaptive Armor' AND species = 'cyborg'
  AND effects::text LIKE '%"duration": 4%';

UPDATE spell_definitions
SET effects = '{"target": "self", "duration": 3, "statBoost": 15, "statsAffected": "all", "healingPerTurn": 30}'::jsonb
WHERE name = 'Nanite Swarm' AND species = 'cyborg'
  AND effects::text LIKE '%"duration": 4%';

UPDATE spell_definitions
SET effects = '{"target": "self", "duration": 3, "statBoost": 100, "statsAffected": "all", "transformVisual": "golden_glow"}'::jsonb
WHERE name = 'Ascended Appliance' AND species = 'toaster'
  AND effects::text LIKE '%"duration": 4%';

UPDATE spell_definitions
SET effects = '{"target": "all", "duration": 3, "damageType": "nature", "targetType": "enemies", "damagePerTurn": 20, "speedReduction": 40}'::jsonb
WHERE name = 'Wild Growth' AND species = 'fairy'
  AND effects::text LIKE '%"duration": 4%';

UPDATE spell_definitions
SET effects = '{"target": "self", "duration": 3, "immuneStun": true, "immuneKnockback": true}'::jsonb
WHERE name = 'Ancient Fortitude' AND species = 'golem'
  AND effects::text LIKE '%"duration": 4%';

UPDATE spell_definitions
SET effects = '{"target": "self", "duration": 3, "healingPerTurnPercent": 15}'::jsonb
WHERE name = 'Reconstruction' AND species = 'golem'
  AND effects::text LIKE '%"duration": 4%';

-- ===== COMMENTS =====
COMMENT ON COLUMN spell_definitions.character_id IS 'References specific character for signature spells (NULL for universal/archetype/species spells)';
COMMENT ON COLUMN spell_definitions.max_rank IS 'Maximum rank this spell can reach (1-3), affects power scaling';
