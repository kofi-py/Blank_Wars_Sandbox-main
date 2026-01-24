import { CardanoMintingService } from '../CardanoMintingService';
import { query } from '../../../database';

jest.mock('../../../database', () => ({
    query: jest.fn(),
}));

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('CardanoMintingService - mintCharacterNFT', () => {
    let service: CardanoMintingService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new CardanoMintingService();
    });

    describe('Character Validation', () => {
        test('throws CHARACTER_NOT_FOUND if character does not exist', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] });

            await expect(
                service.mintCharacterNFT({
                    userId: 'user123',
                    userCharacterId: 'nonexistent',
                    cardSetId: 'set123',
                })
            ).rejects.toThrow('CHARACTER_NOT_FOUND');
        });

        test('throws CHARACTER_NOT_FOUND if character belongs to different user', async () => {
            mockQuery.mockResolvedValueOnce({ rows: [] });

            await expect(
                service.mintCharacterNFT({
                    userId: 'user123',
                    userCharacterId: 'other-user-char',
                    cardSetId: 'set123',
                })
            ).rejects.toThrow('CHARACTER_NOT_FOUND');
        });

        test('throws CHARACTER_DATA_INCOMPLETE if missing name', async () => {
            mockQuery.mockResolvedValueOnce({
                rows: [
                    {
                        name: null,
                        archetype: 'warrior',
                        rarity: 'rare',
                    },
                ],
            });

            await expect(
                service.mintCharacterNFT({
                    userId: 'user123',
                    userCharacterId: 'char123',
                    cardSetId: 'set123',
                })
            ).rejects.toThrow('CHARACTER_DATA_INCOMPLETE');
        });

        test('throws CHARACTER_ALREADY_MINTED if already an NFT', async () => {
            mockQuery
                .mockResolvedValueOnce({
                    rows: [
                        {
                            name: 'Test',
                            archetype: 'warrior',
                            rarity: 'rare',
                        },
                    ],
                })
                .mockResolvedValueOnce({
                    rows: [{ is_minted: true }],
                });

            await expect(
                service.mintCharacterNFT({
                    userId: 'user123',
                    userCharacterId: 'char123',
                    cardSetId: 'set123',
                })
            ).rejects.toThrow('CHARACTER_ALREADY_MINTED');
        });
    });

    describe('Card Set Validation', () => {
        const validCharacter = {
            name: 'Test',
            archetype: 'warrior',
            rarity: 'rare',
        };

        beforeEach(() => {
            jest.clearAllMocks();
            service = new CardanoMintingService();
        });

        test('throws CARD_SET_NOT_FOUND for invalid set ID', async () => {
            mockQuery
                .mockResolvedValueOnce({ rows: [validCharacter] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] });

            await expect(
                service.mintCharacterNFT({
                    userId: 'user123',
                    userCharacterId: 'char123',
                    cardSetId: 'nonexistent',
                })
            ).rejects.toThrow('CARD_SET_NOT_FOUND');
        });

        test('throws POLICY_NOT_CONFIGURED if no policy ID', async () => {
            mockQuery
                .mockResolvedValueOnce({ rows: [validCharacter] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({
                    rows: [
                        {
                            policy_id: null,
                            minting_active: true,
                            current_minted: 0,
                        },
                    ],
                });

            await expect(
                service.mintCharacterNFT({
                    userId: 'user123',
                    userCharacterId: 'char123',
                    cardSetId: 'set123',
                })
            ).rejects.toThrow('POLICY_NOT_CONFIGURED');
        });

        test('throws MINTING_INACTIVE if minting disabled', async () => {
            mockQuery
                .mockResolvedValueOnce({ rows: [validCharacter] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({
                    rows: [
                        {
                            policy_id: 'a'.repeat(56),
                            minting_active: false,
                            current_minted: 0,
                        },
                    ],
                });

            await expect(
                service.mintCharacterNFT({
                    userId: 'user123',
                    userCharacterId: 'char123',
                    cardSetId: 'set123',
                })
            ).rejects.toThrow('MINTING_INACTIVE');
        });

        test('throws MINTING_NOT_STARTED if before start time', async () => {
            const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

            mockQuery
                .mockResolvedValueOnce({ rows: [validCharacter] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({
                    rows: [
                        {
                            policy_id: 'a'.repeat(56),
                            minting_active: true,
                            current_minted: 0,
                            minting_starts_at: futureDate,
                        },
                    ],
                });

            await expect(
                service.mintCharacterNFT({
                    userId: 'user123',
                    userCharacterId: 'char123',
                    cardSetId: 'set123',
                })
            ).rejects.toThrow('MINTING_NOT_STARTED');
        });

        test('throws MINTING_ENDED if after end time', async () => {
            const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

            mockQuery
                .mockResolvedValueOnce({ rows: [validCharacter] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({
                    rows: [
                        {
                            policy_id: 'a'.repeat(56),
                            minting_active: true,
                            current_minted: 0,
                            minting_ends_at: pastDate,
                        },
                    ],
                });

            await expect(
                service.mintCharacterNFT({
                    userId: 'user123',
                    userCharacterId: 'char123',
                    cardSetId: 'set123',
                })
            ).rejects.toThrow('MINTING_ENDED');
        });

        test('throws MAX_SUPPLY_REACHED if supply exhausted', async () => {
            mockQuery
                .mockResolvedValueOnce({ rows: [validCharacter] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({
                    rows: [
                        {
                            policy_id: 'a'.repeat(56),
                            minting_active: true,
                            current_minted: 100,
                            max_supply: 100,
                        },
                    ],
                });

            await expect(
                service.mintCharacterNFT({
                    userId: 'user123',
                    userCharacterId: 'char123',
                    cardSetId: 'set123',
                })
            ).rejects.toThrow('MAX_SUPPLY_REACHED');
        });
    });
});

describe('CardanoMintingService - buildCIP68Metadata', () => {
    let service: CardanoMintingService;

    beforeEach(() => {
        service = new CardanoMintingService();
    });

    const createValidCharacter = (overrides: Partial<any> = {}) => ({
        id: 'char123',
        name: 'Test Character',
        title: 'The Bold',
        backstory: 'A brave warrior',
        artwork_url: undefined,
        archetype: 'warrior',
        rarity: 'epic',
        level: 10,
        experience: 1000,
        total_battles: 20,
        total_wins: 12,
        current_attack: 75,
        current_defense: 60,
        current_speed: 55,
        current_max_health: 120,
        current_mental_health: 90,
        bond_level: 3,
        acquired_at: new Date().toISOString(),
        serial_number: '1',
        ...overrides,
    });

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
        'bond_level',
    ];

    requiredFields.forEach((field) => {
        test(`throws CHARACTER_DATA_INCOMPLETE if ${field} is null`, () => {
            const character = createValidCharacter();
            (character as any)[field] = null;

            expect(() => service['buildCIP68Metadata'](character)).toThrow('CHARACTER_DATA_INCOMPLETE');
        });

        test(`throws CHARACTER_DATA_INCOMPLETE if ${field} is undefined`, () => {
            const character = createValidCharacter();
            delete (character as any)[field];

            expect(() => service['buildCIP68Metadata'](character)).toThrow('CHARACTER_DATA_INCOMPLETE');
        });
    });

    test('allows null/undefined for optional display fields', () => {
        const character = createValidCharacter({
            title: undefined,
            backstory: undefined,
            artwork_url: undefined,
        });

        const metadata: any = service['buildCIP68Metadata'](character);

        expect(metadata.title).toBe('');
        expect(metadata.description).toBe('A legendary warrior in Blank Wars');
        expect(metadata.image).toMatch(/blankwars.com\/nft/);
    });

    test('includes all stats without fallbacks', () => {
        const character = createValidCharacter({
            level: 10,
            current_attack: 75,
            current_defense: 60,
            current_speed: 55,
            current_max_health: 120,
            total_battles: 50,
            total_wins: 30,
        });

        const metadata: any = service['buildCIP68Metadata'](character);

        expect(metadata.attributes.level).toBe(10);
        expect(metadata.attributes.attack).toBe(75);
        expect(metadata.attributes.defense).toBe(60);
        expect(metadata.attributes.total_battles).toBe(50);
        expect(metadata.attributes.total_wins).toBe(30);
        expect(metadata.attributes.win_rate).toBe('60.00');
    });
});
