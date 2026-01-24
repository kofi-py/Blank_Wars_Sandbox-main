'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Crown,
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Zap,
  Target,
  Clock,
  Award,
  Medal,
  Sparkles,
  Eye,
  Loader2
} from 'lucide-react';
import { apiClient } from '@/services/apiClient';

// Leaderboard types that map to API endpoints
type LeaderboardType = 'battles' | 'streaks' | 'coach' | 'teams' | 'collections' | 'activity';

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  value: number;
  secondary_value: number;
  team_id?: string;
  team_name?: string;
  stats: Record<string, any>;
}

interface LeaderboardResponse {
  ok: boolean;
  leaderboard_type: string;
  sort_by?: string;
  period?: string;
  total_entries: number;
  entries: LeaderboardEntry[];
}

interface UserRankResponse {
  ok: boolean;
  leaderboard_type: string;
  rank: number | null;
  value?: number;
  secondary_value?: number;
}

interface LeaderboardsProps {
  current_user_id?: string;
}

export default function Leaderboards({ current_user_id }: LeaderboardsProps) {
  const [activeLeaderboard, setActiveLeaderboard] = useState<LeaderboardType>('battles');
  const [timeFrame, setTimeFrame] = useState<'daily' | 'weekly' | 'monthly' | 'all_time'>('all_time');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRank, setUserRank] = useState<{ rank: number; value: number } | null>(null);
  const [totalEntries, setTotalEntries] = useState(0);

  // Leaderboard configuration
  const leaderboardConfigs: Record<LeaderboardType, {
    title: string;
    icon: React.ReactNode;
    description: string;
    value_label: string;
    color: string;
    endpoint: string;
    sort?: string;
  }> = {
    battles: {
      title: 'Battle Victories',
      icon: <Trophy className="w-6 h-6 text-red-400" />,
      description: 'Coaches with the most battle victories',
      value_label: 'Wins',
      color: 'from-red-500 to-pink-500',
      endpoint: '/leaderboards/battles',
      sort: 'wins'
    },
    streaks: {
      title: 'Win Streaks',
      icon: <Zap className="w-6 h-6 text-purple-400" />,
      description: 'Longest consecutive win streaks',
      value_label: 'Best Streak',
      color: 'from-purple-500 to-indigo-500',
      endpoint: '/leaderboards/streaks',
      sort: 'best'
    },
    coach: {
      title: 'Coach Rankings',
      icon: <Crown className="w-6 h-6 text-yellow-400" />,
      description: 'Top coaches by experience and level',
      value_label: 'Level',
      color: 'from-yellow-500 to-orange-500',
      endpoint: '/leaderboards/coach',
      sort: 'level'
    },
    teams: {
      title: 'Team Power',
      icon: <Users className="w-6 h-6 text-green-400" />,
      description: 'Most powerful teams in the realm',
      value_label: 'Wins',
      color: 'from-green-500 to-teal-500',
      endpoint: '/leaderboards/teams',
      sort: 'wins'
    },
    collections: {
      title: 'Character Collectors',
      icon: <Star className="w-6 h-6 text-blue-400" />,
      description: 'Coaches with the largest character collections',
      value_label: 'Characters',
      color: 'from-blue-500 to-cyan-500',
      endpoint: '/leaderboards/collections',
      sort: 'total'
    },
    activity: {
      title: 'Monthly Activity',
      icon: <Target className="w-6 h-6 text-orange-400" />,
      description: 'Most active coaches this month',
      value_label: 'Battles',
      color: 'from-orange-500 to-red-500',
      endpoint: '/leaderboards/activity'
    }
  };

  const config = leaderboardConfigs[activeLeaderboard];

  // Fetch leaderboard data
  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const params: Record<string, string> = { limit: '50' };

        if (config.sort) {
          params.sort = config.sort;
        }

        // For activity leaderboard, use timeFrame as period
        if (activeLeaderboard === 'activity') {
          params.period = timeFrame === 'all_time' ? 'monthly' : timeFrame;
        }

        const response = await apiClient.get<LeaderboardResponse>(config.endpoint, { params });

        if (response.data.ok) {
          setEntries(response.data.entries);
          setTotalEntries(response.data.total_entries);
        } else {
          setError('Failed to load leaderboard');
        }
      } catch (err: any) {
        console.error('[LEADERBOARD] Fetch error:', err);
        setError(err.message || 'Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [activeLeaderboard, timeFrame, config.endpoint, config.sort]);

  // Fetch user's rank
  useEffect(() => {
    const fetchUserRank = async () => {
      if (!current_user_id) return;

      try {
        const response = await apiClient.get<UserRankResponse>(`/leaderboards/my-rank/${activeLeaderboard}`);
        if (response.data.ok && response.data.rank !== null) {
          setUserRank({
            rank: response.data.rank,
            value: response.data.value || 0
          });
        } else {
          setUserRank(null);
        }
      } catch (err) {
        console.error('[LEADERBOARD] User rank fetch error:', err);
        setUserRank(null);
      }
    };

    fetchUserRank();
  }, [activeLeaderboard, current_user_id]);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-300" />;
    if (rank === 3) return <Award className="w-6 h-6 text-orange-400" />;
    return <span className="text-lg font-bold text-gray-400">#{rank}</span>;
  };

  const formatValue = (value: number) => {
    if (value >= 1000) {
      return value.toLocaleString();
    }
    return value.toString();
  };

  const getSecondaryStatLabel = () => {
    switch (activeLeaderboard) {
      case 'battles': return 'Win Rate';
      case 'streaks': return 'Current';
      case 'coach': return 'XP';
      case 'teams': return 'Chemistry';
      case 'collections': return 'Total Level';
      case 'activity': return 'Wins';
      default: return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {config.icon}
            <div>
              <h2 className="text-2xl font-bold text-white">{config.title}</h2>
              <p className="text-gray-400">{config.description}</p>
            </div>
          </div>

          {activeLeaderboard === 'activity' && (
            <div className="flex gap-3">
              <select
                value={timeFrame}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'daily' || value === 'weekly' || value === 'monthly' || value === 'all_time') {
                    setTimeFrame(value);
                  }
                }}
                className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          )}
        </div>

        {/* Leaderboard Type Tabs */}
        <div className="flex overflow-x-auto gap-2 pb-2">
          {Object.entries(leaderboardConfigs).map(([type, tabConfig]) => (
            <button
              key={type}
              onClick={() => setActiveLeaderboard(type as LeaderboardType)}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                activeLeaderboard === type
                  ? `bg-gradient-to-r ${tabConfig.color} text-white shadow-lg`
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              {tabConfig.icon}
              <span className="hidden sm:inline">{tabConfig.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          <span className="ml-3 text-gray-400">Loading leaderboard...</span>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-900/20 rounded-xl border border-red-700 p-6 text-center">
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => setActiveLeaderboard(activeLeaderboard)}
            className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
          >
            Retry
          </button>
        </div>
      )}

      {/* Top 3 Podium */}
      {!loading && !error && entries.length > 0 && (
        <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            Hall of Champions
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {entries.slice(0, 3).map((entry, index) => {
              const position = index + 1;
              const heights = ['h-32', 'h-40', 'h-28'];
              const displayOrder = [1, 0, 2]; // 2nd, 1st, 3rd for visual

              return (
                <motion.div
                  key={entry.user_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: displayOrder[index] * 0.1 }}
                  className={`${heights[index]} relative order-${displayOrder[index]}`}
                  style={{ order: displayOrder[index] }}
                >
                  <div className={`absolute bottom-0 w-full bg-gradient-to-t ${config.color}/20 border-2 ${
                    position === 1 ? 'border-yellow-400' :
                    position === 2 ? 'border-gray-300' :
                    'border-orange-400'
                  } rounded-t-lg p-4 flex flex-col justify-end`}>
                    <div className="text-center">
                      <div className="text-4xl mb-2">
                        {position === 1 ? '👑' : position === 2 ? '🥈' : '🥉'}
                      </div>
                      <div className="flex items-center justify-center mb-2">
                        {getRankIcon(position)}
                      </div>
                      <h4 className="font-bold text-white text-sm">{entry.username}</h4>
                      {entry.team_name && (
                        <p className="text-xs text-gray-400">{entry.team_name}</p>
                      )}
                      <div className="text-lg font-bold text-white mt-1">
                        {formatValue(entry.value)}
                      </div>
                      <div className="text-xs text-gray-400">{config.value_label}</div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Full Rankings */}
      {!loading && !error && (
        <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Full Rankings</h3>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Clock className="w-4 h-4" />
              <span>{totalEntries} coaches ranked</span>
            </div>
          </div>

          {entries.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No entries yet. Be the first!</p>
          ) : (
            <div className="space-y-2">
              {entries.map((entry, index) => (
                <motion.div
                  key={entry.user_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(index * 0.03, 0.5) }}
                  className={`border rounded-lg p-4 transition-all ${
                    entry.user_id === current_user_id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    {/* Rank and User Info */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-12">
                        {getRankIcon(entry.rank)}
                      </div>

                      <div className="text-3xl">
                        {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : '👤'}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{entry.username}</span>
                          {entry.stats?.coach_title && (
                            <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                              {entry.stats.coach_title}
                            </span>
                          )}
                          {entry.user_id === current_user_id && (
                            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                              YOU
                            </span>
                          )}
                        </div>
                        {entry.team_name && (
                          <div className="flex items-center gap-1 text-sm text-gray-400">
                            <Users className="w-3 h-3" />
                            {entry.team_name}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-6">
                      {/* Secondary Stat */}
                      <div className="hidden md:block text-center">
                        <div className="text-green-400 font-semibold">
                          {typeof entry.secondary_value === 'number'
                            ? (activeLeaderboard === 'battles'
                                ? `${entry.secondary_value.toFixed(1)}%`
                                : formatValue(entry.secondary_value))
                            : entry.secondary_value}
                        </div>
                        <div className="text-gray-400 text-xs">{getSecondaryStatLabel()}</div>
                      </div>

                      {/* Main Value */}
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">
                          {formatValue(entry.value)}
                        </div>
                        <div className="text-xs text-gray-400">{config.value_label}</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Load More */}
          {entries.length > 0 && totalEntries > entries.length && (
            <div className="text-center mt-6">
              <button className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-2 mx-auto">
                <Eye className="w-4 h-4" />
                View Full Rankings (Top 100)
              </button>
            </div>
          )}
        </div>
      )}

      {/* Personal Rank Card */}
      {current_user_id && userRank && (
        <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/50 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Your Current Rank</h3>
              <p className="text-gray-300">Keep climbing the leaderboards!</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-400">#{userRank.rank}</div>
              <div className="text-sm text-gray-400">{config.title}</div>
              <div className="text-lg text-white font-semibold mt-1">
                {formatValue(userRank.value)} {config.value_label}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
