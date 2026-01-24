-- Migration 305: Enhance Team Relationships
-- Adds tenure tracking columns to existing team_relationships table

BEGIN;

ALTER TABLE team_relationships
    ADD COLUMN IF NOT EXISTS days_together INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS challenges_completed INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS dramas_survived INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS training_sessions_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS social_activities_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS roster_changes INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS chemistry_level TEXT DEFAULT 'neutral'
        CHECK (chemistry_level IN ('toxic', 'strained', 'neutral', 'bonded', 'legendary')),
    ADD COLUMN IF NOT EXISTS formed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

COMMIT;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (305, '305_enhance_team_relationships')
ON CONFLICT (version) DO NOTHING;
