// CharacterToken - Visual representation of a character on the hex grid

import React from 'react';
import { HexGridSystem, HexPosition } from '@/systems/hexGridSystem';
import { TeamCharacter } from '@/data/teamBattleSystem';

interface CharacterTokenProps {
  character: TeamCharacter;
  position: HexPosition;
  hexSize: number;
  isActive: boolean;
  isUserTeam: boolean;
  onClick: () => void;
}

export const CharacterToken: React.FC<CharacterTokenProps> = ({
  character,
  position,
  hexSize,
  isActive,
  isUserTeam,
  onClick
}) => {
  // Convert hex position to pixel coordinates
  const pixel = HexGridSystem.toPixel(position, hexSize);

  // Canvas center offset (matches HexGrid)
  const centerOffsetX = 600; // Half of canvas width
  const centerOffsetY = 450; // Half of canvas height

  const x = pixel.x + centerOffsetX;
  const y = pixel.y + centerOffsetY;

  // Calculate HP percentage
  const hpPercentage = (character.currentHp / character.maxHp) * 100;

  // Color scheme based on team
  const teamColor = isUserTeam ? 'bg-blue-500' : 'bg-red-500';
  const ringColor = isUserTeam ? 'ring-blue-400' : 'ring-red-400';

  return (
    <div
      className="absolute pointer-events-auto cursor-pointer"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: 'translate(-50%, -50%)',
        zIndex: 10
      }}
      onClick={onClick}
    >
      {/* Character Token */}
      <div
        className={`relative w-12 h-12 rounded-full ${teamColor} flex items-center justify-center
          ${isActive ? `ring-4 ${ringColor} ring-offset-2 ring-offset-gray-800` : ''}
          transition-all duration-200 hover:scale-110`}
      >
        {/* Character Avatar or Initial */}
        {character.avatar ? (
          <img
            src={character.avatar}
            alt={character.name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <span className="text-white font-bold text-xl">
            {character.name.charAt(0)}
          </span>
        )}

        {/* Active Turn Indicator */}
        {isActive && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-white animate-pulse" />
        )}
      </div>

      {/* HP Bar */}
      <div className="absolute top-14 left-1/2 transform -translate-x-1/2 w-16">
        <div className="bg-gray-700 rounded-full h-1.5 mb-0.5">
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${
              hpPercentage > 50 ? 'bg-green-500' : hpPercentage > 25 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${hpPercentage}%` }}
          />
        </div>

        {/* Name Label */}
        <div className="text-center">
          <span className="text-xs text-white font-semibold bg-gray-900 bg-opacity-75 px-1.5 py-0.5 rounded whitespace-nowrap">
            {character.name}
          </span>
        </div>

        {/* HP Text */}
        <div className="text-center">
          <span className="text-xs text-gray-300 font-mono">
            {character.currentHp}/{character.maxHp}
          </span>
        </div>
      </div>

      {/* Status Effects (if any) */}
      {character.statusEffects && character.statusEffects.length > 0 && (
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
          {character.statusEffects.slice(0, 3).map((effect, index) => (
            <div
              key={index}
              className="w-4 h-4 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center"
              title={effect}
            >
              {effect.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
