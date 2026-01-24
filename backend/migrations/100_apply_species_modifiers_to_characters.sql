-- Migration 099: Apply Species Stat Modifiers
-- Tier 3 of 4-tier modifier system: Universal (50) → Archetype → Species → Individual
-- Species modifiers ADD to existing archetype-modified stats
-- Species budgets: Common 130, Basic 145, Advanced 160, Elite 175, Legendary 200

-- COMMON TIER SPECIES (130 points)

-- HUMAN
UPDATE characters
SET
  attack = attack + 10,
  defense = defense + 5,
  speed = speed + 10,
  strength = strength + 8,
  dexterity = dexterity + 8,
  endurance = endurance + 8,
  magic_attack = magic_attack - 5,
  magic_defense = magic_defense - 5,
  intelligence = intelligence + 12,
  wisdom = wisdom + 8,
  spirit = spirit + 8,
  charisma = charisma + 12,
  max_health = max_health + 5,
  max_energy = max_energy + 10,
  max_mana = max_mana - 30,
  training = training + 10,
  mental_health = mental_health - 10,
  team_player = team_player + 5,
  ego = ego + 20,
  communication = communication + 5
WHERE species = 'human';

-- KANGAROO
UPDATE characters
SET
  attack = attack + 20,
  defense = defense + 5,
  speed = speed + 25,
  strength = strength + 25,
  dexterity = dexterity + 15,
  endurance = endurance + 20,
  magic_attack = magic_attack - 10,
  magic_defense = magic_defense - 8,
  intelligence = intelligence - 15,
  wisdom = wisdom + 5,
  spirit = spirit + 8,
  charisma = charisma - 10,
  max_health = max_health + 15,
  max_energy = max_energy + 20,
  max_mana = max_mana - 15,
  training = training - 25,
  mental_health = mental_health - 10,
  team_player = team_player - 15,
  ego = ego + 10,
  communication = communication - 15
WHERE species = 'kangaroo';

-- DIRE_WOLF
UPDATE characters
SET
  attack = attack + 15,
  defense = defense + 5,
  speed = speed + 15,
  strength = strength + 18,
  dexterity = dexterity + 15,
  endurance = endurance + 20,
  magic_attack = magic_attack - 10,
  magic_defense = magic_defense - 8,
  intelligence = intelligence - 15,
  wisdom = wisdom + 8,
  spirit = spirit + 12,
  charisma = charisma - 12,
  max_health = max_health + 15,
  max_energy = max_energy + 20,
  max_mana = max_mana - 15,
  training = training - 25,
  mental_health = mental_health - 10,
  team_player = team_player - 10,
  ego = ego + 15,
  communication = communication - 15
WHERE species = 'dire_wolf';

-- UNDEAD
UPDATE characters
SET
  attack = attack + 15,
  defense = defense - 5,
  speed = speed - 15,
  strength = strength + 12,
  dexterity = dexterity - 15,
  endurance = endurance + 15,
  magic_attack = magic_attack + 15,
  magic_defense = magic_defense - 15,
  intelligence = intelligence - 20,
  wisdom = wisdom - 18,
  spirit = spirit - 20,
  charisma = charisma - 25,
  max_health = max_health - 10,
  max_energy = max_energy + 20,
  max_mana = max_mana + 20,
  training = training - 15,
  mental_health = mental_health - 15,
  team_player = team_player + 15,
  ego = ego + 0,
  communication = communication - 20
WHERE species = 'undead';

-- BASIC TIER SPECIES (145 points)

-- ROBOT
UPDATE characters
SET
  attack = attack + 10,
  defense = defense + 10,
  speed = speed - 20,
  strength = strength + 15,
  dexterity = dexterity - 10,
  endurance = endurance + 20,
  magic_attack = magic_attack - 15,
  magic_defense = magic_defense - 10,
  intelligence = intelligence + 25,
  wisdom = wisdom - 8,
  spirit = spirit - 12,
  charisma = charisma - 10,
  max_health = max_health + 10,
  max_energy = max_energy + 15,
  max_mana = max_mana - 25,
  training = training + 10,
  mental_health = mental_health - 15,
  team_player = team_player - 10,
  ego = ego + 0,
  communication = communication + 10
