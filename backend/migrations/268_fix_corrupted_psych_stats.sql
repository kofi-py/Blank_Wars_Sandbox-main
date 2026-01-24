-- Migration 268: Fix Corrupted Psychological Stats
--
-- PROBLEM: Migrations 093-095, 099-101, 115, 121 all ran and stacked additively,
-- corrupting training, ego, team_player, and mental_health values.
-- Some characters have ego values of 7000+ instead of ~100.
--
-- SOLUTION: Reset all characters to correct final values:
-- - System characters (non-contestants): base values only
-- - Contestants: base + archetype + species + individual (applied ONCE)
--
-- BASE VALUES:
-- training=75, ego=60, team_player=70, mental_health=80

BEGIN;

-- ============================================================================
-- STEP 1: Reset ALL characters to base values
-- ============================================================================
UPDATE characters SET
    training = 75,
    ego = 60,
    team_player = 70,
    mental_health = 80
WHERE TRUE;

-- ============================================================================
-- STEP 2: Apply ARCHETYPE modifiers (contestants only)
-- From migration 093
-- ============================================================================

-- WARRIOR: training+10, mental_health-15, team_player-5, ego+10
UPDATE characters SET
    training = training + 10,
    mental_health = mental_health - 15,
    team_player = team_player - 5,
    ego = ego + 10
WHERE archetype = 'warrior' AND role = 'contestant';

-- BEAST: training-15, mental_health-10, team_player-5, ego+10
UPDATE characters SET
    training = training - 15,
    mental_health = mental_health - 10,
    team_player = team_player - 5,
    ego = ego + 10
WHERE archetype = 'beast' AND role = 'contestant';

-- TANK: training+5, mental_health+5, team_player+5, ego+0
UPDATE characters SET
    training = training + 5,
    mental_health = mental_health + 5,
    team_player = team_player + 5,
    ego = ego + 0
WHERE archetype = 'tank' AND role = 'contestant';

-- ASSASSIN: training+5, mental_health-10, team_player-20, ego+10
UPDATE characters SET
    training = training + 5,
    mental_health = mental_health - 10,
    team_player = team_player - 20,
    ego = ego + 10
WHERE archetype = 'assassin' AND role = 'contestant';

-- MAGE: training+15, mental_health+10, team_player+0, ego+0
UPDATE characters SET
    training = training + 15,
    mental_health = mental_health + 10,
    team_player = team_player + 0,
    ego = ego + 0
WHERE archetype = 'mage' AND role = 'contestant';

-- SCHOLAR: training+20, mental_health+5, team_player+5, ego-10
UPDATE characters SET
    training = training + 20,
    mental_health = mental_health + 5,
    team_player = team_player + 5,
    ego = ego - 10
WHERE archetype = 'scholar' AND role = 'contestant';

-- TRICKSTER: training+0, mental_health-20, team_player-25, ego+20
UPDATE characters SET
    training = training + 0,
    mental_health = mental_health - 20,
    team_player = team_player - 25,
    ego = ego + 20
WHERE archetype = 'trickster' AND role = 'contestant';

-- DETECTIVE: training+10, mental_health-15, team_player-15, ego+30
UPDATE characters SET
    training = training + 10,
    mental_health = mental_health - 15,
    team_player = team_player - 15,
    ego = ego + 30
WHERE archetype = 'detective' AND role = 'contestant';

-- LEADER: training+10, mental_health+10, team_player+10, ego+30
UPDATE characters SET
    training = training + 10,
    mental_health = mental_health + 10,
    team_player = team_player + 10,
    ego = ego + 30
WHERE archetype = 'leader' AND role = 'contestant';

-- BEASTMASTER: training+10, mental_health+10, team_player+5, ego+0
UPDATE characters SET
    training = training + 10,
    mental_health = mental_health + 10,
    team_player = team_player + 5,
    ego = ego + 0
