-- Migration 007: Rename gameplan_adherence_level to gameplan_adherence
-- Standardizing column name to match codebase convention

-- Rename column in user_characters
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_characters'
        AND column_name = 'gameplan_adherence_level'
    ) THEN
        ALTER TABLE user_characters
        RENAME COLUMN gameplan_adherence_level TO gameplan_adherence;
    END IF;

    -- Try to rename constraint if it exists (may not exist in all schemas)
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'user_characters'
        AND constraint_name = 'user_characters_gameplan_adherence_level_check'
    ) THEN
        ALTER TABLE user_characters
        RENAME CONSTRAINT user_characters_gameplan_adherence_level_check
        TO user_characters_gameplan_adherence_check;
    END IF;
END $$;

-- Rename column in characters
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'characters'
        AND column_name = 'gameplan_adherence_level'
    ) THEN
        ALTER TABLE characters
        RENAME COLUMN gameplan_adherence_level TO gameplan_adherence;
    END IF;
END $$;

-- Rename column in tmp_user_characters_backup if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'tmp_user_characters_backup'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tmp_user_characters_backup'
        AND column_name = 'gameplan_adherence_level'
    ) THEN
        ALTER TABLE tmp_user_characters_backup
        RENAME COLUMN gameplan_adherence_level TO gameplan_adherence;
    END IF;
END $$;

-- Update comments (only if column exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_characters'
        AND column_name = 'gameplan_adherence'
    ) THEN
        COMMENT ON COLUMN user_characters.gameplan_adherence IS 'Characters tendency to follow coachs strategy (0-100). Calculated from archetype, species, rarity, personality. Modified by stress, HP, confidence.';
    END IF;
END $$;
