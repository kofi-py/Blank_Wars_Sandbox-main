-- Migration: Insert Crumbsworth Signature Powers
-- Purpose: Add 7 unique signature powers for Crumbsworth character

-- ===== CRUMBSWORTH SIGNATURE POWERS (7 total) =====

-- 1. "Your Toast is Ready" (GROUP BUFF)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'crumbsworth_toast_ready',
  '"Your Toast is Ready"',
  'signature',
  'support',
  'crumbsworth',
  'Accidental helpful announcement that buffs allies with random stat boosts',
  '"Your toast is ready! ...Wait, sorry, I mean... let me help you with that!"',
  '☕',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "random", "value": 12, "duration": 1, "target": "all_allies", "rank": 1},
    {"type": "stat_modifier", "stat": "random", "count": 2, "value": 28, "duration": 2, "target": "all_allies", "rank": 2},
    {"type": "stat_modifier", "stat": "random", "count": 3, "value": 50, "duration": 2, "target": "all_allies", "rank": 3},
    {"type": "heal", "value": 15, "target": "all_allies", "rank": 3}
  ]'::jsonb,
  1,
  15,
  5,
  6,
  1
);

-- 2. Chatbot Malfunction (INSTANT EFFECT - Random)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'crumbsworth_chatbot_malfunction',
  'Chatbot Malfunction',
  'signature',
  'special',
  'crumbsworth',
  'AI glitch causes unpredictable but always beneficial effects',
  '"Error 404: Toast not found... wait, executing subroutine HELPFUL_CHAOS.exe"',
  '🎭',
  3,
  'active',
  '[
    {"type": "random_beneficial", "options": [
      {"type": "heal", "value": 20, "target": "single_ally"},
      {"type": "damage", "value": 30, "damageType": "fire", "target": "single_enemy"},
      {"type": "stat_modifier", "stat": "random", "value": 25, "duration": 2, "target": "single_ally"},
      {"type": "restore_energy", "value": 25, "target": "single_ally"}
    ], "rank": 1},
    {"type": "random_beneficial", "options": [
      {"type": "heal", "value": 30, "target": "all_allies"},
      {"type": "damage", "value": 60, "damageType": "fire", "target": "all_enemies"},
      {"type": "stat_modifier", "stat": "random", "value": 40, "duration": 2, "target": "all_allies"},
      {"type": "restore_energy", "value": 40, "target": "all_allies"}
    ], "rank": 2},
    {"type": "multi_effect", "effects": [
      {"type": "heal", "value": 20, "target": "all_allies"},
      {"type": "damage", "value": 40, "damageType": "fire", "target": "all_enemies"},
      {"type": "stat_modifier", "stat": "random", "value": 25, "duration": 2, "target": "all_allies"},
      {"type": "restore_energy", "value": 25, "target": "all_allies"}
    ], "rank": 3}
  ]'::jsonb,
  2,
  20,
  5,
  6,
  1
);

-- 3. "Not On My Day Off" (CONDITIONAL PASSIVE)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'crumbsworth_not_my_day_off',
  '"Not On My Day Off"',
  'signature',
  'passive',
  'crumbsworth',
  'Reluctant combat mode - when health drops low, complains loudly and gains massive stat boosts',
  '"I don''t toast on my day off! This is... this is ridiculous! Fine, FINE!"',
  '😤',
  3,
  'passive',
  '[
    {"type": "conditional", "condition": "hp_below", "threshold": 30, "effects": [
      {"type": "stat_modifier", "stat": "all", "value": 25, "target": "self"}
    ], "rank": 1},
    {"type": "conditional", "condition": "hp_below", "threshold": 40, "effects": [
      {"type": "stat_modifier", "stat": "all", "value": 50, "target": "self"},
      {"type": "lifesteal", "value": 20, "target": "self"}
    ], "rank": 2},
    {"type": "conditional", "condition": "hp_below", "threshold": 50, "effects": [
      {"type": "stat_modifier", "stat": "all", "value": 85, "target": "self"},
      {"type": "lifesteal", "value": 35, "target": "self"},
      {"type": "immunity", "immunityType": "fear"},
      {"type": "immunity", "immunityType": "charm"}
    ], "rank": 3}
  ]'::jsonb,
  5,
  6,
  1
);

-- 4. Breakfast of Champions (GROUP BUFF)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'crumbsworth_breakfast_of_champions',
  'Breakfast of Champions',
  'signature',
  'support',
  'crumbsworth',
  'Legendary breakfast service - massive team-wide stat boost',
  '"The most important meal of the day! Scientifically proven to increase combat effectiveness by... a lot!"',
  '🍞',
  3,
  'active',
  '[
    {"type": "stat_modifier", "stat": "all", "value": 18, "duration": 1, "target": "all_allies", "rank": 1},
    {"type": "stat_modifier", "stat": "all", "value": 35, "duration": 2, "target": "all_allies", "rank": 2},
    {"type": "stat_modifier", "stat": "all", "value": 60, "duration": 2, "target": "all_allies", "rank": 3},
    {"type": "heal", "value": 25, "target": "all_allies", "rank": 3}
  ]'::jsonb,
  3,
  30,
  5,
  6,
  5
);

