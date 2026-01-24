'use client';

import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { SafeMotion } from './SafeMotion';
import { useMobileSafeMotion } from '@/hooks/useMobileSafeMotion';
import {
  Zap,
  Star,
  TrendingUp,
  Crown,
  ChevronUp,
  Plus,
  Minus,
  Info,
  Sparkles,
  X
} from 'lucide-react';
import type { UserCharacter } from '@blankwars/types';

interface CharacterEcho {
  character_id: string;
  count: number;
  character_name?: string;
  character_rarity?: string;
  character_archetype?: string;
}

interface CharacterEchoManagerProps {
  echoes: CharacterEcho[];
  is_open: boolean;
  onClose: () => void;
  onSpendEchoes?: (character_id: string, amount: number, action: 'ascend' | 'rankUp') => void;
  user_characters?: UserCharacter[];
}

interface EchoAction {
  type: 'ascend' | 'rankUp';
  cost: number;
  description: string;
  benefits: string[];
}

const ECHO_ACTIONS: { [key: string]: EchoAction } = {
  ascend: {
    type: 'ascend',
    cost: 3,
    description: 'Ascend Character',
    benefits: [
      '+5 to all base stats',
      'Unlocks new ability tier',
      'Enhanced visual effects',
      'Increased level cap by 10'
    ]
  },
  rank_up_ability: {
    type: 'rankUp',
    cost: 2,
    description: 'Rank Up Ability',
    benefits: [
      '+20% ability damage',
      'Reduced cooldown',
      'Enhanced effects',
      'New ability animations'
    ]
  }
};

