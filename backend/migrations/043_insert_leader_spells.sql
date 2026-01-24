-- Migration: Insert Leader Class Spells
-- Purpose: Add class-specific spells for Leader class
-- Category: Class-specific (restricted_to_class = 'leader')

-- ===== LEADER CLASS SPELLS =====
-- Leader focus: Team buffs, coordination, inspiration, resource management, strategic advantages

-- COMMON TIER (3 spells)

INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  archetype,
  unlock_cost_coins, learn_time_seconds, required_level,
  mana_cost, cooldown_turns, charges_per_battle,
  effects, icon
) VALUES
(
  'leader_rally',
  'Rally',
  'Grant all allies +15% to all stats for 3 turns.',
  'Together, we are stronger!',
  'archetype',
  'class',
  'leader',
  150, 0, 2,
  25, 4, NULL,
  '{"statBoost": 15, "statsAffected": "all", "duration": 3, "target": "all", "targetType": "allies"}',
  '📣'
),
(
  'leader_inspire',
  'Inspire',
  'Restore 20 mana to all allies.',
  'Let my strength become yours.',
  'archetype',
  'class',
  'leader',
  120, 0, 1,
  15, 3, NULL,
  '{"manaRestore": 20, "target": "all", "targetType": "allies"}',
  '⭐'
),
(
  'leader_focus_fire',
  'Focus Fire',
  'Mark an enemy. All allies deal 20% bonus damage to them for 3 turns.',
  'Everyone, that one!',
  'archetype',
  'class',
  'leader',
  150, 0, 2,
  20, 3, NULL,
  '{"marked": true, "markedDamageBonus": 20, "duration": 3, "target": "single", "targetType": "enemy"}',
  '🎯'
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
  'leader_coordinate_strike',
  'Coordinate Strike',
  'All allies attack the same target simultaneously for 30% bonus damage each.',
  'On my mark... NOW!',
  'archetype',
  'class',
  'leader',
  600, 3600, 6,
  40, 5, NULL,
  '{"coordinatedAttack": true, "damageBonus": 30, "target": "single", "targetType": "enemy"}',
  '⚔️'
),
(
  'leader_tactical_retreat',
  'Tactical Retreat',
  'All allies gain +50% speed and 30% dodge chance for 2 turns.',
  'He who fights and runs away lives to fight another day.',
  'archetype',
  'class',
  'leader',
  550, 3600, 5,
  32, 5, NULL,
  '{"speedBoost": 50, "dodgeChance": 30, "duration": 2, "target": "all", "targetType": "allies"}',
  '🏃'
),
(
  'leader_banner_of_hope',
  'Banner of Hope',
  'Plant a banner that heals allies for 15 HP per turn for 4 turns.',
  'While this banner stands, we fight on.',
  'archetype',
  'class',
  'leader',
  650, 7200, 7,
  35, 6, NULL,
  '{"healingPerTurn": 15, "duration": 4, "target": "all", "targetType": "allies", "summon": "banner"}',
  '🚩'
),
(
  'leader_share_strength',
  'Share Strength',
  'Redistribute all allies HP to be equal. Grant everyone +10% defense for 3 turns.',
  'We rise together or not at all.',
  'archetype',
  'class',
  'leader',
  600, 3600, 6,
  38, 5, NULL,
  '{"redistributeHp": "equal", "defenseBoost": 10, "duration": 3, "target": "all", "targetType": "allies"}',
  '🤝'
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
  'leader_stand_as_one',
  'Stand As One',
  'Link all allies. Damage is split equally among all living allies for 3 turns.',
  'No one falls alone.',
  'archetype',
  'class',
  'leader',
  2500, 14400, 13,
  55, 6, NULL,
  '{"damageSharing": true, "duration": 3, "target": "all", "targetType": "allies"}',
  '⛓️'
),
(
  'leader_kings_decree',
  'King''s Decree',
  'Command an ally to immediately take another turn. They deal 40% bonus damage.',
  'Your will is my command.',
  'archetype',
  'class',
  'leader',
  2800, 14400, 14,
  60, 6, NULL,
  '{"extraTurn": true, "damageBoost": 40, "duration": 1, "target": "single", "targetType": "ally"}',
  '👑'
),
(
  'leader_tactical_genius',
  'Tactical Genius',
  'Rearrange turn order for all combatants. Your team goes first for the next 2 rounds.',
  'I see the entire battlefield as a chessboard.',
  'archetype',
  'class',
  'leader',
  2600, 21600, 12,
  50, 7, NULL,
  '{"rearrangeTurnOrder": true, "allyPriority": "first", "duration": 2, "target": "battlefield"}',
  '♟️'
),
(
  'leader_sacrifice_play',
  'Sacrifice Play',
  'An ally takes damage intended for the entire team. That ally becomes invulnerable for 2 turns after.',
  'Your sacrifice will not be in vain.',
  'archetype',
  'class',
  'leader',
  2200, 14400, 12,
  45, 6, NULL,
  '{"redirectAllDamage": true, "invulnerableAfter": true, "invulnDuration": 2, "target": "single", "targetType": "ally"}',
  '🛡️'
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
  'leader_legendary_speech',
  'Legendary Speech',
  'Deliver an inspiring oration. All allies gain +50% to all stats and full mana restoration.',
  'We few, we happy few, we band of brothers.',
  'archetype',
  'class',
  'leader',
  9000, 43200, 22,
  80, 8, 1,
  '{"statBoost": 50, "statsAffected": "all", "manaRestore": "full", "duration": 4, "target": "all", "targetType": "allies"}',
  '🎤'
),
(
  'leader_final_gambit',
  'Final Gambit',
  'All allies gain double stats for 3 turns. After duration, all allies lose 50% HP.',
  'Victory at any cost.',
  'archetype',
  'class',
  'leader',
  10000, 43200, 25,
  70, 10, NULL,
  '{"statBoost": 100, "statsAffected": "all", "duration": 3, "onEnd": {"hpLoss": 50, "lossType": "percentage"}, "target": "all", "targetType": "allies"}',
  '⚠️'
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
  'leader_destined_for_greatness',
  'Destined for Greatness',
  'Designate an ally as the chosen one. They cannot die and gain +100% to all stats for 5 turns.',
  'This is your moment.',
  'archetype',
  'class',
  'leader',
  25000, 86400, 30,
  100, 12, 1,
  '{"cannotDie": true, "statBoost": 100, "statsAffected": "all", "duration": 5, "target": "single", "targetType": "ally"}',
  '✨'
),
(
  'leader_unite_or_perish',
  'Unite or Perish',
  'All allies merge their HP, mana, and stats into one uber-combatant for 4 turns. When it ends, stats redistribute.',
  'Together, we are not just strong. We are inevitable.',
  'archetype',
  'class',
  'leader',
  30000, 86400, 35,
  90, 15, 1,
  '{"mergeAllies": true, "combineStats": true, "combinedMultiplier": 1.5, "duration": 4, "target": "all", "targetType": "allies"}',
  '🌟'
)
ON CONFLICT (id) DO NOTHING;
