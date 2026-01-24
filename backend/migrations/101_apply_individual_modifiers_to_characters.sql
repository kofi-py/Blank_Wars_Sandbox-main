-- Migration 101: Apply Individual/Signature Stat Modifiers to Characters Table
-- Tier 4 of 4-tier modifier system: Universal (50) → Archetype → Species → Individual
-- Individual budgets: 200-300 points (case-by-case based on character legend status)
-- Balance margin: ±20 (more flexible for unique personalities)
-- HIGH ego = negative trait (selfish, arrogant)
-- Full 20-attribute system

-- ACHILLES (NET +10)
UPDATE characters
SET
    attack = attack + 15,
    defense = defense + 15,
    speed = speed + 20,
    strength = strength + 20,
    dexterity = dexterity + 20,
    endurance = endurance + 20,
    magic_attack = magic_attack + 10,
    magic_defense = magic_defense + 10,
    intelligence = intelligence + 5,
    wisdom = wisdom + 5,
    spirit = spirit + 15,
    charisma = charisma + 15,
    max_health = max_health + 20,
    max_energy = max_energy + 20,
    max_mana = max_mana + 0,
    training = training + 10,
    mental_health = mental_health - 45,
    team_player = team_player - 40,
    ego = ego + 60,
    communication = communication + 0
WHERE name = 'Achilles';

-- AGENT X (NET 0)
UPDATE characters
SET
    attack = attack + 15,
    defense = defense + 10,
    speed = speed + 15,
    strength = strength + 10,
    dexterity = dexterity + 20,
    endurance = endurance + 10,
    magic_attack = magic_attack - 10,
    magic_defense = magic_defense + 5,
    intelligence = intelligence + 20,
    wisdom = wisdom + 5,
    spirit = spirit + 5,
    charisma = charisma + 5,
    max_health = max_health + 5,
    max_energy = max_energy + 20,
    max_mana = max_mana - 20,
    training = training + 30,
    mental_health = mental_health - 30,
    team_player = team_player - 30,
    ego = ego + 35,
    communication = communication + 0
WHERE name = 'Agent X';

-- ALEISTER CROWLEY (NET 0)
UPDATE characters
SET
    attack = attack - 15,
    defense = defense - 15,
    speed = speed - 10,
    strength = strength - 15,
    dexterity = dexterity - 5,
    endurance = endurance - 10,
    magic_attack = magic_attack + 25,
    magic_defense = magic_defense + 20,
    intelligence = intelligence + 20,
    wisdom = wisdom + 15,
    spirit = spirit + 30,
    charisma = charisma - 10,
    max_health = max_health - 10,
    max_energy = max_energy - 10,
    max_mana = max_mana + 50,
    training = training + 20,
    mental_health = mental_health - 30,
    team_player = team_player - 30,
    ego = ego + 50,
    communication = communication + 0
WHERE name = 'Aleister Crowley';

-- ARCHANGEL MICHAEL (NET +10)
UPDATE characters
SET
    attack = attack + 20,
    defense = defense + 15,
    speed = speed + 15,
    strength = strength + 20,
    dexterity = dexterity + 15,
    endurance = endurance + 15,
    magic_attack = magic_attack + 15,
    magic_defense = magic_defense + 20,
    intelligence = intelligence + 10,
    wisdom = wisdom + 15,
    spirit = spirit + 30,
    charisma = charisma + 10,
    max_health = max_health + 15,
    max_energy = max_energy + 15,
    max_mana = max_mana + 20,
    training = training + 5,
    mental_health = mental_health - 30,
    team_player = team_player - 45,
    ego = ego + 70,
    communication = communication + 5
WHERE name = 'Archangel Michael';

-- BILLY THE KID (NET 0)
UPDATE characters
SET
    attack = attack + 25,
    defense = defense - 20,
    speed = speed + 30,
    strength = strength + 10,
    dexterity = dexterity + 30,
    endurance = endurance + 5,
    magic_attack = magic_attack - 15,
    magic_defense = magic_defense - 10,
    intelligence = intelligence + 5,
    wisdom = wisdom - 10,
    spirit = spirit + 5,
    charisma = charisma + 10,
    max_health = max_health + 5,
    max_energy = max_energy + 35,
    max_mana = max_mana - 20,
    training = training + 10,
    mental_health = mental_health - 30,
    team_player = team_player - 30,
    ego = ego + 50,
    communication = communication + 0
