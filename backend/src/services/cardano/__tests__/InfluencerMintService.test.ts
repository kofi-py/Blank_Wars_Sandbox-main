import { InfluencerMintService } from '../InfluencerMintService';
import { query } from '../../../database';

jest.mock('../../../database', () => ({
    query: jest.fn(),
}));

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('InfluencerMintService - validateAllowlistEntry', () => {
    let service: InfluencerMintService;
    const walletAddress = 'addr1'.concat('a'.repeat(60));

    beforeEach(() => {
        jest.clearAllMocks();
        service = new InfluencerMintService();
    });

    test('throws CLAIM_CODE_NOT_FOUND for invalid code', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] });

        await expect(
            service.validateAllowlistEntry({
                claimCode: 'INVALID123',
                walletAddress,
            })
        ).rejects.toThrow('CLAIM_CODE_NOT_FOUND');
    });

    test('throws CLAIM_CODE_ALREADY_USED if status is CLAIMED', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    status: 'CLAIMED',
                    wallet_address: walletAddress,
                    card_set_id: 'set1',
                    expires_at: new Date(Date.now() + 1000 * 60 * 60),
                },
            ],
        });

        await expect(
            service.validateAllowlistEntry({
                claimCode: 'CLAIMED123',
                walletAddress,
            })
        ).rejects.toThrow('CLAIM_CODE_ALREADY_USED');
    });

    test('throws CLAIM_CODE_EXPIRED if status is EXPIRED', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    status: 'EXPIRED',
                    wallet_address: walletAddress,
                    card_set_id: 'set1',
                    expires_at: new Date(Date.now() - 1000 * 60 * 60),
                },
            ],
        });

        await expect(
            service.validateAllowlistEntry({
                claimCode: 'EXPIRED123',
                walletAddress,
            })
        ).rejects.toThrow('CLAIM_CODE_EXPIRED');
    });

    test('throws CLAIM_CODE_REVOKED if status is REVOKED', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    status: 'REVOKED',
                    wallet_address: walletAddress,
                    card_set_id: 'set1',
                    expires_at: new Date(Date.now() + 1000 * 60 * 60),
                },
            ],
        });

        await expect(
            service.validateAllowlistEntry({
                claimCode: 'REVOKED123',
                walletAddress,
            })
        ).rejects.toThrow('CLAIM_CODE_REVOKED');
    });

    test('auto-updates status to EXPIRED if past expiration', async () => {
        const expiredDate = new Date(Date.now() - 1000 * 60 * 60);
        mockQuery
            .mockResolvedValueOnce({
                rows: [
                    {
                        id: 'allow1',
                        status: 'PENDING',
                        wallet_address: walletAddress,
                        card_set_id: 'set1',
                        expires_at: expiredDate,
                    },
                ],
            })
            .mockResolvedValueOnce({ rows: [] });

        await expect(
            service.validateAllowlistEntry({
                claimCode: 'EXPIREDCODE',
                walletAddress,
            })
        ).rejects.toThrow('CLAIM_CODE_EXPIRED');

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('UPDATE influencer_mint_allowlist SET status'),
            ['EXPIRED', 'allow1']
        );
    });

    test('throws WALLET_MISMATCH if different wallet', async () => {
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    status: 'PENDING',
                    wallet_address: 'addr1'.concat('b'.repeat(60)),
                    card_set_id: 'set1',
                    expires_at: new Date(Date.now() + 1000 * 60 * 60),
                },
            ],
        });

        await expect(
            service.validateAllowlistEntry({
                claimCode: 'MISMATCH123',
                walletAddress,
            })
        ).rejects.toThrow('WALLET_MISMATCH');
    });

    test('validates successfully when all conditions met', async () => {
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60);
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    id: 'allow2',
                    status: 'PENDING',
                    wallet_address: walletAddress,
                    card_set_id: 'set2',
                    expires_at: expiresAt,
                },
            ],
        });

        const result = await service.validateAllowlistEntry({
            claimCode: 'VALIDCODE',
            walletAddress,
        });

        expect(result.allowlistId).toBe('allow2');
        expect(result.cardSetId).toBe('set2');
        expect(result.expiresAt).toBeInstanceOf(Date);
    });
});
