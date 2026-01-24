import React from 'react';
import { Power } from '../services/powerAPI';

interface PowerCardProps {
  power: Power;
  onUnlock?: () => void;
  onRankUp?: () => void;
  is_loading?: boolean;
}

const TIER_STYLES = {
  skill: {
    border: 'border-blue-500',
    bg: 'bg-gradient-to-br from-blue-500/20 to-blue-600/30',
    text: 'text-blue-400',
    badge: 'bg-blue-500/30',
    icon: '⚔️'
  },
  ability: {
    border: 'border-purple-500',
    bg: 'bg-gradient-to-br from-purple-500/20 to-purple-600/30',
    text: 'text-purple-400',
    badge: 'bg-purple-500/30',
    icon: '🛡️'
  },
  species: {
    border: 'border-green-500',
    bg: 'bg-gradient-to-br from-green-500/20 to-green-600/30',
    text: 'text-green-400',
    badge: 'bg-green-500/30',
    icon: '🧬'
  },
  signature: {
    border: 'border-yellow-500',
    bg: 'bg-gradient-to-br from-yellow-500/20 to-orange-600/30',
    text: 'text-yellow-400',
    badge: 'bg-yellow-500/30',
    icon: '⭐'
  }
};

const POWER_LEVEL_STYLES = {
  1: {
    label: 'Common',
    icon: '⚪',
    color: 'text-gray-400',
    bg: 'bg-gray-500/20'
  },
  2: {
    label: 'Uncommon',
    icon: '🔵',
    color: 'text-blue-400',
    bg: 'bg-blue-500/20'
  },
  3: {
    label: 'Rare',
    icon: '🟣',
    color: 'text-purple-400',
    bg: 'bg-purple-500/20'
  }
};

interface PowerEffect {
  type?: string;
  value?: number;
  target?: string;
  duration?: number;
  damage_type?: string;
  stat?: string;
  percent?: boolean;
  statusEffect?: string;
  chance?: number;
  immunityType?: string;
  rank?: number;
  [key: string]: unknown;
}

/**
 * Format power effect into readable text
 */
function formatEffect(effect: PowerEffect): string | null {
  if (!effect || !effect.type) return null;

  const target = effect.target ? ` (${effect.target})` : '';
  const duration = effect.duration ? ` for ${effect.duration} turn${effect.duration > 1 ? 's' : ''}` : '';

  switch (effect.type) {
    case 'damage':
      return `${effect.value} ${effect.damage_type || 'physical'} damage${target}`;

    case 'heal':
      return `Heal ${effect.value} HP${target}`;

    case 'stat_modifier':
      const sign = effect.value >= 0 ? '+' : '';
      return `${sign}${effect.value}${effect.percent ? '%' : ''} ${effect.stat}${duration}${target}`;

    case 'status_effect':
      return `Apply ${effect.statusEffect}${effect.chance ? ` (${effect.chance}% chance)` : ''}${duration}${target}`;

    case 'immunity':
      return `Immune to ${effect.immunityType}${duration}`;

    case 'shield':
      return `${effect.value} damage shield${duration}`;

    case 'purge':
      return `Remove ${effect.count === 99 ? 'all' : effect.count} ${effect.purgeType}${target}`;

    case 'special':
      return (effect.specialType as string | undefined)?.replace(/_/g, ' ') || 'Special effect';

    case 'lifesteal':
      return `${effect.value}% lifesteal${duration}`;

    case 'reflect':
      return `Reflect ${effect.value}% damage${duration}`;

    case 'regen':
      return `Regenerate ${effect.value} HP per turn${duration}`;

    default:
      return `${effect.type}: ${effect.value || ''}`.trim();
  }
}