WHERE name = 'Billy the Kid';

-- CLEOPATRA VII (NET +10)
UPDATE characters
SET
    attack = attack - 5,
    defense = defense - 10,
    speed = speed + 5,
    strength = strength - 10,
    dexterity = dexterity + 10,
    endurance = endurance + 5,
    magic_attack = magic_attack + 15,
    magic_defense = magic_defense + 15,
    intelligence = intelligence + 25,
    wisdom = wisdom + 15,
    spirit = spirit + 15,
    charisma = charisma + 30,
    max_health = max_health + 10,
    max_energy = max_energy + 15,
    max_mana = max_mana + 20,
    training = training + 15,
    mental_health = mental_health - 30,
    team_player = team_player - 35,
    ego = ego + 55,
    communication = communication + 20
WHERE name = 'Cleopatra VII';

-- COUNT DRACULA (NET 0)
UPDATE characters
SET
    attack = attack + 15,
    defense = defense + 10,
    speed = speed + 20,
    strength = strength + 20,
    dexterity = dexterity + 15,
    endurance = endurance + 20,
    magic_attack = magic_attack + 15,
    magic_defense = magic_defense + 15,
    intelligence = intelligence + 15,
    wisdom = wisdom + 10,
    spirit = spirit - 10,
    charisma = charisma + 20,
    max_health = max_health + 15,
    max_energy = max_energy + 10,
    max_mana = max_mana + 25,
    training = training + 10,
    mental_health = mental_health - 40,
    team_player = team_player - 45,
    ego = ego + 65,
    communication = communication + 10
WHERE name = 'Count Dracula';

-- CRUMBSWORTH (NET +10)
UPDATE characters
SET
    attack = attack - 30,
    defense = defense - 25,
    speed = speed + 0,
    strength = strength - 25,
    dexterity = dexterity + 5,
    endurance = endurance - 15,
    magic_attack = magic_attack + 40,
    magic_defense = magic_defense + 30,
    intelligence = intelligence + 25,
    wisdom = wisdom + 20,
    spirit = spirit + 30,
    charisma = charisma - 20,
    max_health = max_health + 10,
    max_energy = max_energy + 15,
    max_mana = max_mana + 50,
    training = training - 20,
    mental_health = mental_health + 20,
    team_player = team_player + 40,
    ego = ego - 10,
    communication = communication - 10
WHERE name = 'Crumbsworth';

-- DON QUIXOTE (NET +10)
UPDATE characters
SET
    attack = attack + 10,
    defense = defense + 10,
    speed = speed + 5,
    strength = strength + 5,
    dexterity = dexterity + 5,
    endurance = endurance + 15,
    magic_attack = magic_attack - 10,
    magic_defense = magic_defense + 5,
    intelligence = intelligence - 10,
    wisdom = wisdom - 15,
    spirit = spirit + 30,
    charisma = charisma + 20,
    max_health = max_health + 10,
    max_energy = max_energy + 25,
    max_mana = max_mana - 10,
    training = training + 20,
    mental_health = mental_health - 50,
    team_player = team_player - 20,
    ego = ego + 50,
    communication = communication + 20
WHERE name = 'Don Quixote';

-- FENRIR (NET 0)
UPDATE characters
SET
    attack = attack + 30,
    defense = defense + 15,
    speed = speed + 25,
    strength = strength + 30,
    dexterity = dexterity + 20,
    endurance = endurance + 25,
    magic_attack = magic_attack + 10,
    magic_defense = magic_defense + 10,
    intelligence = intelligence - 10,
    wisdom = wisdom - 10,
    spirit = spirit + 15,
    charisma = charisma - 15,
    max_health = max_health + 25,
    max_energy = max_energy + 25,
    max_mana = max_mana - 10,
    training = training - 20,
    mental_health = mental_health - 40,
    team_player = team_player - 50,
    ego = ego + 50,
    communication = communication - 20
WHERE name = 'Fenrir';

-- FRANKENSTEIN'S MONSTER (NET +10)
UPDATE characters
SET
    attack = attack + 15,
    defense = defense + 15,
    speed = speed - 15,
    strength = strength + 30,
    dexterity = dexterity - 10,
    endurance = endurance + 30,
    magic_attack = magic_attack - 10,
    magic_defense = magic_defense + 5,
    intelligence = intelligence - 15,
    wisdom = wisdom - 10,
    spirit = spirit + 10,
    charisma = charisma - 20,
    max_health = max_health + 35,
    max_energy = max_energy + 25,
    max_mana = max_mana - 10,
    training = training + 5,
    mental_health = mental_health - 40,
    team_player = team_player - 25,
    ego = ego + 30,
    communication = communication - 10
