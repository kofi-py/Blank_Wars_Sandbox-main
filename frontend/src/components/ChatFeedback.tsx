'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, 
  Star, 
  TrendingUp, 
  TrendingDown, 
  Award, 
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { 
  CHAT_XP_CONSTANTS, 
  CHAT_ANIMATION_CONSTANTS, 
  CHAT_UI_CONSTANTS,
  isProblemResolutionBonus 
} from '@/constants/chatFeedback';

export interface ChatFeedbackData {
  bond_increase?: boolean;
  chat_result?: 'success' | 'neutral' | 'failure';
  xp_awarded?: number;
  penalty_applied?: boolean;
  character_name?: string;
}

interface ChatFeedbackProps {
  feedback_data: ChatFeedbackData;
  className?: string;
}

export default function ChatFeedback({ feedback_data, className }: ChatFeedbackProps) {
  const {
    bond_increase,
    chat_result,
    xp_awarded,
    penalty_applied,
    character_name
  } = feedback_data;

  // Don't render if no meaningful feedback
  if (!bond_increase && !xp_awarded && !penalty_applied && chat_result === 'neutral') {
    return null;
  }

  const getResultConfig = () => {
    switch (chat_result) {
      case 'success':
        return {
          icon: CheckCircle,
          color: 'text-green-400',
          bg_color: 'bg-green-900/20',
          border_color: 'border-green-500/30',
          label: 'Great coaching!'
        };
      case 'failure':
        return {
          icon: XCircle,
          color: 'text-red-400',
          bg_color: 'bg-red-900/20',
          border_color: 'border-red-500/30',
          label: 'Communication issue'
        };
      default:
        return {
          icon: Heart,
          color: 'text-blue-400',
          bg_color: 'bg-blue-900/20',
          border_color: 'border-blue-500/30',
          label: 'Good interaction'
        };
    }
  };

  const resultConfig = getResultConfig();
  const ResultIcon = resultConfig.icon;

  // Check if this was a problem resolution (100+ XP bonus)
  const isProblemResolution = isProblemResolutionBonus(xp_awarded);

  return (
    <AnimatePresence>
      <motion.div 
        className={`mt-2 space-y-2 ${className}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: CHAT_ANIMATION_CONSTANTS.DEFAULT_ANIMATION_DURATION }}
      >
        {/* Bond Increase Indicator */}
        {bond_increase && (
          <motion.div 
            className="flex items-center gap-2 text-xs text-yellow-200"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: CHAT_ANIMATION_CONSTANTS.BOND_ANIMATION_DELAY }}
          >
            <Heart className="w-3 h-3 fill-current" />
            <span>Bond with {character_name} increased!</span>
          </motion.div>
        )}

        {/* Chat Result & XP Feedback */}
        {(chat_result || xp_awarded !== 0 || penalty_applied) && (
          <motion.div 
            className={`flex items-center justify-between p-2 rounded-lg border ${resultConfig.bg_color} ${resultConfig.border_color}`}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: CHAT_ANIMATION_CONSTANTS.RESULT_ANIMATION_DELAY }}
          >
            <div className="flex items-center gap-2">
              <ResultIcon className={`w-4 h-4 ${resultConfig.color}`} />
              <span className={`text-xs font-medium ${resultConfig.color}`}>
                {resultConfig.label}
              </span>
            </div>

            {/* XP Display */}
            {xp_awarded !== 0 && (
              <div className="flex items-center gap-1">
                {xp_awarded > 0 ? (
                  <TrendingUp className="w-3 h-3 text-green-400" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-400" />
                )}
                <span className={`text-xs font-bold ${
                  xp_awarded > 0 ? 'text-green-300' : 'text-red-300'
                }`}>
                  {xp_awarded > 0 ? '+' : ''}{xp_awarded} XP
                </span>
              </div>
            )}

            {/* Penalty Applied */}
            {penalty_applied && (
              <div className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-orange-400" />
                <span className="text-xs text-orange-300">Penalty</span>
              </div>
            )}
          </motion.div>
        )}

        {/* Problem Resolution Bonus Special Effect */}
        {isProblemResolution && (
          <motion.div 
            className="flex items-center gap-2 p-2 bg-gradient-to-r from-purple-900/30 to-yellow-900/30 border border-yellow-500/40 rounded-lg"
            initial={{ scale: 0, rotate: -5 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              delay: CHAT_ANIMATION_CONSTANTS.PROBLEM_RESOLUTION_DELAY,
              type: "spring",
              stiffness: 200,
              damping: 15
            }}
          >
            <Award className="w-4 h-4 text-yellow-400" />
            <div className="flex-1">
              <div className="text-xs font-bold text-yellow-300">
                🎉 Problem Resolution Bonus!
              </div>
              <div className="text-xs text-yellow-200">
                You helped {character_name} solve their problem (+{CHAT_XP_CONSTANTS.PROBLEM_RESOLUTION_BONUS} XP)
              </div>
            </div>
            <Star className="w-4 h-4 text-yellow-400 fill-current" />
          </motion.div>
        )}

        {/* Subtle coaching tips for failures */}
        {chat_result === 'failure' && (
          <motion.div 
            className="text-xs text-gray-400 italic pl-4 border-l-2 border-gray-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: CHAT_ANIMATION_CONSTANTS.TIPS_ANIMATION_DELAY }}
          >
            💡 Try asking about their concerns or offering specific advice
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// Helper component for inline XP display in message lists
export function InlineXPBadge({ xp_awarded }: { xp_awarded: number }) {
  if (xp_awarded === 0) return null;

  return (
    <motion.span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ml-2 ${
        xp_awarded > 0
          ? 'bg-green-900/30 text-green-300 border border-green-500/30'
          : 'bg-red-900/30 text-red-300 border border-red-500/30'
      }`}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: CHAT_ANIMATION_CONSTANTS.XP_BADGE_ANIMATION_DELAY }}
    >
      {xp_awarded > 0 ? (
        <TrendingUp className="w-3 h-3" />
      ) : (
        <TrendingDown className="w-3 h-3" />
      )}
      {xp_awarded > 0 ? '+' : ''}{xp_awarded} XP
    </motion.span>
  );
}

// Helper hook for XP accumulation display
export function useXPTracker() {
  const [total_xp, setTotalXP] = React.useState(0);
  const [recentXP, setRecentXP] = React.useState<number[]>([]);

  const addXP = (amount: number) => {
    setTotalXP(prev => prev + amount);
    setRecentXP(prev => [...prev.slice(-(CHAT_UI_CONSTANTS.MAX_RECENT_XP_ENTRIES - 1)), amount]); // Keep last N XP gains
  };

  const getXPSummary = () => {
    const sessionXP = recentXP.reduce((sum, xp) => sum + xp, 0);
    const successfulChats = recentXP.filter(xp => xp > 0).length;
    const failedChats = recentXP.filter(xp => xp < 0).length;
    
    return {
      total_xp,
      sessionXP,
      successfulChats,
      failedChats,
      chat_count: recentXP.length
    };
  };

  return {
    total_xp,
    addXP,
    getXPSummary,
    recentXP
  };
}