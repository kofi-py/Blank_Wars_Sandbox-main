-- Migration 009: Seed Achilles Power Definitions
-- Populates power_definitions with Achilles' complete power tree

BEGIN;

-- ============================================================================
-- TIER 1: UNIVERSAL SKILLS (can be learned by any character)
-- ============================================================================

-- Combat Skills
INSERT INTO power_definitions (id, name, tier, category, description, flavor_text, icon, max_rank, power_type, effects, unlock_level, unlock_cost) VALUES
('swordsmanship', 'Swordsmanship', 'skill', 'combat', 'Mastery of blade combat techniques', 'The art of the sword, refined through countless hours of practice', '⚔️', 10, 'passive',
'[{"type": "stat_modifier", "stat": "attack", "value": 1, "per_rank": true, "description": "+1% sword damage per rank"}]'::jsonb, 1, 1),

('defensive_tactics', 'Defensive Tactics', 'skill', 'combat', 'Advanced defensive maneuvers and positioning', 'A strong defense is the foundation of victory', '🛡️', 10, 'passive',
'[{"type": "stat_modifier", "stat": "defense", "value": 1, "per_rank": true, "description": "+1% damage reduction per rank"}]'::jsonb, 1, 1),

('leadership', 'Leadership', 'skill', 'progression', 'Inspire and coordinate allies in battle', 'Lead by example, and others will follow', '👑', 10, 'passive',
'[{"type": "stat_modifier", "stat": "all", "value": 0.5, "per_rank": true, "target": "all_allies", "description": "+0.5% all stats to team per rank"}]'::jsonb, 3, 1),

('coach_bond', 'Coach Bond', 'skill', 'progression', 'Strengthen relationship with coach', 'Trust is built through shared experiences', '🤝', 10, 'passive',
'[{"type": "special", "effect": "bond_gain_rate", "value": 10, "per_rank": true, "description": "+10% bond gain rate per rank"}]'::jsonb, 1, 1),

('meditation', 'Meditation', 'skill', 'progression', 'Focus mind and body to accelerate growth', 'In stillness, strength is forged', '🧘', 10, 'passive',
'[{"type": "special", "effect": "xp_gain", "value": 2, "per_rank": true, "description": "+2% XP gain per rank"}]'::jsonb, 5, 1)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- TIER 2: WARRIOR ARCHETYPE ABILITIES
-- ============================================================================

-- Offensive Branch
INSERT INTO power_definitions (id, name, tier, category, archetype, description, flavor_text, icon, max_rank, power_type, effects, cooldown, energy_cost, unlock_level, unlock_cost) VALUES
('shield_bash', 'Shield Bash', 'ability', 'offensive', 'warrior', 'Strike with shield to stun enemy', 'A warriors shield is both defense and weapon', '🛡️💥', 3, 'active',
'[{"type": "damage", "value": 80, "target": "enemy", "damageType": "physical"}, {"type": "status_effect", "value": 1, "duration": 1, "target": "enemy", "statusEffect": "stun"}]'::jsonb, 3, 20, 3, 1),

