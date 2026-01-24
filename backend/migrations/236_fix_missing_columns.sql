-- Migration 236: Fix missing columns in characters and signature_attribute_modifiers
-- Goal: Add columns that are causing 500 errors in logs.

BEGIN;

-- 1. Add missing resistance columns to characters
ALTER TABLE characters 
  ADD COLUMN IF NOT EXISTS physical_resistance INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS magical_resistance INTEGER DEFAULT 0;

-- 2. Add missing source column to signature_attribute_modifiers
ALTER TABLE signature_attribute_modifiers 
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'individual';

COMMIT;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (236, '236_fix_missing_columns')
ON CONFLICT (version) DO NOTHING;