WHERE name = 'Frankensteins Monster';

-- GENGHIS KHAN (NET +10)
UPDATE characters
SET
    attack = attack + 20,
    defense = defense + 15,
    speed = speed + 15,
    strength = strength + 20,
    dexterity = dexterity + 15,
    endurance = endurance + 15,
    magic_attack = magic_attack - 10,
    magic_defense = magic_defense + 5,
    intelligence = intelligence + 15,
    wisdom = wisdom + 10,
    spirit = spirit + 10,
    charisma = charisma + 15,
    max_health = max_health + 15,
    max_energy = max_energy + 15,
    max_mana = max_mana - 20,
    training = training + 25,
    mental_health = mental_health - 35,
    team_player = team_player - 40,
    ego = ego + 60,
    communication = communication + 10
WHERE name = 'Genghis Khan';

-- JACK THE RIPPER (NET +2)
UPDATE characters
SET
    attack = attack + 25,
    defense = defense + 5,
    speed = speed + 30,
    strength = strength + 10,
    dexterity = dexterity + 25,
    endurance = endurance + 5,
    magic_attack = magic_attack - 10,
    magic_defense = magic_defense - 5,
    intelligence = intelligence + 15,
    wisdom = wisdom - 5,
    spirit = spirit - 10,
    charisma = charisma - 15,
    max_health = max_health + 10,
    max_energy = max_energy + 25,
    max_mana = max_mana - 20,
    training = training + 20,
    mental_health = mental_health - 50,
    team_player = team_player - 40,
    ego = ego + 45,
    communication = communication - 5
WHERE name = 'Jack the Ripper';

-- JOAN OF ARC (NET +9)
UPDATE characters
SET
    attack = attack + 10,
    defense = defense + 15,
    speed = speed - 8,
    strength = strength + 12,
    dexterity = dexterity - 10,
    endurance = endurance + 15,
    magic_attack = magic_attack + 10,
    magic_defense = magic_defense + 10,
    intelligence = intelligence + 5,
    wisdom = wisdom + 5,
    spirit = spirit + 35,
    charisma = charisma + 15,
    max_health = max_health + 5,
    max_energy = max_energy + 20,
    max_mana = max_mana + 10,
    training = training + 5,
    mental_health = mental_health - 60,
    team_player = team_player - 35,
    ego = ego + 55,
    communication = communication + 5
WHERE name = 'Joan of Arc';

-- KALI (NET +10)
UPDATE characters
SET
    attack = attack + 15,
    defense = defense + 15,
    speed = speed + 15,
    strength = strength + 15,
    dexterity = dexterity + 20,
    endurance = endurance + 20,
    magic_attack = magic_attack + 15,
    magic_defense = magic_defense + 15,
    intelligence = intelligence + 15,
    wisdom = wisdom + 15,
    spirit = spirit + 15,
    charisma = charisma - 20,
    max_health = max_health + 15,
    max_energy = max_energy + 15,
    max_mana = max_mana + 15,
    training = training + 0,
    mental_health = mental_health - 60,
    team_player = team_player - 60,
    ego = ego + 70,
    communication = communication + 0
WHERE name = 'Kali';

-- KANGAROO (NET +5)
UPDATE characters
SET
    attack = attack + 30,
    defense = defense + 5,
    speed = speed + 25,
    strength = strength + 35,
    dexterity = dexterity + 15,
    endurance = endurance + 25,
    magic_attack = magic_attack - 10,
    magic_defense = magic_defense - 10,
    intelligence = intelligence - 15,
    wisdom = wisdom + 5,
    spirit = spirit + 10,
    charisma = charisma - 10,
    max_health = max_health + 10,
    max_energy = max_energy + 30,
    max_mana = max_mana - 5,
    training = training - 20,
    mental_health = mental_health - 40,
    team_player = team_player - 40,
    ego = ego + 25,
    communication = communication - 10
WHERE name = 'Kangaroo';

