-- Migration 128: Influencer Allowlist & Gating
-- Enables exclusive NFT drops for partnered influencers
-- One-time use claim codes with wallet verification

BEGIN;

-- Allowlist entry status
CREATE TYPE allowlist_status AS ENUM (
    'PENDING',  -- Code created but not yet claimed
    'CLAIMED',  -- Successfully redeemed
    'EXPIRED',  -- Past expiration date
    'REVOKED'   -- Manually invalidated by admin
);

-- Influencer Mint Allowlist
-- Grants specific wallets permission to mint exclusive NFTs
CREATE TABLE influencer_mint_allowlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Gating: Who can claim
    wallet_address TEXT NOT NULL,
    card_set_id UUID NOT NULL REFERENCES cardano_card_sets(id) ON DELETE CASCADE,
    
    -- Claim Code (one-time use, human-readable)
    claim_code TEXT UNIQUE NOT NULL,
    
    -- Status Tracking
    status allowlist_status DEFAULT 'PENDING' NOT NULL,
    claimed_by_user_id TEXT REFERENCES users(id),
    claimed_at TIMESTAMP,
    
    -- Provenance
    allocated_by TEXT, -- Admin or influencer who created this entry
    allocation_reason TEXT,
    notes TEXT,
    
    -- Expiration
    expires_at TIMESTAMP NOT NULL,
    
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    
    -- INVARIANT: Cardano wallet addresses are minimum 50 characters
    CONSTRAINT valid_wallet CHECK (LENGTH(wallet_address) >= 50),
    
    -- INVARIANT: Claim code must be uppercase alphanumeric (e.g., "BLANK-WARS-2026")
    CONSTRAINT valid_claim_code CHECK (claim_code ~ '^[A-Z0-9-]{8,32}$'),
    
    -- INVARIANT: Once claimed, must have user ID and timestamp
    CONSTRAINT claim_consistency CHECK (
        (status != 'CLAIMED') OR 
        (claimed_by_user_id IS NOT NULL AND claimed_at IS NOT NULL)
    ),
    
    -- INVARIANT: Expiration must be in the future when created
    CONSTRAINT expiry_future CHECK (expires_at > created_at)
);

-- Indexes
CREATE INDEX idx_allowlist_wallet ON influencer_mint_allowlist(wallet_address);
CREATE INDEX idx_allowlist_claim_code ON influencer_mint_allowlist(claim_code);
CREATE INDEX idx_allowlist_status ON influencer_mint_allowlist(status);
CREATE INDEX idx_allowlist_card_set ON influencer_mint_allowlist(card_set_id);

-- Influencer Mint Tracking
-- Records successful NFT mints via influencer codes
CREATE TABLE influencer_mints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Who minted
    user_id TEXT NOT NULL REFERENCES users(id),
    allowlist_entry_id UUID NOT NULL REFERENCES influencer_mint_allowlist(id),
    
    -- What was minted
    policy_id TEXT NOT NULL,
    asset_name TEXT NOT NULL,
    tx_hash TEXT NOT NULL,
    
    -- Link to character record
    user_character_id TEXT REFERENCES user_characters(id),
    
    minted_at TIMESTAMP DEFAULT NOW() NOT NULL,
    
    -- INVARIANT: Transaction hash must be 64 hex characters
    CONSTRAINT valid_tx_hash CHECK (LENGTH(tx_hash) = 64 AND tx_hash ~ '^[0-9a-f]{64}$'),
    
    -- INVARIANT: Policy ID must be valid
    CONSTRAINT valid_policy CHECK (LENGTH(policy_id) = 56 AND policy_id ~ '^[0-9a-f]{56}$')
);

-- Indexes
CREATE INDEX idx_influencer_mints_user ON influencer_mints(user_id);
CREATE INDEX idx_influencer_mints_tx ON influencer_mints(tx_hash);
CREATE INDEX idx_influencer_mints_allowlist ON influencer_mints(allowlist_entry_id);
CREATE INDEX idx_influencer_mints_character ON influencer_mints(user_character_id);

-- Record migration
INSERT INTO migration_log (version, name) VALUES (129, '129_influencer_allowlist') ON CONFLICT (version) DO NOTHING;

COMMIT;
