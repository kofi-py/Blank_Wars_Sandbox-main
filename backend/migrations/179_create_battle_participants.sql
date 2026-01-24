CREATE TABLE IF NOT EXISTS battle_participants (
    battle_id TEXT NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
    character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    
    -- Dynamic State
    current_health INTEGER NOT NULL DEFAULT 0,
    current_ap INTEGER NOT NULL DEFAULT 0,
    current_position JSONB DEFAULT NULL, -- Hex coordinates {q, r, s}
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    PRIMARY KEY (battle_id, character_id)
);

-- Index for faster lookups by battle
CREATE INDEX IF NOT EXISTS idx_battle_participants_battle_id ON battle_participants(battle_id);

-- Index for lookups by user (e.g. "active battles for user")
CREATE INDEX IF NOT EXISTS idx_battle_participants_user_id ON battle_participants(user_id);

-- Log migration
INSERT INTO migration_log (version, name)
VALUES (179, '179_create_battle_participants')
ON CONFLICT (version) DO NOTHING;
