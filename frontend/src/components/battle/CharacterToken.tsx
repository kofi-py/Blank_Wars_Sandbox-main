// CharacterToken - Visual representation of a character on the hex grid

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HexGridSystem, HexPosition } from '@/systems/hexGridSystem';
import { TeamCharacter } from '@/data/teamBattleSystem';
import { Swords, Shield, Zap, Heart, Droplet, Brain } from 'lucide-react';

// Facing direction: 0-5 representing 6 hex directions
// 0 = East (right), 1 = SE, 2 = SW, 3 = West (left), 4 = NW, 5 = NE
export type FacingDirection = 0 | 1 | 2 | 3 | 4 | 5;

interface CharacterTokenProps {
  character: TeamCharacter;
  position: HexPosition;
  hex_size: number;
  is_active: boolean;
  is_user_team: boolean;
  onClick: (event: React.MouseEvent) => void;
  clickable?: boolean; // When false, clicks pass through to hex grid underneath
  show_tutorial_hint?: boolean; // Show "Click to Act" hint (first time only)
  facing?: FacingDirection; // Direction the character is facing (0-5)
  is_hit?: boolean; // Flash when taking damage
  is_attacking?: boolean; // Lunge animation when attacking
  combo_count?: number; // Show combo counter when > 1
}

export const CharacterToken: React.FC<CharacterTokenProps> = ({
  character,
  position,
  hex_size,
  is_active,
  is_user_team,
  onClick,
  clickable = true,
  show_tutorial_hint = false,
  facing = 0,
  is_hit = false,
  is_attacking = false,
  combo_count = 0
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Convert facing (0-5) to rotation degrees
  // 0 = East (0°), 1 = SE (60°), 2 = SW (120°), 3 = West (180°), 4 = NW (240°), 5 = NE (300°)
  const facingRotation = facing * 60;

  // Convert hex position to pixel coordinates
  const pixel = HexGridSystem.toPixel(position, hex_size);

  // Canvas dimensions scale with hex_size (matches HexGrid)
  const canvasWidth = hex_size * 40;  // 1200 when hex_size=30
  const canvasHeight = hex_size * 30; // 900 when hex_size=30

  // Calculate position as percentage of canvas (for responsive scaling)
  const centerOffsetX = canvasWidth / 2;
  const centerOffsetY = canvasHeight / 2;

  const x_percent = ((pixel.x + centerOffsetX) / canvasWidth) * 100;
  const y_percent = ((pixel.y + centerOffsetY) / canvasHeight) * 100;

  // Calculate HP percentage
  const hpPercentage = (character.current_health / character.max_health) * 100;

  // Color scheme based on team
  const teamColor = is_user_team ? 'bg-blue-500' : 'bg-red-500';
  const ringColor = is_user_team ? 'ring-blue-400' : 'ring-red-400';

  // Get adherence display (rebellion chance)
  const adherence = (character as any).adherence ?? 75;
  const rebellionChance = Math.max(0, 100 - adherence);

  // Get mana if available
  const currentMana = (character as any).current_mana ?? null;
  const maxMana = (character as any).max_mana ?? null;

  return (
    <div
      className={`absolute ${clickable ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'}`}
      style={{
        left: `${x_percent}%`,
        top: `${y_percent}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: isHovered ? 50 : 10
      }}
      onClick={clickable ? (e) => onClick(e) : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Stats Tooltip on Hover */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50"
          >
            <div className="bg-gray-900 border border-gray-600 rounded-lg shadow-xl p-3 min-w-[180px]">
              {/* Character Name & Level */}
              <div className="text-center mb-2 pb-2 border-b border-gray-700">
                <div className={`font-bold ${is_user_team ? 'text-blue-400' : 'text-red-400'}`}>
                  {character.name}
                </div>
                <div className="text-xs text-gray-400">
                  Lvl {(character as any).level ?? 1} {(character as any).species ?? 'Fighter'}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                {/* Attack */}
                <div className="flex items-center gap-1">
                  <Swords size={12} className="text-orange-400" />
                  <span className="text-gray-400">ATK:</span>
                  <span className="text-white font-medium">
                    {is_user_team ? ((character as any).strength ?? (character as any).attack ?? '?') : '??'}
                  </span>
                </div>

                {/* Defense */}
                <div className="flex items-center gap-1">
                  <Shield size={12} className="text-blue-400" />
                  <span className="text-gray-400">DEF:</span>
                  <span className="text-white font-medium">
                    {is_user_team ? ((character as any).defense ?? '?') : '??'}
                  </span>
                </div>

                {/* Speed */}
                <div className="flex items-center gap-1">
                  <Zap size={12} className="text-yellow-400" />
                  <span className="text-gray-400">SPD:</span>
                  <span className="text-white font-medium">
                    {is_user_team ? ((character as any).speed ?? '?') : '??'}
                  </span>
                </div>

                {/* HP - always visible since HP bar shows it anyway */}
                <div className="flex items-center gap-1">
                  <Heart size={12} className="text-red-400" />
                  <span className="text-gray-400">HP:</span>
                  <span className="text-white font-medium">{character.current_health}/{character.max_health}</span>
                </div>

                {/* Mana (if applicable) - hidden for enemies */}
                {is_user_team && currentMana !== null && (
                  <div className="flex items-center gap-1 col-span-2">
                    <Droplet size={12} className="text-cyan-400" />
                    <span className="text-gray-400">Mana:</span>
                    <span className="text-white font-medium">{currentMana}/{maxMana}</span>
                  </div>
                )}
              </div>

              {/* Adherence / Rebellion - only show for user team */}
              {is_user_team && (
                <div className="mt-2 pt-2 border-t border-gray-700">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      <Brain size={12} className="text-purple-400" />
                      <span className="text-gray-400">Adherence:</span>
                    </div>
                    <span className={`font-medium ${
                      adherence >= 80 ? 'text-green-400' :
                      adherence >= 50 ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {adherence}%
                    </span>
                  </div>
                  {rebellionChance > 0 && (
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      {rebellionChance}% chance to rebel
                    </div>
                  )}
                </div>
              )}

              {/* Equipped Weapon - only show for user team */}
              {is_user_team && (character as any).equipped_weapon && (
                <div className="mt-2 pt-2 border-t border-gray-700 text-xs">
                  <div className="text-gray-400">Weapon:</div>
                  <div className="text-white">{(character as any).equipped_weapon.name ?? 'Unknown'}</div>
                </div>
              )}

              {/* Status Effects */}
              {character.status_effects && character.status_effects.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-700">
                  <div className="text-xs text-gray-400 mb-1">Status:</div>
                  <div className="flex flex-wrap gap-1">
                    {character.status_effects.map((effect, i) => (
                      <span key={i} className="text-[10px] bg-purple-600/50 text-purple-200 px-1.5 py-0.5 rounded">
                        {effect}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Tooltip Arrow */}
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-900 border-r border-b border-gray-600 rotate-45" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Active Character Glow Effect */}
      {is_active && is_user_team && (
        <motion.div
          className="absolute w-20 h-20 bg-yellow-400/30"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            clipPath: 'polygon(50% 0%, 100% 75%, 50% 60%, 0% 75%)'
          }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.6, 0.2, 0.6],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}

      {/* Combo Counter */}
      <AnimatePresence>
        {combo_count > 1 && (
          <motion.div
            className="absolute -top-6 left-1/2 z-50"
            style={{ transform: 'translateX(-50%)' }}
            initial={{ opacity: 0, scale: 0.5, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: -10 }}
          >
            <motion.div
              className="bg-gradient-to-r from-orange-500 to-red-500 text-white font-black text-sm px-2 py-0.5 rounded-full border-2 border-yellow-300 shadow-lg"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.3 }}
            >
              {combo_count}x COMBO!
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Character Token - Arrow/Chevron Shape */}
      <motion.div
        className="relative w-20 h-20 transition-all duration-200 hover:scale-110"
        style={{
          transform: `rotate(${facingRotation}deg)`,
        }}
        animate={
          is_attacking ? {
            // Lunge forward animation (in facing direction)
            x: [0, 15, 0],
            scale: [1, 1.15, 1],
            filter: [
              'drop-shadow(0 0 5px rgba(255, 200, 0, 0.5))',
              'drop-shadow(0 0 20px rgba(255, 200, 0, 0.9))',
              'drop-shadow(0 0 5px rgba(255, 200, 0, 0.5))',
            ]
          } : is_active && is_user_team ? {
            filter: [
              'drop-shadow(0 0 6px rgba(250, 204, 21, 0.4))',
              'drop-shadow(0 0 12px rgba(250, 204, 21, 0.7))',
              'drop-shadow(0 0 6px rgba(250, 204, 21, 0.4))',
            ]
          } : {}
        }
        transition={
          is_attacking ? {
            duration: 0.3,
            ease: "easeOut"
          } : is_active && is_user_team ? {
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          } : {}
        }
      >
        {/* SVG Arrow Shape */}
        <svg
          viewBox="0 0 100 100"
          className={`w-full h-full transition-all duration-100 ${is_hit ? 'scale-110' : ''}`}
          style={{
            filter: is_hit
              ? 'drop-shadow(0 0 20px rgba(255, 255, 255, 0.9)) brightness(2)'
              : is_active
                ? `drop-shadow(0 0 4px ${is_user_team ? 'rgba(250, 204, 21, 0.6)' : 'rgba(239, 68, 68, 0.6)'})`
                : 'none'
          }}
        >
          {/* Main arrow body */}
          <polygon
            points="50,5 95,75 50,55 5,75"
            className={`${is_hit ? 'fill-white' : is_user_team ? 'fill-blue-500' : 'fill-red-500'} ${is_active ? (is_user_team ? 'stroke-yellow-400' : 'stroke-red-300') : 'stroke-gray-700'} transition-all duration-100`}
            strokeWidth={is_active ? 4 : 2}
          />
          {/* Inner highlight for depth */}
          <polygon
            points="50,15 80,65 50,50 20,65"
            className={`${is_hit ? 'fill-white' : is_user_team ? 'fill-blue-400' : 'fill-red-400'} ${is_hit ? 'opacity-100' : 'opacity-50'} transition-all duration-100`}
          />
        </svg>

        {/* Character Initial/Emoji - counter-rotate to stay upright */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ transform: `rotate(${-facingRotation}deg)`, marginTop: '-6px' }}
        >
          {character.avatar && character.avatar.length <= 4 ? (
            <span className="text-2xl drop-shadow-lg">
              {character.avatar}
            </span>
          ) : (
            <span className="text-white font-bold text-2xl drop-shadow-lg">
              {character.name.charAt(0)}
            </span>
          )}
        </div>

        {/* Active Turn Indicator */}
        {is_active && (
          <div
            className="absolute w-4 h-4 bg-yellow-400 rounded-full border-2 border-white animate-pulse"
            style={{
              top: '0px',
              left: '50%',
              transform: `translateX(-50%) rotate(${-facingRotation}deg)`
            }}
          />
        )}
      </motion.div>

      {/* "Click to Act" prompt for active user character - tutorial hint only */}
      {is_active && is_user_team && show_tutorial_hint && (
        <motion.div
          className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: [0.7, 1, 0.7], y: 0 }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <span className="text-xs text-yellow-400 font-semibold bg-gray-900/90 px-2 py-0.5 rounded border border-yellow-400/50">
            Click to Act
          </span>
        </motion.div>
      )}

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
            {character.current_health}/{character.max_health}
          </span>
        </div>
      </div>

      {/* Status Effects (if any) */}
      {character.status_effects && character.status_effects.length > 0 && (
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
          {character.status_effects.slice(0, 3).map((effect, index) => (
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
