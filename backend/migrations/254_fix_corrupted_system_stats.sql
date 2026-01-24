-- Migration: Fix corrupted system character stats
-- Description: Updates max_health, max_energy, and max_mana to 100 for system characters.
-- This prevents constraint violations (CHECK >= 0) when these characters are copied to new users.

BEGIN;

UPDATE characters
SET 
    max_health = 100,
    max_energy = 100,
    max_mana = 100
WHERE role IN ('therapist', 'judge', 'host', 'real_estate_agent', 'trainer');

COMMIT;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (254, '254_fix_corrupted_system_stats')
ON CONFLICT (version) DO NOTHING;
