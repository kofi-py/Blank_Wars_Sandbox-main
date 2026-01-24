/**
 * Powers & Spells Panel
 * Displays equipped powers and spells with cooldown tracking and AP cost indicators
 */

import React, { useState } from 'react';
import { PowerDefinition, SpellDefinition, PowerSpellEffect } from '../../data/magic';

interface PowersSpellsPanelProps {
  equipped_powers: PowerDefinition[];
  equipped_spells: SpellDefinition[];
  power_cooldowns: Record<string, number>;
  spell_cooldowns: Record<string, number>;
  current_ap: number;
  max_ap: number;
  current_mana?: number;
  max_mana?: number;
  onUsePower: (powerId: string) => void;
  onCastSpell: (spellId: string) => void;
  disabled?: boolean;
}

export const PowersSpellsPanel: React.FC<PowersSpellsPanelProps> = ({
  equipped_powers,
  equipped_spells,
  power_cooldowns,
  spell_cooldowns,
  current_ap,
  max_ap,
  current_mana = 100,
  max_mana = 100,
  onUsePower,
  onCastSpell,
  disabled = false
}) => {
  const [activeTab, setActiveTab] = useState<'powers' | 'spells'>('powers');

  // Calculate AP cost based on rank
  const getAPCost = (rank: number) => rank;

  // Check if a power can be used
  const canUsePower = (power: PowerDefinition): { can: boolean; reason?: string } => {
    const cooldown = power_cooldowns[power.id] || 0;
    if (cooldown > 0) {
      return { can: false, reason: `Cooldown: ${cooldown} turns` };
    }

    const ap_cost = getAPCost(power.current_rank);
    if (current_ap < ap_cost) {
      return { can: false, reason: `Need ${ap_cost} AP` };
    }

    if (power.power_type === 'passive') {
      return { can: false, reason: 'Passive' };
    }

    return { can: true };
  };

  // Check if a spell can be cast
  const canCastSpell = (spell: SpellDefinition): { can: boolean; reason?: string } => {
    const cooldown = spell_cooldowns[spell.id] || 0;
    if (cooldown > 0) {
      return { can: false, reason: `Cooldown: ${cooldown} turns` };
    }

    const ap_cost = getAPCost(spell.current_rank);
    if (current_ap < ap_cost) {
      return { can: false, reason: `Need ${ap_cost} AP` };
    }

    if (current_mana < spell.mana_cost) {
      return { can: false, reason: `Need ${spell.mana_cost} mana` };
    }

    return { can: true };
  };

  // Get tier color
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'skill':
      case 'universal':
        return 'text-gray-300';
      case 'ability':
      case 'archetype':
        return 'text-blue-400';
      case 'species':
        return 'text-purple-400';
      case 'signature':
        return 'text-yellow-400';
      default:
        return 'text-gray-300';
    }
  };

  // Get rank indicator
  const renderRankIndicator = (current_rank: number, max_rank: number) => {
    return (
      <div className="flex gap-0.5">
        {[...Array(max_rank)].map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full ${i < current_rank ? 'bg-yellow-400' : 'bg-gray-600'
              }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 mb-4">
      {/* Header with Tabs */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-white">Powers & Spells</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('powers')}
            className={`px-3 py-1 rounded text-sm font-semibold ${activeTab === 'powers'
                ? 'bg-red-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
          >
            Powers ({equipped_powers.length})
          </button>
          <button
            onClick={() => setActiveTab('spells')}
            className={`px-3 py-1 rounded text-sm font-semibold ${activeTab === 'spells'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
          >
            Spells ({equipped_spells.length})
          </button>
        </div>
      </div>

      {/* Mana Bar (for spells) */}
      {activeTab === 'spells' && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Mana</span>
            <span>{current_mana} / {max_mana}</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${(current_mana / max_mana) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Powers List */}
      {activeTab === 'powers' && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {equipped_powers.length === 0 ? (
            <div className="text-gray-400 text-sm text-center py-4">
              No powers equipped
            </div>
          ) : (
            equipped_powers.map(power => {
              const availability = canUsePower(power);
              const ap_cost = getAPCost(power.current_rank);
              const isPassive = power.power_type === 'passive';

              return (
                <button
                  key={power.id}
                  onClick={() => !disabled && availability.can && onUsePower(power.id)}
                  disabled={disabled || !availability.can || isPassive}
                  className={`w-full p-3 rounded-lg text-left transition-all ${isPassive
                      ? 'bg-gray-900 border border-gray-700 cursor-default'
                      : availability.can && !disabled
                        ? 'bg-gray-700 hover:bg-gray-600 border border-gray-600 cursor-pointer'
                        : 'bg-gray-900 border border-gray-700 cursor-not-allowed opacity-60'
                    }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{power.icon || '⚡'}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${getTierColor(power.tier)}`}>
                            {power.name}
                          </span>
                          {renderRankIndicator(power.current_rank, power.max_rank)}
                        </div>
                        <div className="text-xs text-gray-400">{power.tier}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className={`px-2 py-0.5 rounded text-xs font-bold ${current_ap >= ap_cost ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                        }`}>
                        {ap_cost} AP
                      </div>
                      {!availability.can && availability.reason && (
                        <div className="text-xs text-yellow-400">
                          {availability.reason}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-300 line-clamp-2">
                    {power.description}
                  </div>
                  {power.power_type === 'passive' && (
                    <div className="text-xs text-blue-400 mt-1">Always Active</div>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}

      {/* Spells List */}
      {activeTab === 'spells' && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {equipped_spells.length === 0 ? (
            <div className="text-gray-400 text-sm text-center py-4">
              No spells equipped
            </div>
          ) : (
            equipped_spells.map(spell => {
              const availability = canCastSpell(spell);
              const ap_cost = getAPCost(spell.current_rank);

              return (
                <button
                  key={spell.id}
                  onClick={() => !disabled && availability.can && onCastSpell(spell.id)}
                  disabled={disabled || !availability.can}
                  className={`w-full p-3 rounded-lg text-left transition-all ${availability.can && !disabled
                      ? 'bg-gray-700 hover:bg-gray-600 border border-gray-600 cursor-pointer'
                      : 'bg-gray-900 border border-gray-700 cursor-not-allowed opacity-60'
                    }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{spell.icon || '✨'}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${getTierColor(spell.tier)}`}>
                            {spell.name}
                          </span>
                          {renderRankIndicator(spell.current_rank, spell.max_rank)}
                        </div>
                        <div className="text-xs text-gray-400">{spell.tier}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex gap-1">
                        <div className={`px-2 py-0.5 rounded text-xs font-bold ${current_ap >= ap_cost ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                          }`}>
                          {ap_cost} AP
                        </div>
                        <div className={`px-2 py-0.5 rounded text-xs font-bold ${current_mana >= spell.mana_cost ? 'bg-blue-900 text-blue-300' : 'bg-red-900 text-red-300'
                          }`}>
                          {spell.mana_cost} MP
                        </div>
                      </div>
                      {!availability.can && availability.reason && (
                        <div className="text-xs text-yellow-400">
                          {availability.reason}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-300 line-clamp-2">
                    {spell.description}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}

      {/* Empty State */}
      {equipped_powers.length === 0 && equipped_spells.length === 0 && (
        <div className="text-center text-gray-400 py-8">
          <div className="text-4xl mb-2">⚔️</div>
          <div className="text-sm">No powers or spells equipped</div>
          <div className="text-xs text-gray-500 mt-1">
            Equip powers and spells before battle
          </div>
        </div>
      )}
    </div>
  );
};
