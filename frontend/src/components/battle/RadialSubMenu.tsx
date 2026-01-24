/**
 * RadialSubMenu Component
 *
 * Secondary radial menu for Powers or Spells selection.
 * Shows equipped abilities in a circle with cooldown/mana indicators.
 */

import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Zap, Sparkles } from 'lucide-react';
import { PowerDefinition, SpellDefinition } from '@/data/magic';

export type SubMenuType = 'powers' | 'spells';

export interface RadialSubMenuProps {
  isOpen: boolean;
  type: SubMenuType;
  position: { x: number; y: number };
  onClose: () => void;
  onBack: () => void;

  // For powers
  powers?: PowerDefinition[];
  powerCooldowns?: Record<string, number>;
  onSelectPower?: (powerId: string) => void;

  // For spells
  spells?: SpellDefinition[];
  spellCooldowns?: Record<string, number>;
  onSelectSpell?: (spellId: string) => void;

  // Resources
  currentAP: number;
  currentMana?: number;
  maxMana?: number;
}

const RADIUS = 100; // Slightly larger than main menu
const BUTTON_SIZE = 52;

// Calculate position on circle
const getPosition = (index: number, total: number, radius: number) => {
  // Start from top (-90 degrees) and distribute evenly
  const angleStep = (2 * Math.PI) / Math.max(total, 1);
  const angle = -Math.PI / 2 + index * angleStep;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
};

// Get AP cost for powers/spells (based on rank)
const getAPCost = (rank: number) => rank;

// Get tier color
const getTierColor = (tier: string): string => {
  switch (tier) {
    case 'skill':
    case 'novice':
      return 'border-gray-400';
    case 'ability':
    case 'adept':
      return 'border-blue-400';
    case 'species':
    case 'expert':
      return 'border-purple-400';
    case 'signature':
    case 'master':
      return 'border-yellow-400';
    default:
      return 'border-gray-400';
  }
};

const getTierBg = (tier: string): string => {
  switch (tier) {
    case 'skill':
    case 'novice':
      return 'bg-gray-700';
    case 'ability':
    case 'adept':
      return 'bg-blue-900';
    case 'species':
    case 'expert':
      return 'bg-purple-900';
    case 'signature':
    case 'master':
      return 'bg-yellow-900';
    default:
      return 'bg-gray-700';
  }
};

// Animation variants
const menuVariants = {
  closed: { scale: 0, opacity: 0 },
  open: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 25,
      staggerChildren: 0.03,
    }
  },
  exit: {
    scale: 0,
    opacity: 0,
    transition: { duration: 0.15 }
  }
};

const buttonVariants = {
  closed: { scale: 0, opacity: 0 },
  open: {
    scale: 1,
    opacity: 1,
    transition: { type: 'spring' as const, stiffness: 400, damping: 20 }
  },
};

interface AbilityButtonProps {
  name: string;
  tier: string;
  rank: number;
  cooldown: number;
  manaCost?: number;
  currentAP: number;
  currentMana?: number;
  position: { x: number; y: number };
  onClick: () => void;
  isPassive?: boolean;
}

const AbilityButton: React.FC<AbilityButtonProps> = ({
  name,
  tier,
  rank,
  cooldown,
  manaCost,
  currentAP,
  currentMana,
  position,
  onClick,
  isPassive = false,
}) => {
  const apCost = getAPCost(rank);
  const canAffordAP = currentAP >= apCost;
  const canAffordMana = manaCost === undefined || (currentMana !== undefined && currentMana >= manaCost);
  const isOnCooldown = cooldown > 0;
  const disabled = isPassive || isOnCooldown || !canAffordAP || !canAffordMana;

  let statusText = '';
  if (isPassive) statusText = 'Passive';
  else if (isOnCooldown) statusText = `${cooldown}T`;
  else if (!canAffordAP) statusText = `${apCost}AP`;
  else if (!canAffordMana) statusText = `${manaCost}MP`;

  return (
    <motion.button
      variants={buttonVariants}
      className={`
        absolute flex flex-col items-center justify-center
        rounded-lg shadow-lg border-2 transition-colors group
        ${getTierBg(tier)} ${getTierColor(tier)}
        ${disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:brightness-125 cursor-pointer'
        }
      `}
      style={{
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
        left: position.x - BUTTON_SIZE / 2,
        top: position.y - BUTTON_SIZE / 2,
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onClick();
      }}
      disabled={disabled}
      whileHover={disabled ? {} : { scale: 1.1 }}
      whileTap={disabled ? {} : { scale: 0.95 }}
    >
      {/* Rank indicator dots */}
      <div className="flex gap-0.5 mb-1">
        {Array.from({ length: Math.min(rank, 5) }).map((_, i) => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
        ))}
      </div>

      {/* Abbreviated name */}
      <span className="text-[10px] font-medium text-center leading-tight px-1 truncate w-full">
        {name.length > 8 ? name.substring(0, 7) + '...' : name}
      </span>

      {/* Status overlay */}
      {statusText && (
        <span className={`
          absolute inset-0 flex items-center justify-center
          rounded-lg text-xs font-bold
          ${isOnCooldown ? 'bg-black/70 text-red-400' : 'bg-black/50 text-gray-300'}
        `}>
          {statusText}
        </span>
      )}

      {/* AP cost badge */}
      {!isPassive && !isOnCooldown && (
        <span className={`
          absolute -bottom-1 -right-1 text-[10px] font-bold px-1 py-0.5 rounded
          ${canAffordAP ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}
        `}>
          {apCost}
        </span>
      )}

      {/* Mana cost badge */}
      {manaCost !== undefined && !isPassive && !isOnCooldown && (
        <span className={`
          absolute -bottom-1 -left-1 text-[10px] font-bold px-1 py-0.5 rounded
          ${canAffordMana ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'}
        `}>
          {manaCost}
        </span>
      )}

      {/* Full name tooltip */}
      <span className="
        absolute -bottom-10 left-1/2 -translate-x-1/2
        text-xs whitespace-nowrap bg-black/95 px-2 py-1 rounded
        opacity-0 group-hover:opacity-100 pointer-events-none z-10
        border border-gray-600
      ">
        {name}
      </span>
    </motion.button>
  );
};

