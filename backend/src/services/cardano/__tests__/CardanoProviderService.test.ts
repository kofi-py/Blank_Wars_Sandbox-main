import { CardanoProviderService } from '../CardanoProviderService';
import * as CardanoWasm from '@emurgo/cardano-serialization-lib-nodejs';

const CardanoWasmAny = CardanoWasm as any;

const mockFetchAddressAssets = jest.fn();
const mockFetchAssetMetadata = jest.fn();

jest.mock('@meshsdk/core', () => ({
    BlockfrostProvider: jest.fn().mockImplementation(() => ({
        fetchAddressAssets: mockFetchAddressAssets,
        fetchAssetMetadata: mockFetchAssetMetadata,
    })),
}));

describe('CardanoProviderService - Environment Validation', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
        process.env = { ...originalEnv };
        jest.clearAllMocks();
    });

    test('throws CARDANO_NOT_CONFIGURED if CARDANO_API_KEY not set', () => {
        delete process.env.CARDANO_API_KEY;
        process.env.CARDANO_NETWORK = 'preprod';

        expect(() => new CardanoProviderService()).toThrow('CARDANO_NOT_CONFIGURED');
    });

    test('throws CARDANO_NOT_CONFIGURED if CARDANO_NETWORK not set', () => {
        process.env.CARDANO_API_KEY = 'test_key';
        delete process.env.CARDANO_NETWORK;

        expect(() => new CardanoProviderService()).toThrow('CARDANO_NOT_CONFIGURED');
    });

    test('initializes successfully with valid environment', () => {
        process.env.CARDANO_API_KEY = 'test_key';
        process.env.CARDANO_NETWORK = 'preprod';

        expect(() => new CardanoProviderService()).not.toThrow();
    });
});

describe('CardanoProviderService - verifyNftOwnership', () => {
    const originalEnv = { ...process.env };
    let provider: CardanoProviderService;
    let validAddress: string;

    beforeAll(() => {
        const networkId = CardanoWasmAny.NetworkInfo.testnet().network_id();
        const paymentKeyHash = CardanoWasmAny.Ed25519KeyHash.from_bytes(Buffer.alloc(28, 1));
        const stakeKeyHash = CardanoWasmAny.Ed25519KeyHash.from_bytes(Buffer.alloc(28, 2));
        const baseAddress = CardanoWasmAny.BaseAddress.new(
            networkId,
            CardanoWasmAny.StakeCredential.from_keyhash(paymentKeyHash),
            CardanoWasmAny.StakeCredential.from_keyhash(stakeKeyHash)
        );
        validAddress = baseAddress.to_address().to_bech32();
    });

    beforeEach(() => {
        process.env = {
            ...originalEnv,
            CARDANO_API_KEY: 'test_key',
            CARDANO_NETWORK: 'preprod',
        };
        jest.clearAllMocks();
        provider = new CardanoProviderService();
    });

    afterAll(() => {
        process.env = { ...originalEnv };
    });

    test('throws INVALID_WALLET_ADDRESS for short addresses', async () => {
        await expect(provider.verifyNftOwnership('addr1short', 'asset1test')).rejects.toThrow(
            'INVALID_WALLET_ADDRESS'
        );
    });

    test('throws INVALID_ASSET_FINGERPRINT for wrong prefix', async () => {
        await expect(
            provider.verifyNftOwnership(validAddress, 'wrong_prefix123')
        ).rejects.toThrow('INVALID_ASSET_FINGERPRINT');
    });

    test('returns true when asset exists in wallet', async () => {
        mockFetchAddressAssets.mockResolvedValueOnce({ 'asset1abc...': '1' });

        const result = await provider.verifyNftOwnership(validAddress, 'asset1abc...');
        expect(result).toBe(true);
    });

    test('returns false when asset not in wallet', async () => {
        mockFetchAddressAssets.mockResolvedValueOnce({});

        const result = await provider.verifyNftOwnership(validAddress, 'asset1xyz...');
        expect(result).toBe(false);
    });
});

describe('CardanoProviderService - resolveStakeKey', () => {
    const originalEnv = { ...process.env };
    let provider: CardanoProviderService;
    let baseAddressBech32: string;
    let enterpriseAddressBech32: string;

    beforeAll(() => {
        const networkInfo = CardanoWasmAny.NetworkInfo.testnet();
        const paymentKeyHash = CardanoWasmAny.Ed25519KeyHash.from_bytes(Buffer.alloc(28, 3));
        const stakeKeyHash = CardanoWasmAny.Ed25519KeyHash.from_bytes(Buffer.alloc(28, 4));

        const baseAddress = CardanoWasmAny.BaseAddress.new(
            networkInfo.network_id(),
            CardanoWasmAny.StakeCredential.from_keyhash(paymentKeyHash),
            CardanoWasmAny.StakeCredential.from_keyhash(stakeKeyHash)
        );
        baseAddressBech32 = baseAddress.to_address().to_bech32();

        const enterpriseAddress = CardanoWasmAny.EnterpriseAddress.new(
            networkInfo.network_id(),
            CardanoWasmAny.StakeCredential.from_keyhash(paymentKeyHash)
        );
        enterpriseAddressBech32 = enterpriseAddress.to_address().to_bech32();
    });

    beforeEach(() => {
        process.env = {
            ...originalEnv,
            CARDANO_API_KEY: 'test_key',
            CARDANO_NETWORK: 'preprod',
        };
        jest.clearAllMocks();
        provider = new CardanoProviderService();
    });

    afterAll(() => {
        process.env = { ...originalEnv };
    });

    test('throws INVALID_PAYMENT_ADDRESS for addresses under 50 chars', async () => {
        await expect(provider.resolveStakeKey('addr1short')).rejects.toThrow('INVALID_PAYMENT_ADDRESS');
    });

    test('throws INVALID_ADDRESS_FORMAT for non-addr prefix', async () => {
        await expect(
            provider.resolveStakeKey('stake1u8rfnq9wz4nej3smvvpgq0qxq5yjp7u2zq8c6g7yq0y8c5g8c5g8c')
        ).rejects.toThrow('INVALID_ADDRESS_FORMAT');
    });

    test('throws ADDRESS_DESERIALIZATION_FAILED for invalid bech32', async () => {
        await expect(
            provider.resolveStakeKey('addr1invalidbech32charactersthataretoolongfornetworktests12345')
        ).rejects.toThrow('ADDRESS_DESERIALIZATION_FAILED');
    });

    test('throws NO_STAKE_COMPONENT for enterprise addresses', async () => {
        await expect(provider.resolveStakeKey(enterpriseAddressBech32)).rejects.toThrow('NO_STAKE_COMPONENT');
    });

    test('returns valid stake address for base address', async () => {
        const result = await provider.resolveStakeKey(baseAddressBech32);

        expect(result).toMatch(/^stake/);
        expect(result.length).toBeGreaterThan(50);
    });
});
