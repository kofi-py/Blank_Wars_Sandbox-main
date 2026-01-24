'use client';

import { useState, useEffect } from 'react';
import SafeMotion from "./SafeMotion";
import {
  Trophy,
  Medal,
  Award,
  Crown,
  Star,
  Zap,
  Target,
  TrendingUp,
  Gift
} from 'lucide-react';
import apiClient from '../services/apiClient';

interface FullResults {
  final_scores: Record<string, number>;
  elimination_order?: string[];
  performance_stats?: Record<string, number>;
}

interface TotalRewards {
  currency_distributed: number;
  items_awarded: number;
  experience_granted: number;
}

interface RewardConfig {
  item_id?: string;
  item_name?: string;
  quantity?: number;
  rarity?: string;
}

interface ChallengeResult {
  id: string;
  active_challenge_id: string;
  challenge_template_id: string;
  winner_character_id: string;
  second_place_character_id: string | null;
  third_place_character_id: string | null;
  total_participants: number;
  completion_time_minutes: number | null;
  full_results: FullResults;
  highlight_moments: string[];
  total_rewards_given: TotalRewards;
  completed_at: string;
}

interface DistributedReward {
  id: string;
  user_character_id: string;
  reward_type: string;
  reward_config: RewardConfig;
  currency_amount: number | null;
  claimed: boolean;
  character_name?: string;
}

interface ChallengeResultsProps {
  challenge_id?: string;
  result_id?: string;
  user_character_id?: string;
  onClose?: () => void;
}

const ChallengeResults: React.FC<ChallengeResultsProps> = ({
  challenge_id,
  result_id,
  user_character_id,
  onClose
}) => {
  const [result, setResult] = useState<ChallengeResult | null>(null);
  const [rewards, setRewards] = useState<DistributedReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user_character_id) {
      loadUnclaimedRewards();
    }
  }, [user_character_id]);

  const loadUnclaimedRewards = async () => {
    if (!user_character_id) return;

    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get(`/challenges/rewards/unclaimed/${user_character_id}`);
      setRewards(response.data.rewards || []);
    } catch (err: unknown) {
      console.error('Error loading rewards:', err);
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to load rewards');
    } finally {
      setLoading(false);
    }
  };

  const getPodiumPosition = (position: number) => {
    switch (position) {
      case 1:
        return {
          icon: Crown,
          color: 'text-yellow-400',
          bg_color: 'bg-yellow-500/20',
          border_color: 'border-yellow-500',
          label: '1st Place - WINNER!'
        };
      case 2:
        return {
          icon: Medal,
          color: 'text-gray-300',
          bg_color: 'bg-gray-500/20',
          border_color: 'border-gray-400',
          label: '2nd Place'
        };
      case 3:
        return {
          icon: Award,
          color: 'text-orange-400',
          bg_color: 'bg-orange-500/20',
          border_color: 'border-orange-500',
          label: '3rd Place'
        };
      default:
        return {
          icon: Star,
          color: 'text-blue-400',
          bg_color: 'bg-blue-500/20',
          border_color: 'border-blue-500',
          label: `${position}th Place`
        };
    }
  };

  const getRewardIcon = (rewardType: string) => {
    switch (rewardType) {
      case 'currency':
        return Zap;
      case 'equipment':
        return Target;
      case 'battle_boost':
        return TrendingUp;
      default:
        return Gift;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="text-white text-xl">Loading results...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Trophy className="w-12 h-12 text-yellow-400" />
            <div>
              <h1 className="text-4xl font-bold text-white">Challenge Complete!</h1>
              <p className="text-gray-300">View results and claim rewards</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          )}
        </div>

        {/* Unclaimed Rewards */}
        {rewards.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Gift className="w-6 h-6 text-yellow-400" />
              Your Rewards ({rewards.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rewards.map((reward, index) => {
                const RewardIcon = getRewardIcon(reward.reward_type);
                return (
                  <SafeMotion
                    key={reward.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    class_name="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500 rounded-xl p-6"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-3 bg-yellow-500/30 rounded-lg">
                        <RewardIcon className="w-6 h-6 text-yellow-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold capitalize">
                          {reward.reward_type.replace('_', ' ')}
                        </h3>
                        {reward.currency_amount && (
                          <div className="text-yellow-400 font-bold text-lg">
                            ${reward.currency_amount}
                          </div>
                        )}
                      </div>
                    </div>
                    {!reward.claimed && (
                      <div className="mt-4">
                        <button className="w-full px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold rounded-lg transition-colors">
                          Claim Reward
                        </button>
                      </div>
                    )}
                    {reward.claimed && (
                      <div className="text-green-400 text-sm font-semibold">
                        ✓ Claimed
                      </div>
                    )}
                  </SafeMotion>
                );
              })}
            </div>
          </div>
        )}

        {/* Results Display */}
        {result && (
          <div className="space-y-6">
            {/* Winner Podium */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700">
              <h2 className="text-3xl font-bold text-white mb-6 text-center">
                Challenge Winners
              </h2>
              <div className="grid grid-cols-3 gap-4 mb-6">
                {/* 2nd Place */}
                {result.second_place_character_id && (
                  <div className="text-center pt-8">
                    <div className="bg-gray-500/20 border-2 border-gray-400 rounded-xl p-4">
                      <Medal className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <div className="text-gray-300 font-bold">2nd Place</div>
                      <div className="text-sm text-gray-400 mt-1">
                        {result.second_place_character_id}
                      </div>
                    </div>
                  </div>
                )}

                {/* 1st Place */}
                <div className="text-center">
                  <div className="bg-yellow-500/20 border-4 border-yellow-500 rounded-xl p-6">
                    <Crown className="w-16 h-16 text-yellow-400 mx-auto mb-3 animate-pulse" />
                    <div className="text-yellow-400 font-bold text-xl">WINNER!</div>
                    <div className="text-white font-bold text-lg mt-2">
                      {result.winner_character_id}
                    </div>
                  </div>
                </div>

                {/* 3rd Place */}
                {result.third_place_character_id && (
                  <div className="text-center pt-12">
                    <div className="bg-orange-500/20 border-2 border-orange-500 rounded-xl p-4">
                      <Award className="w-10 h-10 text-orange-400 mx-auto mb-2" />
                      <div className="text-orange-400 font-bold">3rd Place</div>
                      <div className="text-sm text-gray-400 mt-1">
                        {result.third_place_character_id}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                  <div className="text-gray-400 text-sm mb-1">Participants</div>
                  <div className="text-white font-bold text-2xl">
                    {result.total_participants}
                  </div>
                </div>
                {result.completion_time_minutes && (
                  <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                    <div className="text-gray-400 text-sm mb-1">Duration</div>
                    <div className="text-white font-bold text-2xl">
                      {result.completion_time_minutes}m
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Highlight Moments */}
            {result.highlight_moments && result.highlight_moments.length > 0 && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
                <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <Star className="w-6 h-6 text-yellow-400" />
                  Highlight Moments
                </h3>
                <div className="space-y-2">
                  {result.highlight_moments.map((moment, index) => (
                    <div
                      key={index}
                      className="p-3 bg-gray-700/50 rounded-lg text-gray-300"
                    >
                      • {moment}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!result && rewards.length === 0 && (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No results to display</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChallengeResults;
