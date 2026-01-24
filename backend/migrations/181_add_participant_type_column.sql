-- Migration 182: Add participant_type column to battle_participants
-- Purpose: Distinguish between user characters and AI characters in battles
-- Note: FK constraints on character_id/user_id were intentionally removed to support
-- hybrid battles (User vs AI). This column documents the participant type.

BEGIN;

-- Add participant_type enum
DO $$ BEGIN
    CREATE TYPE participant_type AS ENUM ('user_character', 'ai_character', 'ai_coach');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add participant_type column with default 'user_character' for existing records
ALTER TABLE battle_participants
ADD COLUMN IF NOT EXISTS participant_type participant_type DEFAULT 'user_character';

-- Add comment explaining the design decision
COMMENT ON TABLE battle_participants IS
'Tracks all participants in a battle. Supports hybrid participants (user characters, AI characters, AI coaches).
FK constraints on character_id/user_id were removed to allow AI entities that don''t exist in users/characters tables.
The participant_type column indicates which table to reference for full entity data.';

COMMENT ON COLUMN battle_participants.participant_type IS
'Type of participant: user_character (references user_characters), ai_character (references ai_characters), ai_coach (references ai_coaches)';

-- Create index for filtering by type
CREATE INDEX IF NOT EXISTS idx_battle_participants_type ON battle_participants(participant_type);

COMMIT;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (181, '181_add_participant_type_column')
ON CONFLICT (version) DO NOTHING;
