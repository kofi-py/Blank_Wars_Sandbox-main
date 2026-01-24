-- Migration: Insert Trickster Class Spells
-- Purpose: Add class-specific spells for Trickster class
-- Category: Class-specific (restricted_to_class = 'trickster')

-- ===== TRICKSTER CLASS SPELLS =====
-- Trickster focus: Deception, stealth, poison, debuffs, chaos, stealing, misdirection

-- COMMON TIER (3 spells)

INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  archetype,
  unlock_cost_coins, learn_time_seconds, required_level,
  mana_cost, cooldown_turns, charges_per_battle,
  effects, icon
) VALUES
(
  'trickster_smoke_bomb',
  'Smoke Bomb',
  'Increase dodge chance by 40% for 2 turns.',
  'Now you see me...',
  'archetype',
  'class',
  'trickster',
  150, 0, 2,
  18, 3, NULL,
  '{"dodgeChance": 40, "duration": 2, "target": "self"}',
  '💨'
),
(
  'trickster_poison_dart',
  'Poison Dart',
  'Deal minor damage and inflict poison (10 damage per turn for 3 turns).',
  'A little prick. That is all.',
  'archetype',
  'class',
  'trickster',
  120, 0, 1,
  15, 2, NULL,
  '{"damage": 20, "damageType": "poison", "poisonDamage": 10, "poisonDuration": 3, "target": "single", "targetType": "enemy"}',
  '🗡️'
),
(
  'trickster_pickpocket',
  'Pickpocket',
  'Steal 15 mana from an enemy.',
  'Thanks for that.',
  'archetype',
  'class',
  'trickster',
  150, 0, 2,
  10, 2, NULL,
  '{"stealMana": 15, "target": "single", "targetType": "enemy"}',
  '💰'
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
  'trickster_backstab',
  'Backstab',
  'Deal 200% damage if target is not looking at you or is debuffed.',
  'Nothing personal.',
  'archetype',
  'class',
  'trickster',
  600, 3600, 6,
  35, 4, NULL,
  '{"damage": 60, "damageType": "physical", "bonusCondition": "distracted", "bonusMultiplier": 2, "target": "single", "targetType": "enemy"}',
  '🗡️'
),
(
  'trickster_steal_buff',
  'Steal Buff',
  'Remove one positive effect from enemy and apply it to yourself.',
  'I will take that, thank you.',
  'archetype',
  'class',
  'trickster',
  550, 3600, 5,
  30, 5, NULL,
  '{"stealBuff": true, "target": "single", "targetType": "enemy"}',
  '✨'
),
(
  'trickster_misdirection',
  'Misdirection',
  'Redirect the next attack targeting you to a random enemy.',
  'Over there!',
  'archetype',
  'class',
  'trickster',
  650, 7200, 7,
  28, 4, NULL,
  '{"redirectAttack": true, "redirectTarget": "random_enemy", "duration": 1, "target": "self"}',
  '👉'
),
(
  'trickster_sabotage',
  'Sabotage',
  'Increase enemy cooldowns by 2 turns and reduce their mana regeneration by 50% for 3 turns.',
  'Let me just... adjust this...',
  'archetype',
  'class',
  'trickster',
  600, 3600, 6,
  32, 5, NULL,
  '{"cooldownIncrease": 2, "manaRegenReduction": 50, "duration": 3, "target": "single", "targetType": "enemy"}',
  '🔧'
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
  'trickster_shadow_clone',
  'Shadow Clone',
  'Create a clone that takes 50% of damage meant for you for 3 turns. Clone deals 30% of your damage.',
  'Which one is real?',
  'archetype',
  'class',
  'trickster',
  2500, 14400, 13,
  55, 6, NULL,
  '{"summonClone": true, "cloneDamageShare": 50, "cloneDamageOutput": 30, "duration": 3, "target": "self"}',
  '👥'
),
(
  'trickster_deadly_toxin',
  'Deadly Toxin',
  'Inflict a powerful poison dealing 25 damage per turn for 5 turns. Stacks up to 3 times.',
  'This one will hurt.',
  'archetype',
  'class',
  'trickster',
  2800, 14400, 14,
  60, 5, NULL,
  '{"poisonDamage": 25, "poisonDuration": 5, "stackable": true, "maxStacks": 3, "target": "single", "targetType": "enemy"}',
  '☠️'
),
(
  'trickster_vanish',
  'Vanish',
  'Become untargetable for 2 turns. Your next attack deals 150% bonus damage.',
  'You will never see me coming.',
  'archetype',
  'class',
  'trickster',
  2600, 21600, 12,
  50, 7, NULL,
  '{"untargetable": true, "duration": 2, "nextAttackBonus": 150, "target": "self"}',
  '👻'
),
(
  'trickster_sleight_of_hand',
  'Sleight of Hand',
  'Swap the stats of two targets for 3 turns.',
  'The hand is quicker than the eye.',
  'archetype',
  'class',
  'trickster',
  2200, 14400, 12,
  45, 6, NULL,
  '{"swapStats": true, "duration": 3, "target": "two", "targetType": "any"}',
  '🃏'
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
  'trickster_master_thief',
  'Master Thief',
  'Steal all buffs from all enemies and distribute them to your team.',
  'What is yours is now mine.',
  'archetype',
  'class',
  'trickster',
  9000, 43200, 22,
  75, 8, 2,
  '{"stealAllBuffs": true, "distributeToAllies": true, "target": "all", "targetType": "enemies"}',
  '👑'
),
(
  'trickster_perfect_assassination',
  'Perfect Assassination',
  'Instantly kill any enemy below 30% HP. No save. No dodge. No mercy.',
  'Nothing personal. Just business.',
  'archetype',
  'class',
  'trickster',
  10000, 43200, 25,
  80, 10, 1,
  '{"instantKill": true, "hpThreshold": 30, "target": "single", "targetType": "enemy"}',
  '💀'
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
  'trickster_chaos_theory',
  'Chaos Theory',
  'Randomize all stats, buffs, debuffs, and positions on the battlefield. Chaos favors the clever.',
  'Let us see what happens.',
  'archetype',
  'class',
  'trickster',
  25000, 86400, 30,
  100, 12, 1,
  '{"randomizeEverything": true, "tricksterBonus": 25, "target": "battlefield"}',
  '🎲'
),
(
  'trickster_the_ultimate_con',
  'The Ultimate Con',
  'Convince an enemy to fight for you for 5 turns. When they return, they explode dealing damage to their team.',
  'I am very persuasive.',
  'archetype',
  'class',
  'trickster',
  30000, 86400, 35,
  90, 15, 1,
  '{"mindControl": true, "duration": 5, "onEnd": {"explosion": true, "damage": 150, "damageType": "physical", "target": "all_enemies"}, "target": "single", "targetType": "enemy"}',
  '🎭'
)
ON CONFLICT (id) DO NOTHING;
