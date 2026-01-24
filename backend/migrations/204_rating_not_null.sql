-- Migration 204: Make rating NOT NULL

BEGIN;

-- First ensure no nulls (set to default 1000)
UPDATE users SET rating = 1000 WHERE rating IS NULL;

-- Make column NOT NULL
ALTER TABLE users ALTER COLUMN rating SET NOT NULL;

COMMIT;
