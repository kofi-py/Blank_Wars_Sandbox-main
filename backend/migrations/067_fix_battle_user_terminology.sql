-- Migration: 067_fix_battle_user_terminology
-- Description: Eliminate player terminology, use user/opponent convention
-- The user is the COACH (human). Characters are FIGHTERS.
-- Created: 2025-11-02

BEGIN;

-- =====================================================
-- BATTLES TABLE: Fix player column naming
-- =====================================================

-- Rename user columns from player1/player2 to user/opponent
ALTER TABLE battles RENAME COLUMN player1_id TO user_id;
ALTER TABLE battles RENAME COLUMN player2_id TO opponent_user_id;
ALTER TABLE battles RENAME COLUMN character1_id TO user_character_id;
ALTER TABLE battles RENAME COLUMN character2_id TO opponent_character_id;

-- Rename strategy columns (if they exist with p1/p2 naming)
ALTER TABLE battles RENAME COLUMN p1_strategy TO user_strategy;
ALTER TABLE battles RENAME COLUMN p2_strategy TO opponent_strategy;

-- Update strategy check constraints
ALTER TABLE battles DROP CONSTRAINT IF EXISTS battles_p1_strategy_check;
ALTER TABLE battles DROP CONSTRAINT IF EXISTS battles_p2_strategy_check;
ALTER TABLE battles ADD CONSTRAINT battles_user_strategy_check
  CHECK (user_strategy IS NULL OR user_strategy = ANY (ARRAY['aggressive'::text, 'defensive'::text, 'balanced'::text]));
ALTER TABLE battles ADD CONSTRAINT battles_opponent_strategy_check
  CHECK (opponent_strategy IS NULL OR opponent_strategy = ANY (ARRAY['aggressive'::text, 'defensive'::text, 'balanced'::text]));

-- Update foreign key constraints
ALTER TABLE battles DROP CONSTRAINT IF EXISTS battles_player1_id_fkey;
ALTER TABLE battles DROP CONSTRAINT IF EXISTS battles_player2_id_fkey;
ALTER TABLE battles DROP CONSTRAINT IF EXISTS battles_character1_id_fkey;
ALTER TABLE battles DROP CONSTRAINT IF EXISTS battles_character2_id_fkey;

ALTER TABLE battles ADD CONSTRAINT battles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE battles ADD CONSTRAINT battles_opponent_user_id_fkey
  FOREIGN KEY (opponent_user_id) REFERENCES users(id);
ALTER TABLE battles ADD CONSTRAINT battles_user_character_id_fkey
  FOREIGN KEY (user_character_id) REFERENCES user_characters(id);
ALTER TABLE battles ADD CONSTRAINT battles_opponent_character_id_fkey
  FOREIGN KEY (opponent_character_id) REFERENCES user_characters(id);

-- Update indexes
DROP INDEX IF EXISTS idx_battles_player1;
DROP INDEX IF EXISTS idx_battles_player2;
CREATE INDEX IF NOT EXISTS idx_battles_user ON battles (user_id);
CREATE INDEX IF NOT EXISTS idx_battles_opponent ON battles (opponent_user_id);

-- =====================================================
-- Record migration
-- =====================================================

INSERT INTO migration_log (version, name)
VALUES (67, '067_fix_battle_user_terminology')
ON CONFLICT (version) DO NOTHING;

COMMIT;