WHERE species = 'robot';

-- CYBORG
UPDATE characters
SET
  attack = attack + 12,
  defense = defense + 12,
  speed = speed + 8,
  strength = strength + 15,
  dexterity = dexterity + 10,
  endurance = endurance + 18,
  magic_attack = magic_attack - 8,
  magic_defense = magic_defense - 10,
  intelligence = intelligence + 15,
  wisdom = wisdom + 5,
  spirit = spirit - 12,
  charisma = charisma - 10,
  max_health = max_health + 15,
  max_energy = max_energy + 15,
  max_mana = max_mana - 25,
  training = training + 10,
  mental_health = mental_health - 20,
  team_player = team_player - 15,
  ego = ego + 15,
  communication = communication + 0
WHERE species = 'cyborg';

-- GOLEM
UPDATE characters
SET
  attack = attack + 12,
  defense = defense + 25,
  speed = speed - 25,
  strength = strength + 25,
  dexterity = dexterity - 15,
  endurance = endurance + 35,
  magic_attack = magic_attack + 8,
  magic_defense = magic_defense + 8,
  intelligence = intelligence - 18,
  wisdom = wisdom - 12,
  spirit = spirit + 12,
  charisma = charisma - 20,
  max_health = max_health + 20,
  max_energy = max_energy + 5,
  max_mana = max_mana + 30,
  training = training - 15,
  mental_health = mental_health - 25,
  team_player = team_player - 15,
  ego = ego + 0,
  communication = communication - 25
WHERE species = 'golem';

-- DINOSAUR
UPDATE characters
SET
  attack = attack + 25,
  defense = defense + 15,
  speed = speed + 15,
  strength = strength + 30,
  dexterity = dexterity + 8,
  endurance = endurance + 25,
  magic_attack = magic_attack - 12,
  magic_defense = magic_defense - 10,
  intelligence = intelligence - 18,
  wisdom = wisdom - 15,
  spirit = spirit + 10,
  charisma = charisma - 15,
  max_health = max_health + 25,
  max_energy = max_energy + 15,
  max_mana = max_mana - 20,
  training = training - 20,
  mental_health = mental_health - 25,
  team_player = team_player - 15,
  ego = ego + 15,
  communication = communication - 15
WHERE species = 'dinosaur';

-- ADVANCED TIER SPECIES (160 points)

-- HUMAN_MAGICAL
UPDATE characters
SET
  attack = attack - 10,
  defense = defense - 20,
  speed = speed - 10,
  strength = strength - 12,
  dexterity = dexterity - 8,
  endurance = endurance - 10,
  magic_attack = magic_attack + 25,
  magic_defense = magic_defense + 20,
  intelligence = intelligence + 18,
  wisdom = wisdom + 15,
  spirit = spirit + 15,
  charisma = charisma + 8,
  max_health = max_health - 20,
  max_energy = max_energy - 5,
  max_mana = max_mana + 40,
  training = training + 20,
  mental_health = mental_health + 5,
  team_player = team_player + 5,
  ego = ego + 10,
  communication = communication + 10
WHERE species = 'human_magical';

-- VAMPIRE
UPDATE characters
SET
  attack = attack + 20,
  defense = defense + 5,
  speed = speed + 20,
  strength = strength + 18,
  dexterity = dexterity + 18,
  endurance = endurance + 20,
  magic_attack = magic_attack + 15,
  magic_defense = magic_defense + 15,
  intelligence = intelligence + 18,
  wisdom = wisdom + 15,
  spirit = spirit - 15,
  charisma = charisma + 25,
  max_health = max_health + 10,
  max_energy = max_energy - 25,
  max_mana = max_mana + 25,
  training = training + 5,
  mental_health = mental_health - 25,
  team_player = team_player - 30,
  ego = ego + 25,
  communication = communication + 10
WHERE species = 'vampire';

