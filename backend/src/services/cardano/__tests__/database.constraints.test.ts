import { randomUUID } from 'crypto';
import { closeDatabase, initialize_database, query } from '../../../database';

const hex56 = 'a'.repeat(56);
const fingerprint = 'asset1'.concat('a'.repeat(38));
const walletAddress = 'addr1'.concat('b'.repeat(60));

const createCardPack = async (): Promise<string> => {
    const result = await query(
        'INSERT INTO card_packs (name, pack_type) VALUES ($1, $2) RETURNING id',
        ['Test Pack', 'starter']
    );
    return result.rows[0].id;
};

const createCardSet = async (overrides: Partial<{ distribution_type: string; policy_id: string }> = {}) => {
    const packId = await createCardPack();
    const result = await query(
        `INSERT INTO cardano_card_sets (card_pack_id, distribution_type, policy_id, minting_active)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [
            packId,
            overrides.distribution_type ?? 'CARDANO_MINTABLE',
            overrides.policy_id ?? hex56,
            true,
        ]
    );
    return result.rows[0].id;
};

const createUser = async (): Promise<string> => {
    const id = randomUUID();
    await query('INSERT INTO users (id, username, email) VALUES ($1, $2, $3)', [
        id,
        `user_${id.slice(0, 8)}`,
        `${id}@example.com`,
    ]);
    return id;
};

const createCharacter = async (): Promise<string> => {
    const id = `char_${randomUUID().slice(0, 8)}`;
    await query(
        'INSERT INTO characters (id, name, archetype, rarity, base_attack, base_defense, base_speed, base_max_health) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [id, 'Test Character', 'warrior', 'common', 100, 100, 100, 100]
    );
    return id;
};

const createUserCharacter = async (userId: string, characterId: string): Promise<string> => {
    const id = randomUUID();
    await query(
        `INSERT INTO user_characters 
         (id, user_id, character_id, current_attack, current_defense, current_speed, current_max_health, current_health)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [id, userId, characterId, 100, 100, 100, 100, 100]
    );
    return id;
};

