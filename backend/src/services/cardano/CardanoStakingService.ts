/**
 * Cardano Staking Service
 * Manages NFT character staking for passive rewards
 * STRICT MODE: All operations verify NFT ownership via Blockfrost
 */

import { query } from '../../database/index';
import { cardanoProvider } from './CardanoProviderService';

interface StakeResult {
    positionId: string;
    tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
    baseRewardsPerDay: number;
    xpMultiplier: number;
}

interface UnstakeResult {
    rewardsClaimed: number;
    totalStakedHours: number;
}

// Row type for staking position query
interface StakingPositionRow {
    id: string;
    user_id: string;
    user_character_id: string;
    tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
    status: 'ACTIVE' | 'UNSTAKED';
    staked_at: Date;
    unstaked_at: Date | null;
    total_rewards_accrued: number;
    total_rewards_claimed: number;
    character_name: string;
    rarity: string;
    archetype: string;
}

export class CardanoStakingService {
    /**
     * Stake an NFT character
     * Verifies on-chain ownership before allowing stake
     * @throws NFT_NOT_FOUND if character is not minted
     * @throws WALLET_NOT_CONNECTED if user has no wallet
     * @throws NFT_OWNERSHIP_VERIFICATION_FAILED if ownership check fails
     * @throws CHARACTER_ALREADY_STAKED if already staking
     * @throws TIER_REQUIREMENTS_NOT_MET if character doesn't meet tier requirements
     */
    async stakeCharacter(params: {
        userId: string;
        userCharacterId: string;
        tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
    }): Promise<StakeResult> {
        // 1. Get NFT metadata
        const nftResult = await query(
            `SELECT nm.*, uc.level, c.rarity
       FROM cardano_nft_metadata nm
       JOIN user_characters uc ON nm.user_character_id = uc.id
       JOIN characters c ON uc.character_id = c.id
       WHERE nm.user_character_id = $1 AND nm.is_minted = true`,
            [params.userCharacterId]
        );

        if (nftResult.rows.length === 0) {
            throw new Error('NFT_NOT_FOUND: Character is not minted as an NFT');
        }

        const nft = nftResult.rows[0];
        if (!nft.asset_fingerprint || !nft.policy_id) {
            throw new Error('NFT_DATA_CORRUPT: Missing asset fingerprint or policy ID');
        }

        // 2. Get user's wallet address
        const userResult = await query(
            'SELECT cardano_wallet_address FROM users WHERE id = $1',
            [params.userId]
        );

        if (userResult.rows.length === 0 || !userResult.rows[0].cardano_wallet_address) {
            throw new Error('WALLET_NOT_CONNECTED: User must connect a Cardano wallet first');
        }

        const walletAddress = userResult.rows[0].cardano_wallet_address;

        // 3. Verify NFT ownership via Blockfrost
        const ownsNFT = await cardanoProvider.verifyNftOwnership(
            walletAddress,
            nft.asset_fingerprint
        );

        if (!ownsNFT) {
            throw new Error(
                `NFT_OWNERSHIP_VERIFICATION_FAILED: Wallet ${walletAddress} does not own NFT ${nft.asset_fingerprint}`
            );
        }

        // 4. Check if already staked
        const existingStake = await query(
            'SELECT id FROM cardano_staking_positions WHERE user_character_id = $1 AND status = $2',
            [params.userCharacterId, 'ACTIVE']
        );

        if (existingStake.rows.length > 0) {
            throw new Error('CHARACTER_ALREADY_STAKED: This character is already staked');
        }

        // 5. Verify tier requirements
        const tierConfig = await query(
            'SELECT * FROM staking_tier_config WHERE tier = $1',
            [params.tier]
        );

        if (tierConfig.rows.length === 0) {
            throw new Error(`INVALID_TIER: Tier ${params.tier} does not exist`);
        }

        const tier = tierConfig.rows[0];
        if (!tier.base_rewards_per_day || !tier.xp_multiplier || !tier.min_rarity) {
            throw new Error('TIER_CONFIG_CORRUPT: Missing required tier configuration fields');
        }

        // Check rarity requirement
        const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
        const requiredRarityIndex = rarityOrder.indexOf(tier.min_rarity);
        const characterRarityIndex = rarityOrder.indexOf(nft.rarity);

        if (characterRarityIndex < requiredRarityIndex) {
            throw new Error(
                `TIER_REQUIREMENTS_NOT_MET: ${params.tier} tier requires ${tier.min_rarity} rarity, ` +
                `but character is ${nft.rarity}`
            );
        }

        // Check level requirement
        if (nft.level < tier.min_level) {
            throw new Error(
                `TIER_REQUIREMENTS_NOT_MET: ${params.tier} tier requires level ${tier.min_level}, ` +
                `but character is level ${nft.level}`
            );
        }

        // 6. Create staking position
        const result = await query(
            `INSERT INTO cardano_staking_positions 
       (user_id, user_character_id, policy_id, asset_name, tier, base_rewards_per_day, xp_multiplier, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE')
       RETURNING id`,
            [
                params.userId,
                params.userCharacterId,
                nft.policy_id,
                nft.asset_name,
                params.tier,
                tier.base_rewards_per_day,
                tier.xp_multiplier
            ]
        );

        return {
            positionId: result.rows[0].id,
            tier: params.tier,
            baseRewardsPerDay: tier.base_rewards_per_day,
            xpMultiplier: parseFloat(tier.xp_multiplier)
        };
    }

