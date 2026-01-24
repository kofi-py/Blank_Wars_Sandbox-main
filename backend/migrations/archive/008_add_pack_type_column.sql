-- Migration 008: Add pack_type column to claimable_packs table
-- This adds the missing pack_type column that the pack service expects

ALTER TABLE claimable_packs ADD COLUMN pack_type VARCHAR(50);

-- Add an index on pack_type for performance
CREATE INDEX idx_claimable_packs_pack_type ON claimable_packs(pack_type);

-- Update any existing records to have a default pack_type (if any exist)
UPDATE claimable_packs SET pack_type = 'standard' WHERE pack_type IS NULL;
