'use client';

import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import SafeMotion from './SafeMotion';
import { useMobileSafeMotion } from '@/hooks/useMobileSafeMotion';
import {
  Zap,
  Star,
  Crown,
  Target,
  Clock,
  Flame,
  Eye,
  TrendingUp,
  Battery,
  X,
  Lock,
  ArrowUp,
  Award,
  MessageCircle,
  Send,
  User
} from 'lucide-react';
import {
  Ability,
  AbilityType,
  AbilityProgress,
  getAbilitiesForCharacter,
  getAvailableAbilities,
  canUseAbility,
  getExperienceToNextRank
} from '@/data/abilities';
import GameEventBus from '../services/gameEventBus';
import EventContextService from '../services/eventContextService';

interface AbilityManagerProps {
  character_id?: string;
  character_name?: string;
  character_level?: number;
  character_stats?: { atk: number; def: number; spd: number; energy: number; max_energy: number; hp: number; max_health: number };
  ability_progress?: AbilityProgress[];
  cooldowns?: Record<string, number>;
  onUseAbility?: (ability: Ability) => void;
  onUpgradeAbility?: (ability_id: string) => void;
  context?: 'battle' | 'training' | 'overview';
}

export default function AbilityManager({
  character_id = 'achilles',
  character_name = 'Achilles',
  character_level = 1,
  character_stats = { atk: 100, def: 80, spd: 90, energy: 50, max_energy: 100, hp: 200, max_health: 200 },
  ability_progress = [],
  cooldowns = {},
  onUseAbility,
  onUpgradeAbility,
  context = 'overview'
}: AbilityManagerProps = {}) {
  const { isMobile, get_safe_motion_props } = useMobileSafeMotion();
  const [selectedAbility, setSelectedAbility] = useState<Ability | null>(null);
  const [filterType, setFilterType] = useState<AbilityType | 'all'>('all');
  const [showLockedAbilities, setShowLockedAbilities] = useState(false);

  // Skill Development Chat State
  const [showSkillChat, setShowSkillChat] = useState(false);
  const [chat_messages, setChatMessages] = useState<Array<{
    id: number;
    sender: 'coach' | 'contestant';
    message: string;
    timestamp: Date;
    character_name?: string;
  }>>([]);
  const [currentChatMessage, setCurrentChatMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Get all abilities for this character
  const characterAbilities = getAbilitiesForCharacter(character_id || 'achilles');
  const availableAbilities = getAvailableAbilities(character_id || 'achilles', character_level || 1);

  // Filter abilities
  const filteredAbilities = characterAbilities.filter(ability => {
    const typeMatch = filterType === 'all' || ability.type === filterType;
    const availabilityMatch = showLockedAbilities || availableAbilities.includes(ability);
    return typeMatch && availabilityMatch;
  });

  const getAbilityProgress = (ability_id: string): AbilityProgress => {
    const existing = ability_progress.find(p => p.ability_id === ability_id);
    if (existing) return existing;

    return {
      ability_id,
      current_rank: 1,
      experience: 0,
      experience_to_next: getExperienceToNextRank(1),
      times_used: 0
    };
  };

  const getTypeIcon = (type: AbilityType) => {
    const icons = {
      active: <Zap className="w-5 h-5" />,
      passive: <Eye className="w-5 h-5" />,
      ultimate: <Crown className="w-5 h-5" />,
      combo: <Target className="w-5 h-5" />
    };
    return icons[type] || <Star className="w-5 h-5" />;
  };

  const getTypeColor = (type: AbilityType) => {
    const colors = {
      active: 'from-blue-500 to-cyan-500',
      passive: 'from-green-500 to-emerald-500',
      ultimate: 'from-purple-500 to-pink-500',
      combo: 'from-orange-500 to-red-500'
    };
    return colors[type] || 'from-gray-500 to-gray-600';
  };

  const isAbilityUsable = (ability: Ability): boolean => {
    return canUseAbility(ability, {
      energy: character_stats?.energy || 0,
      level: character_level || 1,
      hp: character_stats?.hp || 100,
      max_health: character_stats?.max_health || 100,
      cooldowns
    });
  };

  const isAbilityAvailable = (ability: Ability): boolean => {
    return availableAbilities.includes(ability);
  };

  const getCooldownText = (ability_id: string): string => {
    const remaining = cooldowns[ability_id] || 0;
    return remaining > 0 ? `${remaining} turns` : 'Ready';
  };

  const getRankBonusText = (ability: Ability, rank: number): string[] => {
    const rankBonus = ability.rank_bonuses.find(r => r.rank === rank);
    return rankBonus ? rankBonus.improvements : [];
  };

  // Skill Development Chat Functions
  const sendSkillChatMessage = async () => {
    if (!currentChatMessage.trim() || isChatLoading) return;

    const user_message = {
      id: Date.now(),
      sender: 'coach' as const,
      message: currentChatMessage,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, user_message]);
    const messageContent = currentChatMessage;
    setCurrentChatMessage('');
    setIsChatLoading(true);

    // Import skills context for enhanced conversations
    let skillsContext = '';
    try {
      const contextService = EventContextService.getInstance();
      skillsContext = await contextService.getSkillsContext(character_id || 'achilles');
    } catch (error) {
      console.error('Error getting skills context:', error);
    }

    try {
      // Real API call to skills coaching service
      const token = localStorage.getItem('accessToken');
      const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

      const response = await fetch(`${BACKEND_URL}/coaching/skills`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          character_id: character_name?.toLowerCase().replace(' ', '_') || character_id, // Convert name to ID format
          user_message: messageContent,
          context: {
            level: character_level,
            current_skills: filteredAbilities.slice(0, 5).map(a => a.name),
            skill_focus: filterType,
            skill_points: 0,
            bond_level: 50,
            skills_context: skillsContext || 'No recent skill development context.',
            previous_messages: chat_messages.slice(-5).map(msg => ({
              role: msg.sender === 'coach' ? 'user' : 'assistant',
              content: msg.message
            }))
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const aiResponse = {
        id: Date.now() + 1,
        sender: 'contestant' as const,
        message: data.message,
        timestamp: new Date(),
        character_name: data.character || character_name
      };

      setChatMessages(prev => [...prev, aiResponse]);

      // Publish skills coaching event
      try {
        const eventBus = GameEventBus.getInstance();
        const responseText = data.message?.toLowerCase() || '';
        let event_type = 'skill_development_session';
        let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';

        if (responseText.includes('breakthrough') || responseText.includes('mastered') || responseText.includes('advanced')) {
          event_type = 'skill_breakthrough';
          severity = 'high';
        } else if (responseText.includes('struggle') || responseText.includes('difficulty') || responseText.includes('practice more')) {
          event_type = 'skill_plateau';
          severity = 'medium';
        } else if (responseText.includes('new technique') || responseText.includes('learned') || responseText.includes('improved')) {
          event_type = 'technique_learned';
          severity = 'medium';
        }

        await eventBus.publish({
          type: event_type as any,
          source: 'skills_advisor',
          primary_character_id: character_id || 'achilles',
          severity,
          category: 'skills',
          description: `${character_name} skills coaching: "${messageContent.substring(0, 100)}..."`,
          metadata: {
            skill_focus: filterType,
            character_level: character_level || 1,
            response_length: data.message?.length || 0,
            coaching_type: 'skills_development'
          },
          tags: ['skills', 'coaching', 'development']
        });
      } catch (error) {
        console.error('Error publishing skills event:', error);
      }

      setIsChatLoading(false);
    } catch (error) {
      console.error('Skill chat error:', error);
      const errorResponse = {
        id: Date.now() + 1,
        sender: 'contestant' as const,
        message: 'I apologize, but I\'m having trouble responding right now. Please try again.',
        timestamp: new Date(),
        character_name: character_name
      };
      setChatMessages(prev => [...prev, errorResponse]);
      setIsChatLoading(false);
    }
  };

  const handleChatKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendSkillChatMessage();
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-3">
          <Zap className="w-8 h-8 text-purple-400" />
          {character_name}&apos;s Abilities
        </h1>
        <p className="text-gray-400 text-lg">
          Master your character&apos;s unique powers and devastating abilities
        </p>
      </div>

      {/* Filters */}
      <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold">Type:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as AbilityType | 'all')}
              className="px-3 py-1 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="active">Active</option>
              <option value="passive">Passive</option>
              <option value="ultimate">Ultimate</option>
              <option value="combo">Combo</option>
            </select>
          </div>

          {/* Show Locked Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showLockedAbilities}
              onChange={(e) => setShowLockedAbilities(e.target.checked)}
              className="rounded"
            />
            <span className="text-white">Show locked abilities</span>
          </label>

          {/* Character Stats Summary */}
          <div className="ml-auto flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Battery className="w-4 h-4 text-blue-400" />
              <span className="text-blue-400">{character_stats?.energy || 0}/{character_stats?.max_energy || 100}</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400">Level {character_level || 1}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Abilities Grid */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAbilities.map((ability) => {
          const progress = getAbilityProgress(ability.id);
          const isAvailable = isAbilityAvailable(ability);
          const isUsable = isAbilityUsable(ability);
          const cooldownRemaining = cooldowns[ability.id] || 0;

          return (
            <SafeMotion
              as="div"
              key={ability.id}
              class_name={`border rounded-xl p-4 cursor-pointer transition-all ${
                !isAvailable
                  ? 'border-gray-700 bg-gray-800/30 opacity-60'
                  : isUsable && context === 'battle'
                    ? `border-purple-500 bg-gradient-to-r ${getTypeColor(ability.type)}/10 hover:scale-105`
                    : `border-gray-600 bg-gradient-to-r ${getTypeColor(ability.type)}/5 hover:border-purple-500`
              }`}
              initial={{ opacity: 0, scale: isMobile ? 1 : 0.9, y: isMobile ? 0 : 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                duration: isMobile ? 0.15 : 0.3,
                type: isMobile ? 'tween' : 'spring'
              }}
              while_hover={isMobile ? {} : (isAvailable ? { y: -2 } : {})}
              while_tap={isMobile ? { scale: 0.98 } : { scale: 0.95 }}
              onClick={() => setSelectedAbility(ability)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-r ${getTypeColor(ability.type)}`}>
                    <span className="text-2xl">{ability.icon}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white">{ability.name}</h3>
                      {!isAvailable && <Lock className="w-4 h-4 text-red-400" />}
                    </div>
                    <div className="flex items-center gap-2">
                      {getTypeIcon(ability.type)}
                      <span className="text-sm text-gray-400 capitalize">{ability.type}</span>
                    </div>
                  </div>
                </div>

                {/* Rank */}
                <div className="text-right">
                  <div className="flex items-center gap-1 mb-1">
                    <Award className="w-4 h-4 text-yellow-400" />
                    <span className="text-yellow-400 font-bold">
                      Rank {progress.current_rank}/{ability.max_rank}
                    </span>
                  </div>
                  {progress.current_rank < ability.max_rank && (
                    <div className="text-xs text-gray-400">
                      {progress.experience}/{progress.experience_to_next} XP
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="text-gray-300 text-sm mb-3">{ability.description}</p>

              {/* Requirements & Costs */}
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="flex items-center gap-1">
                  <Battery className="w-3 h-3 text-blue-400" />
                  <span className={(character_stats?.energy || 0) >= ability.cost.energy ? 'text-blue-400' : 'text-red-400'}>
                    {ability.cost.energy} Energy
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-yellow-400" />
                  <span className={cooldownRemaining === 0 ? 'text-green-400' : 'text-red-400'}>
                    {getCooldownText(ability.id)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-purple-400" />
                  <span className={(character_level || 1) >= ability.unlock_level ? 'text-green-400' : 'text-red-400'}>
                    Level {ability.unlock_level}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-400">
                    {ability.cost.cooldown}T CD
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              {progress.current_rank < ability.max_rank && isAvailable && (
                <div className="mb-3">
                  <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${getTypeColor(ability.type)} transition-all`}
                      style={{ width: `${(progress.experience / progress.experience_to_next) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                {context === 'battle' && isAvailable && isUsable && onUseAbility && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUseAbility(ability);
                    }}
                    className={`flex-1 py-2 bg-gradient-to-r ${getTypeColor(ability.type)} text-white rounded-lg font-semibold transition-colors hover:opacity-90`}
                  >
                    Use Ability
                  </button>
                )}

                {context !== 'battle' && isAvailable && progress.current_rank < ability.max_rank && onUpgradeAbility && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpgradeAbility(ability.id);
                    }}
                    className="flex-1 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-1"
                  >
                    <ArrowUp className="w-4 h-4" />
                    Upgrade
                  </button>
                )}
              </div>
            </SafeMotion>
          );
        })}
      </div>

      {filteredAbilities.length === 0 && (
        <div className="text-center py-12">
          <Zap className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">No Abilities Found</h3>
          <p className="text-gray-500">
            {showLockedAbilities
              ? "This character has no abilities of the selected type"
              : "Try showing locked abilities or changing the filter"}
          </p>
        </div>
      )}
        </div>

      </div>

      {/* Ability Detail Modal */}
      <AnimatePresence>
        {selectedAbility && (
          <SafeMotion
            as="div"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: isMobile ? 0.15 : 0.25,
              type: isMobile ? 'tween' : 'spring'
            }}
            class_name="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedAbility(null)}
          >
            <SafeMotion
              as="div"
              initial={{
                scale: isMobile ? 1 : 0.9,
                opacity: 0,
                y: isMobile ? 20 : 0
              }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{
                scale: isMobile ? 1 : 0.9,
                opacity: 0,
                y: isMobile ? 20 : 0
              }}
              transition={{
                duration: isMobile ? 0.2 : 0.3,
                type: isMobile ? 'tween' : 'spring'
              }}
              class_name="bg-gray-900 rounded-xl border border-gray-700 max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-white">Ability Details</h3>
                <button
                  onClick={() => setSelectedAbility(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className={`p-4 rounded-lg bg-gradient-to-r ${getTypeColor(selectedAbility.type)}/20 border border-current mb-6`}>
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-5xl">{selectedAbility.icon}</span>
                  <div>
                    <h4 className="text-2xl font-bold text-white mb-1">{selectedAbility.name}</h4>
                    <div className="flex items-center gap-2 text-gray-300">
                      {getTypeIcon(selectedAbility.type)}
                      <span className="capitalize">{selectedAbility.type} Ability</span>
                    </div>
                  </div>
                </div>

                <p className="text-gray-300 mb-3">{selectedAbility.description}</p>
                <p className="text-sm text-gray-400 italic">&quot;{selectedAbility.flavor}&quot;</p>
              </div>

              {/* Current Rank & Progress */}
              {(() => {
                const progress = getAbilityProgress(selectedAbility.id);
                return (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-white font-semibold">Rank Progress</h5>
                      <span className="text-yellow-400 font-bold">
                        Rank {progress.current_rank}/{selectedAbility.max_rank}
                      </span>
                    </div>

                    {progress.current_rank < selectedAbility.max_rank && (
                      <div className="mb-2">
                        <div className="bg-gray-700 rounded-full h-3 overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${getTypeColor(selectedAbility.type)} transition-all`}
                            style={{ width: `${(progress.experience / progress.experience_to_next) * 100}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {progress.experience}/{progress.experience_to_next} XP to next rank
                        </div>
                      </div>
                    )}

                    {/* Next Rank Bonuses */}
                    {progress.current_rank < selectedAbility.max_rank && (
                      <div className="mt-3">
                        <h6 className="text-sm font-semibold text-gray-300 mb-1">
                          Rank {progress.current_rank + 1} Bonuses:
                        </h6>
                        <ul className="text-sm text-green-400 space-y-1">
                          {getRankBonusText(selectedAbility, progress.current_rank + 1).map((bonus, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <ArrowUp className="w-3 h-3" />
                              {bonus}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Effects */}
              <div className="mb-6">
                <h5 className="text-white font-semibold mb-3">Effects</h5>
                <div className="space-y-3">
                  {selectedAbility.effects.map((effect, index) => (
                    <div key={index} className="bg-gray-800 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-purple-400 font-semibold capitalize">
                          {effect.type.replace('_', ' ')}
                        </span>
                        <span className="text-gray-400 capitalize">{effect.target.replace('_', ' ')}</span>
                      </div>
                      <div className="text-sm text-gray-300">
                        {effect.type === 'damage' && `${effect.value} ${effect.damage_type} damage`}
                        {effect.type === 'heal' && `Restores ${effect.value} HP`}
                        {effect.type === 'stat_modifier' &&
                          `${effect.value > 0 ? '+' : ''}${effect.value}% ${effect.stat?.toUpperCase()} ${effect.duration ? `for ${effect.duration} turns` : ''}`}
                        {effect.type === 'status_effect' &&
                          `Applies ${effect.status_effect} ${effect.duration ? `for ${effect.duration} turns` : ''}`}
                        {effect.type === 'special' && 'Special effect (see ability description)'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Requirements & Costs */}
              <div className="mb-6">
                <h5 className="text-white font-semibold mb-3">Requirements & Costs</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className={`flex items-center gap-2 ${(character_level || 1) >= selectedAbility.unlock_level ? 'text-green-400' : 'text-red-400'}`}>
                      <Star className="w-4 h-4" />
                      Level {selectedAbility.unlock_level}
                    </div>
                    <div className={`flex items-center gap-2 ${(character_stats?.energy || 0) >= selectedAbility.cost.energy ? 'text-blue-400' : 'text-red-400'}`}>
                      <Battery className="w-4 h-4" />
                      {selectedAbility.cost.energy} Energy
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-yellow-400">
                      <Clock className="w-4 h-4" />
                      {selectedAbility.cost.cooldown} turns cooldown
                    </div>
                    {selectedAbility.cost.requirements?.hp_threshold && (
                      <div className="flex items-center gap-2 text-red-400">
                        <Flame className="w-4 h-4" />
                        Below {selectedAbility.cost.requirements.hp_threshold}% HP
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                {context === 'battle' && isAbilityAvailable(selectedAbility) && isAbilityUsable(selectedAbility) && onUseAbility && (
                  <button
                    onClick={() => {
                      onUseAbility(selectedAbility);
                      setSelectedAbility(null);
                    }}
                    className={`flex-1 py-3 bg-gradient-to-r ${getTypeColor(selectedAbility.type)} text-white rounded-lg font-semibold transition-colors hover:opacity-90`}
                  >
                    Use Ability
                  </button>
                )}

                <button
                  onClick={() => setSelectedAbility(null)}
                  className="flex-1 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </SafeMotion>
          </SafeMotion>
        )}
      </AnimatePresence>
    </div>
  );
}