-- KARNA (NET 0)
UPDATE characters
SET
    attack = attack + 15,
    defense = defense + 10,
    speed = speed + 15,
    strength = strength + 10,
    dexterity = dexterity + 20,
    endurance = endurance + 10,
    magic_attack = magic_attack + 10,
    magic_defense = magic_defense + 5,
    intelligence = intelligence + 5,
    wisdom = wisdom + 5,
    spirit = spirit + 10,
    charisma = charisma + 10,
    max_health = max_health + 10,
    max_energy = max_energy + 10,
    max_mana = max_mana + 5,
    training = training + 5,
    mental_health = mental_health - 45,
    team_player = team_player - 50,
    ego = ego + 65,
    communication = communication + 5
WHERE name = 'Karna';

-- LITTLE BO PEEP (NET +15)
UPDATE characters
SET
    attack = attack - 10,
    defense = defense - 15,
    speed = speed + 10,
    strength = strength + 5,
    dexterity = dexterity + 10,
    endurance = endurance + 10,
    magic_attack = magic_attack + 30,
    magic_defense = magic_defense + 15,
    intelligence = intelligence - 5,
    wisdom = wisdom + 5,
    spirit = spirit + 10,
    charisma = charisma - 5,
    max_health = max_health - 10,
    max_energy = max_energy + 15,
    max_mana = max_mana + 40,
    training = training - 10,
    mental_health = mental_health - 50,
    team_player = team_player - 45,
    ego = ego + 10,
    communication = communication + 15
WHERE name = 'Little Bo Peep';

-- MAMI WATA (NET 0)
UPDATE characters
SET
    attack = attack - 20,
    defense = defense - 20,
    speed = speed - 10,
    strength = strength - 30,
    dexterity = dexterity + 0,
    endurance = endurance - 20,
    magic_attack = magic_attack + 20,
    magic_defense = magic_defense + 10,
    intelligence = intelligence - 10,
    wisdom = wisdom + 5,
    spirit = spirit + 15,
    charisma = charisma + 30,
    max_health = max_health + 40,
    max_energy = max_energy - 20,
    max_mana = max_mana + 40,
    training = training - 30,
    mental_health = mental_health + 20,
    team_player = team_player + 10,
    ego = ego + 40,
    communication = communication + 10
WHERE name = 'Mami Wata';

-- MERLIN (NET +5)
UPDATE characters
SET
    attack = attack - 25,
    defense = defense - 15,
    speed = speed - 10,
    strength = strength - 20,
    dexterity = dexterity - 15,
    endurance = endurance - 10,
    magic_attack = magic_attack + 30,
    magic_defense = magic_defense + 25,
    intelligence = intelligence + 15,
    wisdom = wisdom + 20,
    spirit = spirit + 10,
    charisma = charisma - 15,
    max_health = max_health - 15,
    max_energy = max_energy - 20,
    max_mana = max_mana + 55,
    training = training + 10,
    mental_health = mental_health + 20,
    team_player = team_player + 20,
    ego = ego + 50,
    communication = communication - 5
WHERE name = 'Merlin';

-- NAPOLEON BONAPARTE (NET 0)
UPDATE characters
SET
    attack = attack + 15,
    defense = defense - 5,
    speed = speed + 10,
    strength = strength - 5,
    dexterity = dexterity + 15,
    endurance = endurance + 5,
    magic_attack = magic_attack - 10,
    magic_defense = magic_defense - 10,
    intelligence = intelligence + 20,
    wisdom = wisdom - 10,
    spirit = spirit + 10,
    charisma = charisma + 15,
    max_health = max_health + 10,
    max_energy = max_energy + 40,
    max_mana = max_mana - 10,
    training = training + 30,
    mental_health = mental_health - 30,
    team_player = team_player - 30,
    ego = ego + 50,
    communication = communication - 10
WHERE name = 'Napoleon Bonaparte';

-- NIKOLA TESLA (NET +5)
UPDATE characters
SET
    attack = attack - 10,
    defense = defense - 10,
    speed = speed + 10,
    strength = strength - 10,
    dexterity = dexterity + 10,
    endurance = endurance + 5,
    magic_attack = magic_attack + 10,
    magic_defense = magic_defense + 10,
    intelligence = intelligence + 50,
    wisdom = wisdom - 10,
    spirit = spirit + 10,
    charisma = charisma - 20,
    max_health = max_health + 0,
    max_energy = max_energy + 50,
    max_mana = max_mana + 0,
    training = training + 40,
    mental_health = mental_health - 40,
    team_player = team_player - 30,
    ego = ego + 50,
    communication = communication - 10
