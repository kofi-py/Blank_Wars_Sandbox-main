-- Migration 095: Apply Individual/Signature Stat Modifiers
-- Tier 4 of 4-tier modifier system: Universal (50) → Archetype → Species → Individual
-- Individual budgets: 200-300 points (case-by-case based on character legend status)
-- Balance margin: ±20 (more flexible for unique personalities)
-- HIGH ego = negative trait (selfish, arrogant)

-- ACHILLES (280 points, net 0)
UPDATE user_characters uc
SET
    current_attack = uc.current_attack + 20,
    current_defense = uc.current_defense + 20,
    current_speed = uc.current_speed + 20,
    current_special = uc.current_special + 20,
    current_max_health = uc.current_max_health + 20,
    max_energy = uc.max_energy + 20,
    max_mana = uc.max_mana + 10,
    current_training = uc.current_training + 10,
    current_mental_health = uc.current_mental_health - 50,
    current_team_player = uc.current_team_player - 30,
    current_ego = uc.current_ego + 60,
    current_communication = uc.current_communication + 0
FROM characters c
WHERE c.name = 'Achilles' AND uc.character_id = c.id;

-- AGENT X (200 points, net 0)
UPDATE user_characters uc
SET
    current_attack = uc.current_attack + 15,
    current_defense = uc.current_defense + 10,
    current_speed = uc.current_speed + 10,
    current_special = uc.current_special + 10,
    current_max_health = uc.current_max_health + 5,
    max_energy = uc.max_energy + 20,
    max_mana = uc.max_mana - 20,
    current_training = uc.current_training + 30,
    current_mental_health = uc.current_mental_health - 30,
    current_team_player = uc.current_team_player - 20,
    current_ego = uc.current_ego + 30,
    current_communication = uc.current_communication + 0
FROM characters c
WHERE c.name = 'Agent X' AND uc.character_id = c.id;

-- ALEISTER CROWLEY (240 points, net 0)
UPDATE user_characters uc
SET
    current_attack = uc.current_attack - 10,
    current_defense = uc.current_defense - 10,
    current_speed = uc.current_speed - 10,
    current_special = uc.current_special - 5,
    current_max_health = uc.current_max_health + 30,
    max_energy = uc.max_energy - 5,
    max_mana = uc.max_mana + 50,
    current_training = uc.current_training + 30,
    current_mental_health = uc.current_mental_health - 20,
    current_team_player = uc.current_team_player - 20,
    current_ego = uc.current_ego + 40,
    current_communication = uc.current_communication + 10
FROM characters c
WHERE c.name = 'Aleister Crowley' AND uc.character_id = c.id;

-- ARCHANGEL MICHAEL (280 points, net +20)
UPDATE user_characters uc
SET
    current_attack = uc.current_attack + 30,
    current_defense = uc.current_defense + 20,
    current_speed = uc.current_speed + 15,
    current_special = uc.current_special + 15,
    current_max_health = uc.current_max_health + 15,
    max_energy = uc.max_energy + 15,
    max_mana = uc.max_mana + 30,
    current_training = uc.current_training + 0,
    current_mental_health = uc.current_mental_health - 30,
    current_team_player = uc.current_team_player - 30,
    current_ego = uc.current_ego + 70,
    current_communication = uc.current_communication + 10
FROM characters c
WHERE c.name = 'Archangel Michael' AND uc.character_id = c.id;

-- BILLY THE KID (240 points, net 0)
UPDATE user_characters uc
SET
    current_attack = uc.current_attack + 25,
    current_defense = uc.current_defense - 20,
    current_speed = uc.current_speed + 30,
    current_special = uc.current_special + 20,
    current_max_health = uc.current_max_health + 10,
    max_energy = uc.max_energy + 35,
    max_mana = uc.max_mana + 0,
    current_training = uc.current_training + 0,
    current_mental_health = uc.current_mental_health - 25,
    current_team_player = uc.current_team_player - 25,
    current_ego = uc.current_ego + 50,
    current_communication = uc.current_communication + 0
FROM characters c
WHERE c.name = 'Billy the Kid' AND uc.character_id = c.id;

