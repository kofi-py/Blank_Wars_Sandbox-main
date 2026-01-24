/**
 * RadialMenu Component
 *
 * A circular action menu that appears when clicking on the active character.
 * Displays 6 main actions: Move, Attack, Defend, Powers, Spells, Items
 */

import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Move,
  Swords,
  Shield,
  Zap,
  Sparkles,
  Package,
  X
} from 'lucide-react';

export type ActionMode = 'move' | 'attack' | 'power' | 'spell' | 'item' | null;

export interface RadialMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;

  // Action availability
  canMove: boolean;
  canAttack: boolean;
  canDefend: boolean;
  currentAP: number;

  // Current selection
  activeMode: ActionMode;

  // Handlers
  onMoveClick: () => void;
  onAttackClick: () => void;
  onDefendClick: () => void;
  onPowersClick: () => void;
  onSpellsClick: () => void;
  onItemsClick: () => void;

  // Powers/Spells counts for badges
  powersCount?: number;
  spellsCount?: number;
  itemsCount?: number;

  // Whether it's this player's turn
  isPlayerTurn: boolean;
}

interface RadialButtonProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  apCost?: number | string;
  onClick: () => void;
  disabled: boolean;
  isActive: boolean;
  angle: number;
  radius: number;
  index: number;
  badge?: number;
}

const RADIUS = 90; // Distance from center to buttons
const BUTTON_SIZE = 56; // Size of each button

// Calculate position on circle
const getPosition = (angle: number, radius: number) => ({
  x: Math.cos(angle) * radius,
  y: Math.sin(angle) * radius,
});

// Animation variants
const menuVariants = {
  closed: {
    scale: 0,
    opacity: 0,
  },
  open: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 25,
      staggerChildren: 0.05,
    }
  },
  exit: {
    scale: 0,
    opacity: 0,
    transition: {
      duration: 0.2,
    }
  }
};

const buttonVariants = {
  closed: {
    scale: 0,
    opacity: 0,
  },
  open: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 20,
    }
  },
};

const RadialButton: React.FC<RadialButtonProps> = ({
  icon,
  label,
  description,
  apCost,
  onClick,
  disabled,
  isActive,
  angle,
  radius,
  index,
  badge,
}) => {
  const pos = getPosition(angle, radius);

  return (
    <motion.button
      variants={buttonVariants}
      className={`
        absolute flex flex-col items-center justify-center
        rounded-full shadow-lg border-2 transition-colors
        ${disabled
          ? 'bg-gray-800 border-gray-600 text-gray-500 cursor-not-allowed'
          : isActive
            ? 'bg-yellow-600 border-yellow-400 text-white'
            : 'bg-gray-800 border-gray-500 text-white hover:bg-gray-700 hover:border-gray-400'
        }
      `}
      style={{
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
        left: pos.x - BUTTON_SIZE / 2,
        top: pos.y - BUTTON_SIZE / 2,
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onClick();
      }}
      disabled={disabled}
      whileHover={disabled ? {} : { scale: 1.1 }}
      whileTap={disabled ? {} : { scale: 0.95 }}
    >
      <div className="text-xl">{icon}</div>

      {/* AP Cost badge */}
      {apCost !== undefined && (
        <span className={`
          absolute -bottom-1 -right-1 text-xs font-bold px-1.5 py-0.5 rounded-full
          ${disabled ? 'bg-gray-700 text-gray-500' : 'bg-green-600 text-white'}
        `}>
          {apCost}
        </span>
      )}

      {/* Count badge for powers/spells/items */}
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-1 -right-1 text-xs font-bold px-1.5 py-0.5 rounded-full bg-blue-600 text-white">
          {badge}
        </span>
      )}

      {/* Enhanced Tooltip with description */}
      <div className="
        absolute top-full left-1/2 -translate-x-1/2 mt-2
        opacity-0 hover:opacity-100 transition-opacity duration-200
        pointer-events-none z-50
      ">
        <div className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 shadow-xl min-w-[160px]">
          <div className="font-semibold text-white text-sm">{label}</div>
          {description && (
            <div className="text-xs text-gray-400 mt-1">{description}</div>
          )}
          {/* Arrow */}
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-900 border-l border-t border-gray-600 rotate-45" />
        </div>
      </div>
    </motion.button>
  );
};

