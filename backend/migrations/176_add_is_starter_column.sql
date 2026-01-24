-- Migration 176: Add is_starter column to spell_definitions and power_definitions
-- Purpose: Fix missing column required by auto_unlock_starters trigger (Migration 163)

BEGIN;

-- Add is_starter to spell_definitions
ALTER TABLE spell_definitions ADD COLUMN IF NOT EXISTS is_starter BOOLEAN DEFAULT FALSE;

-- Add is_starter to power_definitions
ALTER TABLE power_definitions ADD COLUMN IF NOT EXISTS is_starter BOOLEAN DEFAULT FALSE;

COMMIT;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (176, '176_add_is_starter_column')
ON CONFLICT (version) DO NOTHING;
