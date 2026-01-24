-- Migration 094: Apply Species Stat Modifiers
-- Tier 2 of 4-tier modifier system: Universal (50) → Archetype → Species → Individual
-- Species modifiers ADD to existing archetype-modified stats
-- Species budgets: Common 130, Basic 145, Advanced 160, Elite 175, Legendary 200

-- COMMON TIER SPECIES (130 points)

-- HUMAN
UPDATE user_characters uc
SET
  current_attack = uc.current_attack + 10,
  current_defense = uc.current_defense + 5,
  current_speed = uc.current_speed + 10,
  current_special = uc.current_special + 10,
  current_max_health = uc.current_max_health + 5,
  max_energy = uc.max_energy + 10,
  max_mana = uc.max_mana - 30,
  current_training = uc.current_training + 10,
  current_mental_health = uc.current_mental_health - 10,
  current_team_player = uc.current_team_player + 5,
  current_ego = uc.current_ego + 20,
  current_communication = uc.current_communication + 5
FROM characters c
WHERE uc.character_id = c.id AND c.species = 'human';

-- KANGAROO
UPDATE user_characters uc
SET
  current_attack = uc.current_attack + 15,
  current_defense = uc.current_defense - 5,
  current_speed = uc.current_speed + 20,
  current_special = uc.current_special + 10,
  current_max_health = uc.current_max_health + 10,
  max_energy = uc.max_energy + 15,
  max_mana = uc.max_mana - 5,
  current_training = uc.current_training - 20,
  current_mental_health = uc.current_mental_health - 5,
  current_team_player = uc.current_team_player - 10,
  current_ego = uc.current_ego + 5,
  current_communication = uc.current_communication - 10
FROM characters c
WHERE uc.character_id = c.id AND c.species = 'kangaroo';

-- DIRE_WOLF
UPDATE user_characters uc
SET
  current_attack = uc.current_attack + 15,
  current_defense = uc.current_defense + 5,
  current_speed = uc.current_speed + 10,
  current_special = uc.current_special + 10,
  current_max_health = uc.current_max_health + 10,
  max_energy = uc.max_energy + 15,
  max_mana = uc.max_mana - 5,
  current_training = uc.current_training - 20,
  current_mental_health = uc.current_mental_health - 5,
  current_team_player = uc.current_team_player - 10,
  current_ego = uc.current_ego + 15,
  current_communication = uc.current_communication - 10
FROM characters c
WHERE uc.character_id = c.id AND c.species = 'dire_wolf';

-- UNDEAD
UPDATE user_characters uc
SET
  current_attack = uc.current_attack + 15,
  current_defense = uc.current_defense - 10,
  current_speed = uc.current_speed - 10,
  current_special = uc.current_special + 15,
  current_max_health = uc.current_max_health - 10,
  max_energy = uc.max_energy + 15,
  max_mana = uc.max_mana + 15,
  current_training = uc.current_training - 10,
  current_mental_health = uc.current_mental_health - 10,
  current_team_player = uc.current_team_player - 10,
  current_ego = uc.current_ego + 0,
  current_communication = uc.current_communication - 10
FROM characters c
WHERE uc.character_id = c.id AND c.species = 'undead';

-- BASIC TIER SPECIES (145 points)

-- ROBOT
UPDATE user_characters uc
SET
  current_attack = uc.current_attack + 10,
  current_defense = uc.current_defense + 10,
  current_speed = uc.current_speed - 20,
  current_special = uc.current_special + 10,
  current_max_health = uc.current_max_health + 10,
  max_energy = uc.max_energy + 15,
  max_mana = uc.max_mana - 25,
  current_training = uc.current_training + 10,
  current_mental_health = uc.current_mental_health - 15,
  current_team_player = uc.current_team_player - 10,
  current_ego = uc.current_ego + 0,
  current_communication = uc.current_communication + 10
FROM characters c
WHERE uc.character_id = c.id AND c.species = 'robot';

-- CYBORG
UPDATE user_characters uc
SET
  current_attack = uc.current_attack + 10,
  current_defense = uc.current_defense + 10,
  current_speed = uc.current_speed + 10,
  current_special = uc.current_special + 10,
  current_max_health = uc.current_max_health + 10,
  max_energy = uc.max_energy + 10,
  max_mana = uc.max_mana - 20,
  current_training = uc.current_training + 10,
  current_mental_health = uc.current_mental_health - 20,
  current_team_player = uc.current_team_player - 15,
  current_ego = uc.current_ego + 15,
  current_communication = uc.current_communication + 5
FROM characters c
WHERE uc.character_id = c.id AND c.species = 'cyborg';

-- GOLEM
UPDATE user_characters uc
SET
  current_attack = uc.current_attack + 10,
  current_defense = uc.current_defense + 10,
  current_speed = uc.current_speed - 20,
  current_special = uc.current_special - 10,
  current_max_health = uc.current_max_health + 10,
  max_energy = uc.max_energy + 10,
  max_mana = uc.max_mana + 25,
  current_training = uc.current_training + 10,
  current_mental_health = uc.current_mental_health - 20,
  current_team_player = uc.current_team_player - 10,
  current_ego = uc.current_ego + 0,
  current_communication = uc.current_communication - 10
FROM characters c
WHERE uc.character_id = c.id AND c.species = 'golem';

-- DINOSAUR
UPDATE user_characters uc
SET
  current_attack = uc.current_attack + 20,
  current_defense = uc.current_defense + 10,
  current_speed = uc.current_speed + 15,
  current_special = uc.current_special + 10,
  current_max_health = uc.current_max_health + 10,
  max_energy = uc.max_energy + 10,
  max_mana = uc.max_mana - 10,
  current_training = uc.current_training - 10,
  current_mental_health = uc.current_mental_health - 20,
  current_team_player = uc.current_team_player - 10,
  current_ego = uc.current_ego + 10,
  current_communication = uc.current_communication - 10