-- UNICORN
UPDATE characters
SET
  attack = attack + 15,
  defense = defense + 10,
  speed = speed + 20,
  strength = strength + 12,
  dexterity = dexterity + 18,
  endurance = endurance + 15,
  magic_attack = magic_attack + 25,
  magic_defense = magic_defense + 25,
  intelligence = intelligence + 18,
  wisdom = wisdom + 22,
  spirit = spirit + 30,
  charisma = charisma + 25,
  max_health = max_health + 15,
  max_energy = max_energy + 15,
  max_mana = max_mana + 35,
  training = training - 25,
  mental_health = mental_health + 10,
  team_player = team_player - 20,
  ego = ego + 50,
  communication = communication - 15
WHERE species = 'unicorn';

-- ZETA_RETICULAN_GREY
UPDATE characters
SET
  attack = attack + 15,
  defense = defense - 20,
  speed = speed + 0,
  strength = strength - 15,
  dexterity = dexterity - 10,
  endurance = endurance - 12,
  magic_attack = magic_attack + 20,
  magic_defense = magic_defense + 18,
  intelligence = intelligence + 25,
  wisdom = wisdom + 20,
  spirit = spirit + 15,
  charisma = charisma - 15,
  max_health = max_health + 15,
  max_energy = max_energy + 15,
  max_mana = max_mana + 15,
  training = training + 10,
  mental_health = mental_health + 10,
  team_player = team_player - 20,
  ego = ego + 20,
  communication = communication - 10
WHERE species = 'zeta_reticulan_grey';

-- ELITE TIER SPECIES (175 points)

-- ANGEL
UPDATE characters
SET
  attack = attack + 20,
  defense = defense + 15,
  speed = speed + 15,
  strength = strength + 18,
  dexterity = dexterity + 20,
  endurance = endurance + 18,
  magic_attack = magic_attack + 30,
  magic_defense = magic_defense + 30,
  intelligence = intelligence + 25,
  wisdom = wisdom + 28,
  spirit = spirit + 35,
  charisma = charisma + 28,
  max_health = max_health + 15,
  max_energy = max_energy + 20,
  max_mana = max_mana + 30,
  training = training + 5,
  mental_health = mental_health + 15,
  team_player = team_player - 30,
  ego = ego + 80,
  communication = communication + 5
WHERE species = 'angel';

-- MAGICAL_TOASTER
UPDATE characters
SET
  attack = attack - 15,
  defense = defense - 10,
  speed = speed - 20,
  strength = strength - 20,
  dexterity = dexterity - 20,
  endurance = endurance - 10,
  magic_attack = magic_attack + 20,
  magic_defense = magic_defense + 18,
  intelligence = intelligence + 15,
  wisdom = wisdom + 5,
  spirit = spirit + 8,
  charisma = charisma - 18,
  max_health = max_health + 25,
  max_energy = max_energy + 25,
  max_mana = max_mana + 40,
  training = training - 25,
  mental_health = mental_health + 5,
  team_player = team_player + 15,
  ego = ego + 0,
  communication = communication - 20
WHERE species = 'magical_toaster';

-- LEGENDARY TIER SPECIES (200 points)

-- DEITY
UPDATE characters
SET
  attack = attack + 25,
  defense = defense + 15,
  speed = speed + 15,
  strength = strength + 20,
  dexterity = dexterity + 15,
  endurance = endurance + 25,
  magic_attack = magic_attack + 30,
  magic_defense = magic_defense + 30,
  intelligence = intelligence + 25,
  wisdom = wisdom + 30,
  spirit = spirit + 35,
  charisma = charisma + 30,
  max_health = max_health + 20,
  max_energy = max_energy + 20,
  max_mana = max_mana + 50,
  training = training - 20,
  mental_health = mental_health - 15,
  team_player = team_player - 30,
  ego = ego + 80,
  communication = communication - 20
WHERE species = 'deity';

COMMENT ON TABLE characters IS 'Stats now include Tier 2 (Archetype) and Tier 3 (Species) modifiers with full 12-attribute system.';
