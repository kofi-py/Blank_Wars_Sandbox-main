-- Migration 126: Cardano Card Set System
-- Extends existing card_packs table with Web3 functionality
-- NO FALLBACKS - All on-chain sets MUST have valid policy IDs

BEGIN;

-- Distribution types for dual-rail Web2/Web3 system
CREATE TYPE cardano_distribution_type AS ENUM (
    'WEB2_ONLY',           -- Traditional pack opening (existing system)
    'CARDANO_MINTABLE',    -- Can be minted as NFT (hybrid)
    'CARDANO_EXCLUSIVE',   -- ONLY available as NFT (pure Web3)
    'INFLUENCER_EXCLUSIVE' -- Gated by allowlist (special drops)
);

-- Cardano Card Sets (extends existing card_packs)
CREATE TABLE cardano_card_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_pack_id UUID REFERENCES card_packs(id) ON DELETE CASCADE,
    
    -- Distribution Strategy
    distribution_type cardano_distribution_type NOT NULL,
    
    -- Cardano Policy (REQUIRED for on-chain sets)
    -- Policy ID is a 56-character hex string (28 bytes)
    policy_id TEXT,
    policy_script JSONB,
    
    -- CIP-68 Metadata Standard
    cip68_enabled BOOLEAN DEFAULT true NOT NULL,
    metadata_schema_version TEXT NOT NULL DEFAULT '1.0.0',
    
    -- Supply Constraints
    max_supply INTEGER,
    current_minted INTEGER DEFAULT 0 NOT NULL,
    minting_active BOOLEAN DEFAULT false NOT NULL,
    
    -- Minting Window
    minting_starts_at TIMESTAMP,
    minting_ends_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    
    -- INVARIANT: On-chain sets MUST have valid policy_id
    CONSTRAINT policy_required_for_onchain CHECK (
        (distribution_type = 'WEB2_ONLY') OR 
        (policy_id IS NOT NULL AND LENGTH(policy_id) = 56)
    ),
    
    -- INVARIANT: Cannot mint more than max supply
    CONSTRAINT max_supply_enforced CHECK (
        (max_supply IS NULL) OR (current_minted <= max_supply)
    ),
    
    -- INVARIANT: Minting window must be logically valid
    CONSTRAINT minting_window_valid CHECK (
        (minting_starts_at IS NULL) OR 
        (minting_ends_at IS NULL) OR 
        (minting_starts_at < minting_ends_at)
    )
);

-- Indexes for efficient querying
CREATE INDEX idx_cardano_sets_policy ON cardano_card_sets(policy_id);
CREATE INDEX idx_cardano_sets_distribution ON cardano_card_sets(distribution_type);
CREATE INDEX idx_cardano_sets_minting_active ON cardano_card_sets(minting_active) WHERE minting_active = true;
CREATE INDEX idx_cardano_sets_card_pack ON cardano_card_sets(card_pack_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_cardano_card_sets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cardano_card_sets_updated_at
    BEFORE UPDATE ON cardano_card_sets
    FOR EACH ROW
    EXECUTE FUNCTION update_cardano_card_sets_updated_at();

-- Record migration
INSERT INTO migration_log (version, name) VALUES (127, '127_cardano_card_sets') ON CONFLICT (version) DO NOTHING;

COMMIT;
