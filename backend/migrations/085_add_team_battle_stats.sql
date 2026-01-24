-- Migration: 085 - Add team battle statistics tracking
-- Description: Add wins, losses, battles_played, and last_battle_date to teams table
-- Created: 2025-11-10

BEGIN;

-- Add team battle tracking columns
ALTER TABLE teams
ADD COLUMN IF NOT EXISTS wins INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS losses INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS battles_played INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_battle_date TIMESTAMP;

-- Add constraints only if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teams_wins_check') THEN
    ALTER TABLE teams ADD CONSTRAINT teams_wins_check CHECK (wins >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teams_losses_check') THEN
    ALTER TABLE teams ADD CONSTRAINT teams_losses_check CHECK (losses >= 0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teams_battles_played_check') THEN
    ALTER TABLE teams ADD CONSTRAINT teams_battles_played_check CHECK (battles_played >= 0);
  END IF;
END $$;

-- Add index for querying teams by battle activity
CREATE INDEX IF NOT EXISTS idx_teams_last_battle_date ON teams(last_battle_date);

-- Add comments explaining the columns
COMMENT ON COLUMN teams.wins IS 'Total team victories in 3v3 team battles';
COMMENT ON COLUMN teams.losses IS 'Total team defeats in 3v3 team battles';
COMMENT ON COLUMN teams.battles_played IS 'Total number of 3v3 team battles completed';
COMMENT ON COLUMN teams.last_battle_date IS 'Timestamp of the most recent 3v3 team battle';

COMMIT;
