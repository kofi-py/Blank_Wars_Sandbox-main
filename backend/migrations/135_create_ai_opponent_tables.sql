-- Create AI Opponent Tables for Persistent PVE

BEGIN;

-- 1. AI Coaches (The "User" equivalent for AI)
CREATE TABLE IF NOT EXISTS ai_coaches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    difficulty_tier TEXT NOT NULL CHECK (difficulty_tier IN ('tutorial', 'easy', 'medium', 'hard', 'elite', 'boss')),
    personality_profile TEXT, -- JSON string for trash talk style
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. AI Teams (The "Team" equivalent)
CREATE TABLE IF NOT EXISTS ai_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES ai_coaches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    rating INTEGER DEFAULT 1000, -- ELO rating for matchmaking
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. AI Characters (The "Character" equivalent)
-- Stores specific instances of canonical characters owned by AI teams
CREATE TABLE IF NOT EXISTS ai_characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES ai_teams(id) ON DELETE CASCADE,
    character_id TEXT NOT NULL REFERENCES characters(id), -- Link to canonical definition
    
    -- Instance Stats (Snapshot of power at creation/level-up)
    level INTEGER NOT NULL DEFAULT 1,
    experience INTEGER DEFAULT 0,
    
    current_health INTEGER NOT NULL,
    max_health INTEGER NOT NULL,
    current_mana INTEGER NOT NULL,
    max_mana INTEGER NOT NULL,
    current_energy INTEGER NOT NULL,
    max_energy INTEGER NOT NULL,
    
    -- Combat Stats
    attack INTEGER NOT NULL,
    defense INTEGER NOT NULL,
    speed INTEGER NOT NULL,
    magic_attack INTEGER NOT NULL,
    magic_defense INTEGER NOT NULL,
    
    -- Loadout
    abilities TEXT DEFAULT '[]', -- JSON array
    personality_traits TEXT DEFAULT '[]', -- JSON array
    equipment TEXT DEFAULT '[]', -- JSON array
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_teams_rating ON ai_teams(rating);
CREATE INDEX IF NOT EXISTS idx_ai_teams_coach ON ai_teams(coach_id);
CREATE INDEX IF NOT EXISTS idx_ai_characters_team ON ai_characters(team_id);

-- Record migration
INSERT INTO migration_log (version, name) VALUES (135, '135_create_ai_opponent_tables') ON CONFLICT (version) DO NOTHING;

COMMIT;
