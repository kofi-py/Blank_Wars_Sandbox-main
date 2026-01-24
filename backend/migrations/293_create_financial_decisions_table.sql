-- Migration 293: Recreate financial_decisions table with correct schema
-- Fixes: removes _cents suffix, adds blueprint columns, correct FK types
-- Reference: character_decisions table for pattern

BEGIN;

-- Rename old table (preserve data just in case)
ALTER TABLE IF EXISTS financial_decisions RENAME TO financial_decisions_deprecated_293;

-- Drop old indexes if they exist
DROP INDEX IF EXISTS idx_financial_decisions_character;
DROP INDEX IF EXISTS idx_financial_decisions_pending;

-- Create new table with correct schema
CREATE TABLE financial_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES user_characters(id) ON DELETE CASCADE,

  -- What they want to buy (TEXT to match items/equipment tables)
  item_id TEXT REFERENCES items(id),
  equipment_id TEXT REFERENCES equipment(id),

  -- Decision details
  category TEXT NOT NULL CHECK (category IN ('luxury', 'investment', 'essentials', 'impulse', 'generosity', 'debt_payment')),
  amount INTEGER NOT NULL,
  character_reasoning TEXT NOT NULL,
  is_risky BOOLEAN NOT NULL DEFAULT false,

  -- Coach response (null until coach responds)
  coach_response TEXT CHECK (coach_response IN ('endorse', 'advise_against')),

  -- Character response after coach (null until resolved)
  character_response TEXT CHECK (character_response IN ('comply', 'defy')),
  adherence_roll INTEGER,
  outcome TEXT CHECK (outcome IN ('executed', 'rejected')),

  -- Judge evaluation (null until judged)
  judge_character_id UUID REFERENCES user_characters(id),
  judge_grade TEXT CHECK (judge_grade IN ('A', 'B', 'C', 'D', 'E')),
  judge_ruling TEXT,

  -- Outcome changes (no _cents suffix - matches user_characters.wallet/debt)
  trust_change INTEGER,
  stress_change INTEGER,
  wallet_change INTEGER,
  debt_change INTEGER,
  xp_change INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,

  -- Ensure item OR equipment is set (or neither for debt_payment)
  CONSTRAINT financial_decisions_item_or_equipment CHECK (
    (item_id IS NOT NULL AND equipment_id IS NULL) OR
    (item_id IS NULL AND equipment_id IS NOT NULL) OR
    (item_id IS NULL AND equipment_id IS NULL AND category = 'debt_payment')
  )
);

-- Index for finding pending decisions by character
CREATE INDEX idx_financial_decisions_pending
  ON financial_decisions(character_id)
  WHERE resolved_at IS NULL;

-- Index for finding all decisions by character
CREATE INDEX idx_financial_decisions_character
  ON financial_decisions(character_id);

-- Ensure only one pending decision per character at a time
CREATE UNIQUE INDEX idx_financial_decisions_one_pending_per_char
  ON financial_decisions(character_id)
  WHERE resolved_at IS NULL;

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (293, '293_create_financial_decisions_table')
ON CONFLICT (version) DO NOTHING;

COMMIT;
