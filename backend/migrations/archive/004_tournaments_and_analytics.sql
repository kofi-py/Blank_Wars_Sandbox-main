-- Migration: 004_tournaments_and_analytics
-- Description: Tournament system, analytics, and advanced features
-- Created: 2025-07-22

BEGIN;

-- =====================================================
-- TOURNAMENT SYSTEM TABLES
-- =====================================================

-- Tournament definitions
CREATE TABLE tournaments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    description TEXT,

    -- Tournament configuration
    format tournament_format NOT NULL,
    status tournament_status DEFAULT 'upcoming',
    max_participants INTEGER NOT NULL,
    min_participants INTEGER DEFAULT 2,

    -- Entry requirements
    entry_fee_credits INTEGER DEFAULT 0,
    entry_fee_gems INTEGER DEFAULT 0,
    required_level INTEGER DEFAULT 1,
    required_characters INTEGER DEFAULT 3,

    -- Scheduling
    registration_opens_at TIMESTAMP NOT NULL,
    registration_closes_at TIMESTAMP NOT NULL,
    tournament_starts_at TIMESTAMP NOT NULL,
    tournament_ends_at TIMESTAMP,

    -- Bracket and progression
    current_round INTEGER DEFAULT 1,
    total_rounds INTEGER,
    bracket_data JSONB DEFAULT '{}'::jsonb, -- Tournament bracket structure

    -- Prizes and rewards
    prize_pool JSONB DEFAULT '{}'::jsonb, -- Distribution of rewards
    sponsor_data JSONB DEFAULT '{}'::jsonb,

    -- Rules and restrictions
    team_size INTEGER DEFAULT 3,
    character_restrictions JSONB DEFAULT '[]'::jsonb, -- Banned/required characters
    special_rules JSONB DEFAULT '{}'::jsonb,

    -- Organizer and moderation
    organizer_user_id UUID REFERENCES users(id),
    is_official BOOLEAN DEFAULT FALSE,
    moderation_notes TEXT,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tournaments_status ON tournaments (status);
CREATE INDEX idx_tournaments_registration ON tournaments (registration_opens_at, registration_closes_at);
CREATE INDEX idx_tournaments_starts ON tournaments (tournament_starts_at);
CREATE INDEX idx_tournaments_organizer ON tournaments (organizer_user_id);

-- Tournament participants
CREATE TABLE tournament_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Registration data
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    team_composition JSONB NOT NULL, -- Array of character IDs
    team_name VARCHAR(100),

    -- Tournament progression
    current_round INTEGER DEFAULT 1,
    is_eliminated BOOLEAN DEFAULT FALSE,
    eliminated_at TIMESTAMP,
    eliminated_by_user_id UUID REFERENCES users(id),

    -- Performance tracking
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    total_battles INTEGER DEFAULT 0,
    points INTEGER DEFAULT 0, -- For Swiss format

    -- Placement and rewards
    final_placement INTEGER,
    rewards_claimed BOOLEAN DEFAULT FALSE,
    rewards_data JSONB DEFAULT '{}'::jsonb,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(tournament_id, user_id)
);

CREATE INDEX idx_tournament_participants_tournament ON tournament_participants (tournament_id);
CREATE INDEX idx_tournament_participants_user ON tournament_participants (user_id);
CREATE INDEX idx_tournament_participants_eliminated ON tournament_participants (is_eliminated);
CREATE INDEX idx_tournament_participants_placement ON tournament_participants (final_placement);

-- =====================================================
-- ANALYTICS AND TRACKING TABLES
-- =====================================================

-- Analytics events for user behavior tracking
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(255),

    -- Event classification
    event_type VARCHAR(100) NOT NULL, -- 'battle_start', 'pack_open', 'character_upgrade'
    event_category VARCHAR(50), -- 'gameplay', 'economy', 'social'
    event_source VARCHAR(100), -- 'mobile_app', 'web_app', 'api'

    -- Event data
    event_data JSONB DEFAULT '{}'::jsonb,
    event_value DECIMAL(10,2), -- Monetary or point value if applicable

    -- Context
    character_context VARCHAR(50), -- Character involved if any
    battle_context UUID, -- Battle ID if applicable
    device_info JSONB DEFAULT '{}'::jsonb,

    -- Geolocation (if consented)
    country_code VARCHAR(2),
    region VARCHAR(50),

    -- Timing
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    event_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- A/B testing
    experiment_variant VARCHAR(50),
    experiment_id VARCHAR(100)
);

CREATE INDEX idx_analytics_events_user ON analytics_events (user_id);
CREATE INDEX idx_analytics_events_type ON analytics_events (event_type);
CREATE INDEX idx_analytics_events_category ON analytics_events (event_category);
CREATE INDEX idx_analytics_events_created ON analytics_events (created_at);
CREATE INDEX idx_analytics_events_session ON analytics_events (session_id);

-- =====================================================
-- CHARACTER ECHO SYSTEM (DUPLICATES)
-- =====================================================

-- Track duplicate characters for echo points/currency
CREATE TABLE user_character_echoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    character_id VARCHAR(50) NOT NULL REFERENCES characters(id),

    -- Echo data
    echo_count INTEGER DEFAULT 0 CHECK (echo_count >= 0),
    total_echoes_ever INTEGER DEFAULT 0, -- Historical total

    -- Conversion tracking
    last_conversion_at TIMESTAMP,
    total_converted_to_currency INTEGER DEFAULT 0,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, character_id)
);

