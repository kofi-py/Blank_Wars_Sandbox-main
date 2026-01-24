'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Target, Shield, Zap, CheckCircle, Clock, ArrowRight, MessageCircle } from 'lucide-react';
import { TeamCharacter } from '@/data/teamBattleSystem';

interface CharacterStrategy {
  character_id: string;
  attack: string | null;
  defense: string | null;
  special: string | null;
  is_complete: boolean;
}

interface CharacterSpecificStrategyPanelProps {
  current_round: number;
  current_match: number;
  player_team: { characters: TeamCharacter[] };
  character_strategies: Map<string, CharacterStrategy>;
  onStrategyChange: (character_id: string, category: 'attack' | 'defense' | 'special', strategy: string) => void;
  onAllStrategiesComplete: () => void;
  coaching_messages: string[];
  time_remaining: number;
  is_visible: boolean;
  // CamelCase variants
  currentMatch?: number;
  characterStrategies?: Map<string, CharacterStrategy>;
  coachingMessages?: string[];
  timeRemaining?: number;
}

const strategyOptions = {
  attack: [
    { id: 'aggressive', name: 'Aggressive Assault', description: 'All-out offense, high damage but vulnerable', icon: '⚔️' },
    { id: 'precise', name: 'Precision Strikes', description: 'Calculated attacks, higher accuracy', icon: '🎯' },
    { id: 'overwhelming', name: 'Overwhelming Force', description: 'Multiple attacks, drains energy', icon: '💥' },
    { id: 'adaptive', name: 'Adaptive Combat', description: 'Adjust based on opponent weaknesses', icon: '🧠' }
  ],
  defense: [
    { id: 'fortress', name: 'Fortress Stance', description: 'Maximum defense, reduced mobility', icon: '🏰' },
    { id: 'evasive', name: 'Evasive Maneuvers', description: 'Dodge-focused, maintain agility', icon: '💨' },
    { id: 'counter', name: 'Counter-Attack', description: 'Block and respond with counters', icon: '↩️' },
    { id: 'tactical', name: 'Tactical Defense', description: 'Balanced protection and positioning', icon: '🛡️' }
  ],
  special: [
    { id: 'signature', name: 'Signature Move', description: 'Use character\'s unique ability', icon: '⭐' },
    { id: 'team_synergy', name: 'Team Synergy', description: 'Coordinate with teammates', icon: '🤝' },
    { id: 'power_surge', name: 'Power Surge', description: 'Boost all abilities temporarily', icon: '⚡' },
    { id: 'psychological', name: 'Psychological Warfare', description: 'Intimidate and demoralize', icon: '🧠' }
  ]
};

