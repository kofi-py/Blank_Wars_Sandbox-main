/**
 * Influencer Claim Flow
 * One-time claim code redemption for exclusive NFTs
 * STRICT MODE: Validates codes, wallet, expiration
 */

'use client';

import { useState } from 'react';
import axios from 'axios';

interface InfluencerClaimFlowProps {
    userId: string;
    walletAddress: string;
    onClaimed: (assetFingerprint: string) => void;
}

export default function InfluencerClaimFlow({
    userId,
    walletAddress,
    onClaimed
}: InfluencerClaimFlowProps) {
    const [claimCode, setClaimCode] = useState('');
    const [isClaiming, setIsClaiming] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Validate props on mount
    if (!userId || !walletAddress) {
        return (
            <div className="bg-red-900/30 border border-red-500 rounded-lg p-6">
                <h3 className="text-red-200 font-bold mb-2">Configuration Error</h3>
                <p className="text-red-300 text-sm">
                    User ID and wallet address are required to claim influencer NFTs.
                </p>
            </div>
        );
    }

    const handleClaim = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate claim code format
        const cleanCode = claimCode.trim().toUpperCase();

        if (!cleanCode) {
            setError('EMPTY_CODE: Please enter a claim code');
            return;
        }

        if (cleanCode.length < 8 || cleanCode.length > 32) {
            setError(`INVALID_CODE_LENGTH: Code must be 8-32 characters, got ${cleanCode.length}`);
            return;
        }

        if (!/^[A-Z0-9-]+$/.test(cleanCode)) {
            setError('INVALID_CODE_FORMAT: Code must contain only uppercase letters, numbers, and hyphens');
            return;
        }

        setIsClaiming(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await axios.post('/api/cardano/influencer/claim', {
                userId,
                claimCode: cleanCode
            });

            // Strict validation
            if (!response.data) {
                throw new Error('EMPTY_RESPONSE: Server returned no data');
            }

            if (!response.data.success) {
                throw new Error(response.data.error || 'CLAIM_FAILED: Unknown error');
            }

            if (!response.data.assetFingerprint || !response.data.txHash) {
                throw new Error('INCOMPLETE_RESPONSE: Missing asset fingerprint or transaction hash');
            }

            setSuccess(`NFT claimed successfully! TX: ${response.data.txHash.substring(0, 16)}...`);
            onClaimed(response.data.assetFingerprint);

            // Clear form
            setClaimCode('');
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                const errorMessage = err.response?.data?.error || err.message;
                setError(errorMessage);
            } else {
                const errorMessage = err instanceof Error ? err.message : String(err);
                setError(errorMessage);
            }
        } finally {
            setIsClaiming(false);
        }
    };

    return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-lg mx-auto">
            <h2 className="text-2xl font-bold text-white mb-2">Claim Influencer NFT</h2>
            <p className="text-gray-400 text-sm mb-6">
                Enter your exclusive claim code to mint a limited-edition character NFT.
            </p>

            <form onSubmit={handleClaim} className="space-y-4">
                {/* Claim Code Input */}
                <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                        Claim Code
                    </label>
                    <input
                        type="text"
                        value={claimCode}
                        onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
                        placeholder="BLANK-WARS-2026"
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                        disabled={isClaiming}
                        maxLength={32}
                    />
                    <p className="text-gray-500 text-xs mt-1">
                        Format: Uppercase letters, numbers, and hyphens (8-32 characters)
                    </p>
                </div>

                {/* Wallet Info */}
                <div className="p-3 bg-gray-800/50 rounded border border-gray-700">
                    <p className="text-gray-400 text-xs mb-1">Connected Wallet:</p>
                    <p className="text-white text-sm font-mono break-all">
                        {walletAddress.substring(0, 20)}...{walletAddress.substring(walletAddress.length - 10)}
                    </p>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="p-3 bg-red-900/30 border border-red-500 rounded">
                        <p className="text-red-200 text-sm font-medium">Claim Failed</p>
                        <p className="text-red-300 text-xs mt-1">{error}</p>
                    </div>
                )}

                {/* Success Display */}
                {success && (
                    <div className="p-3 bg-green-900/30 border border-green-500 rounded">
                        <p className="text-green-200 text-sm font-medium">✓ Success!</p>
                        <p className="text-green-300 text-xs mt-1">{success}</p>
                    </div>
                )}

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isClaiming || !claimCode.trim()}
                    className={`w-full py-3 rounded font-medium transition-colors ${isClaiming || !claimCode.trim()
                            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-500 text-white'
                        }`}
                >
                    {isClaiming ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="animate-spin">⟳</span>
                            Claiming...
                        </span>
                    ) : (
                        'Claim NFT'
                    )}
                </button>
            </form>

            {/* Info Text */}
            <div className="mt-6 pt-6 border-t border-gray-700">
                <h3 className="text-gray-300 font-medium text-sm mb-2">About Influencer NFTs</h3>
                <ul className="text-gray-500 text-xs space-y-1">
                    <li>• One-time use claim codes</li>
                    <li>• Codes are wallet-specific and cannot be transferred</li>
                    <li>• Check expiration date before claiming</li>
                    <li>• NFTs are minted directly to your connected wallet</li>
                </ul>
            </div>
        </div>
    );
}
