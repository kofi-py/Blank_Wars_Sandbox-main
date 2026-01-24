-- Migration: Fix character_memories to use user_character_id
-- Date: 2025-12-09
-- Purpose: The character_memories table was incorrectly created with character_id
--          (base character template) instead of user_character_id (user's instance).
--          Memories must be stored per user character, not per base character.

BEGIN;

-- Step 1: Add the correct column
ALTER TABLE character_memories 
ADD COLUMN IF NOT EXISTS user_character_id TEXT;

-- Step 2: Create index for the new column
CREATE INDEX IF NOT EXISTS idx_character_memories_user_char_id 
ON character_memories(user_character_id);

-- Step 3: Add foreign key constraint to user_characters
-- (Only if user_characters table exists and has data)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_characters') THEN
        -- Don't add FK constraint yet - existing data may not have valid references
        -- ALTER TABLE character_memories 
        -- ADD CONSTRAINT fk_character_memories_user_char 
        -- FOREIGN KEY (user_character_id) REFERENCES user_characters(id);
        RAISE NOTICE 'user_characters table exists - FK constraint can be added after data migration';
    END IF;
END $$;

-- Note: The old character_id column is kept for now.
-- After code is updated and data is migrated, a future migration should:
-- 1. Migrate any existing data from character_id to user_character_id
-- 2. Drop the character_id column
-- 3. Make user_character_id NOT NULL

COMMIT;
