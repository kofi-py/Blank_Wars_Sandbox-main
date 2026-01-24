-- Migration 007: Add rating column to users table
-- This adds the missing rating column that the authentication system expects

ALTER TABLE users ADD COLUMN rating INTEGER DEFAULT 1000;

-- Add an index on rating for performance
CREATE INDEX idx_users_rating ON users(rating);

-- Add a check constraint to ensure rating is non-negative
ALTER TABLE users ADD CONSTRAINT users_rating_check CHECK (rating >= 0);

-- Update any existing users to have the default rating
UPDATE users SET rating = 1000 WHERE rating IS NULL;