WHERE name = 'Nikola Tesla';

-- QUETZALCOATL (NET 0)
UPDATE characters
SET
    attack = attack + 20,
    defense = defense + 15,
    speed = speed + 20,
    strength = strength + 15,
    dexterity = dexterity + 20,
    endurance = endurance + 15,
    magic_attack = magic_attack + 15,
    magic_defense = magic_defense + 15,
    intelligence = intelligence + 10,
    wisdom = wisdom + 15,
    spirit = spirit + 15,
    charisma = charisma + 10,
    max_health = max_health + 15,
    max_energy = max_energy + 15,
    max_mana = max_mana + 25,
    training = training - 40,
    mental_health = mental_health - 60,
    team_player = team_player - 60,
    ego = ego + 70,
    communication = communication - 10
WHERE name = 'Quetzalcoatl';

-- RAMSES II (NET +15)
UPDATE characters
SET
    attack = attack - 15,
    defense = defense - 15,
    speed = speed - 20,
    strength = strength - 15,
    dexterity = dexterity - 20,
    endurance = endurance - 10,
    magic_attack = magic_attack + 20,
    magic_defense = magic_defense + 20,
    intelligence = intelligence + 15,
    wisdom = wisdom + 20,
    spirit = spirit + 15,
    charisma = charisma + 10,
    max_health = max_health + 40,
    max_energy = max_energy - 20,
    max_mana = max_mana + 50,
    training = training + 30,
    mental_health = mental_health - 20,
    team_player = team_player - 10,
    ego = ego + 50,
    communication = communication - 10
WHERE name = 'Ramses II';

-- RILAK TRELKAR (NET +5)
UPDATE characters
SET
    attack = attack - 25,
    defense = defense - 25,
    speed = speed + 5,
    strength = strength - 20,
    dexterity = dexterity + 10,
    endurance = endurance + 10,
    magic_attack = magic_attack + 15,
    magic_defense = magic_defense + 20,
    intelligence = intelligence + 35,
    wisdom = wisdom + 10,
    spirit = spirit + 0,
    charisma = charisma - 20,
    max_health = max_health + 15,
    max_energy = max_energy + 25,
    max_mana = max_mana + 30,
    training = training + 30,
    mental_health = mental_health - 30,
    team_player = team_player - 30,
    ego = ego + 40,
    communication = communication - 10
WHERE name = 'Rilak Trelkar';

-- ROBIN HOOD (NET 0)
UPDATE characters
SET
    attack = attack + 25,
    defense = defense + 5,
    speed = speed + 25,
    strength = strength + 5,
    dexterity = dexterity + 20,
    endurance = endurance + 10,
    magic_attack = magic_attack - 5,
    magic_defense = magic_defense + 0,
    intelligence = intelligence + 10,
    wisdom = wisdom - 10,
    spirit = spirit + 10,
    charisma = charisma + 15,
    max_health = max_health + 10,
    max_energy = max_energy + 25,
    max_mana = max_mana - 25,
    training = training + 10,
    mental_health = mental_health - 45,
    team_player = team_player - 35,
    ego = ego + 50,
    communication = communication + 0
WHERE name = 'Robin Hood';

-- SAM SPADE (NET +1)
UPDATE characters
SET
    attack = attack + 10,
    defense = defense + 10,
    speed = speed + 10,
    strength = strength + 5,
    dexterity = dexterity + 15,
    endurance = endurance + 10,
    magic_attack = magic_attack + 30,
    magic_defense = magic_defense - 10,
    intelligence = intelligence + 20,
    wisdom = wisdom - 10,
    spirit = spirit + 5,
    charisma = charisma + 1,
    max_health = max_health + 20,
    max_energy = max_energy + 20,
    max_mana = max_mana - 30,
    training = training + 20,
    mental_health = mental_health - 40,
    team_player = team_player - 40,
    ego = ego + 45,
    communication = communication + 0
WHERE name = 'Sam Spade';

-- SHAKA ZULU (NET +15)
UPDATE characters
SET
    attack = attack + 20,
    defense = defense + 15,
    speed = speed + 20,
    strength = strength + 10,
    dexterity = dexterity + 10,
    endurance = endurance + 10,
    magic_attack = magic_attack + 10,
    magic_defense = magic_defense + 10,
    intelligence = intelligence + 15,
    wisdom = wisdom + 0,
    spirit = spirit + 5,
    charisma = charisma + 0,
    max_health = max_health + 15,
    max_energy = max_energy + 25,
    max_mana = max_mana - 40,
    training = training + 10,
    mental_health = mental_health - 40,
    team_player = team_player - 30,
    ego = ego + 40,
    communication = communication - 10