-- CLEOPATRA VII (265 points, net +5)
UPDATE user_characters uc
SET
    current_attack = uc.current_attack + 10,
    current_defense = uc.current_defense - 20,
    current_speed = uc.current_speed + 10,
    current_special = uc.current_special + 20,
    current_max_health = uc.current_max_health + 20,
    max_energy = uc.max_energy + 20,
    max_mana = uc.max_mana + 20,
    current_training = uc.current_training + 10,
    current_mental_health = uc.current_mental_health - 30,
    current_team_player = uc.current_team_player - 30,
    current_ego = uc.current_ego + 50,
    current_communication = uc.current_communication + 25
FROM characters c
WHERE c.name = 'Cleopatra VII' AND uc.character_id = c.id;

-- COUNT DRACULA (275 points, net +5)
UPDATE user_characters uc
SET
    current_attack = uc.current_attack + 20,
    current_defense = uc.current_defense + 5,
    current_speed = uc.current_speed + 15,
    current_special = uc.current_special + 20,
    current_max_health = uc.current_max_health + 10,
    max_energy = uc.max_energy + 5,
    max_mana = uc.max_mana + 35,
    current_training = uc.current_training + 15,
    current_mental_health = uc.current_mental_health - 35,
    current_team_player = uc.current_team_player - 35,
    current_ego = uc.current_ego + 65,
    current_communication = uc.current_communication + 15
FROM characters c
WHERE c.name = 'Count Dracula' AND uc.character_id = c.id;

-- CRUMBSWORTH (290 points, net -10)
UPDATE user_characters uc
SET
    current_attack = uc.current_attack - 30,
    current_defense = uc.current_defense - 25,
    current_speed = uc.current_speed + 0,
    current_special = uc.current_special - 30,
    current_max_health = uc.current_max_health + 25,
    max_energy = uc.max_energy + 25,
    max_mana = uc.max_mana + 50,
    current_training = uc.current_training - 25,
    current_mental_health = uc.current_mental_health - 25,
    current_team_player = uc.current_team_player + 40,
    current_ego = uc.current_ego + 0,
    current_communication = uc.current_communication - 15
FROM characters c
WHERE c.name = 'Crumbsworth' AND uc.character_id = c.id;

-- DON QUIXOTE (240 points, net 0)
UPDATE user_characters uc
SET
    current_attack = uc.current_attack + 10,
    current_defense = uc.current_defense + 5,
    current_speed = uc.current_speed + 5,
    current_special = uc.current_special + 20,
    current_max_health = uc.current_max_health + 5,
    max_energy = uc.max_energy + 25,
    max_mana = uc.max_mana + 0,
    current_training = uc.current_training + 20,
    current_mental_health = uc.current_mental_health - 40,
    current_team_player = uc.current_team_player - 30,
    current_ego = uc.current_ego + 50,
    current_communication = uc.current_communication + 30
FROM characters c
WHERE c.name = 'Don Quixote' AND uc.character_id = c.id;

-- FENRIR (285 points, net +5)
UPDATE user_characters uc
SET
    current_attack = uc.current_attack + 35,
    current_defense = uc.current_defense + 15,
    current_speed = uc.current_speed + 20,
    current_special = uc.current_special + 25,
    current_max_health = uc.current_max_health + 25,
    max_energy = uc.max_energy + 20,
    max_mana = uc.max_mana + 5,
    current_training = uc.current_training - 25,
    current_mental_health = uc.current_mental_health - 30,
    current_team_player = uc.current_team_player - 35,
    current_ego = uc.current_ego + 40,
    current_communication = uc.current_communication - 10
FROM characters c
WHERE c.name = 'Fenrir' AND uc.character_id = c.id;

-- FRANKENSTEINS MONSTER (255 points, net +5)
UPDATE user_characters uc
SET
    current_attack = uc.current_attack + 15,
    current_defense = uc.current_defense + 10,
    current_speed = uc.current_speed - 15,
    current_special = uc.current_special + 20,
    current_max_health = uc.current_max_health + 35,
    max_energy = uc.max_energy + 20,
    max_mana = uc.max_mana + 10,
    current_training = uc.current_training + 0,
    current_mental_health = uc.current_mental_health - 40,
    current_team_player = uc.current_team_player - 40,
    current_ego = uc.current_ego + 30,
    current_communication = uc.current_communication + 20
