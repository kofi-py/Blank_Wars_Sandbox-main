/**
 * TurnOrderPanel Component
 *
 * Vertical panel showing the attack order for all characters
 * sorted by initiative. Shows who's up next.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Skull, Shield, HelpCircle } from 'lucide-react';

export interface TurnOrderCharacter {
  id: string;
  name: string;
  isUserTeam: boolean;
  isActive: boolean;
  isKnockedOut: boolean;
  initiative: number;
  isDefending?: boolean;
}

export interface TurnOrderPanelProps {
  characters: TurnOrderCharacter[];
  currentCharacterIndex: number;
}

export const TurnOrderPanel: React.FC<TurnOrderPanelProps> = ({
  characters,
  currentCharacterIndex,
}) => {
  return (
    <div className="fixed left-56 top-1/2 -translate-y-1/2 z-20">
      <div className="bg-gray-900/95 border border-gray-700 rounded-lg p-2 shadow-xl">
        {/* Header with info tooltip */}
        <div className="flex items-center justify-between mb-2 px-2">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Turn Order
          </span>
          <div className="relative group">
            <HelpCircle size={12} className="text-gray-500 hover:text-gray-300 cursor-help" />
            <div className="absolute right-0 top-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              <div className="bg-gray-800 border border-gray-600 rounded-lg p-2 shadow-xl w-48">
                <div className="font-semibold text-white text-xs mb-1">Initiative</div>
                <div className="text-[10px] text-gray-400 leading-relaxed">
                  Higher initiative acts first. Based on Speed stat. Characters take turns in this order each round.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Character list */}
        <div className="space-y-1">
          {characters.map((char, index) => {
            const isCurrentTurn = index === currentCharacterIndex;
            const hasActed = index < currentCharacterIndex;

            return (
              <motion.div
                key={char.id}
                className={`
                  flex items-center gap-2 px-2 py-1.5 rounded-md min-w-[140px]
                  ${isCurrentTurn
                    ? char.isUserTeam
                      ? 'bg-blue-600/30 border border-blue-500'
                      : 'bg-red-600/30 border border-red-500'
                    : hasActed
                      ? 'bg-gray-800/50 opacity-50'
                      : 'bg-gray-800/80'
                  }
                  ${char.isKnockedOut ? 'opacity-40 line-through' : ''}
                `}
                animate={isCurrentTurn ? {
                  x: [0, 3, 0],
                } : {}}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                {/* Turn indicator arrow */}
                {isCurrentTurn && (
                  <motion.div
                    animate={{ x: [0, 4, 0] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                  >
                    <ChevronRight size={14} className={char.isUserTeam ? 'text-blue-400' : 'text-red-400'} />
                  </motion.div>
                )}

                {/* Character icon */}
                <div className={`
                  w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                  ${char.isKnockedOut
                    ? 'bg-gray-700 text-gray-500'
                    : char.isUserTeam
                      ? 'bg-blue-900 text-blue-300 border border-blue-500'
                      : 'bg-red-900 text-red-300 border border-red-500'
                  }
                `}>
                  {char.isKnockedOut ? (
                    <Skull size={12} />
                  ) : (
                    char.name.charAt(0).toUpperCase()
                  )}
                </div>

                {/* Character name */}
                <div className="flex-1 min-w-0">
                  <div className={`
                    text-xs font-medium truncate
                    ${char.isKnockedOut
                      ? 'text-gray-500'
                      : char.isUserTeam
                        ? 'text-blue-200'
                        : 'text-red-200'
                    }
                  `}>
                    {char.name}
                  </div>
                  {/* Initiative stat */}
                  <div className="text-[9px] text-gray-500">
                    Init: {char.initiative}
                  </div>
                </div>

                {/* Status icons */}
                {char.isDefending && !char.isKnockedOut && (
                  <Shield size={12} className="text-yellow-500" />
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-2 pt-2 border-t border-gray-700 flex gap-3 px-2">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-[9px] text-gray-500">You</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-[9px] text-gray-500">Enemy</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TurnOrderPanel;
