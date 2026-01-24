-- Migration 185: Create domain_context table for character domain-specific personas
-- This replaces hardcoded personas in domain handler files (like socialContext.ts)

CREATE TABLE IF NOT EXISTS domain_context (
  id SERIAL PRIMARY KEY,
  character_id VARCHAR(255) NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  domain VARCHAR(50) NOT NULL,
  context_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(character_id, domain)
);

-- Index for fast lookups by character and domain
CREATE INDEX IF NOT EXISTS idx_domain_context_character_domain
ON domain_context(character_id, domain);

-- Comment explaining the table
COMMENT ON TABLE domain_context IS 'Stores domain-specific character context/personas. Each character can have different behavioral context for different domains (kitchen_table, battle, therapy_patient, etc.)';

COMMENT ON COLUMN domain_context.domain IS 'The domain this context applies to: kitchen_table, battle, therapy_patient, confessional, training, etc.';
COMMENT ON COLUMN domain_context.context_text IS 'Domain-specific behavioral instructions or persona description for the character in this domain';

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (185, '185_create_domain_context_table')
ON CONFLICT (version) DO NOTHING;
