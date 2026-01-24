-- Migration: Add GameEventBus persistence tables
-- Date: 2025-08-22
-- Purpose: Add database persistence for GameEventBus events and memories

BEGIN;

-- GameEvents table for event persistence
CREATE TABLE IF NOT EXISTS game_events (
    id VARCHAR(255) PRIMARY KEY,
    type VARCHAR(100) NOT NULL,
    source VARCHAR(100) NOT NULL,
    primary_character_id VARCHAR(255) NOT NULL,
    secondary_character_ids TEXT[], -- Array of character IDs
    severity VARCHAR(20) DEFAULT 'medium',
    category VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    importance INTEGER DEFAULT 5,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Character memories table for memory persistence  
CREATE TABLE IF NOT EXISTS character_memories (
    id VARCHAR(255) PRIMARY KEY,
    character_id VARCHAR(255) NOT NULL,
    event_id VARCHAR(255) REFERENCES game_events(id),
    content TEXT NOT NULL,
    emotion_type VARCHAR(50),
    intensity INTEGER DEFAULT 5, -- 1-10
    valence INTEGER DEFAULT 5, -- 1-10 (negative to positive)
    importance INTEGER DEFAULT 5, -- 1-10
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_recalled TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    recall_count INTEGER DEFAULT 0,
    associated_characters TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    decay_rate DECIMAL DEFAULT 1.0,
    
    -- Chat context
    chat_context JSONB,
    
    -- Cross-reference data for comedy
    cross_reference_data JSONB,
    
    -- Domain-specific metadata
    financial_metadata JSONB,
    therapy_metadata JSONB,
    confessional_metadata JSONB
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_events_timestamp ON game_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_game_events_type ON game_events(type);
CREATE INDEX IF NOT EXISTS idx_game_events_primary_char ON game_events(primary_character_id);
CREATE INDEX IF NOT EXISTS idx_game_events_category ON game_events(category);

CREATE INDEX IF NOT EXISTS idx_character_memories_char_id ON character_memories(character_id);
CREATE INDEX IF NOT EXISTS idx_character_memories_event_id ON character_memories(event_id);
CREATE INDEX IF NOT EXISTS idx_character_memories_importance ON character_memories(importance);
CREATE INDEX IF NOT EXISTS idx_character_memories_created_at ON character_memories(created_at);

-- Record the migration
INSERT INTO migration_log (version, name) VALUES (17, '017_add_game_event_bus_persistence') ON CONFLICT (version) DO NOTHING;

COMMIT;