-- Migration 130: Add Cardano Wallet to Users
-- Stores user's connected Cardano wallet address

BEGIN;

-- Add wallet address column
ALTER TABLE users
ADD COLUMN cardano_wallet_address TEXT,
ADD COLUMN cardano_wallet_connected_at TIMESTAMP;

-- Create index for wallet lookups
CREATE INDEX idx_users_cardano_wallet ON users(cardano_wallet_address) WHERE cardano_wallet_address IS NOT NULL;

-- Add constraint for valid wallet format
ALTER TABLE users
ADD CONSTRAINT valid_cardano_wallet CHECK (
    cardano_wallet_address IS NULL OR 
    LENGTH(cardano_wallet_address) >= 50
);

-- Record migration
INSERT INTO migration_log (version, name) VALUES (124, '124_add_cardano_wallet_to_users') ON CONFLICT (version) DO NOTHING;

COMMIT;
