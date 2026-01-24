-- Migration 005: Consolidate Embedded Schema Logic
-- Moves all remaining schema definitions from application code to database layer
-- This migration ensures all database structure is managed centrally

-- ============================================================================
-- CHAT AND MESSAGING SYSTEM
-- ============================================================================

-- Chat Messages table (from sqlite.ts)
CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    character_id TEXT NOT NULL,
    battle_id TEXT,
    player_message TEXT NOT NULL,
    character_response TEXT NOT NULL,
    message_context JSONB,
    model_used TEXT,
    tokens_used INTEGER,
    response_time_ms INTEGER,
    bond_increase BOOLEAN DEFAULT FALSE,
    memory_saved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (character_id) REFERENCES user_characters(id) ON DELETE CASCADE,
    FOREIGN KEY (battle_id) REFERENCES battles(id) ON DELETE SET NULL
);

-- Indexes for chat messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_character ON chat_messages(user_id, character_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_battle ON chat_messages(battle_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);

-- ============================================================================
-- HEADQUARTERS AND HOUSING SYSTEM
-- ============================================================================

-- User Headquarters table (from sqlite.ts)
CREATE TABLE IF NOT EXISTS user_headquarters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL,
    tier_id TEXT DEFAULT 'spartan_apartment' CHECK (tier_id IN (
        'spartan_apartment', 'luxury_suite', 'team_compound', 'fortress_headquarters'
    )),
    coins INTEGER DEFAULT 50000 CHECK (coins >= 0),
    gems INTEGER DEFAULT 100 CHECK (gems >= 0),
    unlocked_themes JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Headquarters Rooms table (from sqlite.ts)
CREATE TABLE IF NOT EXISTS headquarters_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    headquarters_id UUID NOT NULL,
    room_id TEXT NOT NULL,
    room_type TEXT NOT NULL CHECK (room_type IN (
        'bedroom', 'kitchen', 'training_room', 'lounge', 'office', 'storage',
        'medical_bay', 'trophy_room', 'library', 'workshop'
    )),
    capacity INTEGER DEFAULT 2 CHECK (capacity > 0),
    occupied_slots INTEGER DEFAULT 0 CHECK (occupied_slots >= 0),
    theme TEXT DEFAULT 'default',
    furniture JSONB DEFAULT '[]',
    position_x INTEGER DEFAULT 0,
    position_y INTEGER DEFAULT 0,
    width INTEGER DEFAULT 1 CHECK (width > 0),
    height INTEGER DEFAULT 1 CHECK (height > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (headquarters_id) REFERENCES user_headquarters(id) ON DELETE CASCADE,
    CONSTRAINT valid_occupancy CHECK (occupied_slots <= capacity)
);

-- Room Beds table (from sqlite.ts)
CREATE TABLE IF NOT EXISTS room_beds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL,
    character_id UUID,
    bed_position INTEGER NOT NULL CHECK (bed_position > 0),
    comfort_level INTEGER DEFAULT 50 CHECK (comfort_level BETWEEN 0 AND 100),
    last_used TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES headquarters_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (character_id) REFERENCES user_characters(id) ON DELETE SET NULL,
    UNIQUE(room_id, bed_position),
    UNIQUE(character_id) -- Each character can only have one bed
);

-- ============================================================================
-- CURRENCY AND ECONOMICS SYSTEM
-- ============================================================================

