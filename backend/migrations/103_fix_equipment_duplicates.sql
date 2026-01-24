-- Migration 102: Fix Equipment Duplicates
-- Purpose: Remove duplicate rows from equipment table and enforce unique ID constraint
-- Date: 2025-11-21

BEGIN;

-- 1. Remove duplicates (keep the row with the highest ctid - effectively the latest one)
DELETE FROM equipment a USING equipment b
WHERE a.id = b.id AND a.ctid < b.ctid;

-- 2. Add unique constraint to prevent future duplicates
ALTER TABLE equipment ADD CONSTRAINT equipment_id_unique UNIQUE (id);

COMMIT;
