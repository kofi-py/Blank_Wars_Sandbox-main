-- Migration: Add Judge Ruling History System
-- Date: 2025-11-19
-- Purpose: Track AI judge rulings for consistency and bias tracking

BEGIN;

-- =====================================================
-- JUDGE RULINGS TABLE
-- Stores all AI judge rulings during battles
-- =====================================================
CREATE TABLE IF NOT EXISTS judge_rulings (
    id SERIAL PRIMARY KEY,
    battle_id TEXT NOT NULL,                    -- References battles.id
    judge_character_id TEXT NOT NULL,           -- References characters.id (where role='judge')
    ruling_round INTEGER NOT NULL,              -- Which round this ruling occurred

    -- The ruling itself
    situation TEXT NOT NULL,                    -- What situation was being judged
    ruling TEXT NOT NULL,                       -- The judge's decision
    reasoning TEXT NOT NULL,                    -- Why the judge made this decision
    gameplay_effect TEXT NOT NULL,              -- What happened as a result
    narrative_impact TEXT NOT NULL,             -- Story/flavor impact

    -- Characters affected
    character_affected_id TEXT,                 -- Primary character this ruling affected
    character_benefited_id TEXT,                -- Character who benefited from ruling
    character_penalized_id TEXT,                -- Character who was penalized

    -- Ruling metadata
    ruling_type VARCHAR(50),                    -- 'combat', 'penalty', 'drama', 'fairness', etc.
    severity VARCHAR(20),                       -- 'minor', 'moderate', 'major', 'critical'
    was_controversial BOOLEAN DEFAULT FALSE,    -- Did characters disagree with this?

    -- Character reactions
    character_reactions JSONB DEFAULT '{}'::jsonb,  -- Map of character_id -> reaction text

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT fk_battle FOREIGN KEY (battle_id) REFERENCES battles(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_judge_rulings_battle ON judge_rulings(battle_id);
CREATE INDEX IF NOT EXISTS idx_judge_rulings_judge ON judge_rulings(judge_character_id);
CREATE INDEX IF NOT EXISTS idx_judge_rulings_affected ON judge_rulings(character_affected_id);
CREATE INDEX IF NOT EXISTS idx_judge_rulings_benefited ON judge_rulings(character_benefited_id);
CREATE INDEX IF NOT EXISTS idx_judge_rulings_penalized ON judge_rulings(character_penalized_id);
CREATE INDEX IF NOT EXISTS idx_judge_rulings_type ON judge_rulings(ruling_type);
CREATE INDEX IF NOT EXISTS idx_judge_rulings_created ON judge_rulings(created_at DESC);

-- Index for finding rulings involving specific characters
CREATE INDEX IF NOT EXISTS idx_judge_rulings_characters ON judge_rulings(character_affected_id, character_benefited_id, character_penalized_id);

COMMENT ON TABLE judge_rulings IS 'Stores all AI judge rulings for consistency, bias tracking, and character relationship development';
COMMENT ON COLUMN judge_rulings.character_reactions IS 'JSONB map of character_id to their reaction to this ruling';

COMMIT;