('heroic_strike', 'Heroic Strike', 'ability', 'offensive', 'warrior', 'Channel strength for devastating blow', 'Strike with the force of legend', '⚔️✨', 3, 'active',
'[{"type": "damage", "value": 150, "target": "enemy", "damageType": "physical"}]'::jsonb, 2, 25, 5, 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO power_definitions (id, name, tier, category, archetype, description, flavor_text, icon, max_rank, rank_bonuses, power_type, effects, cooldown, energy_cost, unlock_level, unlock_cost, prerequisite_power_id) VALUES
('berserker_rage', 'Berserker Rage', 'ability', 'offensive', 'warrior', 'Sacrifice defense for overwhelming offense', 'Rage consumes all - friend and foe alike', '😡🔥', 3,
'[{"rank": 2, "improvements": ["+1 turn duration", "-5% defense penalty"]}, {"rank": 3, "improvements": ["+20% attack bonus", "immune to fear"]}]'::jsonb, 'active',
'[{"type": "stat_modifier", "stat": "attack", "value": 50, "duration": 3, "target": "self"}, {"type": "stat_modifier", "stat": "defense", "value": -20, "duration": 3, "target": "self"}]'::jsonb, 5, 40, 10, 1, 'heroic_strike');

-- Defensive Branch
INSERT INTO power_definitions (id, name, tier, category, archetype, description, flavor_text, icon, max_rank, rank_bonuses, power_type, effects, unlock_level, unlock_cost) VALUES
('iron_skin', 'Iron Skin', 'ability', 'defensive', 'warrior', 'Harden body to resist damage', 'The body is a fortress, if trained properly', '🛡️✨', 3,
'[{"rank": 2, "improvements": ["+3% damage reduction"]}, {"rank": 3, "improvements": ["+4% damage reduction"]}]'::jsonb, 'passive',
'[{"type": "stat_modifier", "stat": "defense", "value": 5, "target": "self", "description": "+5% damage reduction"}]'::jsonb, 3, 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO power_definitions (id, name, tier, category, archetype, description, flavor_text, icon, max_rank, rank_bonuses, power_type, effects, cooldown, energy_cost, unlock_level, unlock_cost) VALUES
('shield_wall', 'Shield Wall', 'ability', 'defensive', 'warrior', 'Redirect attack damage back to enemy', 'Every blow against the wall weakens the attacker', '🛡️🔄', 3,
'[{"rank": 2, "improvements": ["+10% block chance"]}, {"rank": 3, "improvements": ["+20% reflect damage"]}]'::jsonb, 'active',
'[{"type": "damage_block", "value": 50, "target": "self"}, {"type": "damage_reflect", "value": 30, "target": "enemy"}]'::jsonb, 4, 30, 5, 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO power_definitions (id, name, tier, category, archetype, description, flavor_text, icon, max_rank, rank_bonuses, power_type, effects, unlock_level, unlock_cost, prerequisite_power_id) VALUES
('last_stand', 'Last Stand', 'ability', 'defensive', 'warrior', 'Gain massive stat boost when near death', 'The closer to death, the fiercer the warrior', '💀⚔️', 3,
'[{"rank": 2, "improvements": ["Threshold 35% HP"]}, {"rank": 3, "improvements": ["Threshold 45% HP", "+10% stat bonus"]}]'::jsonb, 'passive',
'[{"type": "stat_modifier", "stat": "all", "value": 30, "target": "self", "condition": "hp_below_25", "description": "+30% all stats when below 25% HP"}]'::jsonb, 10, 1, 'shield_wall')
ON CONFLICT (id) DO NOTHING;

-- Support Branch
INSERT INTO power_definitions (id, name, tier, category, archetype, description, flavor_text, icon, max_rank, rank_bonuses, power_type, effects, cooldown, energy_cost, unlock_level, unlock_cost) VALUES
('battle_cry', 'Battle Cry', 'ability', 'support', 'warrior', 'Rally team with inspiring shout', 'A warriors cry can turn the tide of battle', '📢⚔️', 3,
'[{"rank": 2, "improvements": ["+5% attack bonus", "+1 turn duration"]}, {"rank": 3, "improvements": ["+5% attack bonus", "Also grants +10% defense"]}]'::jsonb, 'active',
'[{"type": "stat_modifier", "stat": "attack", "value": 15, "duration": 2, "target": "all_allies"}]'::jsonb, 6, 35, 7, 1)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- TIER 3: HUMAN SPECIES POWERS
-- ============================================================================

INSERT INTO power_definitions (id, name, tier, category, species, description, flavor_text, icon, max_rank, power_type, effects, unlock_level, unlock_cost) VALUES
('human_adaptability', 'Adaptability', 'species', 'progression', 'human', 'Humans can learn any skill or ability', 'Humanity''s greatest strength is versatility', '🌟', 1, 'passive',
'[{"type": "special", "effect": "no_archetype_restrictions", "description": "Can learn abilities from any archetype"}, {"type": "stat_modifier", "stat": "skill_learn_rate", "value": 5, "description": "+5% faster skill progression"}]'::jsonb, 1, 0),

('human_determination', 'Determination', 'species', 'defensive', 'human', 'Human willpower resists negative effects', 'The human spirit refuses to break', '💪', 3, 'passive',
'[{"type": "debuff_resistance", "value": 25, "description": "Resist 25% of debuff effects"}]'::jsonb, 8, 1),

('survival_instinct', 'Survival Instinct', 'species', 'defensive', 'human', 'Emergency self-heal when near death', 'Humans fight hardest when cornered', '❤️‍🩹', 3, 'active',
'[{"type": "heal", "value": 15, "target": "self", "condition": "hp_below_20", "once_per_battle": true, "description": "Heal 15% HP when below 20% (once per battle)"}]'::jsonb, 12, 1),

('human_spirit', 'Human Spirit', 'species', 'offensive', 'human', 'Bonus stats when fighting non-human enemies', 'Humanity has always fought against the impossible', '🔥', 3, 'passive',
'[{"type": "stat_modifier", "stat": "all", "value": 10, "target": "self", "condition": "enemy_not_human", "description": "+10% all stats vs non-human opponents"}]'::jsonb, 15, 1)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- TIER 4: ACHILLES SIGNATURE POWERS
-- ============================================================================

INSERT INTO power_definitions (id, name, tier, category, character_id, description, flavor_text, icon, max_rank, rank_bonuses, power_type, effects, cooldown, energy_cost, unlock_level, unlock_cost) VALUES
('achilles_heel', 'Achilles'' Heel', 'signature', 'curse', 'achilles', 'Legendary vulnerability - random critical hits bypass all defense', 'Even the greatest warrior has a fatal flaw', '🦶💀', 1, '[]'::jsonb, 'passive',
'[{"type": "vulnerability", "value": 5, "description": "5% chance to take critical hit (x3 damage) regardless of defense"}]'::jsonb, 0, 0, 1, 0),

('wrath_of_achilles', 'Wrath of Achilles', 'signature', 'ultimate', 'achilles', 'Channel legendary fury for massive damage and rage state', 'The rage of Achilles burns like the fires of Troy', '⚔️🔥', 3,
'[{"rank": 2, "improvements": ["+100 damage", "+1 turn rage duration"]}, {"rank": 3, "improvements": ["+100 damage", "Heal 25% HP on kill during rage"]}]'::jsonb, 'active',
'[{"type": "damage", "value": 300, "target": "enemy", "damageType": "physical"}, {"type": "status_effect", "value": 2, "duration": 2, "target": "self", "statusEffect": "rage"}, {"type": "stat_modifier", "stat": "attack", "value": 50, "duration": 3, "target": "self"}]'::jsonb, 8, 80, 10, 0),

('invulnerability', 'Invulnerability', 'signature', 'defensive', 'achilles', 'Immune to weak attacks - only serious threats can harm you', 'Blessed by the river Styx, no mortal weapon can pierce his skin', '🛡️✨', 1, '[]'::jsonb, 'passive',
'[{"type": "damage_threshold", "value": 50, "description": "Immune to damage from sources below 50% of current HP"}]'::jsonb, 0, 0, 15, 0),

('heros_challenge', 'Hero''s Challenge', 'signature', 'special', 'achilles', 'Force enemy champion into honorable 1v1 duel', 'True warriors settle disputes with blade, not words', '⚔️🤺', 1, '[]'::jsonb, 'active',
'[{"type": "special", "effect": "duel", "duration": 3, "description": "Force 1v1 duel (3 turns, no interference)"}, {"type": "stat_modifier", "stat": "all", "value": 25, "duration": 3, "target": "both", "description": "Both fighters gain +25% all stats"}]'::jsonb, 0, 50, 18, 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO power_definitions (id, name, tier, category, character_id, description, flavor_text, icon, max_rank, power_type, effects, unlock_level, unlock_cost, unlock_challenge) VALUES
('legend_never_dies', 'Legend Never Dies', 'signature', 'defensive', 'achilles', 'Revive upon death with restored health', 'Even in death, Achilles fights on. Legends cannot truly die.', '👻⚔️', 1, 'passive',
'[{"type": "revive", "value": 25, "once_per_battle": true, "description": "Revive at 25% HP upon death (once per battle)"}]'::jsonb, 20, 0, 'die_in_battle')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- CONFIRMATION
-- ============================================================================

-- Verify seed count
DO $$
DECLARE
  power_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO power_count FROM power_definitions WHERE
    character_id = 'achilles' OR
    species = 'human' OR
    archetype = 'warrior' OR
    tier = 'skill';

  RAISE NOTICE 'Seeded % power definitions for Achilles', power_count;
END $$;

COMMIT;
