-- Migration: Insert Frankenstein's Monster Signature Powers
-- Purpose: Add 7 unique signature powers for Frankenstein's Monster character
-- Character: Frankenstein's Monster (Tank, Golem) - Undead creation, electricity, strength, tragic creature

-- ===== FRANKENSTEIN'S MONSTER SIGNATURE POWERS (7 total) =====

-- 1. Lightning Surge (INSTANT ATTACK)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'frankenstein_lightning_surge',
  'Lightning Surge',
  'signature',
  'offensive',
  'frankenstein_monster',
  'Electric power channeled through undead body',
  '"Lightning... gives... LIFE!"',
  '⚡',
  3,
  'active',
  '[
    {"type": "damage", "value": 35, "damageType": "lightning", "target": "single_enemy", "rank": 1},
    {"type": "damage", "value": 80, "damageType": "lightning", "target": "single_enemy", "rank": 2},
    {"type": "status_effect", "statusEffect": "paralyze", "duration": 1, "chance": 30, "rank": 2},
    {"type": "damage", "value": 150, "damageType": "lightning", "target": "single_enemy", "rank": 3},
    {"type": "status_effect", "statusEffect": "paralyze", "duration": 2, "chance": 70, "rank": 3},
    {"type": "special", "specialType": "ignore_armor", "rank": 3}
  ]'::jsonb,
  1,
  18,
  5,
  6,
  1
);

-- 2. Undead Resilience (PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'frankenstein_undead_resilience',
  'Undead Resilience',
  'signature',
  'passive',
  'frankenstein_monster',
  'Cannot truly die - immense durability',
  '"Pain... means... nothing."',
  '🧟',
  3,
  'passive',
  '[
    {"type": "stat_modifier", "stat": "max_hp", "value": 20, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "defense", "value": 10, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "max_hp", "value": 40, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "defense", "value": 22, "target": "self", "rank": 2},
    {"type": "immunity", "immunityType": "poison", "rank": 2},
    {"type": "immunity", "immunityType": "disease", "rank": 2},
    {"type": "stat_modifier", "stat": "max_hp", "value": 70, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "defense", "value": 40, "target": "self", "rank": 3},
    {"type": "immunity", "immunityType": "poison", "rank": 3},
    {"type": "immunity", "immunityType": "disease", "rank": 3},
    {"type": "immunity", "immunityType": "bleed", "rank": 3},
    {"type": "regen", "value": 5, "target": "self", "rank": 3}
  ]'::jsonb,
  5,
  6,
  1
);

-- 3. Overwhelming Strength (INSTANT ATTACK)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'frankenstein_overwhelming_strength',
  'Overwhelming Strength',
  'signature',
  'offensive',
  'frankenstein_monster',
  'Monstrous power that crushes defenses',
  '"STRONG!"',
  '💪',
  3,
  'active',
  '[
    {"type": "damage", "value": 45, "damageType": "physical", "target": "single_enemy", "rank": 1},
    {"type": "stat_modifier", "stat": "defense", "value": -25, "ignorePercent": true, "rank": 1},
    {"type": "damage", "value": 100, "damageType": "physical", "target": "single_enemy", "rank": 2},
    {"type": "stat_modifier", "stat": "defense", "value": -50, "ignorePercent": true, "rank": 2},
    {"type": "damage", "value": 190, "damageType": "physical", "target": "single_enemy", "rank": 3},
    {"type": "stat_modifier", "stat": "defense", "value": -80, "ignorePercent": true, "rank": 3},
    {"type": "status_effect", "statusEffect": "stun", "duration": 2, "chance": 40, "rank": 3}
  ]'::jsonb,
  1,
  20,
  5,
  6,
  1
);

-- 4. Hulking Form (DEFENSIVE BUFF - Self)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'frankenstein_hulking_form',
  'Hulking Form',
  'signature',
  'defensive',
  'frankenstein_monster',
  'Impenetrable defense',
  '"Nothing... hurts... me."',
  '🛡️',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "defense", "value": 35, "duration": 1, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "defense", "value": 70, "duration": 2, "target": "self", "rank": 2},
    {"type": "damage_reduction", "value": 20, "duration": 2, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "defense", "value": 120, "duration": 1, "target": "self", "rank": 3},
    {"type": "damage_reduction", "value": 50, "duration": 1, "target": "self", "rank": 3},
    {"type": "reflect", "value": 30, "duration": 1, "target": "self", "rank": 3}
  ]'::jsonb,
  1,
  22,
  5,
  6,
  5
);

