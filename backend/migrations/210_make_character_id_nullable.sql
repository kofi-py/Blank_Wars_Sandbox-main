-- Migration: Make character_id nullable in character_memories
-- The table now uses user_character_id as the primary reference
-- character_id can be NULL for user-scoped memories

ALTER TABLE character_memories ALTER COLUMN character_id DROP NOT NULL;

-- Add comment explaining the design
COMMENT ON COLUMN character_memories.character_id IS 'Base character ID - can be NULL for user-scoped memories that use user_character_id';
COMMENT ON COLUMN character_memories.user_character_id IS 'User character instance ID - primary reference for user-specific memories';
