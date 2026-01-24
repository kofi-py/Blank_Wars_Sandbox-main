/**
 * NFT Mint Screen
 * Character → NFT minting interface
 * STRICT MODE: Validates all data, fails fast on errors
 */

'use client';

import { useState } from 'react';
import axios from 'axios';

interface Character {
    id: string;
    name: string;
    archetype: string;
    rarity: string;
    level: number;
    artwork_url?: string;
}

interface NftMintScreenProps {
    character: Character;
    userId: string;
    cardSetId: string;
    onMinted: (txHash: string, assetFingerprint: string) => void;
    onCancel: () => void;
}

export default function NftMintScreen({
    character,
    userId,
    cardSetId,
    onMinted,
    onCancel
}: NftMintScreenProps) {
    const [isMinting, setIsMinting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [txHash, setTxHash] = useState<string | null>(null);

    // Validate character data on mount
    if (!character.id || !character.name || !character.archetype || !character.rarity) {
        return (
            <div className="bg-red-900/30 border border-red-500 rounded-lg p-6">
                <h3 className="text-red-200 font-bold mb-2">Invalid Character Data</h3>
                <p className="text-red-300 text-sm">
                    Character is missing required fields. Cannot mint NFT.
                </p>
                <button
                    onClick={onCancel}
                    className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
                >
                    Go Back
                </button>
            </div>
        );
    }

    const handleMint = async () => {
        setIsMinting(true);
        setError(null);

        try {
            const response = await axios.post('/api/cardano/mint', {
                userId,
                userCharacterId: character.id,
                cardSetId
            });

            // Strict validation of response
            if (!response.data) {
                throw new Error('EMPTY_RESPONSE: Server returned no data');
            }

            if (!response.data.success) {
                throw new Error(response.data.error || 'MINT_FAILED: Unknown error');
            }

            if (!response.data.txHash || !response.data.assetFingerprint) {
                throw new Error('INCOMPLETE_RESPONSE: Missing transaction hash or asset fingerprint');
            }

            setTxHash(response.data.txHash);
            onMinted(response.data.txHash, response.data.assetFingerprint);
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                const errorMessage = err.response?.data?.error || err.message;
                setError(errorMessage);
            } else {
                const errorMessage = err instanceof Error ? err.message : String(err);
                setError(errorMessage);
            }
        } finally {
            setIsMinting(false);
        }
    };

    return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-lg mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6">Mint as NFT</h2>

            {/* Character Preview */}
            <div className="bg-gray-800 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-4">
                    {character.artwork_url && (
                        <img
                            src={character.artwork_url}
                            alt={character.name}
                            className="w-24 h-24 rounded object-cover"
                        />
                    )}
                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-white">{character.name}</h3>
                        <p className="text-gray-400 text-sm">{character.archetype}</p>
                        <div className="mt-2 flex gap-2">
                            <span className={`px-2 py-1 rounded text-xs ${getRarityColor(character.rarity)}`}>
                                {character.rarity}
                            </span>
                            <span className="px-2 py-1 bg-blue-900/30 text-blue-300 rounded text-xs">
                                Level {character.level}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded">
                    <p className="text-red-200 text-sm font-medium">Minting Failed</p>
                    <p className="text-red-300 text-xs mt-1">{error}</p>
                </div>
            )}

            {/* Success Display */}
            {txHash && (
                <div className="mb-4 p-3 bg-green-900/30 border border-green-500 rounded">
                    <p className="text-green-200 text-sm font-medium">✓ NFT Minted Successfully</p>
                    <p className="text-green-300 text-xs mt-1 break-all">
                        Transaction: {txHash.substring(0, 16)}...{txHash.substring(txHash.length - 8)}
                    </p>
                </div>
            )}

            {/* Info */}
            {!txHash && (
                <div className="mb-6 p-4 bg-blue-900/20 border border-blue-700 rounded">
                    <h4 className="text-blue-200 font-medium text-sm mb-2">What happens when you mint:</h4>
                    <ul className="text-blue-300 text-xs space-y-1">
                        <li>• CIP-68 reference token sent to your wallet</li>
                        <li>• Metadata token locked in script (updatable)</li>
                        <li>• Character stats synced to blockchain</li>
                        <li>• NFT becomes tradeable on Cardano marketplaces</li>
                    </ul>
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
                <button
                    onClick={handleMint}
                    disabled={isMinting || !!txHash}
                    className={`flex-1 py-3 rounded font-medium transition-colors ${isMinting || txHash
                            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-500 text-white'
                        }`}
                >
                    {isMinting ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="animate-spin">⟳</span>
                            Minting...
                        </span>
                    ) : txHash ? (
                        'Minted'
                    ) : (
                        'Mint NFT'
                    )}
                </button>

                <button
                    onClick={onCancel}
                    disabled={isMinting}
                    className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded text-white font-medium disabled:opacity-50"
                >
                    {txHash ? 'Close' : 'Cancel'}
                </button>
            </div>

            {/* Estimated Cost */}
            <p className="text-gray-500 text-xs mt-4 text-center">
                Estimated cost: ~2-5 ADA (network fees)
            </p>
        </div>
    );
}

function getRarityColor(rarity: string): string {
    const colors: Record<string, string> = {
        common: 'bg-gray-700 text-gray-300',
        uncommon: 'bg-green-900/30 text-green-300',
        rare: 'bg-blue-900/30 text-blue-300',
        epic: 'bg-purple-900/30 text-purple-300',
        legendary: 'bg-yellow-900/30 text-yellow-300',
        mythic: 'bg-red-900/30 text-red-300'
    };

    return colors[rarity.toLowerCase()] || colors.common;
}