-- 5. Tragic Existence (CONDITIONAL PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'frankenstein_tragic_existence',
  'Tragic Existence',
  'signature',
  'passive',
  'frankenstein_monster',
  'Misunderstood monster - pain fuels rage',
  '"Why... attack... me?"',
  '😢',
  3,
  'passive',
  '[
    {"type": "on_damaged", "chance": 20, "effects": [
      {"type": "stat_modifier", "stat": "damage", "value": 30, "duration": 2, "target": "self"}
    ], "rank": 1},
    {"type": "on_damaged", "chance": 40, "effects": [
      {"type": "stat_modifier", "stat": "damage", "value": 60, "duration": 1, "target": "self"},
      {"type": "stat_modifier", "stat": "defense", "value": 30, "duration": 1, "target": "self"}
    ], "rank": 2},
    {"type": "on_damaged", "chance": 70, "effects": [
      {"type": "stat_modifier", "stat": "damage", "value": 110, "duration": 2, "target": "self"},
      {"type": "stat_modifier", "stat": "defense", "value": 60, "duration": 2, "target": "self"},
      {"type": "stat_modifier", "stat": "speed", "value": 40, "duration": 2, "target": "self"},
      {"type": "heal", "value": 20, "target": "self"}
    ], "rank": 3}
  ]'::jsonb,
  5,
  6,
  5
);

-- 6. Reanimation Shock (INSTANT HEAL)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'frankenstein_reanimation_shock',
  'Reanimation Shock',
  'signature',
  'defensive',
  'frankenstein_monster',
  'Electric revival - heal and restore',
  '"Lightning... brings... life!"',
  '⚡💀',
  3,
  'active',
  '[
    {"type": "heal", "value": 30, "target": "self", "rank": 1},
    {"type": "restore_energy", "value": 20, "target": "self", "rank": 1},
    {"type": "heal", "value": 60, "target": "self", "rank": 2},
    {"type": "restore_energy", "value": 40, "target": "self", "rank": 2},
    {"type": "purge", "purgeType": "debuff", "count": 99, "target": "self", "rank": 2},
    {"type": "heal", "value": 100, "target": "self", "rank": 3},
    {"type": "restore_energy", "value": 70, "target": "self", "rank": 3},
    {"type": "purge", "purgeType": "debuff", "count": 99, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "all", "value": 50, "duration": 2, "target": "self", "rank": 3},
    {"type": "revive", "hp_percent": 50, "target": "self", "rank": 3}
  ]'::jsonb,
  3,
  35,
  5,
  6,
  10
);

-- 7. Monster Unleashed (OFFENSIVE BUFF - Self)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'frankenstein_monster_unleashed',
  'Monster Unleashed',
  'signature',
  'offensive',
  'frankenstein_monster',
  'Pure destructive rage',
  '"MONSTER... DESTROY!"',
  '👹',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "all", "value": 35, "duration": 1, "target": "self", "rank": 1},
    {"type": "stat_modifier", "stat": "defense", "value": -30, "ignorePercent": true, "appliesTo": "attacks", "rank": 1},
    {"type": "stat_modifier", "stat": "all", "value": 75, "duration": 2, "target": "self", "rank": 2},
    {"type": "stat_modifier", "stat": "defense", "value": -60, "ignorePercent": true, "appliesTo": "attacks", "rank": 2},
    {"type": "immunity", "immunityType": "cc", "duration": 2, "rank": 2},
    {"type": "stat_modifier", "stat": "all", "value": 140, "duration": 1, "target": "self", "rank": 3},
    {"type": "stat_modifier", "stat": "defense", "value": -100, "ignorePercent": true, "appliesTo": "attacks", "rank": 3},
    {"type": "damage_immunity", "duration": 1, "target": "self", "rank": 3},
    {"type": "special", "specialType": "attacks_hit_all", "duration": 1, "target": "self", "rank": 3},
    {"type": "lifesteal", "value": 100, "duration": 1, "appliesTo": "all_attacks", "rank": 3}
  ]'::jsonb,
  4,
  45,
  5,
  6,
  10
);

COMMENT ON TABLE power_definitions IS 'Added Frankenstein''s Monster signature powers - undead tank specialist';
