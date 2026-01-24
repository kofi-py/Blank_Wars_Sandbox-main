-- Migration 012: Add user_items table for consumable item inventory
-- Enables users to own, buy, and use consumable items

BEGIN;

-- Create user_items table for consumable item inventory
CREATE TABLE IF NOT EXISTS user_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
    acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acquired_from TEXT DEFAULT 'shop', -- 'shop', 'battle_reward', 'craft', 'gift'
    
    -- Prevent duplicate entries - use quantity instead
    UNIQUE(user_id, item_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_items_user ON user_items(user_id);
CREATE INDEX IF NOT EXISTS idx_user_items_item ON user_items(item_id);
CREATE INDEX IF NOT EXISTS idx_user_items_acquired ON user_items(acquired_at);

-- Create purchases table for transaction history
CREATE TABLE IF NOT EXISTS purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Purchase details
    item_type TEXT NOT NULL, -- 'item', 'equipment', 'pack'
    item_id TEXT NOT NULL, -- ID of purchased item
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    
    -- Pricing
    cost_coins INTEGER DEFAULT 0 CHECK (cost_coins >= 0),
    cost_battle_tokens INTEGER DEFAULT 0 CHECK (cost_battle_tokens >= 0),
    cost_premium_currency INTEGER DEFAULT 0 CHECK (cost_premium_currency >= 0),
    
    -- Transaction status
    transaction_status TEXT DEFAULT 'completed' CHECK (transaction_status IN ('pending', 'completed', 'failed', 'refunded')),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    notes TEXT
);

-- Create indexes for purchases
CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(transaction_status);
CREATE INDEX IF NOT EXISTS idx_purchases_created ON purchases(created_at);
CREATE INDEX IF NOT EXISTS idx_purchases_item ON purchases(item_type, item_id);

-- Add gold/coins tracking to user_currency table if not exists
-- (users table already has coins column, but user_currency is more specific)
ALTER TABLE user_currency 
ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 1000 CHECK (coins >= 0);

-- Give existing users starting coins if they don't have any
UPDATE user_currency 
SET coins = 1000 
WHERE coins IS NULL;

-- Record migration completion
INSERT INTO migration_log (version, name) VALUES (12, '012_add_user_items_table') ON CONFLICT (version) DO NOTHING;

COMMIT;