FROM characters c
WHERE c.name = 'Frankensteins Monster' AND uc.character_id = c.id;

-- GENGHIS KHAN (260 points, net 0)
UPDATE user_characters uc
SET
    current_attack = uc.current_attack + 20,
    current_defense = uc.current_defense + 10,
    current_speed = uc.current_speed + 15,
    current_special = uc.current_special + 20,
    current_max_health = uc.current_max_health + 10,
    max_energy = uc.max_energy + 15,
    max_mana = uc.max_mana - 5,
    current_training = uc.current_training + 25,
    current_mental_health = uc.current_mental_health - 30,
    current_team_player = uc.current_team_player - 35,
    current_ego = uc.current_ego + 60,
    current_communication = uc.current_communication + 15
FROM characters c
WHERE c.name = 'Genghis Khan' AND uc.character_id = c.id;

-- JACK THE RIPPER (230 points, net +10)
UPDATE user_characters uc
SET
    current_attack = uc.current_attack + 20,
    current_defense = uc.current_defense + 5,
    current_speed = uc.current_speed + 25,
    current_special = uc.current_special + 20,
    current_max_health = uc.current_max_health + 15,
    max_energy = uc.max_energy + 20,
    max_mana = uc.max_mana - 10,
    current_training = uc.current_training + 15,
    current_mental_health = uc.current_mental_health - 35,
    current_team_player = uc.current_team_player - 30,
    current_ego = uc.current_ego + 35,
    current_communication = uc.current_communication + 0
FROM characters c
WHERE c.name = 'Jack the Ripper' AND uc.character_id = c.id;

-- JOAN OF ARC (260 points, net 0)
UPDATE user_characters uc
SET
    current_attack = uc.current_attack + 10,
    current_defense = uc.current_defense + 15,
    current_speed = uc.current_speed - 5,
    current_special = uc.current_special + 30,
    current_max_health = uc.current_max_health + 5,
    max_energy = uc.max_energy + 25,
    max_mana = uc.max_mana + 30,
    current_training = uc.current_training + 5,
    current_mental_health = uc.current_mental_health - 45,
    current_team_player = uc.current_team_player - 25,
    current_ego = uc.current_ego + 55,
    current_communication = uc.current_communication + 25
FROM characters c
WHERE c.name = 'Joan of Arc' AND uc.character_id = c.id;

-- KALI (290 points, net -20)
UPDATE user_characters uc
SET
    current_attack = uc.current_attack + 25,
    current_defense = uc.current_defense + 10,
    current_speed = uc.current_speed + 10,
    current_special = uc.current_special + 25,
    current_max_health = uc.current_max_health + 15,
    max_energy = uc.max_energy + 15,
    max_mana = uc.max_mana + 30,
    current_training = uc.current_training + 5,
    current_mental_health = uc.current_mental_health - 40,
    current_team_player = uc.current_team_player - 45,
    current_ego = uc.current_ego + 70,
    current_communication = uc.current_communication + 0
FROM characters c
WHERE c.name = 'Kali' AND uc.character_id = c.id;

-- KANGAROO (220 points, net 0)
UPDATE user_characters uc
SET
    current_attack = uc.current_attack + 30,
    current_defense = uc.current_defense + 5,
    current_speed = uc.current_speed + 25,
    current_special = uc.current_special + 10,
    current_max_health = uc.current_max_health + 10,
    max_energy = uc.max_energy + 30,
    max_mana = uc.max_mana - 5,
    current_training = uc.current_training - 20,
    current_mental_health = uc.current_mental_health - 40,
    current_team_player = uc.current_team_player - 20,
    current_ego = uc.current_ego + 15,
    current_communication = uc.current_communication - 10
FROM characters c
WHERE c.name = 'Kangaroo' AND uc.character_id = c.id;

