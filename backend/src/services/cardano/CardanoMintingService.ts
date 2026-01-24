/**
 * Cardano Minting Service
 * Handles NFT minting using CIP-68 standard (Reference + Metadata tokens)
 * STRICT MODE: All methods throw on error, no fallbacks
 */

import { query } from '../../database/index';
import { cardanoProvider } from './CardanoProviderService';

interface MintResult {
    txHash: string;
    assetName: string;
    assetFingerprint: string;
    referenceTokenUtxo: string;
    metadataTokenUtxo: string;
}

interface CharacterData {
    id: string;
    name: string;
    title?: string;
    artwork_url?: string;
    backstory?: string;
    archetype: string;
    rarity: string;
    level: number;
    experience: number;
    total_battles: number;
    total_wins: number;
    current_attack: number;
    current_defense: number;
    current_speed: number;
    current_max_health: number;
    current_mental_health: number;
    bond_level: number;
    acquired_at?: string;
    serial_number: string;
    [key: string]: any; // Allow index access for validation loop
}

export class CardanoMintingService {
    /**
     * Mint a character as an NFT using CIP-68
     * Creates both reference token (user wallet) and metadata token (script address)
     * @throws CHARACTER_NOT_FOUND if character doesn't exist
     * @throws CHARACTER_ALREADY_MINTED if already an NFT
     * @throws MINTING_WINDOW_CLOSED if set is not accepting mints
     * @throws POLICY_NOT_CONFIGURED if no policy ID found
     * @throws CARDANO_NOT_IMPLEMENTED for actual on-chain minting
     */
    async mintCharacterNFT(params: {
        userCharacterId: string;
        userId: string;
        cardSetId: string;
    }): Promise<MintResult> {
        // 1. Verify character exists and belongs to user
        const charResult = await query(
            `SELECT uc.*, c.name, c.archetype, c.rarity, c.title, c.backstory
       FROM user_characters uc
       JOIN characters c ON uc.character_id = c.id
       WHERE uc.id = $1 AND uc.user_id = $2`,
            [params.userCharacterId, params.userId]
        );

        if (charResult.rows.length === 0) {
            throw new Error('CHARACTER_NOT_FOUND: Character does not exist or does not belong to user');
        }

        const character = charResult.rows[0];
        if (!character.name || !character.archetype || !character.rarity) {
            throw new Error('CHARACTER_DATA_INCOMPLETE: Missing critical character template data from JOIN');
        }

        // 2. Check if already minted
        const nftCheck = await query(
            'SELECT id, is_minted FROM cardano_nft_metadata WHERE user_character_id = $1',
            [params.userCharacterId]
        );

        if (nftCheck.rows.length > 0 && nftCheck.rows[0].is_minted) {
            throw new Error('CHARACTER_ALREADY_MINTED: This character is already an NFT');
        }

        // 3. Verify card set and get policy
        const setResult = await query(
            `SELECT cs.*, ccs.policy_id, ccs.minting_active, ccs.current_minted, ccs.max_supply,
              ccs.minting_starts_at, ccs.minting_ends_at
       FROM cardano_card_sets ccs
       JOIN card_packs cs ON ccs.card_pack_id = cs.id
       WHERE ccs.id = $1`,
            [params.cardSetId]
        );

        if (setResult.rows.length === 0) {
            throw new Error('CARD_SET_NOT_FOUND: Invalid card set ID');
        }

        const cardSet = setResult.rows[0];
        if (cardSet.minting_active === undefined || cardSet.current_minted === undefined) {
            throw new Error('CARD_SET_DATA_CORRUPT: Missing minting status fields');
        }

        // 4. Validate minting is allowed
        if (!cardSet.policy_id) {
            throw new Error('POLICY_NOT_CONFIGURED: Card set does not have a minting policy');
        }

        if (!cardSet.minting_active) {
            throw new Error('MINTING_INACTIVE: Minting is not currently active for this set');
        }

        // Check minting window
        const now = new Date();
        if (cardSet.minting_starts_at && new Date(cardSet.minting_starts_at) > now) {
            throw new Error('MINTING_NOT_STARTED: Minting window has not opened yet');
        }
        if (cardSet.minting_ends_at && new Date(cardSet.minting_ends_at) < now) {
            throw new Error('MINTING_ENDED: Minting window has closed');
        }

        // Check supply cap
        if (cardSet.max_supply && cardSet.current_minted >= cardSet.max_supply) {
            throw new Error('MAX_SUPPLY_REACHED: All NFTs from this set have been minted');
        }

        // 5. Generate asset name (using character ID + timestamp)
        const assetName = `BlankWars_${character.name.replace(/\s/g, '')}_${Date.now()}`;

        // 6. Build CIP-68 metadata
        const metadata = this.buildCIP68Metadata(character);

        // 7. Execute minting (STUB - requires smart contract deployment)
        // This would use @meshsdk/core to build and submit transaction
        throw new Error(
            'CARDANO_NOT_IMPLEMENTED: On-chain CIP-68 minting requires smart contract deployment and transaction building. ' +
            'This involves: (1) Minting reference token to user wallet, (2) Minting metadata token to script address, ' +
            '(3) Creating datum with character stats. Please implement using MeshSDK transaction builder.'
        );

        // FUTURE IMPLEMENTATION:
        // const tx = await this.buildCIP68MintTransaction({
        //   policyId: cardSet.policy_id,
        //   assetName,
        //   metadata,
        //   userAddress: userWallet
        // });
        // const txHash = await provider.submitTransaction(tx);
        //
        // // Update database with NFT metadata
        // await query(
        //   `INSERT INTO cardano_nft_metadata 
        //    (user_character_id, policy_id, asset_name, asset_fingerprint, on_chain_metadata, is_minted, minted_at, minted_by_user_id)
        //    VALUES ($1, $2, $3, $4, $5, true, NOW(), $6)`,
        //   [params.userCharacterId, cardSet.policy_id, assetName, fingerprint, JSON.stringify(metadata), params.userId]
        // );
        //
        // return { txHash, assetName, assetFingerprint: fingerprint, ... };
    }