WHERE archetype = 'beastmaster' AND role = 'contestant';

-- MAGICAL_APPLIANCE: training-10, mental_health+10, team_player+20, ego+0
UPDATE characters SET
    training = training - 10,
    mental_health = mental_health + 10,
    team_player = team_player + 20,
    ego = ego + 0
WHERE archetype = 'magical_appliance' AND role = 'contestant';

-- MYSTIC: training+10, mental_health+20, team_player-10, ego+0
UPDATE characters SET
    training = training + 10,
    mental_health = mental_health + 20,
    team_player = team_player - 10,
    ego = ego + 0
WHERE archetype = 'mystic' AND role = 'contestant';

-- ============================================================================
-- STEP 3: Apply SPECIES modifiers (contestants only)
-- From migration 094
-- ============================================================================

-- HUMAN: training+10, mental_health-10, team_player+5, ego+20
UPDATE characters SET
    training = training + 10,
    mental_health = mental_health - 10,
    team_player = team_player + 5,
    ego = ego + 20
WHERE species = 'human' AND role = 'contestant';

-- HUMAN_MAGICAL: training+20, mental_health+0, team_player+15, ego+10
UPDATE characters SET
    training = training + 20,
    mental_health = mental_health + 0,
    team_player = team_player + 15,
    ego = ego + 10
WHERE species = 'human_magical' AND role = 'contestant';

-- KANGAROO: training-20, mental_health-5, team_player-10, ego+5
UPDATE characters SET
    training = training - 20,
    mental_health = mental_health - 5,
    team_player = team_player - 10,
    ego = ego + 5
WHERE species = 'kangaroo' AND role = 'contestant';

-- DIRE_WOLF: training-20, mental_health-5, team_player-10, ego+15
UPDATE characters SET
    training = training - 20,
    mental_health = mental_health - 5,
    team_player = team_player - 10,
    ego = ego + 15
WHERE species = 'dire_wolf' AND role = 'contestant';

-- ROBOT: training+10, mental_health-15, team_player-10, ego+0
UPDATE characters SET
    training = training + 10,
    mental_health = mental_health - 15,
    team_player = team_player - 10,
    ego = ego + 0
WHERE species = 'robot' AND role = 'contestant';

-- CYBORG: training+10, mental_health-15, team_player-10, ego+15
UPDATE characters SET
    training = training + 10,
    mental_health = mental_health - 15,
    team_player = team_player - 10,
    ego = ego + 15
WHERE species = 'cyborg' AND role = 'contestant';

-- GOLEM: training+10, mental_health-20, team_player-10, ego+0
UPDATE characters SET
    training = training + 10,
    mental_health = mental_health - 20,
    team_player = team_player - 10,
    ego = ego + 0
WHERE species = 'golem' AND role = 'contestant';

-- REPTILIAN: training+0, mental_health-10, team_player-10, ego+10
UPDATE characters SET
    training = training + 0,
    mental_health = mental_health - 10,
    team_player = team_player - 10,
    ego = ego + 10
WHERE species = 'reptilian' AND role = 'contestant';

-- FAIRY: training+20, mental_health+10, team_player+10, ego+10
UPDATE characters SET
    training = training + 20,
    mental_health = mental_health + 10,
    team_player = team_player + 10,
    ego = ego + 10
WHERE species = 'fairy' AND role = 'contestant';

-- VAMPIRE: training+5, mental_health-15, team_player-15, ego+20
UPDATE characters SET
    training = training + 5,
    mental_health = mental_health - 15,
    team_player = team_player - 15,
    ego = ego + 20
WHERE species = 'vampire' AND role = 'contestant';

-- MYTHICAL_CREATURE: training+0, mental_health-5, team_player-5, ego+40
UPDATE characters SET
    training = training + 0,
    mental_health = mental_health - 5,
    team_player = team_player - 5,
    ego = ego + 40