FROM characters c
WHERE uc.character_id = c.id AND c.species = 'dinosaur';

-- ADVANCED TIER SPECIES (160 points)

-- HUMAN_MAGICAL  
UPDATE user_characters uc
SET
  current_attack = uc.current_attack - 10,
  current_defense = uc.current_defense - 20,
  current_speed = uc.current_speed - 10,
  current_special = uc.current_special - 5,
  current_max_health = uc.current_max_health - 20,
  max_energy = uc.max_energy - 5,
  max_mana = uc.max_mana + 40,
  current_training = uc.current_training + 20,
  current_mental_health = uc.current_mental_health + 5,
  current_team_player = uc.current_team_player + 5,
  current_ego = uc.current_ego + 10,
  current_communication = uc.current_communication + 10
FROM characters c
WHERE uc.character_id = c.id AND c.species = 'human_magical';

-- VAMPIRE
UPDATE user_characters uc
SET
  current_attack = uc.current_attack + 20,
  current_defense = uc.current_defense + 0,
  current_speed = uc.current_speed + 15,
  current_special = uc.current_special + 10,
  current_max_health = uc.current_max_health + 10,
  max_energy = uc.max_energy - 20,
  max_mana = uc.max_mana + 20,
  current_training = uc.current_training + 5,
  current_mental_health = uc.current_mental_health - 15,
  current_team_player = uc.current_team_player - 20,
  current_ego = uc.current_ego + 20,
  current_communication = uc.current_communication + 5
FROM characters c
WHERE uc.character_id = c.id AND c.species = 'vampire';

-- UNICORN
UPDATE user_characters uc
SET
  current_attack = uc.current_attack + 20,
  current_defense = uc.current_defense + 5,
  current_speed = uc.current_speed + 10,
  current_special = uc.current_special + 5,
  current_max_health = uc.current_max_health + 10,
  max_energy = uc.max_energy + 10,
  max_mana = uc.max_mana + 20,
  current_training = uc.current_training - 20,
  current_mental_health = uc.current_mental_health + 0,
  current_team_player = uc.current_team_player - 10,
  current_ego = uc.current_ego + 40,
  current_communication = uc.current_communication - 10
FROM characters c
WHERE uc.character_id = c.id AND c.species = 'unicorn';

-- ZETA_RETICULAN_GREY
UPDATE user_characters uc
SET
  current_attack = uc.current_attack + 15,
  current_defense = uc.current_defense - 20,
  current_speed = uc.current_speed + 0,
  current_special = uc.current_special - 10,
  current_max_health = uc.current_max_health + 15,
  max_energy = uc.max_energy + 15,
  max_mana = uc.max_mana + 15,
  current_training = uc.current_training + 10,
  current_mental_health = uc.current_mental_health + 10,
  current_team_player = uc.current_team_player - 20,
  current_ego = uc.current_ego + 20,
  current_communication = uc.current_communication - 10
FROM characters c
WHERE uc.character_id = c.id AND c.species = 'zeta_reticulan_grey';

-- ELITE TIER SPECIES (175 points)

-- ANGEL
UPDATE user_characters uc
SET
  current_attack = uc.current_attack + 20,
  current_defense = uc.current_defense + 10,
  current_speed = uc.current_speed + 10,
  current_special = uc.current_special + 5,
  current_max_health = uc.current_max_health + 10,
  max_energy = uc.max_energy + 15,
  max_mana = uc.max_mana + 15,
  current_training = uc.current_training + 5,
  current_mental_health = uc.current_mental_health + 5,
  current_team_player = uc.current_team_player - 20,
  current_ego = uc.current_ego + 60,
  current_communication = uc.current_communication + 0
FROM characters c
WHERE uc.character_id = c.id AND c.species = 'angel';

-- MAGICAL_TOASTER
UPDATE user_characters uc
SET
  current_attack = uc.current_attack - 10,
  current_defense = uc.current_defense - 20,
  current_speed = uc.current_speed - 10,
  current_special = uc.current_special - 10,
  current_max_health = uc.current_max_health + 30,
  max_energy = uc.max_energy + 20,
  max_mana = uc.max_mana + 45,
  current_training = uc.current_training - 20,
  current_mental_health = uc.current_mental_health + 0,
  current_team_player = uc.current_team_player + 0,
  current_ego = uc.current_ego + 0,
  current_communication = uc.current_communication - 10
FROM characters c
WHERE uc.character_id = c.id AND c.species = 'magical_toaster';

-- LEGENDARY TIER SPECIES (200 points)

-- DEITY
UPDATE user_characters uc
SET
  current_attack = uc.current_attack + 30,
  current_defense = uc.current_defense + 20,
  current_speed = uc.current_speed + 15,
  current_special = uc.current_special + 10,
  current_max_health = uc.current_max_health + 10,
  max_energy = uc.max_energy + 10,
  max_mana = uc.max_mana + 35,
  current_training = uc.current_training + 0,
  current_mental_health = uc.current_mental_health - 10,
  current_team_player = uc.current_team_player - 10,
  current_ego = uc.current_ego + 50,
  current_communication = uc.current_communication + 10
FROM characters c
WHERE uc.character_id = c.id AND c.species = 'deity';

COMMENT ON TABLE user_characters IS 'Stats now include Tier 1 (Archetype) and Tier 2 (Species) modifiers stacked together.';
