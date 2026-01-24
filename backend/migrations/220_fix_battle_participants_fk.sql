-- Migration: Drop incorrect foreign key constraint on battle_participants
-- The table needs to store user_character IDs (e.g. "userchar_...") but the constraint
-- forces it to match base character IDs (e.g. "robin_hood").
-- Since this table is polymorphic (can hold user_characters or ai_characters),
-- a strict FK to a single table is not appropriate here.

ALTER TABLE battle_participants
DROP CONSTRAINT battle_participants_character_id_fkey;
