-- Migration: Add win streak tracking columns and trigger function
-- Enables efficient leaderboard queries for battle win streaks

-- Add win streak columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS current_win_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS best_win_streak INTEGER DEFAULT 0;

-- Add constraints (skip if already exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_current_win_streak_check') THEN
    ALTER TABLE users ADD CONSTRAINT users_current_win_streak_check CHECK (current_win_streak >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_best_win_streak_check') THEN
    ALTER TABLE users ADD CONSTRAINT users_best_win_streak_check CHECK (best_win_streak >= 0);
  END IF;
END $$;

-- Add win streak columns to user_characters table
ALTER TABLE user_characters
ADD COLUMN IF NOT EXISTS current_win_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS best_win_streak INTEGER DEFAULT 0;

-- Add constraints (skip if already exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_characters_current_win_streak_check') THEN
    ALTER TABLE user_characters ADD CONSTRAINT user_characters_current_win_streak_check CHECK (current_win_streak >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_characters_best_win_streak_check') THEN
    ALTER TABLE user_characters ADD CONSTRAINT user_characters_best_win_streak_check CHECK (best_win_streak >= 0);
  END IF;
END $$;

-- Create function to update win streaks after battle completion
CREATE OR REPLACE FUNCTION update_battle_win_streaks()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process when battle transitions to completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN

    -- Handle winner
    IF NEW.winner_id IS NOT NULL THEN
      -- Update winner user's streak
      UPDATE users
      SET
        current_win_streak = current_win_streak + 1,
        best_win_streak = GREATEST(best_win_streak, current_win_streak + 1)
      WHERE id = NEW.winner_id;

      -- Update winner's character streak
      IF NEW.winner_id = NEW.user_id AND NEW.user_character_id IS NOT NULL THEN
        UPDATE user_characters
        SET
          current_win_streak = current_win_streak + 1,
          best_win_streak = GREATEST(best_win_streak, current_win_streak + 1)
        WHERE id = NEW.user_character_id;
      ELSIF NEW.winner_id = NEW.opponent_user_id AND NEW.opponent_character_id IS NOT NULL THEN
        UPDATE user_characters
        SET
          current_win_streak = current_win_streak + 1,
          best_win_streak = GREATEST(best_win_streak, current_win_streak + 1)
        WHERE id = NEW.opponent_character_id;
      END IF;

      -- Reset loser's streak
      IF NEW.winner_id = NEW.user_id THEN
        -- Opponent lost
        IF NEW.opponent_user_id IS NOT NULL THEN
          UPDATE users SET current_win_streak = 0 WHERE id = NEW.opponent_user_id;
        END IF;
        IF NEW.opponent_character_id IS NOT NULL THEN
          UPDATE user_characters SET current_win_streak = 0 WHERE id = NEW.opponent_character_id;
        END IF;
      ELSE
        -- User lost
        UPDATE users SET current_win_streak = 0 WHERE id = NEW.user_id;
        IF NEW.user_character_id IS NOT NULL THEN
          UPDATE user_characters SET current_win_streak = 0 WHERE id = NEW.user_character_id;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on battles table
DROP TRIGGER IF EXISTS trigger_update_battle_win_streaks ON battles;
CREATE TRIGGER trigger_update_battle_win_streaks
  AFTER UPDATE ON battles
  FOR EACH ROW
  EXECUTE FUNCTION update_battle_win_streaks();

-- Create indexes for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_users_best_win_streak ON users(best_win_streak DESC);
CREATE INDEX IF NOT EXISTS idx_users_current_win_streak ON users(current_win_streak DESC);
CREATE INDEX IF NOT EXISTS idx_user_characters_best_win_streak ON user_characters(best_win_streak DESC);
CREATE INDEX IF NOT EXISTS idx_user_characters_current_win_streak ON user_characters(current_win_streak DESC);

-- Backfill existing win streaks from battle history
DO $$
DECLARE
  user_rec RECORD;
  battle_rec RECORD;
  current_streak INTEGER;
  max_streak INTEGER;
BEGIN
  -- For each user with completed battles
  FOR user_rec IN
    SELECT DISTINCT user_id AS uid FROM battles WHERE status = 'completed'
    UNION
    SELECT DISTINCT opponent_user_id AS uid FROM battles WHERE status = 'completed' AND opponent_user_id IS NOT NULL
  LOOP
    current_streak := 0;
    max_streak := 0;

    -- Scan battles in reverse chronological order to find current streak
    FOR battle_rec IN
      SELECT winner_id
      FROM battles
      WHERE status = 'completed'
        AND (user_id = user_rec.uid OR opponent_user_id = user_rec.uid)
        AND ended_at IS NOT NULL
      ORDER BY ended_at DESC
    LOOP
      IF battle_rec.winner_id = user_rec.uid THEN
        current_streak := current_streak + 1;
        max_streak := GREATEST(max_streak, current_streak);
      ELSE
        EXIT; -- Stop at first loss for current streak
      END IF;
    END LOOP;

    -- Now scan all battles to find best streak ever
    current_streak := 0;
    FOR battle_rec IN
      SELECT winner_id
      FROM battles
      WHERE status = 'completed'
        AND (user_id = user_rec.uid OR opponent_user_id = user_rec.uid)
        AND ended_at IS NOT NULL
      ORDER BY ended_at ASC
    LOOP
      IF battle_rec.winner_id = user_rec.uid THEN
        current_streak := current_streak + 1;
        max_streak := GREATEST(max_streak, current_streak);
      ELSE
        current_streak := 0;
      END IF;
    END LOOP;

    -- Update user's streaks (re-scan for current streak)
    current_streak := 0;
    FOR battle_rec IN
      SELECT winner_id
      FROM battles
      WHERE status = 'completed'
        AND (user_id = user_rec.uid OR opponent_user_id = user_rec.uid)
        AND ended_at IS NOT NULL
      ORDER BY ended_at DESC
    LOOP
      IF battle_rec.winner_id = user_rec.uid THEN
        current_streak := current_streak + 1;
      ELSE
        EXIT;
      END IF;
    END LOOP;

    UPDATE users
    SET
      current_win_streak = current_streak,
      best_win_streak = max_streak
    WHERE id = user_rec.uid;
  END LOOP;
END $$;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (155, '155_add_win_streak_tracking')
ON CONFLICT (version) DO NOTHING;
