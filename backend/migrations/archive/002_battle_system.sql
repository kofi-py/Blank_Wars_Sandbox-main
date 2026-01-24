-- Migration: 002_battle_system
-- Description: Battle system tables for combat, coaching, and tournaments
-- Created: 2025-07-22

BEGIN;

-- =====================================================
-- BATTLE SYSTEM TABLES
-- =====================================================

-- Add missing columns to battles table
ALTER TABLE battles ADD COLUMN IF NOT EXISTS battle_type VARCHAR(50);
ALTER TABLE battles ADD COLUMN IF NOT EXISTS tournament_id TEXT;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS phase TEXT DEFAULT 'pre_battle_huddle';
ALTER TABLE battles ADD COLUMN IF NOT EXISTS max_rounds INTEGER DEFAULT 10;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS user_team_data JSONB;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS opponent_team_data JSONB;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS battle_log JSONB DEFAULT '[]'::jsonb;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS round_results JSONB DEFAULT '[]'::jsonb;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS coaching_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS battle_result VARCHAR(20);
ALTER TABLE battles ADD COLUMN IF NOT EXISTS final_score JSONB;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS ai_judge_context JSONB DEFAULT '{}'::jsonb;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS ai_commentary TEXT;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS global_morale JSONB DEFAULT '{"user": 50, "opponent": 50}'::jsonb;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS total_duration_seconds INTEGER;

-- Drop old combat_log column (TEXT) since we now have battle_log (JSONB)
ALTER TABLE battles DROP COLUMN IF EXISTS combat_log;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_battles_type ON battles (battle_type);
CREATE INDEX IF NOT EXISTS idx_battles_tournament ON battles (tournament_id);
CREATE INDEX IF NOT EXISTS idx_battles_started ON battles (started_at);

-- Battle queue for matchmaking
CREATE TABLE IF NOT EXISTS battle_queue (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    queue_type VARCHAR(50) NOT NULL, -- 'ranked', 'casual'
    preferred_strategy TEXT,
    team_composition JSONB NOT NULL, -- Array of character IDs

    -- Matchmaking criteria
    min_opponent_level INTEGER,
    max_opponent_level INTEGER,
    estimated_wait_time INTEGER, -- seconds

    -- Queue state
    status VARCHAR(20) DEFAULT 'waiting', -- 'waiting', 'matched', 'cancelled'
    matched_battle_id TEXT REFERENCES battles(id),

    -- Timing
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    matched_at TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '10 minutes')
);

CREATE INDEX IF NOT EXISTS idx_battle_queue_user ON battle_queue (user_id);
CREATE INDEX IF NOT EXISTS idx_battle_queue_type ON battle_queue (queue_type);
CREATE INDEX IF NOT EXISTS idx_battle_queue_status ON battle_queue (status);
CREATE INDEX IF NOT EXISTS idx_battle_queue_expires ON battle_queue (expires_at);

-- =====================================================
-- EQUIPMENT SYSTEM TABLES
-- =====================================================

-- Add missing columns to prod_ref.equipment table
ALTER TABLE prod_ref.equipment ADD COLUMN IF NOT EXISTS flavor_text TEXT;
ALTER TABLE prod_ref.equipment ADD COLUMN IF NOT EXISTS durability INTEGER DEFAULT 100;
ALTER TABLE prod_ref.equipment ADD COLUMN IF NOT EXISTS upgrade_slots INTEGER DEFAULT 0;
ALTER TABLE prod_ref.equipment ADD COLUMN IF NOT EXISTS is_craftable BOOLEAN DEFAULT FALSE;
ALTER TABLE prod_ref.equipment ADD COLUMN IF NOT EXISTS craft_materials JSONB DEFAULT '[]'::jsonb;
ALTER TABLE prod_ref.equipment ADD COLUMN IF NOT EXISTS drop_sources JSONB DEFAULT '[]'::jsonb;

-- Add missing columns to user_equipment table
ALTER TABLE user_equipment ADD COLUMN IF NOT EXISTS current_durability INTEGER DEFAULT 100;
ALTER TABLE user_equipment ADD COLUMN IF NOT EXISTS applied_upgrades JSONB DEFAULT '[]'::jsonb;

-- Record migration version
INSERT INTO migration_log (version, name) VALUES (2, '002_battle_system') ON CONFLICT (version) DO NOTHING;

COMMIT;