-- KARNA (260 points, net +10)
UPDATE user_characters uc
SET
    current_attack = uc.current_attack + 20,
    current_defense = uc.current_defense + 10,
    current_speed = uc.current_speed + 15,
    current_special = uc.current_special + 20,
    current_max_health = uc.current_max_health + 15,
    max_energy = uc.max_energy + 15,
    max_mana = uc.max_mana + 15,
    current_training = uc.current_training + 15,
    current_mental_health = uc.current_mental_health - 35,
    current_team_player = uc.current_team_player - 30,
    current_ego = uc.current_ego + 60,
    current_communication = uc.current_communication + 10
FROM characters c
WHERE c.name = 'Karna' AND uc.character_id = c.id;

-- LITTLE BO PEEP (260 points, net -10)
UPDATE user_characters uc
SET
    current_attack = uc.current_attack - 10,
    current_defense = uc.current_defense - 15,
    current_speed = uc.current_speed - 5,
    current_special = uc.current_special + 25,
    current_max_health = uc.current_max_health - 10,
    max_energy = uc.max_energy + 10,
    max_mana = uc.max_mana + 35,
    current_training = uc.current_training + 15,
    current_mental_health = uc.current_mental_health - 50,
    current_team_player = uc.current_team_player - 45,
    current_ego = uc.current_ego - 15,
    current_communication = uc.current_communication + 25
FROM characters c
WHERE c.name = 'Little Bo Peep' AND uc.character_id = c.id;

-- MAMI WATA (280 points, net 0)
UPDATE user_characters uc
SET
    current_attack = uc.current_attack - 20,
    current_defense = uc.current_defense - 20,
    current_speed = uc.current_speed - 10,
    current_special = uc.current_special + 20,
    current_max_health = uc.current_max_health + 40,
    max_energy = uc.max_energy - 20,
    max_mana = uc.max_mana + 40,
    current_training = uc.current_training - 30,
    current_mental_health = uc.current_mental_health + 20,
    current_team_player = uc.current_team_player + 10,
    current_ego = uc.current_ego + 40,
    current_communication = uc.current_communication + 10
FROM characters c
WHERE c.name = 'Mami Wata' AND uc.character_id = c.id;

-- MERLIN (280 points, net +10)
UPDATE user_characters uc
SET
    current_attack = uc.current_attack - 15,
    current_defense = uc.current_defense - 15,
    current_speed = uc.current_speed - 5,
    current_special = uc.current_special - 15,
    current_max_health = uc.current_max_health - 15,
    max_energy = uc.max_energy - 20,
    max_mana = uc.max_mana + 55,
    current_training = uc.current_training + 30,
    current_mental_health = uc.current_mental_health + 20,
    current_team_player = uc.current_team_player + 20,
    current_ego = uc.current_ego + 50,
    current_communication = uc.current_communication + 20
FROM characters c
WHERE c.name = 'Merlin' AND uc.character_id = c.id;

-- NAPOLEON BONAPARTE (260 points, net 0)
UPDATE user_characters uc
SET
    current_attack = uc.current_attack + 10,
    current_defense = uc.current_defense + 0,
    current_speed = uc.current_speed + 10,
    current_special = uc.current_special + 30,
    current_max_health = uc.current_max_health + 10,
    max_energy = uc.max_energy + 40,
    max_mana = uc.max_mana - 10,
    current_training = uc.current_training + 30,
    current_mental_health = uc.current_mental_health - 30,
    current_team_player = uc.current_team_player - 30,
    current_ego = uc.current_ego + 50,
    current_communication = uc.current_communication - 10
FROM characters c
WHERE c.name = 'Napoleon Bonaparte' AND uc.character_id = c.id;

-- NIKOLA TESLA (250 points, net +10)
UPDATE user_characters uc
SET
    current_attack = uc.current_attack - 10,
    current_defense = uc.current_defense - 10,
    current_speed = uc.current_speed + 10,
    current_special = uc.current_special + 40,
    current_max_health = uc.current_max_health + 0,
    max_energy = uc.max_energy + 40,
    max_mana = uc.max_mana + 0,
    current_training = uc.current_training + 40,
    current_mental_health = uc.current_mental_health - 20,
    current_team_player = uc.current_team_player - 20,
    current_ego = uc.current_ego + 50,
    current_communication = uc.current_communication - 10
