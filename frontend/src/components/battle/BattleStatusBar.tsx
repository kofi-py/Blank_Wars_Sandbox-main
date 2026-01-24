/**
 * BattleStatusBar Component
 *
 * Horizontal bar showing both teams' status including:
 * - Character portraits/icons
 * - Health bars
 * - Active turn indicator
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Skull, Shield, Zap } from 'lucide-react';

// Character data needed for the status bar
export interface StatusBarCharacter {
  id: string;
  name: string;
  current_health: number;
  max_health: number;
  is_knocked_out: boolean;
  species?: string;
}

export interface BattleStatusBarProps {
  userCharacters: StatusBarCharacter[];
  opponentCharacters: StatusBarCharacter[];
  activeCharacterId: string | null;
  currentTurn: 'user' | 'opponent';
  roundNumber: number;
}

interface CharacterStatusProps {
  character: StatusBarCharacter;
  isActive: boolean;
  isUserTeam: boolean;
}

const CharacterStatus: React.FC<CharacterStatusProps> = ({
  character,
  isActive,
  isUserTeam,
}) => {
  const healthPercent = Math.max(0, Math.min(100,
    (character.current_health / character.max_health) * 100
  ));

  // Health bar color based on percentage
  const getHealthColor = () => {
    if (healthPercent > 60) return 'bg-green-500';
    if (healthPercent > 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <motion.div
      className={`
        relative flex flex-col items-center px-2 py-1 rounded-lg
        ${isActive ? 'ring-2 ring-yellow-400 bg-gray-800' : 'bg-gray-800/50'}
        ${character.is_knocked_out ? 'opacity-50' : ''}
      `}
      animate={isActive ? {
        scale: [1, 1.05, 1],
        transition: { repeat: Infinity, duration: 1.5 }
      } : {}}
    >
      {/* Character avatar/icon */}
      <div className={`
        w-10 h-10 rounded-full flex items-center justify-center mb-1
        border-2 ${isUserTeam ? 'border-blue-500 bg-blue-900/50' : 'border-red-500 bg-red-900/50'}
        ${character.is_knocked_out ? 'grayscale' : ''}
      `}>
        {character.is_knocked_out ? (
          <Skull size={20} className="text-gray-400" />
        ) : (
          <span className="text-lg font-bold">
            {character.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Name */}
      <span className="text-[10px] font-medium text-center truncate w-16 mb-1">
        {character.name}
      </span>

      {/* Health bar */}
      <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${getHealthColor()}`}
          initial={{ width: '100%' }}
          animate={{ width: `${healthPercent}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Health numbers */}
      <span className="text-[9px] text-gray-400 mt-0.5">
        {Math.ceil(character.current_health)}/{character.max_health}
      </span>

      {/* Active turn indicator */}
      {isActive && !character.is_knocked_out && (
        <motion.div
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
        >
          <Zap size={10} className="text-yellow-900" />
        </motion.div>
      )}
    </motion.div>
  );
};

export const BattleStatusBar: React.FC<BattleStatusBarProps> = ({
  userCharacters,
  opponentCharacters,
  activeCharacterId,
  currentTurn,
  roundNumber,
}) => {
  return (
    <div className="w-full bg-gray-900/95 border-b border-gray-700 px-4 py-2">
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        {/* User Team (Left side) */}
        <motion.div
          className={`
            flex items-center gap-2 p-2 rounded-lg
            ${currentTurn === 'user' ? 'ring-2 ring-blue-500 bg-blue-900/20' : ''}
          `}
          animate={currentTurn === 'user' ? {
            boxShadow: ['0 0 0px rgba(59,130,246,0)', '0 0 15px rgba(59,130,246,0.5)', '0 0 0px rgba(59,130,246,0)']
          } : {}}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <div className={`
            px-2 py-1 rounded text-xs font-bold uppercase tracking-wider
            ${currentTurn === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}
          `}>
            Your Team
          </div>
          <div className="flex gap-1">
            {userCharacters.map((char) => (
              <CharacterStatus
                key={char.id}
                character={char}
                isActive={char.id === activeCharacterId}
                isUserTeam={true}
              />
            ))}
          </div>
        </motion.div>

        {/* Center - Round + Turn indicator */}
        <div className="flex flex-col items-center">
          {/* Prominent turn indicator */}
          <motion.div
            className={`
              px-4 py-1 rounded-lg font-bold text-sm uppercase tracking-wider mb-1
              ${currentTurn === 'user'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/50'
                : 'bg-red-600 text-white shadow-lg shadow-red-600/50'}
            `}
            animate={{
              scale: [1, 1.05, 1],
              opacity: [1, 0.9, 1],
            }}
            transition={{ repeat: Infinity, duration: 1.2 }}
          >
            {currentTurn === 'user' ? '⚔️ YOUR TURN' : '🔴 ENEMY TURN'}
          </motion.div>

          {/* Round number */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Round</span>
            <span className="text-xl font-bold text-white">{roundNumber}</span>
          </div>
        </div>

        {/* Opponent Team (Right side) */}
        <motion.div
          className={`
            flex items-center gap-2 p-2 rounded-lg
            ${currentTurn === 'opponent' ? 'ring-2 ring-red-500 bg-red-900/20' : ''}
          `}
          animate={currentTurn === 'opponent' ? {
            boxShadow: ['0 0 0px rgba(239,68,68,0)', '0 0 15px rgba(239,68,68,0.5)', '0 0 0px rgba(239,68,68,0)']
          } : {}}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <div className="flex gap-1">
            {opponentCharacters.map((char) => (
              <CharacterStatus
                key={char.id}
                character={char}
                isActive={char.id === activeCharacterId}
                isUserTeam={false}
              />
            ))}
          </div>
          <div className={`
            px-2 py-1 rounded text-xs font-bold uppercase tracking-wider
            ${currentTurn === 'opponent' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-400'}
          `}>
            Enemy
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default BattleStatusBar;