export default function PowerCard({ power, onUnlock, onRankUp, is_loading }: PowerCardProps) {
  const tierStyle = TIER_STYLES[power.tier];
  const isMaxRank = power.current_rank === power.max_rank;
  const canAffordUnlock = power.can_unlock.can;
  const canAffordRankUp = power.can_rank_up.can;

  // Calculate correct rank-up cost based on current rank
  let rankUpCost = power.rank_up_cost;
  if (power.current_rank === 1) {
    rankUpCost = power.rank_up_cost_r2 || power.rank_up_cost;
  } else if (power.current_rank === 2) {
    rankUpCost = power.rank_up_cost_r3 || power.rank_up_cost;
  }

  return (
    <div
      className={`
        relative rounded-lg border-2 p-4 transition-all
        ${tierStyle.border}
        ${tierStyle.bg}
        ${power.is_unlocked ? 'opacity-100' : 'opacity-60'}
        ${power.unlocked_by === 'character_rebellion' ? 'ring-2 ring-red-500/50' : ''}
        ${isMaxRank && power.is_unlocked ? 'ring-2 ring-gradient-to-r from-yellow-400 via-pink-500 to-purple-600' : ''}
        hover:scale-105 hover:shadow-lg
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{tierStyle.icon}</span>
            <h3 className={`font-bold ${tierStyle.text}`}>
              {power.is_unlocked ? '' : '🔒 '}
              {power.name}
            </h3>
            {/* Power Level Badge */}
            {power.power_level && POWER_LEVEL_STYLES[power.power_level as 1 | 2 | 3] && (
              <span className={`px-2 py-0.5 text-xs rounded ${POWER_LEVEL_STYLES[power.power_level as 1 | 2 | 3].bg} ${POWER_LEVEL_STYLES[power.power_level as 1 | 2 | 3].color}`}>
                {POWER_LEVEL_STYLES[power.power_level as 1 | 2 | 3].icon} {POWER_LEVEL_STYLES[power.power_level as 1 | 2 | 3].label}
              </span>
            )}
          </div>

          {power.is_unlocked && (
            <div className="flex flex-col gap-1 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">
                  Rank {power.current_rank}/{power.max_rank}
                </span>
                <span className="text-yellow-400 font-bold">
                  ML {power.mastery_level || 1}
                </span>
                {isMaxRank && (
                  <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                    ⭐ MAX RANK
                  </span>
                )}
              </div>
              {/* Mastery Progress Bar */}
              <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
                <div
                  className="bg-yellow-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: '100%' }} // TODO: Calculate percentage based on next level requirement
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{power.mastery_points || 0} pts</span>
                <span>Next Level: ???</span>
              </div>
            </div>
          )}
        </div>

        {/* Status Badge */}
        {power.is_unlocked && (
          <span className={`px-2 py-1 text-xs rounded ${tierStyle.badge} text-white`}>
            ✅ UNLOCKED
          </span>
        )}
      </div>

      {/* Description */}
      <p className={`text-sm mb-3 ${power.is_unlocked ? 'text-gray-300' : 'text-gray-500'}`}>
        {power.description}
      </p>

      {/* Effects */}
      {power.is_unlocked && power.effects && Array.isArray(power.effects) && (
        <div className="mb-3 text-sm">
          <p className="text-gray-400 mb-1 font-semibold">Effects at Rank {power.current_rank}:</p>
          <ul className="space-y-1 text-gray-300 text-xs">
            {power.effects
              .filter((effect: PowerEffect) => effect.rank === power.current_rank || !effect.rank || effect.rank <= power.current_rank)
              .map((effect: PowerEffect, index: number) => {
                const effectText = formatEffect(effect);
                return effectText ? (
                  <li key={index} className="flex items-start gap-1">
                    <span className="text-green-400">•</span>
                    <span>{effectText}</span>
                  </li>
                ) : null;
              })}
          </ul>

          {/* Next Rank Preview */}
          {!isMaxRank && power.current_rank < power.max_rank && (
            <div className="mt-2 pt-2 border-t border-gray-700/50">
              <p className="text-yellow-400 mb-1 font-semibold text-xs">Next Rank ({power.current_rank + 1}):</p>
              <ul className="space-y-1 text-gray-400 text-xs">
                {power.effects
                  .filter((effect: PowerEffect) => effect.rank === power.current_rank + 1)
                  .map((effect: PowerEffect, index: number) => {
                    const effectText = formatEffect(effect);
                    return effectText ? (
                      <li key={index} className="flex items-start gap-1">
                        <span className="text-yellow-400">+</span>
                        <span>{effectText}</span>
                      </li>
                    ) : null;
                  })}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Lock Reasons (for locked powers) */}
      {!power.is_unlocked && !power.can_unlock.can && (
        <div className="mb-3 text-sm text-red-400">
          <p className="mb-1">⚠️ Requirements:</p>
          <p className="text-xs">{power.can_unlock.reason}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2">
        {!power.is_unlocked && (
          <button
            onClick={onUnlock}
            disabled={!canAffordUnlock || is_loading}
            className={`
              w-full px-4 py-2 rounded font-medium transition-all
              ${canAffordUnlock
                ? `${tierStyle.bg} ${tierStyle.text} hover:opacity-80`
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'}
              ${is_loading ? 'opacity-50 cursor-wait' : ''}
            `}
          >
            {is_loading ? 'Unlocking...' : (
              canAffordUnlock
                ? `Unlock - ${power.unlock_cost} pts`
                : `🔒 Need ${power.unlock_cost} pts`
            )}
          </button>
        )}

        {power.is_unlocked && !isMaxRank && (
          <button
            onClick={onRankUp}
            disabled={!canAffordRankUp || is_loading}
            className={`
              w-full px-4 py-2 rounded font-medium transition-all
              ${canAffordRankUp
                ? `${tierStyle.bg} ${tierStyle.text} hover:opacity-80`
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'}
              ${is_loading ? 'opacity-50 cursor-wait' : ''}
            `}
          >
            {is_loading ? 'Ranking Up...' : (
              canAffordRankUp
                ? `Rank Up ⬆️ - ${rankUpCost} pts`
                : `🔒 Need ${rankUpCost} pts`
            )}
          </button>
        )}
      </div>

      {/* Source Badge (only for rebellion) */}
      {power.unlocked_by === 'character_rebellion' && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <span className="text-xs text-red-400 flex items-center gap-1">
            <span>🔥</span>
            <span>Made own choice</span>
          </span>
          {power.unlocked_at && (
            <span className="text-xs text-gray-500 block mt-1">
              {new Date(power.unlocked_at).toLocaleDateString()}
            </span>
          )}
        </div>
      )}

      {/* Unlock Date (for coach decisions - no special badge) */}
      {power.unlocked_by === 'coach_suggestion' && power.unlocked_at && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <span className="text-xs text-gray-500">
            Unlocked {new Date(power.unlocked_at).toLocaleDateString()}
          </span>
        </div>
      )}
    </div>
  );
}