WHERE species = 'mythical_creature' AND role = 'contestant';

-- ZETA_RETICULAN_GREY: training+10, mental_health-10, team_player-15, ego+20
UPDATE characters SET
    training = training + 10,
    mental_health = mental_health - 10,
    team_player = team_player - 15,
    ego = ego + 20
WHERE species = 'zeta_reticulan_grey' AND role = 'contestant';

-- ANGEL: training+5, mental_health+10, team_player+5, ego+60
UPDATE characters SET
    training = training + 5,
    mental_health = mental_health + 10,
    team_player = team_player + 5,
    ego = ego + 60
WHERE species = 'angel' AND role = 'contestant';

-- DEITY: training+0, mental_health-10, team_player-10, ego+50
UPDATE characters SET
    training = training + 0,
    mental_health = mental_health - 10,
    team_player = team_player - 10,
    ego = ego + 50
WHERE species = 'deity' AND role = 'contestant';

-- ============================================================================
-- STEP 4: Apply INDIVIDUAL modifiers (contestants only)
-- From migration 095 - character-specific adjustments
-- ============================================================================

-- ACHILLES: training+10, mental_health-50, team_player-30, ego+60
UPDATE characters SET
    training = training + 10,
    mental_health = mental_health - 50,
    team_player = team_player - 30,
    ego = ego + 60
WHERE name = 'Achilles' AND role = 'contestant';

-- AGENT X: training+30, mental_health-30, team_player-20, ego+30
UPDATE characters SET
    training = training + 30,
    mental_health = mental_health - 30,
    team_player = team_player - 20,
    ego = ego + 30
WHERE name = 'Agent X' AND role = 'contestant';

-- ALEISTER CROWLEY: training+30, mental_health-20, team_player-20, ego+40
UPDATE characters SET
    training = training + 30,
    mental_health = mental_health - 20,
    team_player = team_player - 20,
    ego = ego + 40
WHERE name = 'Aleister Crowley' AND role = 'contestant';

-- ARCHANGEL MICHAEL: training+0, mental_health-30, team_player-30, ego+70
UPDATE characters SET
    training = training + 0,
    mental_health = mental_health - 30,
    team_player = team_player - 30,
    ego = ego + 70
WHERE name = 'Archangel Michael' AND role = 'contestant';

-- BILLY THE KID: training+0, mental_health-25, team_player-25, ego+50
UPDATE characters SET
    training = training + 0,
    mental_health = mental_health - 25,
    team_player = team_player - 25,
    ego = ego + 50
WHERE name = 'Billy the Kid' AND role = 'contestant';

-- CLEOPATRA VII: training+10, mental_health-30, team_player-30, ego+50
UPDATE characters SET
    training = training + 10,
    mental_health = mental_health - 30,
    team_player = team_player - 30,
    ego = ego + 50
WHERE name = 'Cleopatra VII' AND role = 'contestant';

-- COUNT DRACULA: training+15, mental_health-35, team_player-35, ego+65
UPDATE characters SET
    training = training + 15,
    mental_health = mental_health - 35,
    team_player = team_player - 35,
    ego = ego + 65
WHERE name = 'Count Dracula' AND role = 'contestant';

-- CRUMBSWORTH: training-25, mental_health-25, team_player+40, ego+0
UPDATE characters SET
    training = training - 25,
    mental_health = mental_health - 25,
    team_player = team_player + 40,
    ego = ego + 0
WHERE name = 'Crumbsworth' AND role = 'contestant';

-- DON QUIXOTE: training+20, mental_health-40, team_player-30, ego+50
UPDATE characters SET
    training = training + 20,
    mental_health = mental_health - 40,
    team_player = team_player - 30,
    ego = ego + 50
WHERE name = 'Don Quixote' AND role = 'contestant';

-- FENRIR: training-25, mental_health-30, team_player-35, ego+40
UPDATE characters SET
    training = training - 25,
    mental_health = mental_health - 30,
    team_player = team_player - 35,
    ego = ego + 40
