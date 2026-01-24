-- Migration 038: Create comedian styles library table
-- Provides a reference library of comedy styles for character creation
-- Two categories: public_domain (real comedians with examples) and inspired (style-based, anonymized)

BEGIN;

CREATE TABLE comedian_styles (
  id SERIAL PRIMARY KEY,
  category VARCHAR(20) NOT NULL CHECK (category IN ('public_domain', 'inspired')),

  -- For public_domain: real comedian name
  -- For inspired: style code
  comedian_name VARCHAR(100),
  birth_year INTEGER,
  death_year INTEGER,
  era VARCHAR(50), -- 'vaudeville', 'golden_age', 'modern', etc.

  -- Style description (required for both categories)
  comedy_style TEXT NOT NULL,

  -- Example material
  -- For public_domain: verbatim quotes/bits from their work
  -- For inspired: original examples in the style (not verbatim)
  example_material TEXT,

  -- Metadata
  -- For public_domain: bio/context, influences, career info
  -- For inspired: context/environment where the style works best
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  CONSTRAINT comedian_name_required
    CHECK (comedian_name IS NOT NULL)
);

-- Index for filtering by category
CREATE INDEX idx_comedian_styles_category ON comedian_styles(category);
CREATE INDEX idx_comedian_styles_era ON comedian_styles(era);

-- Record migration
INSERT INTO migration_log (version, name) VALUES (38, '038_create_comedian_styles_library') ON CONFLICT (version) DO NOTHING;

COMMIT;