-- User Currency table (from sqlite.ts)
CREATE TABLE IF NOT EXISTS user_currency (
    user_id UUID PRIMARY KEY,
    battle_tokens INTEGER DEFAULT 100 CHECK (battle_tokens >= 0),
    premium_currency INTEGER DEFAULT 0 CHECK (premium_currency >= 0),
    daily_earnings INTEGER DEFAULT 0 CHECK (daily_earnings >= 0),
    weekly_earnings INTEGER DEFAULT 0 CHECK (weekly_earnings >= 0),
    monthly_earnings INTEGER DEFAULT 0 CHECK (monthly_earnings >= 0),
    total_lifetime_earnings BIGINT DEFAULT 0 CHECK (total_lifetime_earnings >= 0),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================================
-- PSYCHOLOGICAL STATS SYSTEM
-- ============================================================================

-- Add psychological stats to characters table (from migration files)
-- These are base character template values
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS training INTEGER DEFAULT 75 CHECK (training BETWEEN 0 AND 100),
ADD COLUMN IF NOT EXISTS team_player INTEGER DEFAULT 70 CHECK (team_player BETWEEN 0 AND 100),
ADD COLUMN IF NOT EXISTS ego INTEGER DEFAULT 60 CHECK (ego BETWEEN 0 AND 100),
ADD COLUMN IF NOT EXISTS mental_health INTEGER DEFAULT 85 CHECK (mental_health BETWEEN 0 AND 100),
ADD COLUMN IF NOT EXISTS communication INTEGER DEFAULT 80 CHECK (communication BETWEEN 0 AND 100);

-- Add psychological state tracking to user_characters table
-- These are dynamic, per-user character states
ALTER TABLE user_characters
ADD COLUMN IF NOT EXISTS current_training INTEGER DEFAULT 75 CHECK (current_training BETWEEN 0 AND 100),
ADD COLUMN IF NOT EXISTS current_team_player INTEGER DEFAULT 70 CHECK (current_team_player BETWEEN 0 AND 100),
ADD COLUMN IF NOT EXISTS current_ego INTEGER DEFAULT 60 CHECK (current_ego BETWEEN 0 AND 100),
ADD COLUMN IF NOT EXISTS current_mental_health INTEGER DEFAULT 85 CHECK (current_mental_health BETWEEN 0 AND 100),
ADD COLUMN IF NOT EXISTS current_communication INTEGER DEFAULT 80 CHECK (current_communication BETWEEN 0 AND 100),
ADD COLUMN IF NOT EXISTS stress_level INTEGER DEFAULT 0 CHECK (stress_level BETWEEN 0 AND 100),
ADD COLUMN IF NOT EXISTS fatigue_level INTEGER DEFAULT 0 CHECK (fatigue_level BETWEEN 0 AND 100),
ADD COLUMN IF NOT EXISTS morale INTEGER DEFAULT 80 CHECK (morale BETWEEN 0 AND 100);

-- ============================================================================
-- TRAINING AND DAILY LIMITS SYSTEM
-- ============================================================================

-- Add training and daily limit columns to users table (from sqlite.ts migrations)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS daily_training_count INTEGER DEFAULT 0 CHECK (daily_training_count >= 0),
ADD COLUMN IF NOT EXISTS daily_training_reset_date DATE DEFAULT CURRENT_DATE;

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- Additional performance indexes for new tables
CREATE INDEX IF NOT EXISTS idx_user_headquarters_user ON user_headquarters(user_id);
CREATE INDEX IF NOT EXISTS idx_user_headquarters_tier ON user_headquarters(tier_id);

CREATE INDEX IF NOT EXISTS idx_headquarters_rooms_headquarters ON headquarters_rooms(headquarters_id);
CREATE INDEX IF NOT EXISTS idx_headquarters_rooms_type ON headquarters_rooms(room_type);

CREATE INDEX IF NOT EXISTS idx_room_beds_room ON room_beds(room_id);
CREATE INDEX IF NOT EXISTS idx_room_beds_character ON room_beds(character_id);

CREATE INDEX IF NOT EXISTS idx_user_currency_tokens ON user_currency(battle_tokens);
CREATE INDEX IF NOT EXISTS idx_user_currency_premium ON user_currency(premium_currency);

-- Psychological stats indexes
CREATE INDEX IF NOT EXISTS idx_characters_psychstats ON characters(training, team_player, ego, mental_health, communication);
CREATE INDEX IF NOT EXISTS idx_user_characters_psychstats ON user_characters(current_mental_health, stress_level, fatigue_level, morale);

-- Training and daily limits indexes
CREATE INDEX IF NOT EXISTS idx_users_training ON users(daily_training_count, daily_training_reset_date);

-- ============================================================================
-- DATA MIGRATION AND CLEANUP
-- ============================================================================

-- Set default psychological stats for existing characters
UPDATE characters
SET
    training = COALESCE(training, 75),
    team_player = COALESCE(team_player, 70),
    ego = COALESCE(ego, 60),
    mental_health = COALESCE(mental_health, 85),
    communication = COALESCE(communication, 80)
WHERE
    training IS NULL
    OR team_player IS NULL
    OR ego IS NULL
    OR mental_health IS NULL
    OR communication IS NULL;

-- Initialize current psychological stats for existing user characters
UPDATE user_characters
SET
    current_training = COALESCE(current_training, 75),
    current_team_player = COALESCE(current_team_player, 70),
    current_ego = COALESCE(current_ego, 60),
    current_mental_health = COALESCE(current_mental_health, 85),
    current_communication = COALESCE(current_communication, 80),
    stress_level = COALESCE(stress_level, 0),
    fatigue_level = COALESCE(fatigue_level, 0),
    morale = COALESCE(morale, 80)
WHERE
    current_training IS NULL
    OR current_team_player IS NULL
    OR current_ego IS NULL
    OR current_mental_health IS NULL
    OR current_communication IS NULL
    OR stress_level IS NULL
    OR fatigue_level IS NULL
    OR morale IS NULL;

-- Initialize training counters for existing users
UPDATE users
SET
    daily_training_count = COALESCE(daily_training_count, 0),
    daily_training_reset_date = COALESCE(daily_training_reset_date, CURRENT_DATE)
WHERE
    daily_training_count IS NULL
    OR daily_training_reset_date IS NULL;

-- Create user_currency records for existing users who don't have them
INSERT INTO user_currency (user_id, battle_tokens, premium_currency)
SELECT
    u.id,
    100 as battle_tokens,
    0 as premium_currency
FROM users u
LEFT JOIN user_currency uc ON u.id = uc.user_id
WHERE uc.user_id IS NULL;

-- ============================================================================
-- VALIDATION AND CONSTRAINTS
-- ============================================================================

-- Add additional constraint checks for data integrity
ALTER TABLE headquarters_rooms
ADD CONSTRAINT IF NOT EXISTS valid_room_size
CHECK (width > 0 AND height > 0 AND width <= 10 AND height <= 10);

ALTER TABLE room_beds
ADD CONSTRAINT IF NOT EXISTS valid_comfort
CHECK (comfort_level BETWEEN 0 AND 100);

-- Ensure psychological stats are within valid ranges
ALTER TABLE characters
ADD CONSTRAINT IF NOT EXISTS valid_character_psychstats
CHECK (
    training BETWEEN 0 AND 100 AND
    team_player BETWEEN 0 AND 100 AND
    ego BETWEEN 0 AND 100 AND
    mental_health BETWEEN 0 AND 100 AND
    communication BETWEEN 0 AND 100
);

ALTER TABLE user_characters
ADD CONSTRAINT IF NOT EXISTS valid_user_character_psychstats
CHECK (
    current_training BETWEEN 0 AND 100 AND
    current_team_player BETWEEN 0 AND 100 AND
    current_ego BETWEEN 0 AND 100 AND
    current_mental_health BETWEEN 0 AND 100 AND
    current_communication BETWEEN 0 AND 100 AND
    stress_level BETWEEN 0 AND 100 AND
    fatigue_level BETWEEN 0 AND 100 AND
    morale BETWEEN 0 AND 100
);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Record migration completion
INSERT INTO migration_log (version, name) VALUES (5, '005_embedded_schema_consolidation') ON CONFLICT (version) DO NOTHING;