WHERE name = 'Fenrir' AND role = 'contestant';

-- FRANKENSTEINS MONSTER: training+0, mental_health-40, team_player-40, ego+30
UPDATE characters SET
    training = training + 0,
    mental_health = mental_health - 40,
    team_player = team_player - 40,
    ego = ego + 30
WHERE name = 'Frankensteins Monster' AND role = 'contestant';

-- GENGHIS KHAN: training+25, mental_health-30, team_player-35, ego+60
UPDATE characters SET
    training = training + 25,
    mental_health = mental_health - 30,
    team_player = team_player - 35,
    ego = ego + 60
WHERE name = 'Genghis Khan' AND role = 'contestant';

-- JACK THE RIPPER: training+15, mental_health-35, team_player-30, ego+35
UPDATE characters SET
    training = training + 15,
    mental_health = mental_health - 35,
    team_player = team_player - 30,
    ego = ego + 35
WHERE name = 'Jack the Ripper' AND role = 'contestant';

-- JOAN OF ARC: training+5, mental_health-45, team_player-25, ego+55
UPDATE characters SET
    training = training + 5,
    mental_health = mental_health - 45,
    team_player = team_player - 25,
    ego = ego + 55
WHERE name = 'Joan of Arc' AND role = 'contestant';

-- KALI: training+5, mental_health-40, team_player-45, ego+70
UPDATE characters SET
    training = training + 5,
    mental_health = mental_health - 40,
    team_player = team_player - 45,
    ego = ego + 70
WHERE name = 'Kali' AND role = 'contestant';

-- KANGAROO: training-20, mental_health-40, team_player-20, ego+15
UPDATE characters SET
    training = training - 20,
    mental_health = mental_health - 40,
    team_player = team_player - 20,
    ego = ego + 15
WHERE name = 'Kangaroo' AND role = 'contestant';

-- KARNA: training+15, mental_health-35, team_player-30, ego+60
UPDATE characters SET
    training = training + 15,
    mental_health = mental_health - 35,
    team_player = team_player - 30,
    ego = ego + 60
WHERE name = 'Karna' AND role = 'contestant';

-- LITTLE BO PEEP: training+15, mental_health-50, team_player-45, ego-15
UPDATE characters SET
    training = training + 15,
    mental_health = mental_health - 50,
    team_player = team_player - 45,
    ego = ego - 15
WHERE name = 'Little Bo Peep' AND role = 'contestant';

-- MAMI WATA: training-30, mental_health+20, team_player+10, ego+40
UPDATE characters SET
    training = training - 30,
    mental_health = mental_health + 20,
    team_player = team_player + 10,
    ego = ego + 40
WHERE name = 'Mami Wata' AND role = 'contestant';

-- MERLIN: training+30, mental_health+20, team_player+20, ego+50
UPDATE characters SET
    training = training + 30,
    mental_health = mental_health + 20,
    team_player = team_player + 20,
    ego = ego + 50
WHERE name = 'Merlin' AND role = 'contestant';

-- NAPOLEON BONAPARTE: training+30, mental_health-30, team_player-30, ego+50
UPDATE characters SET
    training = training + 30,
    mental_health = mental_health - 30,
    team_player = team_player - 30,
    ego = ego + 50
WHERE name = 'Napoleon Bonaparte' AND role = 'contestant';

-- NIKOLA TESLA: training+40, mental_health-20, team_player-20, ego+50
UPDATE characters SET
    training = training + 40,
    mental_health = mental_health - 20,
    team_player = team_player - 20,
    ego = ego + 50
WHERE name = 'Nikola Tesla' AND role = 'contestant';

-- QUETZALCOATL: training-30, mental_health-25, team_player-25, ego+50
UPDATE characters SET
    training = training - 30,
    mental_health = mental_health - 25,
    team_player = team_player - 25,
    ego = ego + 50
