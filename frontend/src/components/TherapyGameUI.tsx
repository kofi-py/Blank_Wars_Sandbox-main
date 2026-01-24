'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, Heart, Zap, Trophy, Target, Star,
  TrendingUp, Award, Sparkles, Shield, Eye, Users
} from 'lucide-react';
import { TherapyGameState, TherapyAchievement, TherapyReward } from '@/services/therapyGameSystem';

interface TherapyGameUIProps {
  game_state: TherapyGameState;
  onAchievementClick?: (achievement: TherapyAchievement) => void;
  compact?: boolean;
}

export const TherapyGameUI: React.FC<TherapyGameUIProps> = ({
  game_state,
  onAchievementClick,
  compact = false
}) => {
  const [showAchievement, setShowAchievement] = useState<TherapyAchievement | null>(null);
  const [recentPoints, setRecentPoints] = useState<{ type: string; amount: number; reason: string }[]>([]);

  const stageColors = {
    initial: 'from-blue-500 to-blue-600',
    resistance: 'from-orange-500 to-red-500',
    breakthrough: 'from-purple-500 to-pink-500',
    mastery: 'from-yellow-500 to-orange-500'
  };

  const stageIcons = {
    initial: Shield,
    resistance: Zap,
    breakthrough: Eye,
    mastery: Trophy
  };

  const progressPercentage = Math.min(100, game_state.stage_progress);
  const StageIcon = stageIcons[game_state.current_stage];

  if (compact) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-3 border border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full bg-gradient-to-r ${stageColors[game_state.current_stage]}`}>
              <StageIcon className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-medium text-white capitalize">
                {game_state.current_stage}
              </div>
              <div className="text-xs text-gray-400">
                Progress: {progressPercentage.toFixed(0)}%
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4 text-xs">
            <div className="flex items-center space-x-1">
              <Brain className="w-3 h-3 text-blue-400" />
              <span className="text-white">{game_state.insight_points}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Heart className="w-3 h-3 text-pink-400" />
              <span className="text-white">{game_state.vulnerability_score}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Zap className="w-3 h-3 text-yellow-400" />
              <span className="text-white">{game_state.breakthrough_streak}</span>
            </div>
          </div>
        </div>
        <div className="mt-2 w-full bg-gray-700 rounded-full h-1.5">
          <motion.div
            className={`h-1.5 rounded-full bg-gradient-to-r ${stageColors[game_state.current_stage]}`}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/80 backdrop-blur-lg rounded-xl p-6 border border-gray-700 space-y-6">
      {/* Stage Progress Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className={`p-3 rounded-full bg-gradient-to-r ${stageColors[game_state.current_stage]} shadow-lg`}>
            <StageIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white capitalize">
              {game_state.current_stage} Stage
            </h3>
            <p className="text-gray-400 text-sm">
              {getStageDescription(game_state.current_stage)}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-400">Session Progress</div>
          <div className="text-2xl font-bold text-white">
            {progressPercentage.toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
        <motion.div
          className={`h-full bg-gradient-to-r ${stageColors[game_state.current_stage]} shadow-inner`}
          initial={{ width: 0 }}
          animate={{ width: `${progressPercentage}%` }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        />
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Brain}
          label="Insight Points"
          value={game_state.insight_points}
          color="blue"
          description="Earned through revelations"
        />
        <MetricCard
          icon={Heart}
          label="Vulnerability"
          value={game_state.vulnerability_score}
          color="pink"
          description="Openness level"
        />
        <MetricCard
          icon={Zap}
          label="Breakthrough Streak"
          value={game_state.breakthrough_streak}
          color="yellow"
          description="Consecutive breakthroughs"
        />
        <MetricCard
          icon={Users}
          label="Empathy Bonus"
          value={game_state.empathy_bonus}
          color="green"
          description="Understanding shown"
        />
      </div>

      {/* Session Stats */}
      <div className="bg-gray-900/50 rounded-lg p-4">
        <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
          <Target className="w-5 h-5 mr-2 text-blue-400" />
          Session Statistics
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatItem label="Messages" value={game_state.messagesCount} />
          <StatItem label="Deep Thoughts" value={game_state.deep_thoughts_shared} color="text-purple-400" />
          <StatItem label="Breakthroughs" value={game_state.emotional_breakthroughs} color="text-green-400" />
          <StatItem label="Defensive Moments" value={game_state.defensive_moments} color="text-orange-400" />
        </div>
      </div>

      {/* Recent Achievements */}
      {game_state.achievements_unlocked.length > 0 && (
        <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-lg p-4 border border-purple-500/30">
          <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
            <Trophy className="w-5 h-5 mr-2 text-yellow-400" />
            Achievements Unlocked
          </h4>
          <div className="flex flex-wrap gap-2">
            {game_state.achievements_unlocked.slice(-3).map((achievementId, index) => (
              <motion.div
                key={achievementId}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className="bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full text-sm font-medium border border-yellow-500/30"
              >
                🏆 {achievementId.replace(/_/g, ' ')}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Achievement Notification */}
      <AnimatePresence>
        {showAchievement && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: -50 }}
            className="fixed bottom-4 right-4 bg-gradient-to-r from-yellow-500 to-orange-500 p-4 rounded-lg shadow-2xl border border-yellow-400 max-w-sm z-50"
          >
            <div className="flex items-center space-x-3">
              <div className="text-3xl">{showAchievement.icon}</div>
              <div>
                <h5 className="font-bold text-white">{showAchievement.title}</h5>
                <p className="text-yellow-100 text-sm">{showAchievement.description}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface MetricCardProps {
  icon: React.ComponentType<any>;
  label: string;
  value: number;
  color: 'blue' | 'pink' | 'yellow' | 'green';
  description?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon: Icon, label, value, color, description }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 text-blue-400',
    pink: 'from-pink-500 to-pink-600 text-pink-400',
    yellow: 'from-yellow-500 to-yellow-600 text-yellow-400',
    green: 'from-green-500 to-green-600 text-green-400'
  };

  return (
    <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-full bg-gradient-to-r ${colorClasses[color]} bg-opacity-20`}>
          <Icon className={`w-5 h-5 ${colorClasses[color].split(' ')[2]}`} />
        </div>
        <div>
          <div className="text-2xl font-bold text-white">{value}</div>
          <div className="text-xs text-gray-400">{label}</div>
          {description && (
            <div className="text-xs text-gray-500 mt-1">{description}</div>
          )}
        </div>
      </div>
    </div>
  );
};

interface StatItemProps {
  label: string;
  value: number;
  color?: string;
}

const StatItem: React.FC<StatItemProps> = ({ label, value, color = "text-gray-300" }) => (
  <div className="text-center">
    <div className={`text-xl font-bold ${color}`}>{value}</div>
    <div className="text-xs text-gray-500">{label}</div>
  </div>
);

function getStageDescription(stage: string): string {
  switch (stage) {
    case 'initial':
      return 'Building trust and rapport';
    case 'resistance':
      return 'Working through defensive patterns';
    case 'breakthrough':
      return 'Experiencing meaningful insights';
    case 'mastery':
      return 'Deep therapeutic engagement';
    default:
      return 'Therapeutic journey';
  }
}

export default TherapyGameUI;