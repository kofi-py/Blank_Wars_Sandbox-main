-- Migration: Insert Scholar Class Spells
-- Purpose: Add class-specific spells for Scholar class
-- Category: Class-specific (restricted_to_class = 'scholar')

-- ===== SCHOLAR CLASS SPELLS =====
-- Scholar focus: Knowledge, analysis, tactical advantages, intellect-based damage, debuffs

-- COMMON TIER (3 spells)

INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  archetype,
  unlock_cost_coins, learn_time_seconds, required_level,
  mana_cost, cooldown_turns, charges_per_battle,
  effects, icon
) VALUES
(
  'scholar_analyze_weakness',
  'Analyze Weakness',
  'Study an enemy to reveal their stats and increase critical hit chance against them by 25% for 3 turns.',
  'Knowledge is the deadliest weapon.',
  'archetype',
  'class',
  'scholar',
  150, 0, 2,
  15, 3, NULL,
  '{"reveal": true, "critBoostTarget": 25, "duration": 3, "target": "single", "targetType": "enemy"}',
  '🔍'
),
(
  'scholar_quick_study',
  'Quick Study',
  'Gain 15% increased experience from this battle. Stacks up to 3 times.',
  'Every battle is a lesson.',
  'archetype',
  'class',
  'scholar',
  100, 0, 1,
  10, 0, NULL,
  '{"expBoost": 15, "maxStacks": 3, "target": "self", "passive": true}',
  '📚'
),
(
  'scholar_calculated_strike',
  'Calculated Strike',
  'Deal damage based on your intelligence stat instead of attack.',
  'The mind cuts deeper than any blade.',
  'archetype',
  'class',
  'scholar',
  150, 0, 2,
  18, 2, NULL,
  '{"damage": 30, "damageScaling": "intelligence", "damageType": "psychic", "target": "single", "targetType": "enemy"}',
  '🧠'
)
ON CONFLICT (id) DO NOTHING;

-- UNCOMMON TIER (4 spells)

INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  archetype,
  unlock_cost_coins, learn_time_seconds, required_level,
  mana_cost, cooldown_turns, charges_per_battle,
  effects, icon
) VALUES
(
  'scholar_tactical_insight',
  'Tactical Insight',
  'Grant all allies +20% damage and +15% accuracy for 3 turns.',
  'The difference between victory and defeat is often a matter of perspective.',
  'archetype',
  'class',
  'scholar',
  600, 3600, 6,
  35, 5, NULL,
  '{"damageBoost": 20, "accuracyBoost": 15, "duration": 3, "target": "all", "targetType": "allies"}',
  '💡'
),
(
  'scholar_hypothesis_test',
  'Hypothesis Test',
  'Deal damage. If it kills the target, restore all mana. If not, lose 10 mana.',
  'Science demands sacrifice. Sometimes.',
  'archetype',
  'class',
  'scholar',
  550, 3600, 5,
  30, 4, NULL,
  '{"damage": 45, "damageType": "psychic", "onKill": {"restoreMana": "full"}, "onFail": {"manaCost": 10}, "target": "single", "targetType": "enemy"}',
  '🔬'
),
(
  'scholar_mind_palace',
  'Mind Palace',
  'Store the current battle state. Can be recalled once to restore HP/mana to that point.',
  'I remember everything.',
  'archetype',
  'class',
  'scholar',
  650, 7200, 7,
  40, 8, 1,
  '{"saveState": true, "canRestore": 1, "target": "self"}',
  '🏛️'
),
(
  'scholar_expose_flaw',
  'Expose Flaw',
  'Reduce enemy defense by 30% for 4 turns and mark them for bonus damage.',
  'Everyone has a weakness. I found yours.',
  'archetype',
  'class',
  'scholar',
  600, 3600, 6,
  28, 4, NULL,
  '{"defenseReduction": 30, "marked": true, "markedDamageBonus": 15, "duration": 4, "target": "single", "targetType": "enemy"}',
  '🎯'
)
ON CONFLICT (id) DO NOTHING;

-- RARE TIER (4 spells)

INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  archetype,
  unlock_cost_coins, learn_time_seconds, required_level,
  mana_cost, cooldown_turns, charges_per_battle,
  effects, icon
) VALUES
(
  'scholar_perfect_prediction',
  'Perfect Prediction',
  'Predict enemy actions for 2 turns. Dodge all attacks and counter for 50% damage.',
  'I already know your next three moves.',
  'archetype',
  'class',
  'scholar',
  2500, 14400, 13,
  55, 6, NULL,
  '{"dodgeAll": true, "counter": true, "counterDamage": 50, "duration": 2, "target": "self"}',
  '🔮'
),
(
  'scholar_information_overload',
  'Information Overload',
  'Bombard enemy minds with knowledge, dealing psychic damage and confusing them.',
  'Too much truth can shatter a mind.',
  'archetype',
  'class',
  'scholar',
  2800, 14400, 14,
  60, 5, NULL,
  '{"damage": 75, "damageType": "psychic", "confused": true, "confusedDuration": 2, "target": "all", "targetType": "enemies"}',
  '📖'
),
(
  'scholar_strategic_retreat',
  'Strategic Retreat',
  'Swap positions with an ally and grant them +40% defense for 3 turns.',
  'Knowing when to step back is its own kind of courage.',
  'archetype',
  'class',
  'scholar',
  2200, 14400, 12,
  45, 5, NULL,
  '{"swap": true, "defenseBoost": 40, "duration": 3, "target": "single", "targetType": "ally"}',
  '🔄'
),
(
  'scholar_knowledge_is_power',
  'Knowledge is Power',
  'For each unique enemy type you have studied, gain +10% to all stats. Lasts entire battle.',
  'My library grows with every encounter.',
  'archetype',
  'class',
  'scholar',
  2600, 21600, 12,
  50, 0, NULL,
  '{"statBoost": 10, "scaling": "enemiesStudied", "duration": "battle", "target": "self", "passive": true}',
  '📊'
)
ON CONFLICT (id) DO NOTHING;

-- EPIC TIER (2 spells)

INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  archetype,
  unlock_cost_coins, learn_time_seconds, required_level,
  mana_cost, cooldown_turns, charges_per_battle,
  effects, icon
) VALUES
(
  'scholar_forbidden_knowledge',
  'Forbidden Knowledge',
  'Access dangerous truths. Deal massive psychic damage to all enemies. Take 20% of damage dealt as recoil.',
  'Some things were meant to remain unknown. But I must know.',
  'archetype',
  'class',
  'scholar',
  9000, 43200, 22,
  75, 7, 2,
  '{"damage": 110, "damageType": "psychic", "recoil": 20, "target": "all", "targetType": "enemies"}',
  '📜'
),
(
  'scholar_eureka',
  'Eureka!',
  'Brilliant insight strikes! Immediately reset all cooldowns and gain 50% magic attack for 3 turns.',
  'Everything suddenly makes perfect sense.',
  'archetype',
  'class',
  'scholar',
  10000, 43200, 25,
  60, 10, 1,
  '{"resetCooldowns": true, "magicAttackBoost": 50, "duration": 3, "target": "self"}',
  '💡'
)
ON CONFLICT (id) DO NOTHING;

-- LEGENDARY TIER (2 spells)

INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  archetype,
  unlock_cost_coins, learn_time_seconds, required_level,
  mana_cost, cooldown_turns, charges_per_battle,
  effects, icon
) VALUES
(
  'scholar_theory_of_everything',
  'Theory of Everything',
  'Understand the fundamental nature of reality. Copy all enemy buffs to your team and all their debuffs to them.',
  'I have solved the equation of existence.',
  'archetype',
  'class',
  'scholar',
  25000, 86400, 30,
  90, 10, 1,
  '{"copyBuffs": "all", "reverseDebuffs": "all", "target": "battlefield"}',
  '∞'
),
(
  'scholar_akashic_records',
  'Akashic Records',
  'Access the sum of all knowledge. Learn any spell in the game for this battle. After battle, forget it.',
  'For a moment, I know everything that can be known.',
  'archetype',
  'class',
  'scholar',
  30000, 86400, 35,
  100, 12, 1,
  '{"learnAnySpell": true, "duration": "battle", "temporary": true, "target": "self"}',
  '📚'
)
ON CONFLICT (id) DO NOTHING;
