-- Migration: Trim whitespace from character slots in teams table
-- Fixes issue where character IDs have trailing spaces (e.g. "userchar_123 ")
-- causing loadBattleCharacter to fail.

UPDATE teams
SET 
  character_slot_1 = TRIM(character_slot_1),
  character_slot_2 = TRIM(character_slot_2),
  character_slot_3 = TRIM(character_slot_3);
