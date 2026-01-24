-- Migration 096: ROLLBACK - Remove individual modifiers that were incorrectly applied to user_characters
-- These should have been applied to the characters table instead

-- DON QUIXOTE - Reverse individual modifiers
UPDATE user_characters uc
SET
    current_attack = uc.current_attack - 10,
    current_defense = uc.current_defense - 5,
    current_speed = uc.current_speed - 5,
    current_special = uc.current_special - 20,
    current_max_health = uc.current_max_health - 5,
    max_energy = uc.max_energy - 25,
    max_mana = uc.max_mana - 0,
    current_training = uc.current_training - 20,
    current_mental_health = uc.current_mental_health - (-40),
    current_team_player = uc.current_team_player - (-30),
    current_ego = uc.current_ego - 50,
    current_communication = uc.current_communication - 30
FROM characters c
WHERE c.name = 'Don Quixote' AND uc.character_id = c.id;

-- KANGAROO - Reverse individual modifiers
UPDATE user_characters uc
SET
    current_attack = uc.current_attack - 30,
    current_defense = uc.current_defense - 5,
    current_speed = uc.current_speed - 25,
    current_special = uc.current_special - 10,
    current_max_health = uc.current_max_health - 10,
    max_energy = uc.max_energy - 30,
    max_mana = uc.max_mana - (-5),
    current_training = uc.current_training - (-20),
    current_mental_health = uc.current_mental_health - (-40),
    current_team_player = uc.current_team_player - (-20),
    current_ego = uc.current_ego - 15,
    current_communication = uc.current_communication - (-10)
FROM characters c
WHERE c.name = 'Kangaroo' AND uc.character_id = c.id;

-- SHERLOCK HOLMES - Reverse individual modifiers
UPDATE user_characters uc
SET
    current_attack = uc.current_attack - 10,
    current_defense = uc.current_defense - 5,
    current_speed = uc.current_speed - 5,
    current_special = uc.current_special - 30,
    current_max_health = uc.current_max_health - 10,
    max_energy = uc.max_energy - 30,
    max_mana = uc.max_mana - (-40),
    current_training = uc.current_training - 30,
    current_mental_health = uc.current_mental_health - 10,
    current_team_player = uc.current_team_player - (-30),
    current_ego = uc.current_ego - 50,
    current_communication = uc.current_communication - (-10)
FROM characters c
WHERE c.name = 'Sherlock Holmes' AND uc.character_id = c.id;
