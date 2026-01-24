/**
 * Staking Interface
 * NFT character staking with tiered rewards
 * STRICT MODE: Validates ownership, fails fast on errors
 */

'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

interface StakingPosition {
    id: string;
    tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
    base_rewards_per_day: number;
    xp_multiplier: number;
    staked_at: string;
    pending_rewards: number;
    total_unclaimed_rewards: number;
    character_name: string;
    rarity: string;
    status: string;
}

interface StakingInterfaceProps {
    userId: string;
}

export default function StakingInterface({ userId }: StakingInterfaceProps) {
    const [positions, setPositions] = useState<StakingPosition[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadPositions();
        const interval = setInterval(loadPositions, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, [userId]);

    const loadPositions = async () => {
        try {
            const response = await axios.get(`/api/cardano/staking/user/${userId}`);

            if (!response.data || !response.data.positions) {
                throw new Error('INVALID_RESPONSE: Server returned no positions array');
            }

            setPositions(response.data.positions);
            setError(null);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleUnstake = async (positionId: string) => {
        if (!confirm('Are you sure you want to unstake? You will claim all pending rewards.')) {
            return;
        }

        try {
            const response = await axios.post('/api/cardano/unstake', {
                positionId,
                userId
            });

            if (!response.data || !response.data.success) {
                throw new Error(response.data?.error || 'UNSTAKE_FAILED');
            }

            // Show success
            alert(`Successfully unstaked! Claimed ${response.data.rewardsClaimed} Soul Shards`);

            // Reload positions
            await loadPositions();
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            alert(`Unstake failed: ${errorMessage}`);
        }
    };

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-300">Loading staking positions...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-900/30 border border-red-500 rounded-lg p-6">
                <h3 className="text-red-200 font-bold mb-2">Error Loading Staking Data</h3>
                <p className="text-red-300 text-sm">{error}</p>
                <button
                    onClick={loadPositions}
                    className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Training Grounds</h2>
                <button
                    onClick={loadPositions}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm"
                >
                    ⟳ Refresh
                </button>
            </div>

            {/* Tier Info */}
            <div className="grid grid-cols-4 gap-4">
                {TIER_INFO.map((tier) => (
                    <div key={tier.name} className={`p-4 rounded border ${tier.color}`}>
                        <h3 className="font-bold text-sm mb-1">{tier.name}</h3>
                        <p className="text-xs opacity-80">{tier.rewards}/day</p>
                        <p className="text-xs opacity-80">{tier.xp} XP bonus</p>
                    </div>
                ))}
            </div>

            {/* Active Positions */}
            {positions.length === 0 ? (
                <div className="text-center py-12 bg-gray-800/50 rounded-lg border border-gray-700">
                    <p className="text-gray-400">No characters currently staked</p>
                    <p className="text-gray-500 text-sm mt-2">Stake NFT characters to earn passive rewards</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {positions.map((position) => (
                        <div
                            key={position.id}
                            className="bg-gray-800 border border-gray-700 rounded-lg p-4"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-lg font-bold text-white">{position.character_name}</h3>
                                    <p className="text-gray-400 text-sm">{position.rarity} • {position.tier} Tier</p>
                                </div>
                                <span className={`px-2 py-1 rounded text-xs ${position.status === 'ACTIVE' ? 'bg-green-900/30 text-green-300' : 'bg-gray-700 text-gray-400'
                                    }`}>
                                    {position.status}
                                </span>
                            </div>

                            <div className="mt-4 grid grid-cols-3 gap-4">
                                <div>
                                    <p className="text-gray-500 text-xs">Pending Rewards</p>
                                    <p className="text-white font-bold">{position.pending_rewards} 💎</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 text-xs">XP Multiplier</p>
                                    <p className="text-white font-bold">{position.xp_multiplier}x</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 text-xs">Daily Rate</p>
                                    <p className="text-white font-bold">{position.base_rewards_per_day}/day</p>
                                </div>
                            </div>

                            {position.status === 'ACTIVE' && (
                                <button
                                    onClick={() => handleUnstake(position.id)}
                                    className="mt-4 w-full py-2 bg-red-600 hover:bg-red-500 rounded text-white font-medium"
                                >
                                    Unstake & Claim {position.total_unclaimed_rewards} 💎
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

const TIER_INFO = [
    { name: 'BRONZE', rewards: '10', xp: '+10%', color: 'bg-amber-900/20 border-amber-700 text-amber-300' },
    { name: 'SILVER', rewards: '25', xp: '+25%', color: 'bg-gray-600/20 border-gray-500 text-gray-300' },
    { name: 'GOLD', rewards: '50', xp: '+50%', color: 'bg-yellow-900/20 border-yellow-700 text-yellow-300' },
    { name: 'PLATINUM', rewards: '100', xp: '+100%', color: 'bg-cyan-900/20 border-cyan-700 text-cyan-300' }
];
