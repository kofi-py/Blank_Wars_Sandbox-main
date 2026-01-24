-- Migration 043: Add timezone to users and scene type constraints
-- Enables dynamic time-of-day calculation and enforces valid scene types

-- Add timezone column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) DEFAULT 'America/New_York';

-- Add constraints to team_context for valid scene types and times
ALTER TABLE team_context
DROP CONSTRAINT IF EXISTS team_context_scene_type_check;

ALTER TABLE team_context
ADD CONSTRAINT team_context_scene_type_check
CHECK (current_scene_type IN ('mundane', 'conflict', 'chaos'));

ALTER TABLE team_context
DROP CONSTRAINT IF EXISTS team_context_time_of_day_check;

ALTER TABLE team_context
ADD CONSTRAINT team_context_time_of_day_check
CHECK (current_time_of_day IN ('morning', 'afternoon', 'evening', 'night'));

-- Update any existing NULL or invalid values before constraints take effect
UPDATE team_context
SET current_scene_type = 'mundane'
WHERE current_scene_type IS NULL OR current_scene_type NOT IN ('mundane', 'conflict', 'chaos');

UPDATE team_context
SET current_time_of_day = 'afternoon'
WHERE current_time_of_day IS NULL OR current_time_of_day NOT IN ('morning', 'afternoon', 'evening', 'night');
