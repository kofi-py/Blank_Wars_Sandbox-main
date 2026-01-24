-- Migration: Insert Mage Class Spells
-- Purpose: Add class-specific spells for Mage class
-- Category: Class-specific (restricted_to_class = 'mage')

-- ===== MAGE CLASS SPELLS =====
-- Mage focus: Elemental magic, area damage, reality manipulation, arcane mastery

-- COMMON TIER (3 spells)

INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  archetype,
  unlock_cost_coins, learn_time_seconds, required_level,
  mana_cost, cooldown_turns, charges_per_battle,
  effects, icon
) VALUES
(
  'mage_fireball',
  'Fireball',
  'Hurl a ball of flame dealing fire damage to a single enemy.',
  'The classic. Every mage learns this first.',
  'archetype',
  'class',
  'mage',
  150, 0, 2,
  18, 2, NULL,
  '{"damage": 35, "damageType": "fire", "target": "single", "targetType": "enemy"}',
  '🔥'
),
(
  'mage_frost_bolt',
  'Frost Bolt',
  'Launch an icy projectile that deals ice damage and slows the target.',
  'Cold as the void between stars.',
  'archetype',
  'class',
  'mage',
  150, 0, 2,
  20, 2, NULL,
  '{"damage": 30, "damageType": "ice", "speedReduction": 20, "duration": 2, "target": "single", "targetType": "enemy"}',
  '❄️'
),
(
  'mage_arcane_missile',
  'Arcane Missile',
  'Fire 3 missiles of pure arcane energy at random enemies.',
  'Chaos made manifest.',
  'archetype',
  'class',
  'mage',
  120, 0, 1,
  16, 2, NULL,
  '{"damage": 15, "damageType": "arcane", "hits": 3, "targeting": "random", "target": "enemies"}',
  '✨'
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
  'mage_lightning_chain',
  'Chain Lightning',
  'Strike an enemy with lightning that chains to 2 additional targets.',
  'Electricity seeks the path of most destruction.',
  'archetype',
  'class',
  'mage',
  600, 3600, 6,
  35, 4, NULL,
  '{"damage": 40, "damageType": "lightning", "chains": 2, "chainDamageReduction": 0.7, "target": "single", "targetType": "enemy"}',
  '⚡'
),
(
  'mage_ice_wall',
  'Ice Wall',
  'Create a barrier of ice granting 40 defense for 3 turns. When broken, damages attackers.',
  'An elegant defense with sharp consequences.',
  'archetype',
  'class',
  'mage',
  550, 3600, 5,
  30, 5, NULL,
  '{"defenseBoost": 40, "duration": 3, "onBreak": {"damage": 25, "damageType": "ice"}, "target": "self"}',
  '🧊'
),
(
  'mage_flame_wave',
  'Flame Wave',
  'Release a wave of fire hitting all enemies for moderate damage.',
  'Burn the battlefield clean.',
  'archetype',
  'class',
  'mage',
  650, 7200, 7,
  40, 4, NULL,
  '{"damage": 35, "damageType": "fire", "target": "all", "targetType": "enemies"}',
  '🌊'
),
(
  'mage_mana_shield',
  'Mana Shield',
  'Convert mana into a shield. Lose 2 mana per hit taken instead of HP for 3 turns.',
  'Your power becomes your armor.',
  'archetype',
  'class',
  'mage',
  600, 3600, 6,
  25, 5, NULL,
  '{"manaShield": true, "manaPerHit": 2, "duration": 3, "target": "self"}',
  '🔮'
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
  'mage_meteor_strike',
  'Meteor Strike',
  'Summon a meteor from the sky dealing massive fire damage to all enemies.',
  'Call down the wrath of the cosmos.',
  'archetype',
  'class',
  'mage',
  2500, 14400, 13,
  60, 6, NULL,
  '{"damage": 70, "damageType": "fire", "burnChance": 40, "burnDuration": 2, "target": "all", "targetType": "enemies"}',
  '☄️'
),
(
  'mage_blizzard',
  'Blizzard',
  'Summon a freezing storm that damages all enemies and reduces their speed.',
  'Winter has come for your enemies.',
  'archetype',
  'class',
  'mage',
  2800, 14400, 14,
  65, 6, NULL,
  '{"damage": 55, "damageType": "ice", "speedReduction": 30, "duration": 3, "target": "all", "targetType": "enemies"}',
  '🌨️'
),
(
  'mage_arcane_explosion',
  'Arcane Explosion',
  'Detonate pure magical energy, damaging all enemies and draining their mana.',
  'Unravel the very fabric of their magic.',
  'archetype',
  'class',
  'mage',
  2600, 21600, 12,
  55, 5, NULL,
  '{"damage": 60, "damageType": "arcane", "manaDrain": 20, "target": "all", "targetType": "enemies"}',
  '💥'
),
(
  'mage_teleport',
  'Teleport',
  'Instantly reposition, dodging the next attack and increasing speed by 50% for 2 turns.',
  'Here, there, everywhere, nowhere.',
  'archetype',
  'class',
  'mage',
  2200, 14400, 12,
  45, 6, NULL,
  '{"dodge": true, "dodgeDuration": 1, "speedBoost": 50, "boostDuration": 2, "target": "self"}',
  '💫'
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
  'mage_reality_tear',
  'Reality Tear',
  'Rip a hole in reality dealing massive arcane damage and removing all buffs from enemies.',
  'Some things should not be possible. You do them anyway.',
  'archetype',
  'class',
  'mage',
  9000, 43200, 22,
  80, 7, 2,
  '{"damage": 120, "damageType": "arcane", "removeAllPositive": true, "target": "all", "targetType": "enemies"}',
  '🌀'
),
(
  'mage_elemental_mastery',
  'Elemental Mastery',
  'Your next 3 spells cost no mana and deal 50% bonus damage.',
  'Become one with the elements.',
  'archetype',
  'class',
  'mage',
  10000, 43200, 25,
  50, 8, NULL,
  '{"freeSpells": 3, "damageBoost": 50, "target": "self"}',
  '🔱'
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
  'mage_supernova',
  'Supernova',
  'Detonate yourself in a massive explosion. Deal catastrophic damage to all enemies, then revive at 30% HP.',
  'Death is just another spell component.',
  'archetype',
  'class',
  'mage',
  25000, 86400, 30,
  100, 10, 1,
  '{"damage": 250, "damageType": "fire", "target": "all", "targetType": "enemies", "selfRevive": true, "reviveHpPercent": 30}',
  '🌟'
),
(
  'mage_time_loop',
  'Time Loop',
  'Trap the battle in a time loop. At the end of your next turn, rewind to this moment with all HP/mana restored.',
  'You have already won. They just do not know it yet.',
  'archetype',
  'class',
  'mage',
  30000, 86400, 35,
  90, 12, 1,
  '{"timeLoop": true, "loopDuration": 1, "restoreHpMana": true, "target": "self"}',
  '⏰'
)
ON CONFLICT (id) DO NOTHING;

-- Add comment
COMMENT ON TABLE spell_definitions IS 'All spell definitions including universal and class-specific spells with their effects, costs, and requirements';
