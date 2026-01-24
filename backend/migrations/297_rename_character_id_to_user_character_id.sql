-- Migration 297: Fix financial_decisions column naming and add missing columns
--
-- Fixes:
-- 1. Rename character_id → user_character_id (correct naming convention)
-- 2. Add missing columns needed by /decisions/commit route:
--    - decision_type: Type of decision (purchase, etc.)
--    - payment_method: cash or debt
--    - description: Optional description
--    - metadata: JSONB for additional data

BEGIN;

-- =====================================================
-- 1. RENAME THE COLUMN
-- =====================================================

ALTER TABLE financial_decisions
RENAME COLUMN character_id TO user_character_id;

-- =====================================================
-- 2. ADD MISSING COLUMNS FOR COMMIT ROUTE
-- =====================================================

-- decision_type: Distinguishes character-initiated decisions from direct commits
ALTER TABLE financial_decisions
ADD COLUMN IF NOT EXISTS decision_type TEXT;

-- payment_method: How the purchase was paid (cash or debt)
ALTER TABLE financial_decisions
ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Add constraint for payment_method (drop first for idempotency)
ALTER TABLE financial_decisions
DROP CONSTRAINT IF EXISTS chk_payment_method;

ALTER TABLE financial_decisions
ADD CONSTRAINT chk_payment_method
CHECK (payment_method IN ('cash', 'debt') OR payment_method IS NULL);

-- description: Optional description of the transaction
ALTER TABLE financial_decisions
ADD COLUMN IF NOT EXISTS description TEXT;

-- metadata: JSONB for additional transaction data (apr, term, etc.)
ALTER TABLE financial_decisions
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- =====================================================
-- 3. RENAME THE INDEXES (they reference the old column name)
-- =====================================================

-- Drop old indexes
DROP INDEX IF EXISTS idx_financial_decisions_pending;
DROP INDEX IF EXISTS idx_financial_decisions_character;
DROP INDEX IF EXISTS idx_financial_decisions_one_pending_per_char;

-- Recreate with new column name
CREATE INDEX IF NOT EXISTS idx_financial_decisions_pending
  ON financial_decisions(user_character_id)
  WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_financial_decisions_user_character
  ON financial_decisions(user_character_id);

-- Note: Can't use IF NOT EXISTS with UNIQUE INDEX, so drop first
DROP INDEX IF EXISTS idx_financial_decisions_one_pending_per_user_char;
CREATE UNIQUE INDEX idx_financial_decisions_one_pending_per_user_char
  ON financial_decisions(user_character_id)
  WHERE resolved_at IS NULL;

-- =====================================================
-- 4. LOG MIGRATION
-- =====================================================

INSERT INTO migration_log (version, name)
VALUES (297, '297_rename_character_id_to_user_character_id')
ON CONFLICT (version) DO NOTHING;

COMMIT;