FROM characters c
WHERE c.name = 'Nikola Tesla' AND uc.character_id = c.id;

-- QUETZALCOATL (285 points, net +5)
UPDATE user_characters uc
SET
    current_attack = uc.current_attack + 20,
    current_defense = uc.current_defense + 20,
    current_speed = uc.current_speed + 20,
    current_special = uc.current_special + 20,
    current_max_health = uc.current_max_health + 20,
    max_energy = uc.max_energy + 20,
    max_mana = uc.max_mana + 25,
    current_training = uc.current_training - 30,
    current_mental_health = uc.current_mental_health - 25,
    current_team_player = uc.current_team_player - 25,
    current_ego = uc.current_ego + 50,
    current_communication = uc.current_communication - 10
FROM characters c
WHERE c.name = 'Quetzalcoatl' AND uc.character_id = c.id;

-- RAMSES II (270 points, net +10)
UPDATE user_characters uc
SET
    current_attack = uc.current_attack - 15,
    current_defense = uc.current_defense - 15,
    current_speed = uc.current_speed - 20,
    current_special = uc.current_special + 20,
    current_max_health = uc.current_max_health + 40,
    max_energy = uc.max_energy - 20,
    max_mana = uc.max_mana + 50,
    current_training = uc.current_training + 30,
    current_mental_health = uc.current_mental_health - 20,
    current_team_player = uc.current_team_player - 10,
    current_ego = uc.current_ego + 30,
    current_communication = uc.current_communication + 0
FROM characters c
WHERE c.name = 'Ramses II' AND uc.character_id = c.id;

-- RILAK TRELKAR (250 points, net +10)
UPDATE user_characters uc
SET
    current_attack = uc.current_attack - 25,
    current_defense = uc.current_defense - 25,
    current_speed = uc.current_speed + 5,
    current_special = uc.current_special + 15,
    current_max_health = uc.current_max_health + 15,
    max_energy = uc.max_energy + 25,
    max_mana = uc.max_mana + 30,
    current_training = uc.current_training + 30,
    current_mental_health = uc.current_mental_health + 10,
    current_team_player = uc.current_team_player - 30,
    current_ego = uc.current_ego + 30,
    current_communication = uc.current_communication - 10
FROM characters c
WHERE c.name = 'Rilak Trelkar' AND uc.character_id = c.id;

-- ROBIN HOOD (250 points, net 0)
UPDATE user_characters uc
SET
    current_attack = uc.current_attack + 25,
    current_defense = uc.current_defense + 5,
    current_speed = uc.current_speed + 25,
    current_special = uc.current_special + 25,
    current_max_health = uc.current_max_health + 10,
    max_energy = uc.max_energy + 25,
    max_mana = uc.max_mana - 25,
    current_training = uc.current_training + 10,
    current_mental_health = uc.current_mental_health - 35,
    current_team_player = uc.current_team_player - 25,
    current_ego = uc.current_ego + 40,
    current_communication = uc.current_communication + 0
FROM characters c
WHERE c.name = 'Robin Hood' AND uc.character_id = c.id;

-- SAM SPADE (245 points, net -5)
UPDATE user_characters uc
SET
    current_attack = uc.current_attack + 10,
    current_defense = uc.current_defense + 10,
    current_speed = uc.current_speed + 10,
    current_special = uc.current_special + 30,
    current_max_health = uc.current_max_health + 20,
    max_energy = uc.max_energy + 20,
    max_mana = uc.max_mana - 30,
    current_training = uc.current_training + 20,
    current_mental_health = uc.current_mental_health - 30,
    current_team_player = uc.current_team_player - 30,
    current_ego = uc.current_ego + 35,
    current_communication = uc.current_communication + 0
FROM characters c
WHERE c.name = 'Sam Spade' AND uc.character_id = c.id;

-- SHAKA ZULU (255 points, net -5)
UPDATE user_characters uc
SET
    current_attack = uc.current_attack + 20,
    current_defense = uc.current_defense + 15,
    current_speed = uc.current_speed + 20,
    current_special = uc.current_special + 20,
    current_max_health = uc.current_max_health + 15,
    max_energy = uc.max_energy + 25,
    max_mana = uc.max_mana - 40,
    current_training = uc.current_training + 10,
    current_mental_health = uc.current_mental_health - 40,
    current_team_player = uc.current_team_player - 20,
    current_ego = uc.current_ego + 30,
    current_communication = uc.current_communication + 0
