import React from 'react';

interface PowerPointsDisplayProps {
  character_points: number;
  character_name?: string;
}

export default function PowerPointsDisplay({
  character_points,
  character_name = 'Character'
}: PowerPointsDisplayProps) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <span>💪</span>
        <span>CHARACTER POINTS</span>
      </h2>

      <div className="max-w-md">
        <div
          className={`
            relative rounded-lg border-2 p-6
            bg-gradient-to-br from-purple-500/20 via-blue-500/20 to-cyan-500/30
            border-cyan-500
            ${character_points > 0 ? 'animate-pulse' : ''}
            transition-all hover:scale-105
          `}
        >
          {/* Icon */}
          <div className="text-5xl mb-3 text-center">
            ⭐
          </div>

          {/* Points */}
          <div className="text-6xl font-bold text-center mb-2 text-cyan-400">
            {character_points}
          </div>

          {/* Labels */}
          <div className="text-center">
            <div className="text-lg font-semibold text-cyan-400">
              CHARACTER POINTS
            </div>
            <div className="text-sm text-gray-400 mt-2">
              Spend on Powers & Spells
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {character_name}
            </div>
          </div>

          {/* Availability indicator */}
          {character_points > 0 && (
            <div className="absolute top-3 right-3">
              <span className="relative flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-cyan-500"></span>
              </span>
            </div>
          )}

          {/* Cost reference */}
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="text-xs text-gray-400 text-center">
              <div className="font-semibold mb-2">Power Unlock Costs:</div>
              <div className="grid grid-cols-2 gap-2">
                <div>Skill: 1 pt</div>
                <div>Ability: 3 pts</div>
                <div>Species: 5 pts</div>
                <div>Signature: 7 pts</div>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Rank Up: +2 pts each rank
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
