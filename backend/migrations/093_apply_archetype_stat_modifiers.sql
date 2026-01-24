-- Migration 093: Apply Archetype Stat Modifiers
-- Tier 1 of 4-tier modifier system: Universal (50) → Archetype → Species → Individual
-- Each archetype has a point budget (Basic: 120, Advanced: 135, Elite: 150)
-- Must balance within ±10 points (positives vs negatives including high ego as negative)

-- BASIC TIER ARCHETYPES (120 points)

-- WARRIOR
UPDATE user_characters uc
SET
  current_attack = 50 + 10,
  current_defense = 50 + 10,
  current_speed = 50 + 5,
  current_special = 50 + 5,
  current_max_health = 50 + 10,
  max_energy = 100 + 10,
  max_mana = 100 - 20,
  current_training = 75 + 10,
  current_mental_health = 80 - 15,
  current_team_player = 70 - 5,
  current_ego = 60 + 10,  -- High ego (glory-seeker)
  current_communication = 80 - 10
FROM characters c
WHERE uc.character_id = c.id AND c.archetype = 'warrior';

-- BEAST
UPDATE user_characters uc
SET
  current_attack = 50 + 15,
  current_defense = 50 + 5,
  current_speed = 50 + 10,
  current_special = 50 + 5,
  current_max_health = 50 + 10,
  max_energy = 100 + 15,
  max_mana = 100 - 5,
  current_training = 75 - 15,
  current_mental_health = 80 - 10,
  current_team_player = 70 - 5,
  current_ego = 60 + 10,  -- High ego (self-centered)
  current_communication = 80 - 15
FROM characters c
WHERE uc.character_id = c.id AND c.archetype = 'beast';

-- TANK
UPDATE user_characters uc
SET
  current_attack = 50 + 10,
  current_defense = 50 + 20,
  current_speed = 50 - 25,
  current_special = 50 - 5,
  current_max_health = 50 + 15,
  max_energy = 100 + 5,
  max_mana = 100 - 15,
  current_training = 75 + 5,
  current_mental_health = 80 + 5,
  current_team_player = 70 + 5,
  current_ego = 60 + 0,  -- Neutral
  current_communication = 80 - 10
FROM characters c
WHERE uc.character_id = c.id AND c.archetype = 'tank';

-- ASSASSIN
UPDATE user_characters uc
SET
  current_attack = 50 + 10,
  current_defense = 50 - 10,
  current_speed = 50 + 20,
  current_special = 50 + 10,
  current_max_health = 50 + 5,
  max_energy = 100 + 10,
  max_mana = 100 + 0,
  current_training = 75 + 5,
  current_mental_health = 80 - 10,
  current_team_player = 70 - 20,
  current_ego = 60 + 10,  -- High ego (arrogant)
  current_communication = 80 - 10
FROM characters c
WHERE uc.character_id = c.id AND c.archetype = 'assassin';

-- ADVANCED TIER ARCHETYPES (135 points)

-- MAGE
UPDATE user_characters uc
SET
  current_attack = 50 - 10,
  current_defense = 50 - 15,
  current_speed = 50 - 5,
  current_special = 50 - 10,
  current_max_health = 50 - 20,
  max_energy = 100 - 5,
  max_mana = 100 + 40,
  current_training = 75 + 15,
  current_mental_health = 80 + 10,
  current_team_player = 70 + 0,
  current_ego = 60 + 0,
  current_communication = 80 + 5
FROM characters c
WHERE uc.character_id = c.id AND c.archetype = 'mage';

-- SCHOLAR
UPDATE user_characters uc
SET
  current_attack = 50 - 15,
  current_defense = 50 - 10,
  current_speed = 50 - 10,
  current_special = 50 - 10,
  current_max_health = 50 - 10,
  max_energy = 100 - 10,
  max_mana = 100 + 20,
  current_training = 75 + 20,
  current_mental_health = 80 + 5,
  current_team_player = 70 + 5,
  current_ego = 60 - 10,  -- Low ego (humble)
  current_communication = 80 + 10