WHERE name = 'Shaka Zulu';

-- SHERLOCK HOLMES (NET 0)
UPDATE characters
SET
    attack = attack + 15,
    defense = defense + 5,
    speed = speed + 10,
    strength = strength - 5,
    dexterity = dexterity + 10,
    endurance = endurance + 5,
    magic_attack = magic_attack - 30,
    magic_defense = magic_defense - 20,
    intelligence = intelligence + 50,
    wisdom = wisdom + 20,
    spirit = spirit + 5,
    charisma = charisma + 10,
    max_health = max_health + 15,
    max_energy = max_energy + 60,
    max_mana = max_mana - 50,
    training = training + 30,
    mental_health = mental_health - 30,
    team_player = team_player - 30,
    ego = ego + 60,
    communication = communication - 10
WHERE name = 'Sherlock Holmes';

-- SPACE CYBORG (NET -5)
UPDATE characters
SET
    attack = attack + 20,
    defense = defense + 30,
    speed = speed + 10,
    strength = strength + 20,
    dexterity = dexterity + 10,
    endurance = endurance + 30,
    magic_attack = magic_attack - 30,
    magic_defense = magic_defense - 20,
    intelligence = intelligence + 10,
    wisdom = wisdom - 20,
    spirit = spirit - 10,
    charisma = charisma - 30,
    max_health = max_health + 30,
    max_energy = max_energy + 40,
    max_mana = max_mana - 20,
    training = training + 10,
    mental_health = mental_health - 35,
    team_player = team_player - 20,
    ego = ego + 20,
    communication = communication - 10
WHERE name = 'Space Cyborg';

-- SUN WUKONG (NET -10)
UPDATE characters
SET
    attack = attack + 15,
    defense = defense + 5,
    speed = speed + 25,
    strength = strength + 10,
    dexterity = dexterity + 20,
    endurance = endurance - 10,
    magic_attack = magic_attack + 15,
    magic_defense = magic_defense + 15,
    intelligence = intelligence + 20,
    wisdom = wisdom - 20,
    spirit = spirit + 10,
    charisma = charisma + 10,
    max_health = max_health + 15,
    max_energy = max_energy + 20,
    max_mana = max_mana + 20,
    training = training - 30,
    mental_health = mental_health - 50,
    team_player = team_player - 30,
    ego = ego + 60,
    communication = communication - 10
WHERE name = 'Sun Wukong';

-- UNICORN (NET +10)
UPDATE characters
SET
    attack = attack + 20,
    defense = defense + 5,
    speed = speed + 20,
    strength = strength + 10,
    dexterity = dexterity + 20,
    endurance = endurance + 10,
    magic_attack = magic_attack + 20,
    magic_defense = magic_defense + 20,
    intelligence = intelligence - 10,
    wisdom = wisdom + 10,
    spirit = spirit + 10,
    charisma = charisma - 10,
    max_health = max_health + 30,
    max_energy = max_energy + 25,
    max_mana = max_mana + 30,
    training = training - 40,
    mental_health = mental_health - 40,
    team_player = team_player - 40,
    ego = ego + 60,
    communication = communication - 20
WHERE name = 'Unicorn';

-- VELOCIRAPTOR (NET +20)
UPDATE characters
SET
    attack = attack + 30,
    defense = defense + 10,
    speed = speed + 35,
    strength = strength + 20,
    dexterity = dexterity + 30,
    endurance = endurance + 10,
    magic_attack = magic_attack - 15,
    magic_defense = magic_defense - 20,
    intelligence = intelligence + 10,
    wisdom = wisdom - 10,
    spirit = spirit - 10,
    charisma = charisma - 20,
    max_health = max_health + 30,
    max_energy = max_energy + 50,
    max_mana = max_mana - 10,
    training = training - 10,
    mental_health = mental_health - 30,
    team_player = team_player - 30,
    ego = ego + 40,
    communication = communication - 10
WHERE name = 'Velociraptor';

-- End of Migration 101
COMMENT ON TABLE characters IS 'Stats now include Tier 4 (Individual) modifiers applied to all 33 signature characters with full 20-attribute system.';
