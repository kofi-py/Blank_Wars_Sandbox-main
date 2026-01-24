/**
 * Influencer Mint Service
 * Manages allowlist-gated NFT minting for influencer partnerships
 * STRICT MODE: All claim codes are one-time use, all validations throw on error
 */

import { query } from '../../database/index';
import { cardanoProvider } from './CardanoProviderService';

interface ClaimResult {
    txHash: string;
    assetName: string;
    assetFingerprint: string;
    userCharacterId: string;
}

interface AllowlistEntry {
    id: string;
    wallet_address: string;
    card_set_id: string;
    claim_code: string;
    status: string;
    expires_at: Date;
    created_at: Date;
    claimed_at?: Date;
    tx_hash?: string;
}

export class InfluencerMintService {
    /**
     * Validate an allowlist entry
     * @throws CLAIM_CODE_NOT_FOUND if code doesn't exist
     * @throws CLAIM_CODE_EXPIRED if past expiration
     * @throws CLAIM_CODE_ALREADY_USED if already claimed
     * @throws WALLET_MISMATCH if wallet doesn't match allowlist
     */
    async validateAllowlistEntry(params: {
        claimCode: string;
        walletAddress: string;
    }): Promise<{
        allowlistId: string;
        cardSetId: string;
        expiresAt: Date;
    }> {
        // 1. Look up claim code
        const result = await query(
            'SELECT * FROM influencer_mint_allowlist WHERE claim_code = $1',
            [params.claimCode.toUpperCase()]
        );

        if (result.rows.length === 0) {
            throw new Error('CLAIM_CODE_NOT_FOUND: Invalid claim code');
        }

        const allowlistEntry = result.rows[0];
        if (!allowlistEntry.status || !allowlistEntry.wallet_address || !allowlistEntry.card_set_id) {
            throw new Error('ALLOWLIST_DATA_CORRUPT: Missing critical allowlist fields');
        }

        // 2. Check status
        if (allowlistEntry.status === 'CLAIMED') {
            throw new Error('CLAIM_CODE_ALREADY_USED: This claim code has already been redeemed');
        }

        if (allowlistEntry.status === 'REVOKED') {
            throw new Error('CLAIM_CODE_REVOKED: This claim code has been revoked');
        }

        if (allowlistEntry.status === 'EXPIRED') {
            throw new Error('CLAIM_CODE_EXPIRED: This claim code has expired');
        }

        // 3. Check expiration date
        const now = new Date();
        const expiresAt = new Date(allowlistEntry.expires_at);

        if (expiresAt < now) {
            // Auto-update status
            await query(
                'UPDATE influencer_mint_allowlist SET status = $1 WHERE id = $2',
                ['EXPIRED', allowlistEntry.id]
            );
            throw new Error(`CLAIM_CODE_EXPIRED: Code expired on ${expiresAt.toISOString()}`);
        }

        // 4. Verify wallet address matches
        if (allowlistEntry.wallet_address !== params.walletAddress) {
            throw new Error(
                `WALLET_MISMATCH: This claim code is allocated to ${allowlistEntry.wallet_address}, ` +
                `but you are using ${params.walletAddress}`
            );
        }

        return {
            allowlistId: allowlistEntry.id,
            cardSetId: allowlistEntry.card_set_id,
            expiresAt
        };
    }