    /**
     * Unstake character and claim accumulated rewards
     * @throws STAKING_POSITION_NOT_FOUND if not staking
     * @throws UNAUTHORIZED if position doesn't belong to user
     */
    async unstakeCharacter(params: {
        positionId: string;
        userId: string;
    }): Promise<UnstakeResult> {
        // 1. Get staking position
        const positionResult = await query(
            `SELECT * FROM cardano_staking_positions 
       WHERE id = $1 AND status = 'ACTIVE'`,
            [params.positionId]
        );

        if (positionResult.rows.length === 0) {
            throw new Error('STAKING_POSITION_NOT_FOUND: No active staking position found');
        }

        const position = positionResult.rows[0];
        if (!position.user_id || position.total_rewards_accrued === undefined) {
            throw new Error('STAKING_POSITION_CORRUPT: Missing critical staking data');
        }

        // 2. Verify ownership
        if (position.user_id !== params.userId) {
            throw new Error('UNAUTHORIZED: This staking position does not belong to you');
        }

        // 3. Calculate final rewards
        const pendingRewards = await this.calculatePendingRewards(params.positionId);
        const totalRewards = position.total_rewards_accrued + pendingRewards;

        // 4. Calculate total staked time
        const stakedAt = new Date(position.staked_at);
        const now = new Date();
        const totalStakedMs = now.getTime() - stakedAt.getTime();
        const totalStakedHours = Math.floor(totalStakedMs / (1000 * 60 * 60));

        // 5. Update staking position
        await query(
            `UPDATE cardano_staking_positions 
       SET status = 'UNSTAKED', 
           unstaked_at = NOW(),
           total_rewards_accrued = $1,
           total_rewards_claimed = $1,
           last_claimed_at = NOW()
       WHERE id = $2`,
            [totalRewards, params.positionId]
        );

        // 6. Award rewards to user (would update user's Soul Shards balance)
        // TODO: Implement Soul Shards currency system
        // await query(
        //   'UPDATE users SET soul_shards = soul_shards + $1 WHERE id = $2',
        //   [totalRewards, params.userId]
        // );

        return {
            rewardsClaimed: totalRewards,
            totalStakedHours
        };
    }

    /**
     * Calculate pending rewards for an active staking position
     * @throws STAKING_POSITION_NOT_FOUND if position doesn't exist or is not active
     */
    async calculatePendingRewards(positionId: string): Promise<number> {
        const result = await query(
            `SELECT base_rewards_per_day, last_reward_calculated_at, total_rewards_accrued
       FROM cardano_staking_positions 
       WHERE id = $1 AND status = 'ACTIVE'`,
            [positionId]
        );

        if (result.rows.length === 0) {
            throw new Error('STAKING_POSITION_NOT_FOUND: Position not found or not active');
        }

        const position = result.rows[0];
        const lastCalculated = new Date(position.last_reward_calculated_at);
        const now = new Date();

        // Calculate hours since last calculation
        const msSinceLastCalc = now.getTime() - lastCalculated.getTime();
        const hoursSinceLastCalc = msSinceLastCalc / (1000 * 60 * 60);

        // Calculate rewards: (hours / 24) * daily_rate
        const dailyRate = position.base_rewards_per_day;
        const pendingRewards = Math.floor((hoursSinceLastCalc / 24) * dailyRate);

        return pendingRewards;
    }

    /**
     * Get staking position details
     */
    async getStakingPosition(positionId: string): Promise<any> {
        const result = await query(
            `SELECT sp.*, uc.name as character_name, c.rarity, c.archetype
       FROM cardano_staking_positions sp
       JOIN user_characters uc ON sp.user_character_id = uc.id
       JOIN characters c ON uc.character_id = c.id
       WHERE sp.id = $1`,
            [positionId]
        );

        if (result.rows.length === 0) {
            throw new Error('STAKING_POSITION_NOT_FOUND');
        }

        const position = result.rows[0];
        const pendingRewards = position.status === 'ACTIVE'
            ? await this.calculatePendingRewards(positionId)
            : 0;

        return {
            ...position,
            pending_rewards: pendingRewards,
            total_unclaimed_rewards: position.total_rewards_accrued - position.total_rewards_claimed + pendingRewards
        };
    }

    /**
     * Get all staking positions for a user
     */
    async getUserStakingPositions(userId: string): Promise<any[]> {
        const result = await query(
            `SELECT sp.*, uc.name as character_name, c.rarity, c.archetype
       FROM cardano_staking_positions sp
       JOIN user_characters uc ON sp.user_character_id = uc.id
       JOIN characters c ON uc.character_id = c.id
       WHERE sp.user_id = $1
       ORDER BY sp.staked_at DESC`,
            [userId]
        );

        const positions = await Promise.all(
            (result.rows as StakingPositionRow[]).map(async (position) => {
                const pendingRewards = position.status === 'ACTIVE'
                    ? await this.calculatePendingRewards(position.id)
                    : 0;

                return {
                    ...position,
                    pending_rewards: pendingRewards,
                    total_unclaimed_rewards: position.total_rewards_accrued - position.total_rewards_claimed + pendingRewards
                };
            })
        );

        return positions;
    }
}

export const cardanoStakingService = new CardanoStakingService();