describe('Database Constraints - Cardano Tables', () => {
    beforeAll(async () => {
        await initialize_database();
    });

    afterAll(async () => {
        await closeDatabase();
    });

    describe('cardano_card_sets', () => {
        test('rejects policy_id shorter than 56 chars', async () => {
            const packId = await createCardPack();

            await expect(
                query(
                    `INSERT INTO cardano_card_sets (card_pack_id, distribution_type, policy_id, minting_active)
                     VALUES ($1, $2, $3, $4)`,
                    [packId, 'CARDANO_MINTABLE', 'short', true]
                )
            ).rejects.toThrow();
        });

        test('rejects policy_id longer than 56 chars', async () => {
            const packId = await createCardPack();

            await expect(
                query(
                    `INSERT INTO cardano_card_sets (card_pack_id, distribution_type, policy_id, minting_active)
                     VALUES ($1, $2, $3, $4)`,
                    [packId, 'CARDANO_MINTABLE', 'a'.repeat(57), true]
                )
            ).rejects.toThrow();
        });

        test('rejects minting_ends_at before minting_starts_at', async () => {
            const packId = await createCardPack();
            const start = new Date('2025-01-01');
            const end = new Date('2024-12-31');

            await expect(
                query(
                    `INSERT INTO cardano_card_sets 
                     (card_pack_id, distribution_type, policy_id, minting_starts_at, minting_ends_at, minting_active)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [packId, 'CARDANO_MINTABLE', hex56, start, end, true]
                )
            ).rejects.toThrow();
        });
    });

    describe('cardano_nft_metadata', () => {
        test('rejects invalid asset_fingerprint format', async () => {
            const userId = await createUser();
            const characterId = await createCharacter();
            const userCharacterId = await createUserCharacter(userId, characterId);

            await expect(
                query(
                    `INSERT INTO cardano_nft_metadata 
                     (user_character_id, policy_id, asset_name, asset_fingerprint, on_chain_metadata) 
                     VALUES ($1, $2, $3, $4, $5)`,
                    [userCharacterId, hex56, 'TestAsset', 'invalid', {}]
                )
            ).rejects.toThrow();

            await query('DELETE FROM user_characters WHERE id = $1', [userCharacterId]);
            await query('DELETE FROM characters WHERE id = $1', [characterId]);
            await query('DELETE FROM users WHERE id = $1', [userId]);
        });

        test('enforces unique user_character_id', async () => {
            const userId = await createUser();
            const characterId = await createCharacter();
            const userCharacterId = await createUserCharacter(userId, characterId);

            await query(
                `INSERT INTO cardano_nft_metadata 
                 (user_character_id, policy_id, asset_name, asset_fingerprint, on_chain_metadata) 
                 VALUES ($1, $2, $3, $4, $5)`,
                [userCharacterId, hex56, 'AssetOne', fingerprint, {}]
            );

            await expect(
                query(
                    `INSERT INTO cardano_nft_metadata 
                     (user_character_id, policy_id, asset_name, asset_fingerprint, on_chain_metadata) 
                     VALUES ($1, $2, $3, $4, $5)`,
                    [userCharacterId, hex56, 'AssetTwo', 'asset1'.concat('b'.repeat(38)), {}]
                )
            ).rejects.toThrow();

            await query('DELETE FROM cardano_nft_metadata WHERE user_character_id = $1', [userCharacterId]);
            await query('DELETE FROM user_characters WHERE id = $1', [userCharacterId]);
            await query('DELETE FROM characters WHERE id = $1', [characterId]);
            await query('DELETE FROM users WHERE id = $1', [userId]);
        });
    });

    describe('influencer_mint_allowlist', () => {
        test('rejects invalid claim_code format (lowercase)', async () => {
            const cardSetId = await createCardSet();

            await expect(
                query(
                    `INSERT INTO influencer_mint_allowlist 
                     (wallet_address, card_set_id, claim_code, expires_at) 
                     VALUES ($1, $2, $3, $4)`,
                    [walletAddress, cardSetId, 'lowercase', new Date(Date.now() + 86_400_000)]
                )
            ).rejects.toThrow();
        });

        test('rejects claim_code shorter than 8 chars', async () => {
            const cardSetId = await createCardSet();

            await expect(
                query(
                    `INSERT INTO influencer_mint_allowlist 
                     (wallet_address, card_set_id, claim_code, expires_at) 
                     VALUES ($1, $2, $3, $4)`,
                    [walletAddress, cardSetId, 'SHORT', new Date(Date.now() + 86_400_000)]
                )
            ).rejects.toThrow();
        });
    });

    describe('cardano_staking_positions', () => {
        test('rejects xp_multiplier below 1.00', async () => {
            const userId = await createUser();
            const characterId = await createCharacter();
            const userCharacterId = await createUserCharacter(userId, characterId);

            await expect(
                query(
                    `INSERT INTO cardano_staking_positions 
                     (user_id, user_character_id, policy_id, asset_name, tier, base_rewards_per_day, xp_multiplier)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [userId, userCharacterId, hex56, 'AssetOne', 'BRONZE', 10, 0.95]
                )
            ).rejects.toThrow();

            await query('DELETE FROM user_characters WHERE id = $1', [userCharacterId]);
            await query('DELETE FROM characters WHERE id = $1', [characterId]);
            await query('DELETE FROM users WHERE id = $1', [userId]);
        });

        test('rejects xp_multiplier above 3.00', async () => {
            const userId = await createUser();
            const characterId = await createCharacter();
            const userCharacterId = await createUserCharacter(userId, characterId);

            await expect(
                query(
                    `INSERT INTO cardano_staking_positions 
                     (user_id, user_character_id, policy_id, asset_name, tier, base_rewards_per_day, xp_multiplier)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [userId, userCharacterId, hex56, 'AssetTwo', 'SILVER', 15, 3.01]
                )
            ).rejects.toThrow();

            await query('DELETE FROM user_characters WHERE id = $1', [userCharacterId]);
            await query('DELETE FROM characters WHERE id = $1', [characterId]);
            await query('DELETE FROM users WHERE id = $1', [userId]);
        });

        test('rejects negative total_rewards_claimed', async () => {
            const userId = await createUser();
            const characterId = await createCharacter();
            const userCharacterId = await createUserCharacter(userId, characterId);

            await expect(
                query(
                    `INSERT INTO cardano_staking_positions 
                     (user_id, user_character_id, policy_id, asset_name, tier, base_rewards_per_day, xp_multiplier, total_rewards_claimed)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                    [userId, userCharacterId, hex56, 'AssetThree', 'GOLD', 20, 1.5, -10]
                )
            ).rejects.toThrow();

            await query('DELETE FROM user_characters WHERE id = $1', [userCharacterId]);
            await query('DELETE FROM characters WHERE id = $1', [characterId]);
            await query('DELETE FROM users WHERE id = $1', [userId]);
        });
    });
});