export const RadialMenu: React.FC<RadialMenuProps> = ({
  isOpen,
  position,
  onClose,
  canMove,
  canAttack,
  canDefend,
  currentAP,
  activeMode,
  onMoveClick,
  onAttackClick,
  onDefendClick,
  onPowersClick,
  onSpellsClick,
  onItemsClick,
  powersCount = 0,
  spellsCount = 0,
  itemsCount = 0,
  isPlayerTurn,
}) => {
  // Close on ESC key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) {
      onClose();
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Define the 6 action buttons with their angles (starting from top, going clockwise)
  const actions = [
    {
      id: 'move',
      icon: <Move size={24} />,
      label: 'Move',
      description: 'Move across the hex grid. Cost: 1 AP per hex.',
      apCost: '1/hex',
      onClick: onMoveClick,
      disabled: !canMove || !isPlayerTurn,
      isActive: activeMode === 'move',
      angle: -Math.PI / 2, // Top (12 o'clock)
    },
    {
      id: 'attack',
      icon: <Swords size={24} />,
      label: 'Attack',
      description: 'Attack an enemy in weapon range. Damage = ATK vs DEF.',
      apCost: 2,
      onClick: onAttackClick,
      disabled: !canAttack || !isPlayerTurn,
      isActive: activeMode === 'attack',
      angle: -Math.PI / 6, // 2 o'clock
    },
    {
      id: 'powers',
      icon: <Zap size={24} />,
      label: 'Powers',
      description: 'Use character abilities. No mana cost, but have cooldowns.',
      apCost: undefined,
      onClick: onPowersClick,
      disabled: !isPlayerTurn || powersCount === 0,
      isActive: activeMode === 'power',
      angle: Math.PI / 6, // 4 o'clock
      badge: powersCount,
    },
    {
      id: 'spells',
      icon: <Sparkles size={24} />,
      label: 'Spells',
      description: 'Cast magical spells. Costs mana from your mana pool.',
      apCost: undefined,
      onClick: onSpellsClick,
      disabled: !isPlayerTurn || spellsCount === 0,
      isActive: activeMode === 'spell',
      angle: Math.PI / 2, // 6 o'clock (bottom)
      badge: spellsCount,
    },
    {
      id: 'items',
      icon: <Package size={24} />,
      label: 'Items',
      description: 'Use consumable items (potions, buffs, etc.)',
      apCost: 1,
      onClick: onItemsClick,
      disabled: !isPlayerTurn || currentAP < 1,
      isActive: activeMode === 'item',
      angle: (5 * Math.PI) / 6, // 8 o'clock
      badge: itemsCount,
    },
    {
      id: 'defend',
      icon: <Shield size={24} />,
      label: 'Defend',
      description: 'Take defensive stance. Reduces incoming damage by 50%.',
      apCost: 1,
      onClick: onDefendClick,
      disabled: !canDefend || !isPlayerTurn,
      isActive: false,
      angle: -(5 * Math.PI) / 6, // 10 o'clock
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop to catch clicks outside */}
          <motion.div
            className="fixed inset-0 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Radial menu container */}
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
            {/* Center indicator with AP tooltip */}
            <motion.div
              className="absolute w-12 h-12 -ml-6 -mt-6 rounded-full bg-gray-900/80 border-2 border-gray-600 flex items-center justify-center group pointer-events-auto cursor-help"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <span className="text-sm font-bold text-green-400">{currentAP} AP</span>
              {/* AP Info Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                <div className="bg-gray-800 border border-gray-600 rounded-lg p-2 shadow-xl w-52">
                  <div className="font-semibold text-white text-xs mb-1">Action Points (AP)</div>
                  <div className="text-[10px] text-gray-400 leading-relaxed">
                    You have 3 AP per turn. Move costs 1/hex, Attack costs 2, Defend/Items cost 1. Unspent AP is lost at turn end.
                  </div>
                </div>
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-800 border-r border-b border-gray-600 rotate-45" />
              </div>
            </motion.div>

            {/* Action buttons */}
            <div className="pointer-events-auto">
              {actions.map((action, index) => (
                <RadialButton
                  key={action.id}
                  icon={action.icon}
                  label={action.label}
                  description={action.description}
                  apCost={action.apCost}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  isActive={action.isActive}
                  angle={action.angle}
                  radius={RADIUS}
                  index={index}
                  badge={action.badge}
                />
              ))}
            </div>

            {/* Close button in center-bottom */}
            <motion.button
              className="absolute w-8 h-8 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center pointer-events-auto"
              style={{
                left: -16,
                top: RADIUS + 20,
              }}
              onClick={onClose}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X size={16} />
            </motion.button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default RadialMenu;
