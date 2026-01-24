-- Migration 192: Fix signature_attribute_modifiers schema
-- Remove source column from primary key to match archetype and species tables
-- The 4-tier system (base + archetype + species + individual) requires ONE modifier per attribute per character

BEGIN;

-- Step 1: Drop the existing primary key constraint (if exists)
ALTER TABLE signature_attribute_modifiers DROP CONSTRAINT IF EXISTS signature_attribute_modifiers_pkey;

-- Step 2: Drop the source column (not needed for 4-tier base stat system)
ALTER TABLE signature_attribute_modifiers DROP COLUMN IF EXISTS source;

-- Step 3: Add new primary key matching archetype and species tables
-- Always add after dropping, regardless of previous state
DO $$
BEGIN
    -- Only add if constraint doesn't currently exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'signature_attribute_modifiers'::regclass
        AND conname = 'signature_attribute_modifiers_pkey'
    ) THEN
        ALTER TABLE signature_attribute_modifiers ADD PRIMARY KEY (character_id, attribute_name);
    END IF;
END $$;

COMMIT;

-- Verification
SELECT 'Schema fixed. New primary key: (character_id, attribute_name)' AS status;
SELECT COUNT(*) AS row_count FROM signature_attribute_modifiers;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (191, '191_fix_signature_modifiers_schema')
ON CONFLICT (version) DO NOTHING;
