-- Migration: 003_social_and_economy
-- Description: Chat system, social features, packs, tournaments, and economy
-- Created: 2025-07-22

BEGIN;

-- =====================================================
-- CHAT AND SOCIAL SYSTEM TABLES
-- =====================================================

-- Chat messages for various contexts
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL for AI messages
    source event_source NOT NULL,
    context_id VARCHAR(100), -- battle_id, training_session_id, etc.

    -- Message content
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'user', -- 'user', 'ai', 'system', 'coach'
    ai_agent_type VARCHAR(50), -- 'kitchen_chat', 'equipment_advisor', etc.

    -- AI context and personality
    ai_context JSONB DEFAULT '{}'::jsonb, -- For AI responses
    character_context JSONB DEFAULT '{}'::jsonb, -- Character being discussed

    -- Message metadata
    is_pinned BOOLEAN DEFAULT FALSE,
    is_hidden BOOLEAN DEFAULT FALSE,
    sentiment_score DECIMAL(3,2), -- -1.0 to 1.0

    -- Threading and replies
    parent_message_id UUID REFERENCES chat_messages(id),
    thread_depth INTEGER DEFAULT 0,

    -- Reactions and engagement
    reactions JSONB DEFAULT '{}'::jsonb, -- {emoji: count}
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,

    -- Timing
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP
);

CREATE INDEX idx_chat_messages_user ON chat_messages (user_id);
CREATE INDEX idx_chat_messages_source ON chat_messages (source);
CREATE INDEX idx_chat_messages_context ON chat_messages (context_id);
CREATE INDEX idx_chat_messages_type ON chat_messages (message_type);
CREATE INDEX idx_chat_messages_created ON chat_messages (created_at);
CREATE INDEX idx_chat_messages_parent ON chat_messages (parent_message_id);

-- =====================================================
-- CARD PACK AND ECONOMY SYSTEM
-- =====================================================

-- Card pack templates
CREATE TABLE card_packs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    pack_type VARCHAR(50) NOT NULL, -- 'starter', 'premium', 'event', 'seasonal'

    -- Contents and probabilities
    guaranteed_contents JSONB DEFAULT '[]'::jsonb, -- Always included items
    possible_contents JSONB DEFAULT '[]'::jsonb, -- Random pool with probabilities
    total_cards INTEGER DEFAULT 5,

    -- Rarity distribution
    rarity_weights JSONB DEFAULT '{}'::jsonb, -- {common: 60, rare: 25, epic: 15}

    -- Pricing and availability
    cost_credits INTEGER DEFAULT 0,
    cost_real_money DECIMAL(10,2) DEFAULT 0.00,
    is_purchasable BOOLEAN DEFAULT TRUE,
    requires_level INTEGER DEFAULT 1,

    -- Time-limited availability
    available_from TIMESTAMP,
    available_until TIMESTAMP,
    max_purchases_per_user INTEGER, -- NULL for unlimited

    -- Visual design
    pack_artwork VARCHAR(255),
    pack_animation VARCHAR(255),
    rarity_colors JSONB DEFAULT '{}'::jsonb,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_card_packs_type ON card_packs (pack_type);
CREATE INDEX idx_card_packs_available ON card_packs (available_from, available_until);
CREATE INDEX idx_card_packs_active ON card_packs (is_active);

-- QR code system for physical packs
CREATE TABLE qr_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(255) UNIQUE NOT NULL,
    pack_template_id UUID NOT NULL REFERENCES card_packs(id),

    -- Usage tracking
    is_used BOOLEAN DEFAULT FALSE,
    used_by_user_id UUID REFERENCES users(id),
    used_at TIMESTAMP,

    -- QR code data
    batch_id VARCHAR(100), -- Manufacturing batch
    expiration_date DATE,
    region VARCHAR(10), -- Geographic restriction

    -- Security
    validation_hash VARCHAR(255), -- To prevent forgery

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    manufacturer_id VARCHAR(100) -- Tracking for production
);

CREATE INDEX idx_qr_codes_code ON qr_codes (code);
CREATE INDEX idx_qr_codes_used ON qr_codes (is_used);
CREATE INDEX idx_qr_codes_user ON qr_codes (used_by_user_id);
CREATE INDEX idx_qr_codes_batch ON qr_codes (batch_id);