export default function CharacterEchoManager({
  echoes,
  is_open,
  onClose,
  onSpendEchoes,
  user_characters = []
}: CharacterEchoManagerProps) {
  const { isMobile, get_safe_motion_props } = useMobileSafeMotion();
  const [selected_character, setSelectedCharacter] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<EchoAction | null>(null);
  const [spendAmount, setSpendAmount] = useState(1);

  const totalEchoes = echoes.reduce((sum, echo) => sum + echo.count, 0);

  const handleSpendEchoes = () => {
    if (selected_character && selectedAction && onSpendEchoes) {
      const actualAmount = Math.min(spendAmount, getEchoCount(selected_character));
      onSpendEchoes(selected_character, actualAmount, selectedAction.type);
      setSelectedCharacter(null);
      setSelectedAction(null);
      setSpendAmount(1);
    }
  };

  const getEchoCount = (character_id: string): number => {
    return echoes.find(echo => echo.character_id === character_id)?.count || 0;
  };


  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'from-gray-400 to-gray-600';
      case 'uncommon': return 'from-green-400 to-green-600';
      case 'rare': return 'from-blue-400 to-blue-600';
      case 'epic': return 'from-purple-400 to-purple-600';
      case 'legendary': return 'from-yellow-400 to-orange-500';
      case 'mythic': return 'from-pink-400 to-red-500';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  if (!is_open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <SafeMotion
        as="div"
        initial={{ opacity: 0, scale: isMobile ? 1 : 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: isMobile ? 1 : 0.9 }}
        transition={{
          duration: isMobile ? 0.15 : 0.3,
          type: isMobile ? 'tween' : 'spring'
        }}
        class_name="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold">Character Echoes</h2>
                <p className="text-yellow-100">
                  Total Echoes: {totalEchoes} • Use to enhance your characters
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {echoes.length === 0 ? (
            <div className="text-center py-12">
              <Zap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No Echoes Yet</h3>
              <p className="text-gray-500">
                Open card packs to get duplicate characters and earn powerful Echoes!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {echoes.map((echo) => {
                // Backend must provide these fields
                if (!echo.character_name || !echo.character_rarity || !echo.character_archetype) {
                  console.error('Echo missing required character data:', echo);
                  return null;
                }

                return (
                  <SafeMotion
                    as="div"
                    key={echo.character_id}
                    initial={{ opacity: 0, y: isMobile ? 0 : 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: isMobile ? 0.1 : 0.3,
                      type: isMobile ? 'tween' : 'spring'
                    }}
                    while_hover={isMobile ? {} : { y: -2 }}
                    while_tap={{ scale: isMobile ? 0.98 : 0.95 }}
                    class_name={`
                      relative overflow-hidden rounded-xl shadow-lg border-2 
                      ${selected_character === echo.character_id 
                        ? 'border-yellow-400 bg-yellow-50' 
                        : 'border-gray-200 bg-white hover:border-yellow-200'}
                      transition-all cursor-pointer
                    `}
                    onClick={() => setSelectedCharacter(
                      selected_character === echo.character_id ? null : echo.character_id
                    )}
                  >
                    <div className={`bg-gradient-to-r ${getRarityColor(echo.character_rarity)} p-4`}>
                      <div className="flex items-center justify-between text-white">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Zap className="w-8 h-8" />
                            <span className="text-3xl font-bold">{echo.count}x</span>
                          </div>
                          <div>
                            <h3 className="text-xl font-bold">{echo.character_name}</h3>
                            <p className="text-white/90 capitalize">
                              {echo.character_rarity} {echo.character_archetype}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }, (_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < (echo.character_rarity === 'mythic' ? 5 :
                                     echo.character_rarity === 'legendary' ? 4 :
                                     echo.character_rarity === 'epic' ? 3 :
                                     echo.character_rarity === 'rare' ? 2 : 1)
                                  ? 'text-yellow-200 fill-current'
                                  : 'text-white/30'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Action Panel */}
                    <AnimatePresence>
                      {selected_character === echo.character_id && (
                        <SafeMotion
                          as="div"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{
                            duration: isMobile ? 0.15 : 0.3,
                            type: isMobile ? 'tween' : 'spring'
                          }}
                          class_name="bg-yellow-50 border-t border-yellow-200"
                        >
                          <div className="p-6">
                            <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                              <Sparkles className="w-5 h-5 text-yellow-500" />
                              Echo Actions
                            </h4>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                              {Object.values(ECHO_ACTIONS).map((action) => (
                                <div
                                  key={action.type}
                                  className={`
                                    p-4 rounded-lg border-2 cursor-pointer transition-all
                                    ${selectedAction?.type === action.type
                                      ? 'border-yellow-400 bg-yellow-100'
                                      : 'border-gray-200 bg-white hover:border-yellow-200'}
                                  `}
                                  onClick={() => setSelectedAction(
                                    selectedAction?.type === action.type ? null : action
                                  )}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <h5 className="font-semibold">{action.description}</h5>
                                    <div className="flex items-center gap-1 text-yellow-600">
                                      <Zap className="w-4 h-4" />
                                      <span className="font-bold">{action.cost}</span>
                                    </div>
                                  </div>
                                  <ul className="text-sm text-gray-600 space-y-1">
                                    {action.benefits.slice(0, 2).map((benefit, index) => (
                                      <li key={index} className="flex items-center gap-1">
                                        <Plus className="w-3 h-3 text-green-500" />
                                        {benefit}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>

                            {selectedAction && (
                              <SafeMotion
                                as="div"
                                initial={{ opacity: 0, y: isMobile ? 0 : 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                  duration: isMobile ? 0.1 : 0.2,
                                  type: isMobile ? 'tween' : 'spring'
                                }}
                                class_name="bg-white rounded-lg p-4 border border-yellow-200"
                              >
                                <div className="flex items-center justify-between mb-4">
                                  <span className="font-medium">Echoes to spend:</span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSpendAmount(Math.max(1, spendAmount - 1));
                                      }}
                                      className="p-1 hover:bg-gray-100 rounded"
                                      disabled={spendAmount <= 1}
                                    >
                                      <Minus className="w-4 h-4" />
                                    </button>
                                    <span className="w-12 text-center font-bold">
                                      {Math.min(spendAmount, echo.count)}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSpendAmount(Math.min(echo.count, spendAmount + 1));
                                      }}
                                      className="p-1 hover:bg-gray-100 rounded"
                                      disabled={spendAmount >= echo.count}
                                    >
                                      <Plus className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between">
                                  <div className="text-sm text-gray-600">
                                    Cost: {selectedAction.cost} echoes each
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSpendEchoes();
                                    }}
                                    disabled={echo.count < selectedAction.cost}
                                    className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:from-gray-300 disabled:to-gray-400 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 disabled:transform-none"
                                  >
                                    {echo.count >= selectedAction.cost 
                                      ? `Spend ${selectedAction.cost} Echoes`
                                      : `Need ${selectedAction.cost - echo.count} more`}
                                  </button>
                                </div>
                              </SafeMotion>
                            )}
                          </div>
                        </SafeMotion>
                      )}
                    </AnimatePresence>
                  </SafeMotion>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Info className="w-4 h-4" />
              <span>Echoes are earned from duplicate character acquisitions</span>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </SafeMotion>
    </div>
  );
}