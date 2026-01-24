'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SafeMotion from './SafeMotion';
import { useMobileSafeMotion } from '@/hooks/useMobileSafeMotion';
import { 
  Star, 
  TrendingUp, 
  Coins, 
  Zap, 
  Heart,
  Crown,
  Sparkles,
  ArrowRight,
  DollarSign
} from 'lucide-react';
import { BattleRewards as RewardsData, ACHIEVEMENTS } from '@/data/combatRewards';

interface BattleRewardsProps {
  character_name: string;
  character_avatar: string;
  is_victory: boolean;
  rewards: RewardsData;
  old_level: number;
  new_level: number;
  old_xp: number;
  new_xp: number;
  xp_to_next: number;
  onContinue: () => void;
}

export default function BattleRewards({
  character_name,
  character_avatar,
  is_victory,
  rewards,
  old_level,
  new_level,
  old_xp,
  new_xp,
  xp_to_next,
  onContinue
}: BattleRewardsProps) {
  const { isMobile } = useMobileSafeMotion();
  const [showRewards, setShowRewards] = useState(false);
  const [currentRewardIndex, setCurrentRewardIndex] = useState(0);
  const [xpAnimationProgress, setXpAnimationProgress] = useState(0);

  const rewardItems = [
    {
      icon: Star,
      label: 'Experience',
      value: `+${rewards.xp_gained} XP`,
      color: 'text-blue-400',
      bg_color: 'bg-blue-400/10'
    },
    {
      icon: Zap,
      label: 'Training Points',
      value: `+${rewards.training_points} TP`,
      color: 'text-yellow-400',
      bg_color: 'bg-yellow-400/10'
    },
    {
      icon: Coins,
      label: 'Gold',
      value: `+${rewards.currency}`,
      color: 'text-yellow-500',
      bg_color: 'bg-yellow-500/10'
    },
    {
      icon: Heart,
      label: 'Bond',
      value: `+${rewards.bond_increase}`,
      color: 'text-pink-400',
      bg_color: 'bg-pink-400/10'
    },
    {
      icon: DollarSign,
      label: 'Character Earnings',
      value: `$${rewards.character_earnings?.total_earnings?.toLocaleString() || '0'}`,
      color: 'text-green-500',
      bg_color: 'bg-green-500/10'
    }
  ];

  // Add stat bonuses to rewards
  Object.entries(rewards.stat_bonuses).forEach(([stat, value]) => {
    if (value && value > 0) {
      rewardItems.push({
        icon: TrendingUp,
        label: stat.toUpperCase(),
        value: `+${value}`,
        color: 'text-green-400',
        bg_color: 'bg-green-400/10'
      });
    }
  });

  // Start reward animation sequence
  useEffect(() => {
    const timer = setTimeout(() => setShowRewards(true), 500);
    return () => clearTimeout(timer);
  }, []);

  // Animate rewards one by one
  useEffect(() => {
    if (showRewards && currentRewardIndex < rewardItems.length) {
      const timer = setTimeout(() => {
        setCurrentRewardIndex(prev => prev + 1);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [showRewards, currentRewardIndex, rewardItems.length]);

  // Animate XP bar
  useEffect(() => {
    if (currentRewardIndex >= rewardItems.length) {
      const timer = setTimeout(() => {
        const startXP = old_xp;
        const endXP = new_xp;
        const duration = 2000;
        const start_time = Date.now();
        
        const animate = () => {
          const elapsed = Date.now() - start_time;
          const progress = Math.min(elapsed / duration, 1);
          const currentXP = startXP + (endXP - startXP) * progress;
          
          setXpAnimationProgress(currentXP);
          
          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        };
        
        animate();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [currentRewardIndex, rewardItems.length, old_xp, new_xp]);

  const leveledUp = new_level > old_level;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <SafeMotion
        as="div"
        initial={{ opacity: 0, scale: isMobile ? 1 : 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: isMobile ? 0.15 : 0.5, type: isMobile ? 'tween' : 'spring' }}
        class_name="bg-gray-900 rounded-2xl border border-gray-700 max-w-md w-full p-6 text-center"
      >
        {/* Result Header */}
        <SafeMotion
          as="div"
          initial={{ y: isMobile ? 0 : -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: isMobile ? 0.15 : 0.3, type: isMobile ? 'tween' : 'spring' }}
          class_name="mb-6"
        >
          <div className="text-6xl mb-3">
            {is_victory ? '🏆' : '⚔️'}
          </div>
          <h2 className={`text-3xl font-bold mb-2 ${
            is_victory ? 'text-yellow-400' : 'text-blue-400'
          }`}>
            {is_victory ? 'Victory!' : 'Valiant Effort!'}
          </h2>
          <div className="flex items-center justify-center gap-2 text-gray-300">
            <span className="text-2xl">{character_avatar}</span>
            <span className="text-xl">{character_name}</span>
          </div>
        </SafeMotion>

        {/* Achievement Banner */}
        {rewards.achievement_unlocked && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-6 p-4 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/50 rounded-xl"
          >
            <div className="flex items-center justify-center gap-2 text-purple-300">
              <Crown className="w-5 h-5" />
              <span className="font-bold">Achievement Unlocked!</span>
            </div>
            <div className="text-white font-semibold mt-1">
              {ACHIEVEMENTS[rewards.achievement_unlocked as keyof typeof ACHIEVEMENTS]?.icon} {rewards.achievement_unlocked}
            </div>
            <div className="text-gray-400 text-sm mt-1">
              {ACHIEVEMENTS[rewards.achievement_unlocked as keyof typeof ACHIEVEMENTS]?.description}
            </div>
          </motion.div>
        )}

        {/* Rewards List */}
        <div className="space-y-3 mb-6">
          {rewardItems.map((reward, index) => (
            <AnimatePresence key={index}>
              {currentRewardIndex > index && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className={`flex items-center justify-between p-3 rounded-lg ${reward.bg_color} border border-gray-700`}
                >
                  <div className="flex items-center gap-3">
                    <reward.icon className={`w-5 h-5 ${reward.color}`} />
                    <span className="text-white font-medium">{reward.label}</span>
                  </div>
                  <motion.span 
                    className={`font-bold ${reward.color}`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                  >
                    {reward.value}
                  </motion.span>
                </motion.div>
              )}
            </AnimatePresence>
          ))}
        </div>

        {/* XP Progress & Level Up */}
        {currentRewardIndex >= rewardItems.length && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            {/* Level Display */}
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">Level {old_level}</div>
                <div className="text-gray-400 text-sm">Previous</div>
              </div>
              
              {leveledUp && (
                <>
                  <ArrowRight className="w-6 h-6 text-yellow-400" />
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                    className="text-center"
                  >
                    <div className="text-2xl font-bold text-yellow-400 flex items-center gap-2">
                      Level {new_level}
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="text-yellow-300 text-sm">LEVEL UP!</div>
                  </motion.div>
                </>
              )}
              
              {!leveledUp && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">Level {new_level}</div>
                  <div className="text-gray-400 text-sm">Current</div>
                </div>
              )}
            </div>

            {/* XP Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-400 mb-2">
                <span>Experience</span>
                <span>{Math.floor(xpAnimationProgress)}/{xp_to_next}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                <motion.div 
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full"
                  style={{ 
                    width: `${Math.min(100, (xpAnimationProgress / xp_to_next) * 100)}%` 
                  }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              
              {leveledUp && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="text-center text-yellow-400 text-sm mt-2 font-semibold"
                >
                  🎉 Congratulations! Your character grew stronger! 🎉
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* Continue Button */}
        {xpAnimationProgress > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: leveledUp ? 2 : 1 }}
            onClick={onContinue}
            className="w-full py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 rounded-lg text-white font-bold text-lg shadow-lg transition-all transform hover:scale-105"
          >
            Continue
          </motion.button>
        )}
      </SafeMotion>
    </div>
  );
}