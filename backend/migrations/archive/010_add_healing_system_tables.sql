-- Migration 010: Add missing columns and tables for healing system
-- This adds the missing is_dead column and healing tables

-- Add is_dead column to user_characters
ALTER TABLE user_characters ADD COLUMN is_dead BOOLEAN DEFAULT false;
ALTER TABLE user_characters ADD COLUMN resurrection_available_at TIMESTAMP WITHOUT TIME ZONE;

-- Create character_healing_sessions table
CREATE TABLE character_healing_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_character_id UUID NOT NULL REFERENCES user_characters(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    healing_facility_id VARCHAR(50) REFERENCES healing_facilities(id),
    healing_type VARCHAR(50) NOT NULL DEFAULT 'natural',
    start_time TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estimated_completion_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    actual_completion_time TIMESTAMP WITHOUT TIME ZONE,
    healing_amount INTEGER NOT NULL DEFAULT 0,
    cost_paid INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_user_characters_is_dead ON user_characters(is_dead);
CREATE INDEX idx_user_characters_resurrection ON user_characters(resurrection_available_at);
CREATE INDEX idx_healing_sessions_active ON character_healing_sessions(is_active);
CREATE INDEX idx_healing_sessions_completion ON character_healing_sessions(estimated_completion_time);
CREATE INDEX idx_healing_sessions_user ON character_healing_sessions(user_id);
CREATE INDEX idx_healing_sessions_character ON character_healing_sessions(user_character_id);

-- Add check constraints
ALTER TABLE user_characters ADD CONSTRAINT user_characters_resurrection_check
  CHECK (resurrection_available_at IS NULL OR is_dead = true);

ALTER TABLE character_healing_sessions ADD CONSTRAINT healing_sessions_healing_amount_check
  CHECK (healing_amount >= 0);

ALTER TABLE character_healing_sessions ADD CONSTRAINT healing_sessions_cost_check
  CHECK (cost_paid >= 0);
