-- Migration: 068 - Add loss and win percentage tracking
-- Description: Add total_losses and win_percentage columns to all game stat tables
-- Created: 2025-11-02

BEGIN;

-- =====================================================
-- USER_CHARACTERS: Add character-level loss and win% tracking
-- =====================================================

ALTER TABLE user_characters
  ADD COLUMN IF NOT EXISTS total_losses integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS win_percentage real DEFAULT 0.0;

-- Add constraints
ALTER TABLE user_characters
  ADD CONSTRAINT user_characters_total_losses_check CHECK (total_losses >= 0),
  ADD CONSTRAINT user_characters_win_percentage_check CHECK (win_percentage >= 0.0 AND win_percentage <= 100.0);

-- Calculate initial values from existing data
UPDATE user_characters
SET
  total_losses = GREATEST(0, total_battles - total_wins),
  win_percentage = CASE
    WHEN total_battles > 0 THEN (total_wins::real / total_battles::real * 100.0)
    ELSE 0.0
  END
WHERE total_losses IS NULL OR win_percentage IS NULL;

-- =====================================================
-- USERS: Add coach-level loss and win% tracking
-- =====================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS total_losses integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS win_percentage real DEFAULT 0.0;

ALTER TABLE users
  ADD CONSTRAINT users_total_losses_check CHECK (total_losses >= 0),
  ADD CONSTRAINT users_win_percentage_check CHECK (win_percentage >= 0.0 AND win_percentage <= 100.0);

UPDATE users
SET
  total_losses = GREATEST(0, total_battles - total_wins),
  win_percentage = CASE
    WHEN total_battles > 0 THEN (total_wins::real / total_battles::real * 100.0)
    ELSE 0.0
  END
WHERE total_losses IS NULL OR win_percentage IS NULL;

-- =====================================================
-- COACH_PROGRESSION: Add coaching loss and win% tracking
-- =====================================================

ALTER TABLE coach_progression
  ADD COLUMN IF NOT EXISTS total_losses_coached integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS win_percentage_coached real DEFAULT 0.0;

ALTER TABLE coach_progression
  ADD CONSTRAINT coach_progression_total_losses_coached_check CHECK (total_losses_coached >= 0),
  ADD CONSTRAINT coach_progression_win_percentage_coached_check CHECK (win_percentage_coached >= 0.0 AND win_percentage_coached <= 100.0);

UPDATE coach_progression
SET
  total_losses_coached = GREATEST(0, total_battles_coached - total_wins_coached),
  win_percentage_coached = CASE
    WHEN total_battles_coached > 0 THEN (total_wins_coached::real / total_battles_coached::real * 100.0)
    ELSE 0.0
  END
WHERE total_losses_coached IS NULL OR win_percentage_coached IS NULL;

-- =====================================================
-- TEAM_RELATIONSHIPS: Add team loss and win% tracking
-- =====================================================

ALTER TABLE team_relationships
  ADD COLUMN IF NOT EXISTS total_losses integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS win_percentage real DEFAULT 0.0;

ALTER TABLE team_relationships
  ADD CONSTRAINT team_relationships_total_losses_check CHECK (total_losses >= 0),
  ADD CONSTRAINT team_relationships_win_percentage_check CHECK (win_percentage >= 0.0 AND win_percentage <= 100.0);

UPDATE team_relationships
SET
  total_losses = GREATEST(0, total_battles - total_victories),
  win_percentage = CASE
    WHEN total_battles > 0 THEN (total_victories::real / total_battles::real * 100.0)
    ELSE 0.0
  END
WHERE total_losses IS NULL OR win_percentage IS NULL;

-- =====================================================
-- CHALLENGE_LEADERBOARD: Add challenge loss and win% tracking
-- =====================================================

ALTER TABLE challenge_leaderboard
  ADD COLUMN IF NOT EXISTS total_challenges_lost integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS challenge_win_percentage real DEFAULT 0.0;

ALTER TABLE challenge_leaderboard
  ADD CONSTRAINT challenge_leaderboard_total_challenges_lost_check CHECK (total_challenges_lost >= 0),
  ADD CONSTRAINT challenge_leaderboard_challenge_win_percentage_check CHECK (challenge_win_percentage >= 0.0 AND challenge_win_percentage <= 100.0);

UPDATE challenge_leaderboard
SET
  total_challenges_lost = GREATEST(0, total_challenges_entered - total_challenges_won),
  challenge_win_percentage = CASE
    WHEN total_challenges_entered > 0 THEN (total_challenges_won::real / total_challenges_entered::real * 100.0)
    ELSE 0.0
  END
WHERE total_challenges_lost IS NULL OR challenge_win_percentage IS NULL;

COMMIT;