FROM characters c
WHERE c.name = 'Shaka Zulu' AND uc.character_id = c.id;

-- SHERLOCK HOLMES (260 points, net 0)
UPDATE user_characters uc
SET
    current_attack = uc.current_attack + 10,
    current_defense = uc.current_defense + 5,
    current_speed = uc.current_speed + 5,
    current_special = uc.current_special + 30,
    current_max_health = uc.current_max_health + 10,
    max_energy = uc.max_energy + 30,
    max_mana = uc.max_mana - 40,
    current_training = uc.current_training + 30,
    current_mental_health = uc.current_mental_health + 10,
    current_team_player = uc.current_team_player - 30,
    current_ego = uc.current_ego + 50,
    current_communication = uc.current_communication - 10
FROM characters c
WHERE c.name = 'Sherlock Holmes' AND uc.character_id = c.id;

-- SPACE CYBORG (220 points, net 0)
UPDATE user_characters uc
SET
    current_attack = uc.current_attack + 20,
    current_defense = uc.current_defense + 20,
    current_speed = uc.current_speed - 5,
    current_special = uc.current_special + 20,
    current_max_health = uc.current_max_health + 20,
    max_energy = uc.max_energy + 20,
    max_mana = uc.max_mana - 20,
    current_training = uc.current_training + 10,
    current_mental_health = uc.current_mental_health - 35,
    current_team_player = uc.current_team_player - 20,
    current_ego = uc.current_ego + 20,
    current_communication = uc.current_communication - 10
FROM characters c
WHERE c.name = 'Space Cyborg' AND uc.character_id = c.id;

-- SUN WUKONG (285 points, net +5)
UPDATE user_characters uc
SET
    current_attack = uc.current_attack + 15,
    current_defense = uc.current_defense + 5,
    current_speed = uc.current_speed + 25,
    current_special = uc.current_special + 20,
    current_max_health = uc.current_max_health + 20,
    max_energy = uc.max_energy + 30,
    max_mana = uc.max_mana + 30,
    current_training = uc.current_training - 20,
    current_mental_health = uc.current_mental_health - 30,
    current_team_player = uc.current_team_player - 30,
    current_ego = uc.current_ego + 50,
    current_communication = uc.current_communication - 10
FROM characters c
WHERE c.name = 'Sun Wukong' AND uc.character_id = c.id;

-- UNICORN (245 points, net +5)
UPDATE user_characters uc
SET
    current_attack = uc.current_attack + 20,
    current_defense = uc.current_defense + 5,
    current_speed = uc.current_speed + 20,
    current_special = uc.current_special + 10,
    current_max_health = uc.current_max_health + 30,
    max_energy = uc.max_energy + 20,
    max_mana = uc.max_mana + 20,
    current_training = uc.current_training - 30,
    current_mental_health = uc.current_mental_health - 20,
    current_team_player = uc.current_team_player - 20,
    current_ego = uc.current_ego + 40,
    current_communication = uc.current_communication - 10
FROM characters c
WHERE c.name = 'Unicorn' AND uc.character_id = c.id;

-- VELOCIRAPTOR (235 points, net +5)
UPDATE user_characters uc
SET
    current_attack = uc.current_attack + 30,
    current_defense = uc.current_defense + 10,
    current_speed = uc.current_speed + 30,
    current_special = uc.current_special - 5,
    current_max_health = uc.current_max_health + 20,
    max_energy = uc.max_energy + 30,
    max_mana = uc.max_mana - 10,
    current_training = uc.current_training - 10,
    current_mental_health = uc.current_mental_health - 30,
    current_team_player = uc.current_team_player - 30,
    current_ego = uc.current_ego + 20,
    current_communication = uc.current_communication - 10
FROM characters c
WHERE c.name = 'Velociraptor' AND uc.character_id = c.id;

-- End of Migration 095