FROM characters c
WHERE uc.character_id = c.id AND c.archetype = 'scholar';

-- TRICKSTER
UPDATE user_characters uc
SET
  current_attack = 50 + 5,
  current_defense = 50 + 5,
  current_speed = 50 + 15,
  current_special = 50 + 5,
  current_max_health = 50 + 5,
  max_energy = 100 + 5,
  max_mana = 100 + 20,
  current_training = 75 + 0,
  current_mental_health = 80 - 20,
  current_team_player = 70 - 25,
  current_ego = 60 + 20,  -- Very high ego
  current_communication = 80 + 10
FROM characters c
WHERE uc.character_id = c.id AND c.archetype = 'trickster';

-- DETECTIVE
UPDATE user_characters uc
SET
  current_attack = 50 + 5,
  current_defense = 50 + 5,
  current_speed = 50 + 10,
  current_special = 50 + 10,
  current_max_health = 50 + 5,
  max_energy = 100 + 10,
  max_mana = 100 - 10,
  current_training = 75 + 10,
  current_mental_health = 80 - 15,
  current_team_player = 70 - 15,
  current_ego = 60 + 30,  -- Very high ego (arrogant genius)
  current_communication = 80 + 10
FROM characters c
WHERE uc.character_id = c.id AND c.archetype = 'detective';

-- ELITE TIER ARCHETYPES (150 points)

-- LEADER
UPDATE user_characters uc
SET
  current_attack = 50 - 5,
  current_defense = 50 - 15,
  current_speed = 50 - 5,
  current_special = 50 + 0,
  current_max_health = 50 - 15,
  max_energy = 100 + 15,
  max_mana = 100 + 15,
  current_training = 75 + 10,
  current_mental_health = 80 + 10,
  current_team_player = 70 + 10,
  current_ego = 60 + 30,  -- High ego (destined leader)
  current_communication = 80 + 20
FROM characters c
WHERE uc.character_id = c.id AND c.archetype = 'leader';

-- BEASTMASTER
UPDATE user_characters uc
SET
  current_attack = 50 - 15,
  current_defense = 50 - 15,
  current_speed = 50 - 10,
  current_special = 50 - 10,
  current_max_health = 50 - 10,
  max_energy = 100 - 15,
  max_mana = 100 + 35,
  current_training = 75 + 10,
  current_mental_health = 80 + 10,
  current_team_player = 70 + 5,
  current_ego = 60 + 0,
  current_communication = 80 + 15
FROM characters c
WHERE uc.character_id = c.id AND c.archetype = 'beastmaster';

-- MAGICAL_APPLIANCE
UPDATE user_characters uc
SET
  current_attack = 50 - 10,
  current_defense = 50 - 10,
  current_speed = 50 + 0,
  current_special = 50 - 10,
  current_max_health = 50 - 10,
  max_energy = 100 + 20,
  max_mana = 100 + 30,
  current_training = 75 - 10,
  current_mental_health = 80 + 10,
  current_team_player = 70 + 20,
  current_ego = 60 + 0,
  current_communication = 80 - 20
FROM characters c
WHERE uc.character_id = c.id AND c.archetype = 'magical_appliance';

-- MYSTIC
UPDATE user_characters uc
SET
  current_attack = 50 - 15,
  current_defense = 50 - 15,
  current_speed = 50 - 10,
  current_special = 50 - 10,
  current_max_health = 50 + 10,
  max_energy = 100 + 20,
  max_mana = 100 + 20,
  current_training = 75 + 10,
  current_mental_health = 80 + 20,
  current_team_player = 70 - 10,
  current_ego = 60 + 0,
  current_communication = 80 - 10
FROM characters c
WHERE uc.character_id = c.id AND c.archetype = 'mystic';

-- SYSTEM archetype gets no modifiers (therapists, NPCs, non-combatants)
-- Their stats remain at universal base values

COMMENT ON TABLE user_characters IS 'Stats now include Tier 1 (Archetype) modifiers. Base: 50 for combat stats, 75 training, 80 mental_health, 70 team_player, 60 ego, 80 communication, 100 energy/mana.';
