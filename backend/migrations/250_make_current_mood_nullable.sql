-- Migration 250: Make current_mood nullable to allow AFTER INSERT trigger to work
-- Flow: INSERT with NULL -> GENERATED columns calculated -> AFTER INSERT updates current_mood

ALTER TABLE user_characters ALTER COLUMN current_mood DROP NOT NULL;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (250, '250_make_current_mood_nullable')
ON CONFLICT (version) DO NOTHING;