    /**
     * Sync character stats to on-chain metadata
     * Updates the datum on the metadata token (CIP-68)
     * @throws NFT_NOT_FOUND if character is not minted
     * @throws CARDANO_NOT_IMPLEMENTED for actual on-chain sync
     */
    async syncMetadataToChain(userCharacterId: string): Promise<{ txHash: string }> {
        // 1. Verify NFT exists and is minted
        const nftResult = await query(
            `SELECT nm.*, uc.level, uc.experience, uc.total_wins, uc.total_battles
       FROM cardano_nft_metadata nm
       JOIN user_characters uc ON nm.user_character_id = uc.id
       WHERE nm.user_character_id = $1 AND nm.is_minted = true`,
            [userCharacterId]
        );

        if (nftResult.rows.length === 0) {
            throw new Error('NFT_NOT_FOUND: Character is not minted as an NFT');
        }

        const nft = nftResult.rows[0];
        if (!nft.policy_id || !nft.asset_fingerprint) {
            throw new Error('NFT_DATA_CORRUPT: Missing policy ID or asset fingerprint');
        }

        // 2. Load latest character data
        const charResult = await query(
            `SELECT uc.*, c.* 
       FROM user_characters uc
       JOIN characters c ON uc.character_id = c.id
       WHERE uc.id = $1`,
            [userCharacterId]
        );

        if (charResult.rows.length === 0) {
            throw new Error('CHARACTER_NOT_FOUND: User character does not exist');
        }

        const character = charResult.rows[0];

        // 3. Build updated metadata
        const updatedMetadata = this.buildCIP68Metadata(character);

        // 4. Execute metadata update (STUB - requires datum update transaction)
        throw new Error(
            'CARDANO_NOT_IMPLEMENTED: Metadata sync requires updating the datum on the CIP-68 metadata token. ' +
            'This involves building a transaction that consumes the metadata token UTXO from the script address ' +
            'and outputs it back with updated datum. Please implement using MeshSDK and PlutusV2 scripts.'
        );

        // FUTURE IMPLEMENTATION:
        // const tx = await this.buildMetadataUpdateTransaction({
        //   metadataTokenUtxo: nft.metadata_token_utxo,
        //   updatedDatum: updatedMetadata,
        //   scriptAddress: METADATA_SCRIPT_ADDRESS
        // });
        // const txHash = await provider.submitTransaction(tx);
        //
        // await query(
        //   'UPDATE cardano_nft_metadata SET on_chain_metadata = $1, last_synced_at = NOW(), sync_tx_hash = $2 WHERE id = $3',
        //   [JSON.stringify(updatedMetadata), txHash, nft.id]
        // );
        //
        // return { txHash };
    }



    /**
     * Build CIP-68 metadata from character data
     * @private
     */
    private buildCIP68Metadata(character: CharacterData): object {
        const requiredFields = [
            'name',
            'archetype',
            'rarity',
            'level',
            'experience',
            'total_battles',
            'total_wins',
            'current_attack',
            'current_defense',
            'current_speed',
            'current_max_health',
            'current_mental_health',
            'bond_level'
        ];

        const missingFields = requiredFields.filter(
            (field) => character[field] === null || character[field] === undefined
        );

        if (missingFields.length > 0) {
            throw new Error(`CHARACTER_DATA_INCOMPLETE: Missing required fields: ${missingFields.join(', ')}`);
        }

        return {
            name: character.name,
            title: character.title || '',
            image: character.artwork_url || `https://blankwars.com/nft/${character.id}.png`,
            description: character.backstory || 'A legendary warrior in Blank Wars',

            // CIP-68 specific fields
            version: 1,

            // Character Stats (mutable on metadata token)
            attributes: {
                archetype: character.archetype,
                rarity: character.rarity,
                level: character.level,
                experience: character.experience,
                total_battles: character.total_battles,
                total_wins: character.total_wins,
                win_rate: character.total_battles > 0
                    ? ((character.total_wins / character.total_battles) * 100).toFixed(2)
                    : '0.00',

                // Combat Stats
                attack: character.current_attack,
                defense: character.current_defense,
                speed: character.current_speed,
                health: character.current_max_health,

                // Psychology
                mental_health: character.current_mental_health,
                bond_level: character.bond_level
            },

            // Immutable properties
            properties: {
                created_at: character.acquired_at || new Date().toISOString(),
                serial_number: character.serial_number,
                origin: 'Blank Wars 2026',
                blockchain: 'Cardano'
            }
        };
    }
}

export const cardanoMintingService = new CardanoMintingService();