    /**
     * Mint an influencer NFT using a claim code
     * @throws All validation errors from validateAllowlistEntry
     * @throws WALLET_NOT_CONNECTED if user has no wallet
     * @throws CARD_SET_NOT_FOUND if set doesn't exist
     * @throws CARDANO_NOT_IMPLEMENTED for actual minting
     */
    async mintInfluencerNFT(params: {
        userId: string;
        claimCode: string;
        characterId?: string; // Optional: specific character to mint
    }): Promise<ClaimResult> {
        // 1. Get user's wallet
        const userResult = await query(
            'SELECT cardano_wallet_address FROM users WHERE id = $1',
            [params.userId]
        );

        if (userResult.rows.length === 0 || !userResult.rows[0].cardano_wallet_address) {
            throw new Error('WALLET_NOT_CONNECTED: User must connect a Cardano wallet to claim');
        }

        const walletAddress = userResult.rows[0].cardano_wallet_address;

        // 2. Validate allowlist entry
        const allowlist = await this.validateAllowlistEntry({
            claimCode: params.claimCode,
            walletAddress
        });

        // 3. Get card set details
        const setResult = await query(
            `SELECT ccs.*, cp.name as pack_name
       FROM cardano_card_sets ccs
       JOIN card_packs cp ON ccs.card_pack_id = cp.id
       WHERE ccs.id = $1`,
            [allowlist.cardSetId]
        );

        if (setResult.rows.length === 0) {
            throw new Error('CARD_SET_NOT_FOUND: Card set does not exist');
        }

        const cardSet = setResult.rows[0];
        if (!cardSet.policy_id) {
            throw new Error('POLICY_NOT_CONFIGURED: Card set does not have a minting policy');
        }

        // 4. Verify policy is configured
        if (!cardSet.policy_id) {
            throw new Error('POLICY_NOT_CONFIGURED: Card set does not have a minting policy');
        }

        // 5. Select character to mint
        // If user specified a character, use it. Otherwise, pick from pack contents
        let characterId = params.characterId;

        if (!characterId) {
            // Get guaranteed contents from pack
            const packResult = await query(
                'SELECT guaranteed_contents FROM card_packs WHERE id = $1',
                [cardSet.card_pack_id]
            );

            const guaranteedContents = packResult.rows[0]?.guaranteed_contents;
            if (!guaranteedContents || !Array.isArray(guaranteedContents) || guaranteedContents.length === 0) {
                throw new Error('NO_CHARACTERS_AVAILABLE: Card set has no guaranteed characters');
            }

            // Pick first character from guaranteed contents
            characterId = guaranteedContents[0].character_id || guaranteedContents[0];
        }

        // 6. Create user_character entry
        const charResult = await query(
            `INSERT INTO user_characters 
       (user_id, character_id, level, experience, current_health, max_health, acquired_at)
       SELECT $1, $2, 1, 0, c.base_health, c.base_health, NOW()
       FROM characters c WHERE c.id = $2
       RETURNING id`,
            [params.userId, characterId]
        );

        if (charResult.rows.length === 0) {
            throw new Error('CHARACTER_CREATION_FAILED: Could not find character template');
        }

        const userCharacterId = charResult.rows[0].id;

        // 7. Execute minting (STUB - requires smart contract)
        throw new Error(
            'CARDANO_NOT_IMPLEMENTED: Influencer NFT minting requires smart contract integration. ' +
            'This would mint the NFT directly to the allowlisted wallet address, then link it to the ' +
            'user_character record. Requires implementing CIP-68 minting transaction with MeshSDK.'
        );

        // FUTURE IMPLEMENTATION:
        // const assetName = `BlankWars_Influencer_${characterId}_${Date.now()}`;
        // const metadata = buildInfluencerMetadata(character, allowlist);
        //
        // const tx = await this.buildInfluencerMintTransaction({
        //   policyId: cardSet.policy_id,
        //   assetName,
        //   metadata,
        //   recipientAddress: walletAddress
        // });
        //
        // const txHash = await provider.submitTransaction(tx);
        //
        // // Mark claim code as used
        // await query(
        //   `UPDATE influencer_mint_allowlist 
        //    SET status = 'CLAIMED', claimed_by_user_id = $1, claimed_at = NOW()
        //    WHERE id = $2`,
        //   [params.userId, allowlist.allowlistId]
        // );
        //
        // // Record mint
        // await query(
        //   `INSERT INTO influencer_mints 
        //    (user_id, allowlist_entry_id, policy_id, asset_name, tx_hash, user_character_id)
        //    VALUES ($1, $2, $3, $4, $5, $6)`,
        //   [params.userId, allowlist.allowlistId, cardSet.policy_id, assetName, txHash, userCharacterId]
        // );
        //
        // // Link NFT to character
        // await query(
        //   `INSERT INTO cardano_nft_metadata 
        //    (user_character_id, policy_id, asset_name, asset_fingerprint, on_chain_metadata, is_minted, minted_at, minted_by_user_id)
        //    VALUES ($1, $2, $3, $4, $5, true, NOW(), $6)`,
        //   [userCharacterId, cardSet.policy_id, assetName, fingerprint, JSON.stringify(metadata), params.userId]
        // );
        //
        // return {
        //   txHash,
        //   assetName,
        //   assetFingerprint: fingerprint,
        //   userCharacterId
        // };
    }



    /**
     * Get all allowlist entries for a wallet
     */
    async getAllowlistEntriesForWallet(walletAddress: string): Promise<AllowlistEntry[]> {
        const result = await query(
            `SELECT iml.*, ccs.policy_id, cp.name as pack_name
       FROM influencer_mint_allowlist iml
       JOIN cardano_card_sets ccs ON iml.card_set_id = ccs.id
       JOIN card_packs cp ON ccs.card_pack_id = cp.id
       WHERE iml.wallet_address = $1
       ORDER BY iml.created_at DESC`,
            [walletAddress]
        );

        return result.rows;
    }

    /**
     * Admin function: Create allowlist entry
     * @throws INVALID_EXPIRATION if expiration is in the past
     * @throws CARD_SET_NOT_FOUND if set doesn't exist
     */
    async createAllowlistEntry(params: {
        walletAddress: string;
        cardSetId: string;
        claimCode: string;
        expiresAt: Date;
        allocatedBy: string;
        reason?: string;
    }): Promise<{ allowlistId: string }> {
        // 1. Validate expiration
        if (params.expiresAt <= new Date()) {
            throw new Error('INVALID_EXPIRATION: Expiration must be in the future');
        }

        // 2. Verify card set exists
        const setCheck = await query(
            'SELECT id FROM cardano_card_sets WHERE id = $1',
            [params.cardSetId]
        );

        if (setCheck.rows.length === 0) {
            throw new Error('CARD_SET_NOT_FOUND');
        }

        // 3. Create entry
        const result = await query(
            `INSERT INTO influencer_mint_allowlist 
       (wallet_address, card_set_id, claim_code, expires_at, allocated_by, allocation_reason, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')
       RETURNING id`,
            [
                params.walletAddress,
                params.cardSetId,
                params.claimCode.toUpperCase(),
                params.expiresAt,
                params.allocatedBy,
                params.reason || 'Influencer partnership'
            ]
        );

        return { allowlistId: result.rows[0].id };
    }
}

export const influencerMintService = new InfluencerMintService();
