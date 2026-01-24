-- Migration 127: NFT Metadata Linking (CIP-68)
-- Links user_characters to on-chain NFT assets
-- Supports CIP-68 dual-token standard (Reference + Metadata)

BEGIN;

-- Links user_characters to actual on-chain NFTs
CREATE TABLE cardano_nft_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Character Linking (1:1 relationship)
    user_character_id TEXT UNIQUE NOT NULL REFERENCES user_characters(id) ON DELETE CASCADE,
    
    -- On-Chain Identity
    policy_id TEXT NOT NULL,
    asset_name TEXT NOT NULL,
    asset_fingerprint TEXT UNIQUE NOT NULL, -- Bech32 format: asset1...
    
    -- CIP-68 Dual Token Standard
    -- Reference Token (100): Held in user's wallet, represents ownership
    -- Metadata Token (222): Held at script address, contains mutable data
    reference_token_utxo TEXT, -- User's wallet UTXO
    metadata_token_utxo TEXT,  -- Script address UTXO
    
    -- Metadata
    on_chain_metadata JSONB NOT NULL,
    last_synced_at TIMESTAMP NOT NULL DEFAULT NOW(),
    sync_tx_hash TEXT,
    
    -- Minting Status
    is_minted BOOLEAN DEFAULT false NOT NULL,
    minted_at TIMESTAMP,
    minted_by_user_id TEXT REFERENCES users(id),
    
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    
    -- INVARIANT: Policy ID must be 56 hex characters (28 bytes)
    CONSTRAINT valid_policy CHECK (LENGTH(policy_id) = 56 AND policy_id ~ '^[0-9a-f]{56}$'),
    
    -- INVARIANT: Asset fingerprint follows CIP-14 format
    CONSTRAINT valid_fingerprint CHECK (asset_fingerprint ~ '^asset1[a-z0-9]{38}$'),
    
    -- INVARIANT: Minting timestamps must be consistent
    CONSTRAINT minting_consistency CHECK (
        (is_minted = false AND minted_at IS NULL AND minted_by_user_id IS NULL) OR
        (is_minted = true AND minted_at IS NOT NULL AND minted_by_user_id IS NOT NULL)
    ),
    
    -- INVARIANT: Unique policy + asset name combination
    CONSTRAINT unique_asset UNIQUE (policy_id, asset_name)
);

-- Indexes for efficient lookups
CREATE INDEX idx_nft_meta_character ON cardano_nft_metadata(user_character_id);
CREATE INDEX idx_nft_meta_policy_asset ON cardano_nft_metadata(policy_id, asset_name);
CREATE INDEX idx_nft_meta_fingerprint ON cardano_nft_metadata(asset_fingerprint);
CREATE INDEX idx_nft_meta_minted ON cardano_nft_metadata(is_minted) WHERE is_minted = true;
CREATE INDEX idx_nft_meta_user ON cardano_nft_metadata(minted_by_user_id);

-- Record migration
INSERT INTO migration_log (version, name) VALUES (128, '128_cardano_nft_metadata') ON CONFLICT (version) DO NOTHING;

COMMIT;