export default function CharacterSpecificStrategyPanel({
  current_round,
  currentMatch,
  player_team,
  characterStrategies,
  onStrategyChange,
  onAllStrategiesComplete,
  coachingMessages,
  timeRemaining,
  is_visible
}: CharacterSpecificStrategyPanelProps) {
  const [selected_characterIndex, setSelectedCharacterIndex] = useState(0);

  if (!is_visible) return null;

  const currentCharacter = player_team.characters[selected_characterIndex];
  const currentStrategy = characterStrategies.get(currentCharacter.id) || {
    character_id: currentCharacter.id,
    attack: null,
    defense: null,
    special: null,
    is_complete: false
  };

  const allStrategiesComplete = Array.from(characterStrategies.values()).every(strategy => strategy.is_complete);
  const completedCount = Array.from(characterStrategies.values()).filter(strategy => strategy.is_complete).length;

  const handleStrategySelect = (category: 'attack' | 'defense' | 'special', strategy_id: string) => {
    onStrategyChange(currentCharacter.id, category, strategy_id);
  };

  const isCharacterComplete = (character: TeamCharacter) => {
    const strategy = characterStrategies.get(character.id);
    return strategy?.is_complete || false;
  };

  const getCharacterStrategyProgress = (character: TeamCharacter) => {
    const strategy = characterStrategies.get(character.id);
    if (!strategy) return 0;
    const completed = [strategy.attack, strategy.defense, strategy.special].filter(Boolean).length;
    return (completed / 3) * 100;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-gradient-to-br from-blue-900 to-purple-900 rounded-xl p-6 border border-blue-700"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">
            Match {currentMatch} • Round {current_round} Strategy
          </h2>
          <p className="text-blue-200">
            Set individual strategies for each character ({completedCount}/{player_team.characters.length} complete)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-white">
            <Clock className="w-4 h-4" />
            <span className="font-mono">{Math.max(0, timeRemaining)}s</span>
          </div>
          {allStrategiesComplete && (
            <motion.button
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.05 }}
              onClick={onAllStrategiesComplete}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-lg text-white font-bold flex items-center gap-2 transition-all"
            >
              Begin Combat!
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          )}
        </div>
      </div>

      {/* Character Selection Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {player_team.characters.map((character, index) => {
          const isSelected = index === selected_characterIndex;
          const is_complete = isCharacterComplete(character);
          const progress = getCharacterStrategyProgress(character);
          
          return (
            <motion.button
              key={character.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedCharacterIndex(index)}
              className={`flex-shrink-0 p-4 rounded-lg border-2 transition-all ${
                isSelected
                  ? 'bg-blue-800 border-blue-400 text-white'
                  : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-500'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl">{character.avatar}</div>
                <div className="text-left">
                  <div className="font-bold">{character.name}</div>
                  <div className="text-sm opacity-75">Level {character.level}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {is_complete ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <div className="w-4 h-2 bg-gray-600 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-400 transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Current Character Strategy Configuration */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Attack Strategy */}
        <div className="bg-red-900/30 rounded-lg p-4 border border-red-700">
          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Target className="text-red-400" />
            Attack Strategy
          </h3>
          <div className="space-y-2">
            {strategyOptions.attack.map((option) => (
              <motion.button
                key={option.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleStrategySelect('attack', option.id)}
                className={`w-full p-3 rounded-lg text-left transition-all ${
                  currentStrategy.attack === option.id
                    ? 'bg-red-600 text-white border-2 border-red-400'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border-2 border-transparent'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-xl">{option.icon}</span>
                  <div>
                    <div className="font-medium">{option.name}</div>
                    <div className="text-sm opacity-75">{option.description}</div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Defense Strategy */}
        <div className="bg-blue-900/30 rounded-lg p-4 border border-blue-700">
          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Shield className="text-blue-400" />
            Defense Strategy
          </h3>
          <div className="space-y-2">
            {strategyOptions.defense.map((option) => (
              <motion.button
                key={option.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleStrategySelect('defense', option.id)}
                className={`w-full p-3 rounded-lg text-left transition-all ${
                  currentStrategy.defense === option.id
                    ? 'bg-blue-600 text-white border-2 border-blue-400'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border-2 border-transparent'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-xl">{option.icon}</span>
                  <div>
                    <div className="font-medium">{option.name}</div>
                    <div className="text-sm opacity-75">{option.description}</div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Special Strategy */}
        <div className="bg-purple-900/30 rounded-lg p-4 border border-purple-700">
          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Zap className="text-purple-400" />
            Special Strategy
          </h3>
          <div className="space-y-2">
            {strategyOptions.special.map((option) => (
              <motion.button
                key={option.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleStrategySelect('special', option.id)}
                className={`w-full p-3 rounded-lg text-left transition-all ${
                  currentStrategy.special === option.id
                    ? 'bg-purple-600 text-white border-2 border-purple-400'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border-2 border-transparent'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-xl">{option.icon}</span>
                  <div>
                    <div className="font-medium">{option.name}</div>
                    <div className="text-sm opacity-75">{option.description}</div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Character-Specific Recommendations */}
      <div className="mt-6 bg-gray-800 rounded-lg p-4 border border-gray-600">
        <h4 className="text-white font-bold mb-2 flex items-center gap-2">
          <User className="w-4 h-4" />
          Coaching Recommendations for {currentCharacter.name}
        </h4>
        <div className="text-gray-300 text-sm space-y-1">
          <p>
            <strong>Archetype:</strong> {currentCharacter.archetype} • 
            <strong>Level:</strong> {currentCharacter.level} •
            <strong>HP:</strong> {currentCharacter.current_health}/{currentCharacter.max_health}
          </p>
          <p className="text-blue-300">
            💡 Recommended for {currentCharacter.archetype}s: 
            {currentCharacter.archetype === 'warrior' && 'Aggressive Assault + Counter-Attack + Signature Move'}
            {currentCharacter.archetype === 'mage' && 'Precision Strikes + Evasive Maneuvers + Power Surge'}
            {currentCharacter.archetype === 'trickster' && 'Adaptive Combat + Tactical Defense + Psychological Warfare'}
            {currentCharacter.archetype === 'beast' && 'Overwhelming Force + Fortress Stance + Signature Move'}
            {!['warrior', 'mage', 'trickster', 'beast'].includes(currentCharacter.archetype) && 'Balanced approach recommended'}
          </p>
        </div>
      </div>

      {/* Coaching Messages */}
      {coachingMessages.length > 0 && (
        <div className="mt-4 bg-green-900/30 rounded-lg p-4 border border-green-700">
          <h4 className="text-white font-bold mb-2 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-green-400" />
            Coach's Notes
          </h4>
          <div className="space-y-1">
            {coachingMessages.slice(-3).map((message, index) => (
              <p key={index} className="text-green-200 text-sm">
                {message}
              </p>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}