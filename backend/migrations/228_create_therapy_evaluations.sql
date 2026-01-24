-- Migration 228: Create therapy_evaluations table
-- Stores therapist round evaluations and judge session evaluations

CREATE TABLE therapy_evaluations (
    id SERIAL PRIMARY KEY,
    session_id TEXT NOT NULL,
    user_character_id TEXT NOT NULL REFERENCES user_characters(id),
    evaluator_id TEXT NOT NULL REFERENCES characters(id),
    evaluator_type TEXT NOT NULL CHECK (evaluator_type IN ('therapist', 'judge')),
    round_number INTEGER NOT NULL CHECK (round_number >= 1 AND round_number <= 4),
    intensity TEXT NOT NULL CHECK (intensity IN ('soft', 'medium', 'hard')),
    choice TEXT NOT NULL CHECK (choice IN ('A', 'B', 'C', 'D', 'E')),
    reasoning TEXT NOT NULL,
    bonuses_applied JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_therapy_evaluations_session ON therapy_evaluations(session_id);
CREATE INDEX idx_therapy_evaluations_user_character ON therapy_evaluations(user_character_id);
CREATE INDEX idx_therapy_evaluations_evaluator ON therapy_evaluations(evaluator_id);
CREATE INDEX idx_therapy_evaluations_created ON therapy_evaluations(created_at);
