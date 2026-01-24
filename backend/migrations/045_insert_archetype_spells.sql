-- Migration: Insert Archetype-Specific Spells
-- Purpose: Add spells for unique archetypes (appliance, assassin, beast, mystic, system)
-- Category: Archetype-specific spells

-- ===== APPLIANCE ARCHETYPE SPELLS =====
-- Theme: Household items come to life, mechanical quirks, domestic powers gone wild

INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  archetype,
  unlock_cost_coins, learn_time_seconds, required_level,
  mana_cost, cooldown_turns, charges_per_battle,
  effects, icon
) VALUES
(
  'appliance_power_surge',
  'Power Surge',
  'Overload your electrical systems to deal lightning damage and boost speed by 30% for 2 turns.',
  'Who needs a safe operating voltage anyway?',
  'archetype',
  'archetype',
  'appliance',
  550, 3600, 5,
  30, 4, NULL,
  '{"damage": 40, "damageType": "lightning", "speedBoost": 30, "duration": 2, "target": "self_and_enemies"}',
  '⚡'
),
(
  'appliance_automated_repair',
  'Automated Repair',
  'Activate self-repair protocols. Heal 20 HP per turn for 3 turns.',
  'Standard warranty protocol activated.',
  'archetype',
  'archetype',
  'appliance',
  2200, 14400, 12,
  45, 5, NULL,
  '{"healingPerTurn": 20, "duration": 3, "target": "self"}',
  '🔧'
),
(
  'appliance_obsolescence_curse',
  'Planned Obsolescence',
  'Curse an enemy with obsolescence. Their stats decrease by 5% per turn for 4 turns (stacking).',
  'You are being phased out.',
  'archetype',
  'archetype',
  'appliance',
  2600, 14400, 14,
  50, 6, NULL,
  '{"statReduction": 5, "stacking": true, "duration": 4, "target": "single", "targetType": "enemy"}',
  '📉'
),
(
  'appliance_warranty_void',
  'Warranty Void',
  'Enter void mode. Ignore all damage for 1 turn, then explode for damage based on damage prevented.',
  'If tampered with, warranty is void. Explosively.',
  'archetype',
  'archetype',
  'appliance',
  9000, 43200, 22,
  70, 8, 1,
  '{"invulnerable": true, "duration": 1, "explodeAfter": true, "explosionScaling": "damagePrevented", "multiplier": 1.5, "target": "self"}',
  '💣'
),
(
  'appliance_factory_reset',
  'Factory Reset',
  'Reset yourself to factory defaults. Remove all debuffs, restore 50% HP, but lose all buffs.',
  'Restoring to original settings...',
  'archetype',
  'archetype',
  'appliance',
  25000, 86400, 30,
  80, 10, 1,
  '{"removeAllDebuffs": true, "removeAllBuffs": true, "healingPercent": 50, "target": "self"}',
  '🔄'
)
ON CONFLICT (id) DO NOTHING;

-- ===== ASSASSIN ARCHETYPE SPELLS =====
-- Theme: Death from shadows, precision kills, stealth mastery, contract killings

INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  archetype,
  unlock_cost_coins, learn_time_seconds, required_level,
  mana_cost, cooldown_turns, charges_per_battle,
  effects, icon
) VALUES
(
  'assassin_mark_for_death',
  'Mark for Death',
  'Mark an enemy. Your next attack against them deals 100% bonus damage and ignores defense.',
  'The contract is signed.',
  'archetype',
  'archetype',
  'assassin',
  600, 3600, 6,
  35, 4, NULL,
  '{"marked": true, "nextAttackBonus": 100, "ignoreDefense": true, "duration": 3, "target": "single", "targetType": "enemy"}',
  '🎯'
),
(
  'assassin_shadow_step',
  'Shadow Step',
  'Teleport behind an enemy. Your next attack cannot miss and deals critical damage.',
  'Nothing personnel, kid.',
  'archetype',
  'archetype',
  'assassin',
  2500, 14400, 13,
  50, 5, NULL,
  '{"teleport": true, "guaranteedHit": true, "guaranteedCrit": true, "nextAttack": 1, "target": "single", "targetType": "enemy"}',
  '🌑'
),
(
  'assassin_killing_intent',
  'Killing Intent',
  'Radiate pure murderous aura. All enemies lose 20% attack and accuracy for 3 turns.',
  'They can feel death approaching.',
  'archetype',
  'archetype',
  'assassin',
  2800, 14400, 14,
  55, 6, NULL,
  '{"attackReduction": 20, "accuracyReduction": 20, "duration": 3, "target": "all", "targetType": "enemies"}',
  '💀'
),
(
  'assassin_critical_weakness',
  'Exploit Critical Weakness',
  'Study target for 1 turn. Next turn, execute them instantly if below 40% HP.',
  'I found the pressure point.',
  'archetype',
  'archetype',
  'assassin',
  9500, 43200, 23,
  75, 8, 1,
  '{"study": true, "studyDuration": 1, "executeThreshold": 40, "target": "single", "targetType": "enemy"}',
  '🗡️'
),
(
  'assassin_ghost_protocol',
  'Ghost Protocol',
  'Become completely untargetable and invisible for 2 turns. Deal 200% damage on your next attack.',
  'I was never here.',
  'archetype',
  'archetype',
  'assassin',
  26000, 86400, 31,
  90, 12, 1,
  '{"untargetable": true, "invisible": true, "duration": 2, "nextAttackBonus": 200, "target": "self"}',
  '👻'
)
ON CONFLICT (id) DO NOTHING;

