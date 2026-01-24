-- Create unified character_decisions table for all decision tracking across game domains
-- Replaces fragmented JSONB approach in user_characters.recent_decisions

CREATE TABLE IF NOT EXISTS character_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id TEXT REFERENCES user_characters(id) ON DELETE CASCADE NOT NULL,

  -- Decision classification
  domain text NOT NULL CHECK (domain IN ('financial', 'therapy', 'training', 'battle', 'relationship', 'career')),
  decision_type text NOT NULL, -- Domain-specific: 'investment', 'real_estate', 'luxury_purchase', 'party', 'wildcard', 'other' for financial

  -- Common fields
  description text NOT NULL,
  amount integer, -- For financial decisions (in cents or whole dollars depending on domain)
  timestamp timestamptz NOT NULL DEFAULT NOW(),

  -- Coach/advisor interaction tracking
  coach_advice text,
  coach_decision text, -- 'approved', 'declined', 'modified', 'ignored'
  followed_advice boolean,

  -- Outcome tracking
  outcome text, -- 'successful', 'failed', 'pending', 'catastrophic', 'ignored_advice', 'independent_choice', etc.
  financial_impact integer, -- Change in wallet (cents)
  stress_impact integer, -- Change in stress level
  relationship_impact integer, -- Change in trust/relationship metrics

  -- Metadata
  urgency text CHECK (urgency IN ('low', 'medium', 'high')),
  status text CHECK (status IN ('pending', 'decided', 'completed', 'cancelled')) DEFAULT 'pending',
  metadata jsonb DEFAULT '{}'::jsonb, -- Domain-specific extras (character_reasoning, options, etc.)

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_character_decisions_character_id ON character_decisions(character_id);
CREATE INDEX IF NOT EXISTS idx_character_decisions_domain ON character_decisions(domain);
CREATE INDEX IF NOT EXISTS idx_character_decisions_timestamp ON character_decisions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_character_decisions_status ON character_decisions(status);
CREATE INDEX IF NOT EXISTS idx_character_decisions_domain_type ON character_decisions(domain, decision_type);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_character_decisions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
-- Trigger to auto-update updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'character_decisions_updated_at') THEN
    CREATE TRIGGER character_decisions_updated_at
      BEFORE UPDATE ON character_decisions
      FOR EACH ROW
      EXECUTE FUNCTION update_character_decisions_updated_at();
  END IF;
END
$$;

-- Comment on table
COMMENT ON TABLE character_decisions IS 'Unified decision tracking across all game domains (financial, therapy, training, battle, relationship, career). Replaces fragmented JSONB approach in user_characters.recent_decisions.';

COMMENT ON COLUMN character_decisions.domain IS 'Decision domain: financial, therapy, training, battle, relationship, career';
COMMENT ON COLUMN character_decisions.decision_type IS 'Domain-specific type. Financial: investment, real_estate, luxury_purchase, party, wildcard, other';
COMMENT ON COLUMN character_decisions.metadata IS 'Domain-specific extra fields stored as JSONB for flexibility';

-- Record migration
INSERT INTO migration_log (version, name) VALUES (118, '118_create_character_decisions_table') ON CONFLICT (version) DO NOTHING;