-- Claimable packs (for rewards, events, etc.)
CREATE TABLE claimable_packs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pack_template_id UUID NOT NULL REFERENCES card_packs(id),

    -- Claim status
    is_claimed BOOLEAN DEFAULT FALSE,
    claimed_at TIMESTAMP,

    -- Source and reason
    source VARCHAR(100) NOT NULL, -- 'daily_reward', 'achievement', 'event', etc.
    reason TEXT,

    -- Expiration
    expires_at TIMESTAMP,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_claimable_packs_user ON claimable_packs (user_id);
CREATE INDEX idx_claimable_packs_claimed ON claimable_packs (is_claimed);
CREATE INDEX idx_claimable_packs_expires ON claimable_packs (expires_at);

-- Pre-generated pack contents for claimable packs
CREATE TABLE claimable_pack_contents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claimable_pack_id UUID NOT NULL REFERENCES claimable_packs(id) ON DELETE CASCADE,
    character_id VARCHAR(50) NOT NULL REFERENCES characters(id),
    rarity character_rarity NOT NULL,

    -- Enhancement data
    bonus_experience INTEGER DEFAULT 0,
    bonus_bond_levels INTEGER DEFAULT 0,

    -- Order for reveal animation
    reveal_order INTEGER DEFAULT 1,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_claimable_pack_contents_pack ON claimable_pack_contents (claimable_pack_id);
CREATE INDEX idx_claimable_pack_contents_character ON claimable_pack_contents (character_id);

-- =====================================================
-- USER ECONOMY TABLES
-- =====================================================

-- User currency balances
CREATE TABLE user_currency (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

    -- Primary currencies
    credits INTEGER DEFAULT 1000 CHECK (credits >= 0), -- In-game currency
    premium_gems INTEGER DEFAULT 0 CHECK (premium_gems >= 0), -- Premium currency

    -- Secondary currencies
    battle_tokens INTEGER DEFAULT 0 CHECK (battle_tokens >= 0),
    training_points INTEGER DEFAULT 0 CHECK (training_points >= 0),

    -- Metadata
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User friendships and social connections
CREATE TABLE user_friendships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Friendship state
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'blocked'

    -- Interaction tracking
    battles_together INTEGER DEFAULT 0,
    last_interaction TIMESTAMP,
    friendship_level INTEGER DEFAULT 1 CHECK (friendship_level >= 1 AND friendship_level <= 10),

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(requester_user_id, addressee_user_id),
    CHECK(requester_user_id != addressee_user_id)
);

CREATE INDEX idx_user_friendships_requester ON user_friendships (requester_user_id);
CREATE INDEX idx_user_friendships_addressee ON user_friendships (addressee_user_id);
CREATE INDEX idx_user_friendships_status ON user_friendships (status);

-- Purchase history and transactions
CREATE TABLE purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Purchase details
    item_type VARCHAR(50) NOT NULL, -- 'pack', 'character', 'subscription', 'currency'
    item_id VARCHAR(100), -- ID of purchased item
    quantity INTEGER DEFAULT 1,

    -- Pricing
    cost_credits INTEGER DEFAULT 0,
    cost_premium_gems INTEGER DEFAULT 0,
    cost_real_money DECIMAL(10,2) DEFAULT 0.00,
    currency_type VARCHAR(20), -- 'credits', 'gems', 'usd', 'eur', etc.

    -- Payment processing
    stripe_payment_intent_id VARCHAR(255),
    payment_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
    payment_method VARCHAR(50),

    -- Fulfillment
    is_fulfilled BOOLEAN DEFAULT FALSE,
    fulfilled_at TIMESTAMP,
    fulfillment_data JSONB DEFAULT '{}'::jsonb,

    -- Refunds and disputes
    refund_amount DECIMAL(10,2) DEFAULT 0.00,
    refunded_at TIMESTAMP,
    refund_reason TEXT,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_purchases_user ON purchases (user_id);
CREATE INDEX idx_purchases_status ON purchases (payment_status);
CREATE INDEX idx_purchases_fulfilled ON purchases (is_fulfilled);
CREATE INDEX idx_purchases_created ON purchases (created_at);

-- Record migration version
INSERT INTO migration_log (version, name) VALUES (3, '003_social_and_economy') ON CONFLICT (version) DO NOTHING;

COMMIT;
