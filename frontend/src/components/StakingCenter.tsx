import React, { useState } from 'react';
import { useWallet } from '@meshsdk/react';
import { BattleCharacter } from '@/data/battleFlow';
import { WalletConnect } from './WalletConnect';

interface StakingCenterProps {
    characters: BattleCharacter[];
    onStake: (characterId: string) => Promise<void>;
    onUnstake: (characterId: string) => Promise<void>;
    onClaim: () => Promise<void>;
}

export const StakingCenter: React.FC<StakingCenterProps> = ({
    characters,
    onStake,
    onUnstake,
    onClaim
}) => {
    const { connected } = useWallet();
    const [loading, setLoading] = useState<string | null>(null);

    if (!connected) {
        return (
            <div className="staking-center p-6 bg-gray-900 rounded-xl border border-gray-700 text-center">
                <h2 className="text-2xl font-bold text-white mb-4">Training Grounds</h2>
                <p className="text-gray-400 mb-6">Connect your wallet to access the Training Grounds and stake your characters.</p>
                <div className="flex justify-center">
                    <WalletConnect />
                </div>
            </div>
        );
    }

    const handleStake = async (id: string) => {
        setLoading(id);
        try {
            await onStake(id);
        } catch (error) {
            console.error('Stake error:', error);
        } finally {
            setLoading(null);
        }
    };

    const handleUnstake = async (id: string) => {
        setLoading(id);
        try {
            await onUnstake(id);
        } catch (error) {
            console.error('Unstake error:', error);
        } finally {
            setLoading(null);
        }
    };

    const stakedCharacters = characters.filter(c => c.is_staked);
    const availableCharacters = characters.filter(c => !c.is_staked && c.nft_metadata);

    return (
        <div className="staking-center p-6 bg-gray-900 rounded-xl border border-gray-700">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Training Grounds</h2>
                <button
                    onClick={onClaim}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg font-bold transition-colors"
                >
                    Claim Rewards
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Staked Characters */}
                <div className="staked-section">
                    <h3 className="text-xl font-semibold text-green-400 mb-4">Training ({stakedCharacters.length})</h3>
                    <div className="space-y-4">
                        {stakedCharacters.length === 0 && <p className="text-gray-500 italic">No characters currently training.</p>}
                        {stakedCharacters.map(char => (
                            <div key={char.id} className="character-card p-4 bg-gray-800 rounded-lg border border-green-500/30 flex justify-between items-center">
                                <div>
                                    <h4 className="font-bold text-white">{char.name}</h4>
                                    <p className="text-xs text-green-400">Earning XP & Shards</p>
                                </div>
                                <button
                                    onClick={() => handleUnstake(char.id!)}
                                    disabled={loading === char.id}
                                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
                                >
                                    {loading === char.id ? 'Unstaking...' : 'Recall'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Available Characters */}
                <div className="available-section">
                    <h3 className="text-xl font-semibold text-blue-400 mb-4">Available to Train</h3>
                    <div className="space-y-4">
                        {availableCharacters.length === 0 && <p className="text-gray-500 italic">No NFT characters available.</p>}
                        {availableCharacters.map(char => (
                            <div key={char.id} className="character-card p-4 bg-gray-800 rounded-lg border border-gray-700 flex justify-between items-center">
                                <div>
                                    <h4 className="font-bold text-white">{char.name}</h4>
                                    <p className="text-xs text-gray-400">Level {char.character.level} {char.character.archetype}</p>
                                </div>
                                <button
                                    onClick={() => handleStake(char.id!)}
                                    disabled={loading === char.id}
                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition-colors"
                                >
                                    {loading === char.id ? 'Staking...' : 'Train'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
