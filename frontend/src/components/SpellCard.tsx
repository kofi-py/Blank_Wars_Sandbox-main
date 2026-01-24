import React from 'react';
import { Spell } from '../services/spellAPI';

interface SpellCardProps {
  spell: Spell;
  onUnlock?: () => void;
  onRankUp?: () => void;
  onEquip?: () => void;
  is_loading?: boolean;
}

const CATEGORY_STYLES = {
  universal: {
    border: 'border-cyan-500',
    bg: 'bg-gradient-to-br from-cyan-500/20 to-cyan-600/30',
    text: 'text-cyan-400',
    badge: 'bg-cyan-500/30',
    icon: '🌟'
  },
  archetype: {
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
    border: 'border-orange-500',
    bg: 'bg-gradient-to-br from-orange-500/20 to-yellow-600/30',
    text: 'text-orange-400',
    badge: 'bg-orange-500/30',
    icon: '✨'
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

interface SpellEffect {
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
 * Format spell effect into readable text
 */
function formatEffect(effect: SpellEffect): string | null {
  if (!effect || !effect.type) return null;

  const target = effect.target ? ` (${effect.target})` : '';
  const duration = effect.duration ? ` for ${effect.duration} turn${effect.duration > 1 ? 's' : ''}` : '';

  switch (effect.type) {
    case 'damage':
      return `${effect.value} ${effect.damage_type || 'magical'} damage${target}`;

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

    case 'summon':
      return `Summon ${effect.summonType || 'creature'}${duration}`;

    case 'teleport':
      return `Teleport ${effect.range || ''} spaces`;

    case 'dispel':
      return `Dispel magic${target}`;

    default:
      return `${effect.type}: ${effect.value || ''}`.trim();
  }
}

export default function SpellCard({ spell, onUnlock, onRankUp, onEquip, is_loading }: SpellCardProps) {
  const categoryStyle = CATEGORY_STYLES[spell.tier];
  const isMaxRank = spell.current_rank === spell.max_rank;
  const canAffordUnlock = spell.can_unlock.can;
  const canAffordRankUp = spell.can_rank_up.can;

  // Calculate correct rank-up cost based on current rank
  let rankUpCost = spell.rank_up_cost;
  if (spell.current_rank === 1) {
    rankUpCost = spell.rank_up_cost_r2 || spell.rank_up_cost;
  } else if (spell.current_rank === 2) {
    rankUpCost = spell.rank_up_cost_r3 || spell.rank_up_cost;
  }

  return (
    <div
      className={`
        relative rounded-lg border-2 p-4 transition-all
        ${categoryStyle.border}
        ${categoryStyle.bg}
        ${spell.is_unlocked ? 'opacity-100' : 'opacity-60'}
        ${spell.is_equipped ? 'ring-2 ring-blue-500/50' : ''}
        ${isMaxRank && spell.is_unlocked ? 'ring-2 ring-gradient-to-r from-yellow-400 via-pink-500 to-purple-600' : ''}
        hover:scale-105 hover:shadow-lg
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{categoryStyle.icon}</span>
            <h3 className={`font-bold ${categoryStyle.text}`}>
              {spell.is_unlocked ? '' : '🔒 '}
              {spell.name}
            </h3>
            {/* Power Level Badge */}
            {spell.power_level && POWER_LEVEL_STYLES[spell.power_level as 1 | 2 | 3] && (
              <span className={`px-2 py-0.5 text-xs rounded ${POWER_LEVEL_STYLES[spell.power_level as 1 | 2 | 3].bg} ${POWER_LEVEL_STYLES[spell.power_level as 1 | 2 | 3].color}`}>
                {POWER_LEVEL_STYLES[spell.power_level as 1 | 2 | 3].icon} {POWER_LEVEL_STYLES[spell.power_level as 1 | 2 | 3].label}
              </span>
            )}
          </div>

          {spell.is_unlocked && (
            <div className="flex flex-col gap-1 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">
                  Rank {spell.current_rank}/{spell.max_rank}
                </span>
                <span className="text-yellow-400 font-bold">
                  ML {spell.mastery_level || 1}
                </span>
                {isMaxRank && (
                  <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                    ⭐ MAX RANK
                  </span>
                )}
                {spell.is_equipped && (
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
                    ⚔️ EQUIPPED
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
                <span>{spell.mastery_points || 0} pts</span>
                <span>Next Level: ???</span>
              </div>
            </div>
          )}
        </div>

        {/* Status Badge */}
        {spell.is_unlocked && (
          <span className={`px-2 py-1 text-xs rounded ${categoryStyle.badge} text-white`}>
            ✅ UNLOCKED
          </span>
        )}
      </div>

      {/* Description */}
      <p className={`text-sm mb-3 ${spell.is_unlocked ? 'text-gray-300' : 'text-gray-500'}`}>
        {spell.description}
      </p>

      {/* Spell Stats */}
      {spell.is_unlocked && (
        <div className="mb-3 flex gap-4 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-blue-400">💧</span>
            <span className="text-gray-400">{spell.mana_cost} mana</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-purple-400">⏱️</span>
            <span className="text-gray-400">{spell.cooldown_turns} turn CD</span>
          </div>
        </div>
      )}

      {/* Effects */}
      {spell.is_unlocked && spell.effects && Array.isArray(spell.effects) && (
        <div className="mb-3 text-sm">
          <p className="text-gray-400 mb-1 font-semibold">Effects at Rank {spell.current_rank}:</p>
          <ul className="space-y-1 text-gray-300 text-xs">
            {spell.effects
              .filter((effect: SpellEffect) => effect.rank === spell.current_rank || !effect.rank || effect.rank <= spell.current_rank!)
              .map((effect: SpellEffect, index: number) => {
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
          {!isMaxRank && spell.current_rank! < spell.max_rank && (
            <div className="mt-2 pt-2 border-t border-gray-700/50">
              <p className="text-yellow-400 mb-1 font-semibold text-xs">Next Rank ({spell.current_rank! + 1}):</p>
              <ul className="space-y-1 text-gray-400 text-xs">
                {spell.effects
                  .filter((effect: SpellEffect) => effect.rank === spell.current_rank! + 1)
                  .map((effect: SpellEffect, index: number) => {
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

      {/* Lock Reasons (for locked spells) */}
      {!spell.is_unlocked && !spell.can_unlock.can && (
        <div className="mb-3 text-sm text-red-400">
          <p className="mb-1">⚠️ Requirements:</p>
          <p className="text-xs">{spell.can_unlock.reason}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2">
        {!spell.is_unlocked && (
          <button
            onClick={onUnlock}
            disabled={!canAffordUnlock || is_loading}
            className={`
              w-full px-4 py-2 rounded font-medium transition-all
              ${canAffordUnlock
                ? `${categoryStyle.bg} ${categoryStyle.text} hover:opacity-80`
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'}
              ${is_loading ? 'opacity-50 cursor-wait' : ''}
            `}
          >
            {is_loading ? 'Unlocking...' : (
              canAffordUnlock
                ? `Unlock - ${spell.unlock_cost} pts`
                : `🔒 Need ${spell.unlock_cost} pts`
            )}
          </button>
        )}

        {spell.is_unlocked && !isMaxRank && (
          <button
            onClick={onRankUp}
            disabled={!canAffordRankUp || is_loading}
            className={`
              w-full px-4 py-2 rounded font-medium transition-all
              ${canAffordRankUp
                ? `${categoryStyle.bg} ${categoryStyle.text} hover:opacity-80`
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

        {spell.is_unlocked && onEquip && (
          <button
            onClick={onEquip}
            disabled={is_loading}
            className={`
              w-full px-4 py-2 rounded font-medium transition-all
              ${spell.is_equipped
                ? 'bg-blue-500/30 text-blue-400 hover:bg-blue-500/40'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}
              ${is_loading ? 'opacity-50 cursor-wait' : ''}
            `}
          >
            {spell.is_equipped ? '✓ Equipped' : 'Equip to Loadout'}
          </button>
        )}
      </div>

      {/* Flavor Text */}
      {spell.flavor_text && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <p className="text-xs text-gray-500 italic">
            "{spell.flavor_text}"
          </p>
        </div>
      )}

      {/* Usage Stats */}
      {spell.is_unlocked && spell.times_cast > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <span>📊</span>
            <span>Cast {spell.times_cast} time{spell.times_cast !== 1 ? 's' : ''}</span>
          </span>
          {spell.last_cast && (
            <span className="text-xs text-gray-500 block mt-1">
              Last: {new Date(spell.last_cast).toLocaleDateString()}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
