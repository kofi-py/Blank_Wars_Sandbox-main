-- Migration: Add active_teammates and sleeping_arrangement columns
-- Created: 2025-10-07
-- Description: Add missing columns that code expects but were never migrated
-- Fixes confessional 500 error caused by missing database columns

-- Add active_teammates to team_context
-- Stores array of userchar IDs for characters who fight together as teammates
ALTER TABLE team_context
ADD COLUMN active_teammates TEXT[] DEFAULT '{}';

-- Add sleeping_arrangement to user_characters
-- Stores where character sleeps (e.g., 'master_bed', 'bunk_bed', 'floor', 'couch')
ALTER TABLE user_characters
ADD COLUMN sleeping_arrangement VARCHAR(50) DEFAULT 'bunk_bed';

-- Add comments for documentation
COMMENT ON COLUMN team_context.active_teammates IS 'Array of userchar IDs for characters who fight together as battle teammates (distinct from roommates)';
COMMENT ON COLUMN user_characters.sleeping_arrangement IS 'Where this character sleeps: master_bed, bunk_bed, floor, couch, etc.';

-- Record migration
INSERT INTO schema_migrations (version, description, applied_at)
VALUES ('037', 'Add active_teammates and sleeping_arrangement columns', CURRENT_TIMESTAMP);
