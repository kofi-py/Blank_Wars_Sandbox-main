-- Add base_action_points column to characters table
-- Default is 3, Kali gets 4

BEGIN;

ALTER TABLE characters
ADD COLUMN IF NOT EXISTS base_action_points INTEGER DEFAULT 3;

-- Update Kali to have 4 action points (idempotent)
UPDATE characters
SET base_action_points = 4
WHERE id = 'kali';

-- Record migration
INSERT INTO migration_log (version, name) VALUES (133, '133_add_base_action_points') ON CONFLICT (version) DO NOTHING;

COMMIT;