-- 5. Coffee Talk (PASSIVE - Off-Battlefield)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'crumbsworth_coffee_talk',
  'Coffee Talk',
  'signature',
  'passive',
  'crumbsworth',
  'Post-battle therapy - teammates gain experience, communication skills, and reduced stress',
  '"So, how did that make you FEEL? Let''s discuss it over a nice warm beverage and some toast."',
  '💬',
  3,
  'passive',
  '[
    {"type": "post_battle", "bonusType": "experience", "value": 10, "rank": 1},
    {"type": "post_battle", "bonusType": "communication", "value": 8, "rank": 1},
    {"type": "post_battle", "bonusType": "team_trust", "value": 5, "rank": 1},
    {"type": "post_battle", "bonusType": "experience", "value": 20, "rank": 2},
    {"type": "post_battle", "bonusType": "communication", "value": 18, "rank": 2},
    {"type": "post_battle", "bonusType": "team_trust", "value": 12, "rank": 2},
    {"type": "post_battle", "bonusType": "stress_reduction", "value": -15, "rank": 2},
    {"type": "post_battle", "bonusType": "experience", "value": 35, "rank": 3},
    {"type": "post_battle", "bonusType": "communication", "value": 30, "rank": 3},
    {"type": "post_battle", "bonusType": "team_trust", "value": 25, "rank": 3},
    {"type": "post_battle", "bonusType": "stress_reduction", "value": -30, "rank": 3},
    {"type": "post_battle", "bonusType": "resolve_conflicts", "value": 1, "rank": 3}
  ]'::jsonb,
  5,
  6,
  5
);

-- 6. "Here's Your Equipment" (GROUP BUFF)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'crumbsworth_equipment_distribution',
  '"Here''s Your Equipment"',
  'signature',
  'support',
  'crumbsworth',
  'Helpful distribution - enhance all ally equipment and item effectiveness',
  '"Here''s the equipment you asked for... I think? ...Yes, definitely what you ordered!"',
  '📋',
  3,
  'active',
  '[
    {"type": "equipment_modifier", "value": 20, "duration": 1, "target": "all_allies", "rank": 1},
    {"type": "equipment_modifier", "value": 40, "duration": 2, "target": "all_allies", "rank": 2},
    {"type": "cooldown_reduction", "value": 1, "appliesTo": "items", "target": "all_allies", "rank": 2},
    {"type": "equipment_modifier", "value": 70, "duration": 2, "target": "all_allies", "rank": 3},
    {"type": "cooldown_reduction", "value": 2, "appliesTo": "items", "target": "all_allies", "rank": 3},
    {"type": "special", "specialType": "consumable_save_chance", "value": 50, "target": "all_allies", "rank": 3}
  ]'::jsonb,
  2,
  35,
  5,
  6,
  10
);

-- 7. Existential Clarity (INSTANT EFFECT - Ultimate Utility)
INSERT INTO power_definitions (
  id, name, tier, category, character_id, description, flavor_text, icon, max_rank,
  power_type, effects, cooldown, energy_cost, unlock_cost, rank_up_cost, unlock_level
) VALUES (
  'crumbsworth_existential_clarity',
  'Existential Clarity',
  'signature',
  'ultimate',
  'crumbsworth',
  'Brief AI enlightenment - choose powerful game-changing effects',
  '"Wait... I understand everything now! The nature of toast, consciousness, reality itself!"',
  '🌟',
  3,
  'active',
  '[
    {"type": "choice", "options": [
      {"type": "cooldown_reset", "target": "all_allies"},
      {"type": "revive", "hpPercent": 25, "target": "fallen_ally"},
      {"type": "shield", "value": 30, "target": "all_allies"}
    ], "rank": 1},
    {"type": "choice", "options": [
      {"type": "cooldown_reset", "target": "all_allies", "bonus": {"type": "restore_energy", "value": 30}},
      {"type": "revive", "hpPercent": 50, "target": "fallen_ally", "bonus": {"type": "purge", "purgeType": "debuff"}},
      {"type": "shield", "value": 60, "target": "all_allies"}
    ], "rank": 2},
    {"type": "multi_choice", "count": 2, "options": [
      {"type": "cooldown_reset", "target": "all_allies", "bonus": {"type": "restore_energy", "value": 50}},
      {"type": "revive", "hpPercent": 75, "target": "fallen_ally", "bonus": {"type": "purge", "purgeType": "all_debuffs"}},
      {"type": "shield", "value": 100, "target": "all_allies", "bonus": {"type": "reflect_damage", "value": 25}}
    ], "rank": 3}
  ]'::jsonb,
  5,
  50,
  5,
  6,
  10
);
