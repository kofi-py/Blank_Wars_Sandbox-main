-- Migration 099: Apply Archetype Stat Modifiers to Characters Table
-- Tier 2 of 4-tier modifier system: Universal (50) → Archetype → Species → Individual
-- Each archetype has a point budget (Basic: 120, Advanced: 135, Elite: 150)
-- Must balance within ±15 points (positives vs negatives including high ego as negative)

-- BASIC TIER ARCHETYPES (120 points)

-- WARRIOR (NET +10)
UPDATE characters
SET
  attack = 50 + 10,
  defense = 50 + 8,
  speed = 50 + 5,
  strength = 50 + 10,
  dexterity = 50 + 5,
  endurance = 50 + 8,
  magic_attack = 50 - 5,
  magic_defense = 50 - 5,
  intelligence = 50 - 10,
  wisdom = 50 - 5,
  spirit = 50 + 4,
  charisma = 50 + 5,
  max_health = 50 + 10,
  max_energy = 50 + 10,
  max_mana = 50 - 20,
  training = 50 + 10,
  mental_health = 50 - 15,
  team_player = 50 + 0,
  ego = 50 + 10,
  communication = 50 - 5
WHERE archetype = 'warrior';

-- BEAST (NET +9)
UPDATE characters
SET
  attack = 50 + 15,
  defense = 50 + 5,
  speed = 50 + 10,
  strength = 50 + 15,
  dexterity = 50 + 12,
  endurance = 50 + 12,
  magic_attack = 50 - 8,
  magic_defense = 50 - 3,
  intelligence = 50 - 12,
  wisdom = 50 - 8,
  spirit = 50 + 6,
  charisma = 50 - 10,
  max_health = 50 + 20,
  max_energy = 50 + 15,
  max_mana = 50 - 5,
  training = 50 - 15,
  mental_health = 50 - 10,
  team_player = 50 - 5,
  ego = 50 + 10,
  communication = 50 - 15
WHERE archetype = 'beast';

-- TANK (NET +5)
UPDATE characters
SET
  attack = 50 + 5,
  defense = 50 + 20,
  speed = 50 - 25,
  strength = 50 + 10,
  dexterity = 50 - 20,
  endurance = 50 + 15,
  magic_attack = 50 - 15,
  magic_defense = 50 + 0,
  intelligence = 50 + 0,
  wisdom = 50 + 5,
  spirit = 50 + 5,
  charisma = 50 + 0,
  max_health = 50 + 15,
  max_energy = 50 + 0,
  max_mana = 50 - 10,
  training = 50 + 5,
  mental_health = 50 + 5,
  team_player = 50 + 5,
  ego = 50 + 5,
  communication = 50 - 10
WHERE archetype = 'tank';

-- ASSASSIN (NET +10)
UPDATE characters
SET
  attack = 50 + 23,
  defense = 50 - 15,
  speed = 50 + 20,
  strength = 50 + 5,
  dexterity = 50 + 18,
  endurance = 50 - 5,
  magic_attack = 50 + 8,
  magic_defense = 50 + 5,
  intelligence = 50 + 8,
  wisdom = 50 + 0,
  spirit = 50 + 5,
  charisma = 50 - 10,
  max_health = 50 + 0,
  max_energy = 50 + 10,
  max_mana = 50 + 0,
  training = 50 + 5,
  mental_health = 50 - 20,
  team_player = 50 - 27,
  ego = 50 + 10,
  communication = 50 - 10
WHERE archetype = 'assassin';

-- ADVANCED TIER ARCHETYPES (135 points)

-- MAGE (NET +5)
UPDATE characters
SET
  attack = 50 - 15,
  defense = 50 - 15,
  speed = 50 - 8,
  strength = 50 - 15,
  dexterity = 50 - 15,
  endurance = 50 - 15,
  magic_attack = 50 + 20,
  magic_defense = 50 + 15,
  intelligence = 50 + 20,
  wisdom = 50 + 10,
  spirit = 50 + 8,
  charisma = 50 - 10,
  max_health = 50 - 20,
  max_energy = 50 - 10,
  max_mana = 50 + 40,
  training = 50 + 10,
  mental_health = 50 + 5,
  team_player = 50 + 0,
  ego = 50 + 0,
  communication = 50 + 0
WHERE archetype = 'mage';

-- SCHOLAR (NET +12)
UPDATE characters
SET
  attack = 50 - 15,
  defense = 50 - 10,
  speed = 50 - 10,
  strength = 50 - 15,
  dexterity = 50 - 10,
  endurance = 50 - 12,
  magic_attack = 50 + 8,
  magic_defense = 50 + 3,
  intelligence = 50 + 25,
  wisdom = 50 + 20,
  spirit = 50 + 8,
  charisma = 50 - 5,
  max_health = 50 - 10,
  max_energy = 50 - 15,
  max_mana = 50 + 20,
  training = 50 + 20,
  mental_health = 50 + 5,
  team_player = 50 + 5,
  ego = 50 + 10,
  communication = 50 + 10
