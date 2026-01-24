-- Migration 011: Add missing columns for character and pack systems
-- This fixes the remaining schema mismatches causing errors

-- Add missing columns to characters table
ALTER TABLE characters ADD COLUMN IF NOT EXISTS origin_era VARCHAR(50) DEFAULT 'modern';
ALTER TABLE characters ADD COLUMN IF NOT EXISTS conversation_style TEXT DEFAULT 'formal';
ALTER TABLE characters ADD COLUMN IF NOT EXISTS conversation_topics TEXT[] DEFAULT '{}';
ALTER TABLE characters ADD COLUMN IF NOT EXISTS backstory TEXT DEFAULT '';
ALTER TABLE characters ADD COLUMN IF NOT EXISTS artwork_url TEXT DEFAULT '';
ALTER TABLE characters ADD COLUMN IF NOT EXISTS abilities TEXT[] DEFAULT '{}';

-- Add missing columns to user_characters table
ALTER TABLE user_characters ADD COLUMN IF NOT EXISTS serial_number VARCHAR(20);
ALTER TABLE user_characters ADD COLUMN IF NOT EXISTS nickname VARCHAR(100) DEFAULT 'New Character';
ALTER TABLE user_characters ADD COLUMN IF NOT EXISTS max_health INTEGER;
ALTER TABLE user_characters ADD COLUMN IF NOT EXISTS is_injured BOOLEAN DEFAULT false;
ALTER TABLE user_characters ADD COLUMN IF NOT EXISTS equipment JSONB DEFAULT '[]';
ALTER TABLE user_characters ADD COLUMN IF NOT EXISTS enhancements JSONB DEFAULT '[]';
ALTER TABLE user_characters ADD COLUMN IF NOT EXISTS conversation_memory JSONB DEFAULT '[]';
ALTER TABLE user_characters ADD COLUMN IF NOT EXISTS significant_memories JSONB DEFAULT '[]';
ALTER TABLE user_characters ADD COLUMN IF NOT EXISTS personality_drift JSONB DEFAULT '{}';
ALTER TABLE user_characters ADD COLUMN IF NOT EXISTS wallet INTEGER DEFAULT 0;
ALTER TABLE user_characters ADD COLUMN IF NOT EXISTS financial_stress INTEGER DEFAULT 0;
ALTER TABLE user_characters ADD COLUMN IF NOT EXISTS coach_trust_level INTEGER DEFAULT 0;

-- Add missing columns to claimable_packs table
ALTER TABLE claimable_packs ADD COLUMN IF NOT EXISTS claimed_by_user_id UUID REFERENCES users(id);

-- Update existing user_characters to have max_health same as current_health where missing
UPDATE user_characters SET max_health = current_health WHERE max_health IS NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_characters_origin_era ON characters(origin_era);
CREATE INDEX IF NOT EXISTS idx_user_characters_serial ON user_characters(serial_number);
CREATE INDEX IF NOT EXISTS idx_user_characters_nickname ON user_characters(nickname);
CREATE INDEX IF NOT EXISTS idx_claimable_packs_claimed_by ON claimable_packs(claimed_by_user_id);

-- Add check constraints
ALTER TABLE user_characters ADD CONSTRAINT user_characters_wallet_check CHECK (wallet >= 0);
ALTER TABLE user_characters ADD CONSTRAINT user_characters_financial_stress_check CHECK (financial_stress >= 0);
ALTER TABLE user_characters ADD CONSTRAINT user_characters_coach_trust_check CHECK (coach_trust_level >= 0);
