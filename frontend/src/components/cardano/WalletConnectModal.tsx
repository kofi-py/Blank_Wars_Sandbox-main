/**
 * Wallet Connect Modal
 * Cardano wallet connection using MeshSDK
 * STRICT MODE: No fallbacks, explicit validation, fail fast
 */

'use client';

import { useState, useEffect } from 'react';
import { CardanoWallet, useWallet } from '@meshsdk/react';
import axios from 'axios';

interface WalletConnectModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    onConnected: (walletAddress: string) => void;
}

export default function WalletConnectModal({
    isOpen,
    onClose,
    userId,
    onConnected
}: WalletConnectModalProps) {
    const { connected, wallet } = useWallet();
    const [error, setError] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);

    useEffect(() => {
        if (connected && wallet) {
            handleWalletConnected();
        }
    }, [connected, wallet]);

    const handleWalletConnected = async () => {
        if (!wallet) {
            setError('WALLET_NOT_INITIALIZED: Wallet object is undefined');
            return;
        }

        setIsConnecting(true);
        setError(null);

        try {
            // Get wallet address - STRICT: no fallback
            const addresses = await wallet.getUsedAddresses();

            if (!addresses || addresses.length === 0) {
                throw new Error('NO_ADDRESSES_FOUND: Wallet has no used addresses');
            }

            const walletAddress = addresses[0];

            // Validate address format
            if (!walletAddress || walletAddress.length < 50) {
                throw new Error(`INVALID_ADDRESS_FORMAT: Address is too short (${walletAddress?.length || 0} chars)`);
            }

            if (!walletAddress.startsWith('addr')) {
                throw new Error(`INVALID_ADDRESS_PREFIX: Expected 'addr', got '${walletAddress.substring(0, 4)}'`);
            }

            // Save to backend
            const walletName = await wallet.getNetworkId() ? 'Cardano Wallet' : 'Unknown';
            const response = await axios.post('/api/users/connect-wallet', {
                userId,
                walletAddress,
                walletName
            });

            if (!response.data || response.data.success !== true) {
                throw new Error('BACKEND_SAVE_FAILED: Failed to save wallet address to database');
            }

            // Notify parent
            onConnected(walletAddress);
            onClose();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            console.error('Wallet connection error:', errorMessage);
            setError(errorMessage);
        } finally {
            setIsConnecting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white">Connect Cardano Wallet</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded text-red-200 text-sm">
                        <strong>Error:</strong> {error}
                    </div>
                )}

                <div className="space-y-4">
                    <p className="text-gray-300 text-sm">
                        Connect your Cardano wallet to mint NFTs, stake characters, and claim influencer rewards.
                    </p>

                    {!connected ? (
                        <CardanoWallet />
                    ) : isConnecting ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                            <p className="text-gray-300">Connecting wallet...</p>
                        </div>
                    ) : (
                        <div className="text-center py-4">
                            <div className="text-green-400 text-lg mb-2">✓ Wallet Connected</div>
                            <p className="text-gray-400 text-sm">Saving to database...</p>
                        </div>
                    )}

                    <div className="pt-4 border-t border-gray-700">
                        <p className="text-gray-500 text-xs">
                            <strong>Supported Wallets:</strong> Nami, Eternl, Lace, Flint, Typhon, Gero
                        </p>
                        <p className="text-gray-500 text-xs mt-2">
                            <strong>Network:</strong> {process.env.NEXT_PUBLIC_CARDANO_NETWORK || 'preprod'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