CREATE INDEX idx_user_character_echoes_user ON user_character_echoes (user_id);
CREATE INDEX idx_user_character_echoes_character ON user_character_echoes (character_id);
CREATE INDEX idx_user_character_echoes_count ON user_character_echoes (echo_count);

-- =====================================================
-- TRAINING AND PROGRESSION SYSTEM
-- =====================================================

-- Training sessions and activities
CREATE TABLE training_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    character_id UUID NOT NULL REFERENCES user_characters(id) ON DELETE CASCADE,

    -- Training details
    training_type VARCHAR(50) NOT NULL, -- 'combat', 'mental_health', 'team_chemistry'
    training_activity VARCHAR(100) NOT NULL,
    duration_minutes INTEGER NOT NULL,

    -- Results
    experience_gained INTEGER DEFAULT 0,
    skill_points_gained INTEGER DEFAULT 0,
    stat_improvements JSONB DEFAULT '{}'::jsonb,

    -- Training quality
    training_quality DECIMAL(3,2) DEFAULT 1.00, -- 0.0 to 1.0 multiplier
    trainer_type VARCHAR(50), -- 'ai', 'player', 'professional'
    trainer_id VARCHAR(100),

    -- Context
    training_context JSONB DEFAULT '{}'::jsonb,
    pre_training_stats JSONB DEFAULT '{}'::jsonb,
    post_training_stats JSONB DEFAULT '{}'::jsonb,

    -- Completion
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_training_sessions_user ON training_sessions (user_id);
CREATE INDEX idx_training_sessions_character ON training_sessions (character_id);
CREATE INDEX idx_training_sessions_type ON training_sessions (training_type);
CREATE INDEX idx_training_sessions_completed ON training_sessions (is_completed);
CREATE INDEX idx_training_sessions_created ON training_sessions (created_at);

-- =====================================================
-- CONFLICT AND THERAPY SYSTEM
-- =====================================================

-- Conflict events between characters
CREATE TABLE character_conflicts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    character1_id UUID NOT NULL REFERENCES user_characters(id) ON DELETE CASCADE,
    character2_id UUID NOT NULL REFERENCES user_characters(id) ON DELETE CASCADE,

    -- Conflict details
    conflict_type VARCHAR(50) NOT NULL, -- 'personality', 'strategy', 'trust', 'rivalry'
    severity INTEGER DEFAULT 1 CHECK (severity >= 1 AND severity <= 10),
    description TEXT,

    -- Context
    trigger_event VARCHAR(100), -- What caused this conflict
    battle_context UUID, -- Battle where it occurred
    training_context UUID, -- Training session where it occurred

    -- Resolution
    is_resolved BOOLEAN DEFAULT FALSE,
    resolution_method VARCHAR(50), -- 'therapy', 'team_building', 'time', 'separation'
    resolved_at TIMESTAMP,
    resolution_notes TEXT,

    -- Impact tracking
    relationship_impact INTEGER DEFAULT 0, -- Change in relationship score
    team_chemistry_impact INTEGER DEFAULT 0,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CHECK(character1_id != character2_id)
);

CREATE INDEX idx_character_conflicts_user ON character_conflicts (user_id);
CREATE INDEX idx_character_conflicts_char1 ON character_conflicts (character1_id);
CREATE INDEX idx_character_conflicts_char2 ON character_conflicts (character2_id);
CREATE INDEX idx_character_conflicts_resolved ON character_conflicts (is_resolved);
CREATE INDEX idx_character_conflicts_severity ON character_conflicts (severity);

-- Therapy and counseling sessions
CREATE TABLE therapy_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Session participants
    target_character_ids JSONB NOT NULL, -- Array of character IDs receiving therapy
    conflict_id UUID REFERENCES character_conflicts(id), -- If addressing a specific conflict

    -- Session details
    session_type VARCHAR(50) NOT NULL, -- 'individual', 'group', 'conflict_resolution'
    therapist_type VARCHAR(50) DEFAULT 'ai', -- 'ai', 'player_coach', 'professional'
    duration_minutes INTEGER DEFAULT 30,

    -- Session data
    session_transcript JSONB DEFAULT '[]'::jsonb, -- Array of conversation turns
    therapy_goals JSONB DEFAULT '[]'::jsonb,
    techniques_used JSONB DEFAULT '[]'::jsonb,

    -- Outcomes
    mental_health_improvements JSONB DEFAULT '{}'::jsonb, -- Per character
    relationship_improvements JSONB DEFAULT '{}'::jsonb,
    behavioral_changes JSONB DEFAULT '{}'::jsonb,

    -- Quality metrics
    session_effectiveness DECIMAL(3,2) DEFAULT 0.50, -- 0.0 to 1.0
    participant_satisfaction JSONB DEFAULT '{}'::jsonb, -- Per character ratings

    -- Follow-up
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_scheduled_at TIMESTAMP,
    homework_assigned JSONB DEFAULT '[]'::jsonb,

    -- Completion
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_therapy_sessions_user ON therapy_sessions (user_id);
CREATE INDEX idx_therapy_sessions_conflict ON therapy_sessions (conflict_id);
CREATE INDEX idx_therapy_sessions_type ON therapy_sessions (session_type);
CREATE INDEX idx_therapy_sessions_completed ON therapy_sessions (is_completed);
CREATE INDEX idx_therapy_sessions_created ON therapy_sessions (created_at);

-- Record migration version
INSERT INTO migration_log (version, name) VALUES (4, '004_tournaments_and_analytics') ON CONFLICT (version) DO NOTHING;

COMMIT;
