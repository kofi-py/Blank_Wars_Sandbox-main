-- Migration 229: Add coach_name to users table
-- The user IS the coach. coach_name is their display name as a coach.

ALTER TABLE users ADD COLUMN IF NOT EXISTS coach_name TEXT;

-- Set coach_name to username for existing users
UPDATE users SET coach_name = username WHERE coach_name IS NULL;

-- Make it NOT NULL after populating
ALTER TABLE users ALTER COLUMN coach_name SET NOT NULL;

-- Add index for coach_name lookups
CREATE INDEX IF NOT EXISTS idx_users_coach_name ON users(coach_name);