export const RadialSubMenu: React.FC<RadialSubMenuProps> = ({
  isOpen,
  type,
  position,
  onClose,
  onBack,
  powers = [],
  powerCooldowns = {},
  onSelectPower,
  spells = [],
  spellCooldowns = {},
  onSelectSpell,
  currentAP,
  currentMana = 100,
  maxMana = 100,
}) => {
  // Close on ESC key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) {
      onBack();
    }
  }, [isOpen, onBack]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const items = type === 'powers' ? powers : spells;
  const cooldowns = type === 'powers' ? powerCooldowns : spellCooldowns;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sub-menu container */}
          <motion.div
            className="fixed z-50 pointer-events-none"
            style={{
              left: position.x,
              top: position.y,
            }}
            variants={menuVariants}
            initial="closed"
            animate="open"
            exit="exit"
          >
            {/* Center indicator */}
            <motion.div
              className={`
                absolute w-14 h-14 -ml-7 -mt-7 rounded-full border-2 flex flex-col items-center justify-center
                ${type === 'powers' ? 'bg-yellow-900/80 border-yellow-500' : 'bg-blue-900/80 border-blue-500'}
              `}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              {type === 'powers' ? <Zap size={20} /> : <Sparkles size={20} />}
              <span className="text-[10px] font-bold mt-0.5">
                {type === 'powers' ? 'Powers' : 'Spells'}
              </span>
            </motion.div>

            {/* Ability buttons */}
            <div className="pointer-events-auto">
              {items.map((item, index) => {
                const pos = getPosition(index, items.length, RADIUS);
                const cooldown = cooldowns[item.id] || 0;

                if (type === 'powers') {
                  const power = item as PowerDefinition;
                  return (
                    <AbilityButton
                      key={power.id}
                      name={power.name}
                      tier={power.tier}
                      rank={power.current_rank}
                      cooldown={cooldown}
                      currentAP={currentAP}
                      position={pos}
                      onClick={() => onSelectPower?.(power.id)}
                      isPassive={power.power_type === 'passive'}
                    />
                  );
                } else {
                  const spell = item as SpellDefinition;
                  return (
                    <AbilityButton
                      key={spell.id}
                      name={spell.name}
                      tier={spell.tier}
                      rank={spell.current_rank}
                      cooldown={cooldown}
                      manaCost={spell.mana_cost}
                      currentAP={currentAP}
                      currentMana={currentMana}
                      position={pos}
                      onClick={() => onSelectSpell?.(spell.id)}
                    />
                  );
                }
              })}
            </div>

            {/* Back button */}
            <motion.button
              className="absolute w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center pointer-events-auto border-2 border-gray-500"
              style={{
                left: -20,
                top: RADIUS + 30,
              }}
              onClick={(e) => {
                e.stopPropagation();
                onBack();
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ArrowLeft size={18} />
            </motion.button>

            {/* Mana bar for spells */}
            {type === 'spells' && (
              <motion.div
                className="absolute pointer-events-auto"
                style={{
                  left: -50,
                  top: -RADIUS - 30,
                  width: 100,
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="text-xs text-center text-blue-300 mb-1">
                  Mana: {currentMana}/{maxMana}
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden border border-gray-600">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${(currentMana / maxMana) * 100}%` }}
                  />
                </div>
              </motion.div>
            )}

            {/* Empty state */}
            {items.length === 0 && (
              <motion.div
                className="absolute text-center text-gray-400 text-sm"
                style={{
                  left: -60,
                  top: -20,
                  width: 120,
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                No {type} equipped
              </motion.div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default RadialSubMenu;
