'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Star,
  Users,
  MessageCircle,
  Award,
  Target,
  Calendar,
  BarChart3,
  Lightbulb,
  Trophy
} from 'lucide-react';
import ChatAnalyticsServiceClient, {
  ChatSummary,
  ChatPerformanceStats,
  ChatPerformanceTrend
} from '../services/chatAnalyticsService';

export default function ChatAnalyticsDashboard() {
  const [summary, setSummary] = useState<ChatSummary | null>(null);
  const [fullStats, setFullStats] = useState<ChatPerformanceStats | null>(null);
  const [trend, setTrend] = useState<ChatPerformanceTrend | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<7 | 30 | 90>(30);

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const [summaryData, fullStatsData, trendData] = await Promise.all([
        ChatAnalyticsServiceClient.getChatSummary(),
        ChatAnalyticsServiceClient.getChatPerformanceStats(),
        ChatAnalyticsServiceClient.getChatPerformanceTrend(selectedPeriod)
      ]);

      setSummary(summaryData);
      setFullStats(fullStatsData);
      setTrend(trendData);
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('Failed to load chat analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading chat analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-400 mb-4">⚠️ {error}</div>
        <button
          onClick={loadAnalytics}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!summary || !fullStats || !trend) {
    return (
      <div className="p-8 text-center text-gray-400">
        <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No chat data available yet. Start coaching characters to see analytics!</p>
      </div>
    );
  }

  const insights = ChatAnalyticsServiceClient.calculateInsights(fullStats);

  // Prepare chart data
  const character_data = Object.entries(fullStats.character_breakdown).map(([id, data]) => ({
    name: (data as { name: string; chats: number; success_rate: number; total_xp: number }).name,
    xp: (data as { name: string; chats: number; success_rate: number; total_xp: number }).total_xp,
    chats: (data as { name: string; chats: number; success_rate: number; total_xp: number }).chats,
    success_rate: (data as { name: string; chats: number; success_rate: number; total_xp: number }).success_rate
  })).sort((a, b) => b.xp - a.xp);

  const trendData = trend.daily_stats.map(day => ({
    date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    xp: day.xp_gained,
    chats: day.chats,
    success_rate: day.chats > 0 ? Math.round((day.successful_chats / day.chats) * 100) : 0
  }));

  const resultPieData = [
    { name: 'Successful', value: fullStats.successful_chats, color: '#10B981' },
    { name: 'Failed', value: fullStats.failed_chats, color: '#EF4444' },
    { name: 'Neutral', value: fullStats.neutral_chats, color: '#6B7280' }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-3">
          <BarChart3 className="w-8 h-8 text-blue-400" />
          Chat Analytics Dashboard
        </h1>
        <p className="text-gray-400 text-lg">Track your coaching performance and progress</p>
      </div>

      {/* Period Selector */}
      <div className="flex justify-center mb-6">
        <div className="bg-gray-800/50 rounded-lg p-1 flex gap-1">
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              onClick={() => setSelectedPeriod(days as 7 | 30 | 90)}
              className={`px-4 py-2 rounded-md transition-colors ${
                selectedPeriod === days
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {days} days
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Chats"
          value={summary.total_chats}
          icon={MessageCircle}
          color="blue"
        />
        <MetricCard
          title="Success Rate"
          value={`${summary.success_rate}%`}
          icon={Target}
          color={summary.success_rate >= 70 ? "green" : summary.success_rate >= 50 ? "yellow" : "red"}
        />
        <MetricCard
          title="Total XP Gained"
          value={summary.total_xp_gained}
          icon={Star}
          color="purple"
        />
        <MetricCard
          title="Avg XP/Chat"
          value={Math.round(summary.avg_xp_per_chat)}
          icon={TrendingUp}
          color="orange"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* XP Trend Chart */}
        <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            XP Trend ({selectedPeriod} days)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #4B5563',
                  borderRadius: '8px'
                }}
              />
              <Line type="monotone" dataKey="xp" stroke="#8B5CF6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Chat Results Pie Chart */}
        <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Chat Results Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={resultPieData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {resultPieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Character Performance */}
      <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-6 mb-8">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Character Performance
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={character_data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="name" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #4B5563',
                borderRadius: '8px'
              }}
            />
            <Bar dataKey="xp" fill="#3B82F6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Insights & Achievements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Achievements */}
        {insights.achievements.length > 0 && (
          <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 rounded-xl border border-yellow-500/30 p-6">
            <h3 className="text-lg font-semibold text-yellow-300 mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Achievements
            </h3>
            <div className="space-y-2">
              {insights.achievements.map((achievement, index) => (
                <div key={index} className="text-yellow-200 text-sm">
                  {achievement}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Insights */}
        {insights.insights.length > 0 && (
          <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-xl border border-blue-500/30 p-6">
            <h3 className="text-lg font-semibold text-blue-300 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Insights
            </h3>
            <div className="space-y-2">
              {insights.insights.map((insight, index) => (
                <div key={index} className="text-blue-200 text-sm">
                  {insight}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {insights.recommendations.length > 0 && (
          <div className="bg-gradient-to-br from-green-900/30 to-teal-900/30 rounded-xl border border-green-500/30 p-6">
            <h3 className="text-lg font-semibold text-green-300 mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              Recommendations
            </h3>
            <div className="space-y-2">
              {insights.recommendations.map((recommendation, index) => (
                <div key={index} className="text-green-200 text-sm">
                  {recommendation}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'orange';
}

function MetricCard({ title, value, icon: Icon, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'from-blue-900/50 to-blue-800/50 border-blue-500/30 text-blue-300',
    green: 'from-green-900/50 to-green-800/50 border-green-500/30 text-green-300',
    yellow: 'from-yellow-900/50 to-yellow-800/50 border-yellow-500/30 text-yellow-300',
    red: 'from-red-900/50 to-red-800/50 border-red-500/30 text-red-300',
    purple: 'from-purple-900/50 to-purple-800/50 border-purple-500/30 text-purple-300',
    orange: 'from-orange-900/50 to-orange-800/50 border-orange-500/30 text-orange-300'
  };

  return (
    <motion.div
      className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl border p-6`}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400 mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
        </div>
        <Icon className="w-8 h-8" />
      </div>
    </motion.div>
  );
}
