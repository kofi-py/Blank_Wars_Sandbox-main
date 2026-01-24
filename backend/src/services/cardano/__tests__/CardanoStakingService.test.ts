import { cardanoProvider } from '../CardanoProviderService';
import { CardanoStakingService } from '../CardanoStakingService';
import { query } from '../../../database';

jest.mock('../../../database', () => ({
    query: jest.fn(),
}));

jest.mock('../CardanoProviderService', () => ({
    cardanoProvider: {
        verifyNftOwnership: jest.fn(),
    },
}));

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockVerifyNftOwnership = cardanoProvider.verifyNftOwnership as jest.MockedFunction<
    typeof cardanoProvider.verifyNftOwnership
>;

describe('CardanoStakingService - stakeCharacter', () => {
    let service: CardanoStakingService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new CardanoStakingService();
    });

    const baseNftRow = {
        asset_fingerprint: 'asset1testfingerprintfortests1234567890abcd',
        policy_id: 'a'.repeat(56),
        rarity: 'legendary',
        level: 20,
    };

    test('throws NFT_NOT_FOUND if character not minted', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });

        await expect(
            service.stakeCharacter({
                userId: 'user123',
                userCharacterId: 'char123',
                tier: 'BRONZE',
            })
        ).rejects.toThrow('NFT_NOT_FOUND');
    });

    test('throws WALLET_NOT_CONNECTED if no wallet', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [baseNftRow] })
            .mockResolvedValueOnce({ rows: [] });

        await expect(
            service.stakeCharacter({
                userId: 'user123',
                userCharacterId: 'char123',
                tier: 'BRONZE',
            })
        ).rejects.toThrow('WALLET_NOT_CONNECTED');
    });

    test('throws NFT_OWNERSHIP_VERIFICATION_FAILED if not owned', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [baseNftRow] })
            .mockResolvedValueOnce({ rows: [{ cardano_wallet_address: 'addr_test1...' }] });
        mockVerifyNftOwnership.mockResolvedValueOnce(false);

        await expect(
            service.stakeCharacter({
                userId: 'user123',
                userCharacterId: 'char123',
                tier: 'BRONZE',
            })
        ).rejects.toThrow('NFT_OWNERSHIP_VERIFICATION_FAILED');
    });

    test('throws CHARACTER_ALREADY_STAKED if actively staked', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [baseNftRow] })
            .mockResolvedValueOnce({ rows: [{ cardano_wallet_address: 'addr_test1...' }] })
            .mockResolvedValueOnce({ rows: [{ id: 'existing' }] });
        mockVerifyNftOwnership.mockResolvedValueOnce(true);

        await expect(
            service.stakeCharacter({
                userId: 'user123',
                userCharacterId: 'char123',
                tier: 'SILVER',
            })
        ).rejects.toThrow('CHARACTER_ALREADY_STAKED');
    });

    test('throws INVALID_TIER for unknown tier', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [baseNftRow] })
            .mockResolvedValueOnce({ rows: [{ cardano_wallet_address: 'addr_test1...' }] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [] });
        mockVerifyNftOwnership.mockResolvedValueOnce(true);

        await expect(
            service.stakeCharacter({
                userId: 'user123',
                userCharacterId: 'char123',
                tier: 'DIAMOND' as any,
            })
        ).rejects.toThrow('INVALID_TIER');
    });

    test('throws TIER_REQUIREMENTS_NOT_MET for insufficient rarity', async () => {
        mockQuery
            .mockResolvedValueOnce({
                rows: [
                    {
                        ...baseNftRow,
                        rarity: 'common',
                    },
                ],
            })
            .mockResolvedValueOnce({ rows: [{ cardano_wallet_address: 'addr_test1...' }] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({
                rows: [
                    {
                        tier: 'GOLD',
                        min_rarity: 'epic',
                        min_level: 1,
                        base_rewards_per_day: 50,
                        xp_multiplier: 1.5,
                    },
                ],
            });
        mockVerifyNftOwnership.mockResolvedValueOnce(true);

        await expect(
            service.stakeCharacter({
                userId: 'user123',
                userCharacterId: 'char123',
                tier: 'GOLD',
            })
        ).rejects.toThrow('TIER_REQUIREMENTS_NOT_MET');
    });

    test('throws TIER_REQUIREMENTS_NOT_MET for insufficient level', async () => {
        mockQuery
            .mockResolvedValueOnce({
                rows: [
                    {
                        ...baseNftRow,
                        level: 5,
                    },
                ],
            })
            .mockResolvedValueOnce({ rows: [{ cardano_wallet_address: 'addr_test1...' }] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({
                rows: [
                    {
                        tier: 'PLATINUM',
                        min_rarity: 'legendary',
                        min_level: 15,
                        base_rewards_per_day: 100,
                        xp_multiplier: 2.0,
                    },
                ],
            });
        mockVerifyNftOwnership.mockResolvedValueOnce(true);

        await expect(
            service.stakeCharacter({
                userId: 'user123',
                userCharacterId: 'char123',
                tier: 'PLATINUM',
            })
        ).rejects.toThrow('TIER_REQUIREMENTS_NOT_MET');
    });

    test('successfully stakes when requirements met', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [baseNftRow] })
            .mockResolvedValueOnce({ rows: [{ cardano_wallet_address: 'addr_test1...' }] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({
                rows: [
                    {
                        tier: 'PLATINUM',
                        min_rarity: 'legendary',
                        min_level: 15,
                        base_rewards_per_day: 100,
                        xp_multiplier: '2.00',
                    },
                ],
            })
            .mockResolvedValueOnce({ rows: [{ id: 'position-123' }] });
        mockVerifyNftOwnership.mockResolvedValueOnce(true);

        const result = await service.stakeCharacter({
            userId: 'user123',
            userCharacterId: 'char123',
            tier: 'PLATINUM',
        });

        expect(result.positionId).toBe('position-123');
        expect(result.tier).toBe('PLATINUM');
        expect(result.baseRewardsPerDay).toBe(100);
        expect(result.xpMultiplier).toBe(2.0);
    });
});

describe('CardanoStakingService - calculatePendingRewards', () => {
    let service: CardanoStakingService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new CardanoStakingService();
    });

    test('throws STAKING_POSITION_NOT_FOUND for invalid ID', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });

        await expect(service.calculatePendingRewards('nonexistent')).rejects.toThrow(
            'STAKING_POSITION_NOT_FOUND'
        );
    });

    test('throws STAKING_POSITION_NOT_FOUND for unstaked position', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });

        await expect(service.calculatePendingRewards('unstaked')).rejects.toThrow(
            'STAKING_POSITION_NOT_FOUND'
        );
    });

    test('calculates rewards correctly for 24 hours', async () => {
        const lastDay = new Date(Date.now() - 24 * 60 * 60 * 1000);
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    base_rewards_per_day: 10,
                    last_reward_calculated_at: lastDay,
                    total_rewards_accrued: 0,
                },
            ],
        });

        const rewards = await service.calculatePendingRewards('position-123');
        expect(rewards).toBe(10);
    });

    test('calculates partial day rewards', async () => {
        const lastHalfDay = new Date(Date.now() - 12 * 60 * 60 * 1000);
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    base_rewards_per_day: 24,
                    last_reward_calculated_at: lastHalfDay,
                    total_rewards_accrued: 0,
                },
            ],
        });

        const rewards = await service.calculatePendingRewards('position-456');
        expect(rewards).toBe(12);
    });
});