WHERE archetype = 'scholar';

-- TRICKSTER (NET +11)
UPDATE characters
SET
  attack = 50 - 5,
  defense = 50 - 5,
  speed = 50 + 15,
  strength = 50 - 5,
  dexterity = 50 + 15,
  endurance = 50 - 3,
  magic_attack = 50 + 20,
  magic_defense = 50 + 8,
  intelligence = 50 + 15,
  wisdom = 50 + 8,
  spirit = 50 - 10,
  charisma = 50 + 15,
  max_health = 50 + 0,
  max_energy = 50 + 10,
  max_mana = 50 + 20,
  training = 50 + 0,
  mental_health = 50 - 32,
  team_player = 50 - 35,
  ego = 50 + 30,
  communication = 50 + 10
WHERE archetype = 'trickster';

-- DETECTIVE (NET +10)
UPDATE characters
SET
  attack = 50 + 5,
  defense = 50 + 5,
  speed = 50 + 10,
  strength = 50 + 6,
  dexterity = 50 + 10,
  endurance = 50 + 8,
  magic_attack = 50 - 15,
  magic_defense = 50 + 8,
  intelligence = 50 + 20,
  wisdom = 50 + 10,
  spirit = 50 + 5,
  charisma = 50 + 8,
  max_health = 50 + 5,
  max_energy = 50 + 10,
  max_mana = 50 - 15,
  training = 50 + 10,
  mental_health = 50 - 30,
  team_player = 50 - 30,
  ego = 50 + 30,
  communication = 50 + 10
WHERE archetype = 'detective';

-- ELITE TIER ARCHETYPES (150 points)

-- LEADER (NET +10)
UPDATE characters
SET
  attack = 50 + 5,
  defense = 50 + 0,
  speed = 50 + 5,
  strength = 50 + 5,
  dexterity = 50 + 0,
  endurance = 50 + 5,
  magic_attack = 50 + 0,
  magic_defense = 50 - 10,
  intelligence = 50 + 5,
  wisdom = 50 + 5,
  spirit = 50 + 5,
  charisma = 50 + 5,
  max_health = 50 - 10,
  max_energy = 50 + 5,
  max_mana = 50 + 0,
  training = 50 + 5,
  mental_health = 50 + 5,
  team_player = 50 + 5,
  ego = 50 + 35,
  communication = 50 + 5
WHERE archetype = 'leader';

-- BEASTMASTER (NET +13)
UPDATE characters
SET
  attack = 50 - 15,
  defense = 50 - 15,
  speed = 50 - 10,
  strength = 50 - 15,
  dexterity = 50 - 5,
  endurance = 50 + 5,
  magic_attack = 50 + 20,
  magic_defense = 50 + 18,
  intelligence = 50 + 5,
  wisdom = 50 + 0,
  spirit = 50 + 10,
  charisma = 50 + 20,
  max_health = 50 - 10,
  max_energy = 50 - 15,
  max_mana = 50 + 35,
  training = 50 + 5,
  mental_health = 50 - 20,
  team_player = 50 + 5,
  ego = 50 + 20,
  communication = 50 + 15
WHERE archetype = 'beastmaster';

-- MAGICAL_APPLIANCE (NET +10)
UPDATE characters
SET
  attack = 50 - 20,
  defense = 50 - 20,
  speed = 50 + 0,
  strength = 50 - 20,
  dexterity = 50 - 10,
  endurance = 50 - 8,
  magic_attack = 50 + 28,
  magic_defense = 50 + 20,
  intelligence = 50 + 20,
  wisdom = 50 - 10,
  spirit = 50 + 10,
  charisma = 50 - 15,
  max_health = 50 - 10,
  max_energy = 50 + 20,
  max_mana = 50 + 30,
  training = 50 - 10,
  mental_health = 50 + 5,
  team_player = 50 + 10,
  ego = 50 + 0,
  communication = 50 - 10
WHERE archetype = 'magical_appliance';

-- MYSTIC (NET +9)
UPDATE characters
SET
  attack = 50 - 15,
  defense = 50 - 15,
  speed = 50 - 10,
  strength = 50 - 12,
  dexterity = 50 - 8,
  endurance = 50 + 15,
  magic_attack = 50 + 25,
  magic_defense = 50 + 22,
  intelligence = 50 + 10,
  wisdom = 50 + 10,
  spirit = 50 + 20,
  charisma = 50 - 8,
  max_health = 50 + 10,
  max_energy = 50 + 20,
  max_mana = 50 + 25,
  training = 50 + 10,
  mental_health = 50 - 20,
  team_player = 50 - 30,
  ego = 50 + 20,
  communication = 50 - 20
WHERE archetype = 'mystic';

-- SYSTEM archetype gets no modifiers (therapists, NPCs, non-combatants)

COMMENT ON TABLE characters IS 'Stats now include Tier 2 (Archetype) modifiers applied to canonical character templates with full 12-attribute system.';
