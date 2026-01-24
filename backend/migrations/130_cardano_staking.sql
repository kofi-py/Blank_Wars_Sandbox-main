-- Migration 129: Staking & Rewards System
-- NFT staking for passive rewards (Soul Shards + XP)
-- Tiered system: Bronze, Silver, Gold, Platinum

BEGIN;

-- Staking position status
CREATE TYPE staking_status AS ENUM (
    'ACTIVE',    -- Currently staked and earning
    'UNSTAKING', -- Cooldown period (future feature)
    'UNSTAKED',  -- Withdrawn from staking
    'SLASHED'    -- Penalized (future feature)
);

-- Staking tier levels
CREATE TYPE staking_tier AS ENUM (
    'BRONZE',
    'SILVER',
    'GOLD',
    'PLATINUM'
);

-- Staking Positions
-- Tracks individual NFT staking sessions
CREATE TABLE cardano_staking_positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Ownership
    user_id TEXT NOT NULL REFERENCES users(id),
    user_character_id TEXT NOT NULL REFERENCES user_characters(id),
    
    -- NFT Identity
    policy_id TEXT NOT NULL,
    asset_name TEXT NOT NULL,
    
    -- Staking Timeline
    staked_at TIMESTAMP NOT NULL DEFAULT NOW(),
    unstaked_at TIMESTAMP,
    status staking_status DEFAULT 'ACTIVE' NOT NULL,
    
    -- Tier & Rewards Configuration
    tier staking_tier NOT NULL,
    base_rewards_per_day INTEGER NOT NULL, -- Soul Shards
    xp_multiplier NUMERIC(3,2) NOT NULL DEFAULT 1.00,
    
    -- Reward Accumulation
    total_rewards_accrued INTEGER DEFAULT 0 NOT NULL,
    last_reward_calculated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    
    -- Reward Claiming
    total_rewards_claimed INTEGER DEFAULT 0 NOT NULL,
    last_claimed_at TIMESTAMP,
    
    -- On-Chain Verification (future smart contract integration)
    stake_tx_hash TEXT,
    unstake_tx_hash TEXT,
    
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    
    -- INVARIANT: Active stakes must not have unstaked_at
    CONSTRAINT status_consistency CHECK (
        (status = 'ACTIVE' AND unstaked_at IS NULL) OR
        (status != 'ACTIVE' AND unstaked_at IS NOT NULL)
    ),
    
    -- INVARIANT: Cannot claim more rewards than accrued
    CONSTRAINT rewards_non_negative CHECK (total_rewards_accrued >= total_rewards_claimed),
    
    -- INVARIANT: Valid policy ID
    CONSTRAINT valid_policy CHECK (LENGTH(policy_id) = 56 AND policy_id ~ '^[0-9a-f]{56}$'),
    
    -- INVARIANT: XP multiplier must be between 1.00 and 3.00
    CONSTRAINT valid_xp_multiplier CHECK (xp_multiplier >= 1.00 AND xp_multiplier <= 3.00),
    
    -- INVARIANT: Base rewards must be positive
    CONSTRAINT positive_rewards CHECK (base_rewards_per_day > 0)
);

-- Indexes
CREATE INDEX idx_staking_user ON cardano_staking_positions(user_id);
CREATE INDEX idx_staking_character ON cardano_staking_positions(user_character_id);
CREATE INDEX idx_staking_status ON cardano_staking_positions(status);
CREATE INDEX idx_staking_policy_asset ON cardano_staking_positions(policy_id, asset_name);
CREATE INDEX idx_staking_active ON cardano_staking_positions(status) WHERE status = 'ACTIVE';

-- Staking Tier Configuration
-- Defines requirements and rewards for each tier
CREATE TABLE staking_tier_config (
    tier staking_tier PRIMARY KEY,
    
    -- Requirements
    min_rarity TEXT NOT NULL, -- Character rarity: 'common', 'rare', 'epic', etc.
    min_level INTEGER DEFAULT 1 NOT NULL,
    
    -- Rewards
    base_rewards_per_day INTEGER NOT NULL,
    xp_multiplier NUMERIC(3,2) NOT NULL,
    
    -- Additional Requirements (JSONB for flexibility)
    unlock_requirements JSONB NOT NULL DEFAULT '{}',
    
    -- Display
    display_name TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    
    -- INVARIANT: Rewards must be positive
    CONSTRAINT positive_tier_rewards CHECK (base_rewards_per_day > 0),
    
    -- INVARIANT: XP multiplier must be reasonable
    CONSTRAINT valid_tier_multiplier CHECK (xp_multiplier >= 1.00 AND xp_multiplier <= 3.00)
);

-- Pre-populate staking tiers
INSERT INTO staking_tier_config (
    tier, 
    min_rarity, 
    min_level,
    base_rewards_per_day, 
    xp_multiplier,
    display_name,
    description
) VALUES
(
    'BRONZE', 
    'common',
    1,
    10, 
    1.10,
    'Bronze Training',
    'Basic training for all characters. +10% XP gain.'
),
(
    'SILVER', 
    'rare',
    5,
    25, 
    1.25,
    'Silver Training',
    'Advanced training for rare characters. +25% XP gain.'
),
(
    'GOLD', 
    'epic',
    10,
    50, 
    1.50,
    'Gold Training',
    'Elite training for epic characters. +50% XP gain.'
),
(
    'PLATINUM', 
    'legendary',
    15,
    100, 
    2.00,
    'Platinum Training',
    'Legendary training for mythic warriors. +100% XP gain.'
);

-- Function to auto-calculate pending rewards
CREATE OR REPLACE FUNCTION calculate_pending_rewards(position_id UUID)
RETURNS INTEGER AS $$
DECLARE
    position RECORD;
    hours_staked NUMERIC;
    pending_rewards INTEGER;
BEGIN
    SELECT * INTO position
    FROM cardano_staking_positions
    WHERE id = position_id AND status = 'ACTIVE';
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- Calculate hours since last calculation
    hours_staked := EXTRACT(EPOCH FROM (NOW() - position.last_reward_calculated_at)) / 3600;
    
    -- Calculate rewards: (hours / 24) * daily_rate
    pending_rewards := FLOOR((hours_staked / 24.0) * position.base_rewards_per_day);
    
    RETURN pending_rewards;
END;
$$ LANGUAGE plpgsql;

-- Record migration
INSERT INTO migration_log (version, name) VALUES (130, '130_cardano_staking') ON CONFLICT (version) DO NOTHING;

COMMIT;
