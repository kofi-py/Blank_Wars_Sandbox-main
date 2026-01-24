-- Migration: Fix corrupted user_characters HP/mana/energy
-- Issue: When characters table was updated to base 100, user_characters
-- wasn't recalculated. Old modifiers on base 50 resulted in negative values.
--
-- Fix: Reset current_max_health/mana/energy to match characters table

-- Update max values from characters table
UPDATE user_characters uc
SET 
    current_max_health = c.max_health,
    current_max_mana = c.max_mana,
    current_max_energy = c.max_energy
FROM characters c
WHERE uc.character_id = c.id;

-- Fix current values that exceed max or are negative
UPDATE user_characters
SET current_health = current_max_health
WHERE current_health > current_max_health OR current_health < 0;

UPDATE user_characters
SET current_mana = current_max_mana
WHERE current_mana > current_max_mana OR current_mana < 0;

UPDATE user_characters
SET current_energy = current_max_energy
WHERE current_energy > current_max_energy OR current_energy < 0;

-- Verify fix
-- SELECT c.name, uc.current_health, uc.current_max_health FROM user_characters uc 
-- JOIN characters c ON uc.character_id = c.id WHERE c.name = 'Merlin';