-- ===== BEAST ARCHETYPE SPELLS =====
-- Theme: Primal fury, pack tactics, animal instincts, wild nature

INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  archetype,
  unlock_cost_coins, learn_time_seconds, required_level,
  mana_cost, cooldown_turns, charges_per_battle,
  effects, icon
) VALUES
(
  'beast_primal_roar',
  'Primal Roar',
  'Release a terrifying roar. Enemies lose 25% defense for 3 turns.',
  'The sound of ancient predators.',
  'archetype',
  'archetype',
  'beast',
  550, 3600, 5,
  30, 4, NULL,
  '{"defenseReduction": 25, "duration": 3, "target": "all", "targetType": "enemies"}',
  '🦁'
),
(
  'beast_pack_mentality',
  'Pack Mentality',
  'Gain +10% to all stats for each allied beast. Stacks up to 5 times.',
  'The pack is strength.',
  'archetype',
  'archetype',
  'beast',
  2200, 14400, 12,
  40, 0, NULL,
  '{"statBoost": 10, "scaling": "allied_beasts", "maxStacks": 5, "statsAffected": "all", "target": "self", "passive": true}',
  '🐺'
),
(
  'beast_savage_instinct',
  'Savage Instinct',
  'When HP drops below 30%, automatically enter frenzy: +50% attack, +30% speed for 3 turns.',
  'Wounded beasts are the most dangerous.',
  'archetype',
  'archetype',
  'beast',
  2600, 21600, 14,
  0, 7, NULL,
  '{"trigger": "low_hp", "threshold": 30, "attackBoost": 50, "speedBoost": 30, "duration": 3, "target": "self", "passive": true}',
  '😤'
),
(
  'beast_apex_predator',
  'Apex Predator',
  'Mark the weakest enemy. Deal 150% damage to them and heal for 50% of damage dealt.',
  'I am the top of the food chain.',
  'archetype',
  'archetype',
  'beast',
  9000, 43200, 22,
  70, 7, NULL,
  '{"autoTarget": "lowest_hp", "damageBonus": 150, "lifesteal": 50, "target": "single", "targetType": "enemy"}',
  '👑'
),
(
  'beast_primordial_fury',
  'Primordial Fury',
  'Channel pure animal rage. Attack all enemies 3 times with increasing damage each hit.',
  'Become the monster they fear.',
  'archetype',
  'archetype',
  'beast',
  25000, 86400, 30,
  100, 10, 1,
  '{"damage": 50, "hits": 3, "damageIncrease": 25, "target": "all", "targetType": "enemies"}',
  '🔥'
)
ON CONFLICT (id) DO NOTHING;

-- ===== MYSTIC ARCHETYPE SPELLS =====
-- Theme: Ancient magic, prophecy, ethereal powers, spiritual connection

INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  archetype,
  unlock_cost_coins, learn_time_seconds, required_level,
  mana_cost, cooldown_turns, charges_per_battle,
  effects, icon
) VALUES
(
  'mystic_third_eye',
  'Third Eye',
  'See the immediate future. Dodge the next 2 attacks and gain +25% accuracy for 3 turns.',
  'I see all possible timelines.',
  'archetype',
  'archetype',
  'mystic',
  600, 3600, 6,
  35, 4, NULL,
  '{"dodgeNext": 2, "accuracyBoost": 25, "duration": 3, "target": "self"}',
  '👁️'
),
(
  'mystic_astral_projection',
  'Astral Projection',
  'Leave your body. Take no physical damage for 2 turns but can still cast spells.',
  'My spirit walks between worlds.',
  'archetype',
  'archetype',
  'mystic',
  2500, 14400, 13,
  50, 6, NULL,
  '{"immunePhysical": true, "canCast": true, "duration": 2, "target": "self"}',
  '👤'
),
(
  'mystic_prophecy',
  'Prophecy',
  'Foretell the future. Reveal enemy next move and gain perfect defense against it.',
  'It is written.',
  'archetype',
  'archetype',
  'mystic',
  2800, 14400, 14,
  55, 5, NULL,
  '{"reveal": "next_action", "perfectDefense": true, "duration": 1, "target": "single", "targetType": "enemy"}',
  '📜'
),
(
  'mystic_spirit_binding',
  'Spirit Binding',
  'Bind enemy spirit. They cannot use abilities for 2 turns and take damage when they try.',
  'Your soul is mine to command.',
  'archetype',
  'archetype',
  'mystic',
  9500, 43200, 23,
  80, 8, 1,
  '{"silenced": true, "duration": 2, "recoilDamage": 30, "target": "single", "targetType": "enemy"}',
  '⛓️'
),
(
  'mystic_fate_reversal',
  'Fate Reversal',
  'Reverse the threads of fate. Swap HP percentages with target enemy.',
  'What is yours becomes mine. What is mine becomes yours.',
  'archetype',
  'archetype',
  'mystic',
  27000, 86400, 32,
  90, 12, 1,
  '{"swapHpPercent": true, "target": "single", "targetType": "enemy"}',
  '♾️'
)
ON CONFLICT (id) DO NOTHING;

-- ===== SYSTEM ARCHETYPE SPELLS =====
-- Theme: Digital existence, code manipulation, system access, artificial intelligence

INSERT INTO spell_definitions (
  id, name, description, flavor_text, tier, category,
  archetype,
  unlock_cost_coins, learn_time_seconds, required_level,
  mana_cost, cooldown_turns, charges_per_battle,
  effects, icon
) VALUES
(
  'system_debug_mode',
  'Debug Mode',
  'Enter debug mode. Reveal all enemy stats and weaknesses for 4 turns.',
  'Console access granted.',
  'archetype',
  'archetype',
  'system',
  550, 3600, 5,
  30, 5, NULL,
  '{"revealAll": true, "showWeaknesses": true, "duration": 4, "target": "all_enemies"}',
  '🐛'
),
(
  'system_firewall',
  'Firewall',
  'Deploy defensive protocols. Block the next 3 debuffs and reflect them to attackers.',
  'Access denied.',
  'archetype',
  'archetype',
  'system',
  2400, 14400, 13,
  50, 6, NULL,
  '{"blockDebuffs": 3, "reflect": true, "target": "self"}',
  '🛡️'
),
(
  'system_exploit_vulnerability',
  'Exploit Vulnerability',
  'Scan and exploit system weaknesses. Deal damage equal to 3x the difference between your stats and enemy stats.',
  'Found a security flaw.',
  'archetype',
  'archetype',
  'system',
  2700, 14400, 14,
  55, 5, NULL,
  '{"damage": "stat_difference", "multiplier": 3, "target": "single", "targetType": "enemy"}',
  '💻'
),
(
  'system_forced_reboot',
  'Forced Reboot',
  'Force an enemy to reboot. They skip their next turn and lose all buffs.',
  'Ctrl+Alt+Delete.',
  'archetype',
  'archetype',
  'system',
  9000, 43200, 22,
  75, 7, 1,
  '{"skipTurn": true, "removeAllBuffs": true, "target": "single", "targetType": "enemy"}',
  '🔄'
),
(
  'system_root_access',
  'Root Access',
  'Gain administrator privileges. Control one enemy for 2 turns, then delete their buffs permanently.',
  'I am the system administrator now.',
  'archetype',
  'archetype',
  'system',
  26000, 86400, 31,
  95, 12, 1,
  '{"mindControl": true, "duration": 2, "removeBuffsPermanent": true, "target": "single", "targetType": "enemy"}',
  '👨‍💻'
)
ON CONFLICT (id) DO NOTHING;