WHERE name = 'Quetzalcoatl' AND role = 'contestant';

-- RAMSES II: training+30, mental_health-20, team_player-10, ego+30
UPDATE characters SET
    training = training + 30,
    mental_health = mental_health - 20,
    team_player = team_player - 10,
    ego = ego + 30
WHERE name = 'Ramses II' AND role = 'contestant';

-- RILAK TRELKAR: training+30, mental_health+10, team_player-30, ego+30
UPDATE characters SET
    training = training + 30,
    mental_health = mental_health + 10,
    team_player = team_player - 30,
    ego = ego + 30
WHERE name = 'Rilak Trelkar' AND role = 'contestant';

-- ROBIN HOOD: training+10, mental_health-35, team_player-25, ego+40
UPDATE characters SET
    training = training + 10,
    mental_health = mental_health - 35,
    team_player = team_player - 25,
    ego = ego + 40
WHERE name = 'Robin Hood' AND role = 'contestant';

-- SAM SPADE: training+20, mental_health-30, team_player-30, ego+35
UPDATE characters SET
    training = training + 20,
    mental_health = mental_health - 30,
    team_player = team_player - 30,
    ego = ego + 35
WHERE name = 'Sam Spade' AND role = 'contestant';

-- SHAKA ZULU: training+10, mental_health-40, team_player-20, ego+30
UPDATE characters SET
    training = training + 10,
    mental_health = mental_health - 40,
    team_player = team_player - 20,
    ego = ego + 30
WHERE name = 'Shaka Zulu' AND role = 'contestant';

-- SHERLOCK HOLMES: training+30, mental_health+10, team_player-30, ego+50
UPDATE characters SET
    training = training + 30,
    mental_health = mental_health + 10,
    team_player = team_player - 30,
    ego = ego + 50
WHERE name = 'Sherlock Holmes' AND role = 'contestant';

-- SPACE CYBORG: training+10, mental_health-35, team_player-20, ego+20
UPDATE characters SET
    training = training + 10,
    mental_health = mental_health - 35,
    team_player = team_player - 20,
    ego = ego + 20
WHERE name = 'Space Cyborg' AND role = 'contestant';

-- SUN WUKONG: training-20, mental_health-30, team_player-30, ego+50
UPDATE characters SET
    training = training - 20,
    mental_health = mental_health - 30,
    team_player = team_player - 30,
    ego = ego + 50
WHERE name = 'Sun Wukong' AND role = 'contestant';

-- UNICORN: training-30, mental_health-20, team_player-20, ego+40
UPDATE characters SET
    training = training - 30,
    mental_health = mental_health - 20,
    team_player = team_player - 20,
    ego = ego + 40
WHERE name = 'Unicorn' AND role = 'contestant';

-- VELOCIRAPTOR: training-10, mental_health-30, team_player-30, ego+20
UPDATE characters SET
    training = training - 10,
    mental_health = mental_health - 30,
    team_player = team_player - 30,
    ego = ego + 20
WHERE name = 'Velociraptor' AND role = 'contestant';

-- ============================================================================
-- STEP 5: Refresh ALL user_characters from corrected characters table
-- This uses the existing trigger logic but we'll do it manually
-- ============================================================================

UPDATE user_characters uc SET
    current_training = GREATEST(0, c.training),
    current_ego = GREATEST(0, c.ego),
    current_team_player = GREATEST(0, c.team_player),
    current_mental_health = GREATEST(0, c.mental_health)
FROM characters c
WHERE uc.character_id = c.id;

-- ============================================================================
-- STEP 6: Log the migration
-- ============================================================================
INSERT INTO migration_log (version, name, description)
VALUES (268, '268_fix_corrupted_psych_stats', 'Reset all psych stats to correct values after stacking migration bug')
ON CONFLICT (version) DO NOTHING;

COMMIT;
