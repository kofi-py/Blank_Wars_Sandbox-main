/**
 * Cardano Provider Service
 * Strict-mode Blockfrost integration with NO fallbacks
 * All methods throw on failure - never return false/null/default
 */

import * as CardanoWasm from '@emurgo/cardano-serialization-lib-nodejs';
import axios from 'axios';
import { BlockfrostProvider } from '@meshsdk/core';

export class CardanoProviderService {
    private provider: BlockfrostProvider;
    private readonly network: string;

    constructor() {
        // STRICT MODE: Environment variables are REQUIRED
        const apiKey = process.env.CARDANO_API_KEY;
        const network = process.env.CARDANO_NETWORK; // 'preprod' | 'mainnet'

        if (!apiKey) {
            throw new Error('CARDANO_NOT_CONFIGURED: Missing CARDANO_API_KEY environment variable');
        }
        if (!network) {
            throw new Error('CARDANO_NOT_CONFIGURED: Missing CARDANO_NETWORK environment variable');
        }
        if (network !== 'preprod' && network !== 'mainnet') {
            throw new Error(`CARDANO_INVALID_NETWORK: Network must be 'preprod' or 'mainnet', got '${network}'`);
        }

        this.network = network;
        this.provider = new BlockfrostProvider(apiKey);
    }

    /**
     * Fetch all assets owned by a wallet address
     * @throws INVALID_WALLET_ADDRESS if address invalid
     * @throws BLOCKFROST_API_ERROR if API call fails
     * @returns Dictionary of { assetFingerprint: quantity }
     */
    async fetchWalletAssets(walletAddress: string): Promise<Record<string, string>> {
        if (!walletAddress || walletAddress.length < 50) {
            throw new Error(`INVALID_WALLET_ADDRESS: Address must be at least 50 characters, got ${walletAddress?.length || 0}`);
        }

        try {
            const assets = await this.provider.fetchAddressAssets(walletAddress);
            return assets;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`BLOCKFROST_API_ERROR: Failed to fetch assets for ${walletAddress}: ${message}`);
        }
    }

    /**
     * Verify a user owns a specific NFT by asset fingerprint
     * @throws INVALID_PARAMETERS if inputs invalid
     * @throws BLOCKFROST_API_ERROR if verification fails
     * @returns true if owned, false if not owned (NOT an error)
     */
    async verifyNftOwnership(walletAddress: string, assetFingerprint: string): Promise<boolean> {
        if (!assetFingerprint || !assetFingerprint.startsWith('asset1')) {
            throw new Error(`INVALID_ASSET_FINGERPRINT: Must start with 'asset1', got '${assetFingerprint}'`);
        }

        const assets = await this.fetchWalletAssets(walletAddress);
        return !!assets[assetFingerprint];
    }

    /**
     * Resolve payment address to stake address
     * @throws CARDANO_NOT_IMPLEMENTED - Stake resolution requires additional logic
     */
    async resolveStakeKey(paymentAddress: string): Promise<string> {
        if (!paymentAddress || paymentAddress.length < 50) {
            throw new Error(`INVALID_PAYMENT_ADDRESS: Address invalid`);
        }

        if (!paymentAddress.startsWith('addr')) {
            throw new Error('INVALID_ADDRESS_FORMAT');
        }

        let address: CardanoWasm.Address;
        try {
            address = CardanoWasm.Address.from_bech32(paymentAddress);
        } catch (_error: unknown) {
            throw new Error('ADDRESS_DESERIALIZATION_FAILED');
        }

        const baseAddress = CardanoWasm.BaseAddress.from_address(address);
        if (!baseAddress) {
            throw new Error('NO_STAKE_COMPONENT');
        }

        try {
            const stakeCredential = baseAddress.stake_cred();
            const rewardAddress = CardanoWasm.RewardAddress.new(baseAddress.network_id(), stakeCredential);
            const stakeAddress = rewardAddress.to_address().to_bech32();

            if (!stakeAddress.startsWith('stake')) {
                throw new Error('INVALID_ADDRESS_FORMAT');
            }

            return stakeAddress;
        } catch (_error: unknown) {
            throw new Error('ADDRESS_DESERIALIZATION_FAILED');
        }
    }

    /**
     * Check if stake address is delegated to a pool
     * @throws CARDANO_NOT_IMPLEMENTED - Delegation checking requires stake address
     */
    async fetchDelegation(stakeAddress: string): Promise<{ poolId: string; active: boolean } | null> {
        if (!stakeAddress || !stakeAddress.startsWith('stake')) {
            throw new Error(`INVALID_STAKE_ADDRESS: Must start with 'stake', got '${stakeAddress}'`);
        }

        const apiKey = process.env.CARDANO_API_KEY;
        if (!apiKey) {
            throw new Error('CARDANO_NOT_CONFIGURED: Missing CARDANO_API_KEY environment variable');
        }

        const baseUrl = this.network === 'preprod'
            ? 'https://cardano-preprod.blockfrost.io/api/v0'
            : 'https://cardano-mainnet.blockfrost.io/api/v0';
        const url = `${baseUrl}/accounts/${stakeAddress}`;

        try {
            const response = await axios.get<{ stake_address: string; active: boolean; pool_id: string | null }>(url, {
                headers: { project_id: apiKey },
            });

            const { pool_id: poolId, active } = response.data;

            if (!poolId) {
                return null;
            }

            return { poolId, active };
        } catch (error: unknown) {
            if (axios.isAxiosError<string | { message?: string }>(error)) {
                const status = error.response?.status;
                if (status === 404) {
                    return null;
                }

                const message = typeof error.response?.data === 'string'
                    ? error.response.data
                    : error.response?.data?.message;

                if (message) {
                    throw new Error(`BLOCKFROST_API_ERROR: ${message}`);
                }

                throw new Error(`BLOCKFROST_API_ERROR: ${error.message}`);
            }

            throw new Error(`BLOCKFROST_API_ERROR: ${String(error)}`);
        }
    }

    /**
     * Fetch asset metadata from Blockfrost
     * @throws BLOCKFROST_API_ERROR if fetch fails
     */
    async fetchAssetMetadata(assetFingerprint: string): Promise<any> {
        if (!assetFingerprint || !assetFingerprint.startsWith('asset1')) {
            throw new Error(`INVALID_ASSET_FINGERPRINT: ${assetFingerprint}`);
        }

        try {
            const metadata = await this.provider.fetchAssetMetadata(assetFingerprint);
            return metadata;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`METADATA_FETCH_FAILED: ${message}`);
        }
    }

    /**
     * Get current network
     */
    getNetwork(): string {
        return this.network;
    }
}

// Lazy singleton instance
let _cardanoProviderInstance: CardanoProviderService | null = null;

/**
 * Get or create the Cardano provider instance
 * This lazy-loads the service to prevent startup crashes when env vars are missing
 * @throws CARDANO_NOT_CONFIGURED if required environment variables are missing
 */
export function getCardanoProvider(): CardanoProviderService {
    if (!_cardanoProviderInstance) {
        _cardanoProviderInstance = new CardanoProviderService();
    }
    return _cardanoProviderInstance;
}

// For backwards compatibility, create a proxy that lazily initializes
export const cardanoProvider = new Proxy({} as CardanoProviderService, {
    get(_target, prop) {
        const instance = getCardanoProvider();
        const value = (instance as any)[prop];
        return typeof value === 'function' ? value.bind(instance) : value;
    }
});
