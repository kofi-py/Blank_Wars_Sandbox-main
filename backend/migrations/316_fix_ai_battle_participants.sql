-- Migration 316: Fix AI battle participants
-- The user_id column has a NOT NULL constraint but AI characters
-- don't have real users. Make user_id nullable for AI opponents.

-- Step 1: Make user_id nullable
ALTER TABLE battle_participants ALTER COLUMN user_id DROP NOT NULL;

-- Step 2: Add comment explaining the pattern
COMMENT ON COLUMN battle_participants.user_id IS 'User ID for user_character participants. NULL for ai_character participants.';

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (316, '316_fix_ai_battle_participants')
ON CONFLICT (version) DO NOTHING;
