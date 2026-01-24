'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Swords, Move, Shield, Sparkles, Package, Clock, Brain, AlertTriangle, Heart, Users } from 'lucide-react';
import { type BattleCharacter } from '@/data/battleFlow';
import { type Power } from '@/services/powerAPI';
import { type Spell } from '@/services/spellAPI';
import { HexPosition, HexBattleGrid, HexGridSystem } from '@/systems/hexGridSystem';
import { HexGrid } from './HexGrid';

export interface ActionStep {
  type: 'move' | 'attack' | 'power' | 'spell' | 'defend' | 'item';
  ap_cost: number;

  // Movement
  target_hex?: HexPosition;

  // Attack/Power/Spell
  target_id?: string; // Which character to target
  ability_id?: string; // power_id or spell_id
  ability_type?: 'power' | 'spell' | 'basic_attack' | 'power_attack';
  ability_name?: string; // Display name

  // Item
  item_id?: string;
  item_target?: string;
}

export interface PlannedAction {
  action_sequence: ActionStep[];
  plan_b?: 'aggressive' | 'defensive' | 'supportive' | 'tactical';
}

interface CharacterActionPlannerProps {
  character: BattleCharacter;
  enemy_characters: BattleCharacter[];
  ally_characters: BattleCharacter[];
  current_hex: HexPosition;
  reachable_hexes: HexPosition[];
  grid: HexBattleGrid;
  onClose: () => void;
  onSavePlan: (plan: PlannedAction) => void;
  onTimeout?: () => void; // Called when timer expires
  existing_plan?: PlannedAction;
  time_limit?: number; // Timer duration in seconds (default: 60)
  timer_enabled?: boolean; // Whether to show/use the countdown timer (default: false for PvE)
  team_morale?: number; // Team morale (0-100) for adherence check
}

export const CharacterActionPlanner: React.FC<CharacterActionPlannerProps> = ({
  character,
  enemy_characters,
  ally_characters,
  current_hex,
  reachable_hexes,
  grid,
  onClose,
  onSavePlan,
  onTimeout,
  existing_plan,
  time_limit = 60,
  timer_enabled = false, // Disabled by default for PvE - enable for PvP later
  team_morale = 75
}) => {
  const MAX_AP = 3;
  const [action_sequence, setActionSequence] = useState<ActionStep[]>(existing_plan?.action_sequence || []);
  const [plan_b, setPlanB] = useState<PlannedAction['plan_b']>(
    existing_plan?.plan_b || 'tactical'
  );
  const [current_step, setCurrentStep] = useState<Partial<ActionStep>>({});
  const [selectedHex, setSelectedHex] = useState<HexPosition | null>(null);
  const [hoveredHex, setHoveredHex] = useState<HexPosition | null>(null);
  const [showHexGrid, setShowHexGrid] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(time_limit);

  const usedAP = (action_sequence || []).reduce((sum, step) => sum + step.ap_cost, 0);
  const remainingAP = MAX_AP - usedAP;

  // Use gameplan_adherence directly from DB - no frontend recalculation
  const adherenceCheck = useMemo(() => {
    const adherence_score = character.gameplan_adherence;
    const will_follow = adherence_score > 50;
    return { will_follow, adherence_score };
  }, [character]);

  // Helper functions for adherence display
  const getAdherenceColor = (score: number) => {
    if (score >= 75) return 'text-green-400';
    if (score >= 50) return 'text-yellow-400';
    if (score >= 25) return 'text-orange-400';
    return 'text-red-400';
  };

  const getAdherenceStatus = (score: number) => {
    if (score >= 75) return 'Very Likely';
    if (score >= 50) return 'Likely';
    if (score >= 25) return 'Unlikely';
    return 'Very Unlikely';
  };

  // Countdown timer - triggers autonomous action on expiry (only when enabled)
  useEffect(() => {
    if (!timer_enabled) return; // Timer disabled for PvE

    if (timeRemaining <= 0) {
      // Timer expired - trigger autonomous action
      if (onTimeout) {
        onTimeout();
      } else {
        // Fallback: close modal (autonomous action will be triggered by parent)
        onClose();
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timer_enabled, timeRemaining, onTimeout, onClose]);

  // When "Move" is selected, show hex grid
  useEffect(() => {
    setShowHexGrid(current_step.type === 'move');
  }, [current_step.type]);

  // When hex is selected, update current step
  const handleHexClick = (hex: HexPosition) => {
    // Check if hex is reachable
    const isReachable = reachable_hexes.some(h => HexGridSystem.equals(h, hex));
    if (!isReachable) return;

    setSelectedHex(hex);
    setCurrentStep({ ...current_step, target_hex: hex });
  };

  const handleHexHover = (hex: HexPosition | null) => {
    setHoveredHex(hex);
  };

  const handleAddStep = () => {
    if (!current_step.type) return;

    const step: ActionStep = {
      type: current_step.type,
      ap_cost: current_step.ap_cost || 1,
      target_hex: current_step.target_hex,
      target_id: current_step.target_id,
      ability_id: current_step.ability_id,
      ability_type: current_step.ability_type,
      ability_name: current_step.ability_name,
      item_id: current_step.item_id,
      item_target: current_step.item_target
    };

    setActionSequence([...action_sequence, step]);
    setCurrentStep({});
    setSelectedHex(null);
  };

  const handleRemoveStep = (index: number) => {
    setActionSequence(action_sequence.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (action_sequence.length === 0) {
      alert('Please add at least one action to the plan');
      return;
    }

    const plan: PlannedAction = {
      action_sequence,
      plan_b
    };

    onSavePlan(plan);
  };

  const getActionDescription = (step: ActionStep): string => {
    switch (step.type) {
      case 'move':
        return `Move to (${step.target_hex?.q}, ${step.target_hex?.r})`;
      case 'attack':
        const target = enemy_characters.find(e => e.character.id === step.target_id);
        if (step.ability_type === 'power_attack') {
          return `Power Attack ${target?.character.name || 'enemy'}`;
        }
        return `Attack ${target?.character.name || 'enemy'} with basic attack`;
      case 'power':
        const targetP = enemy_characters.find(e => e.character.id === step.target_id);
        return `Use ${step.ability_name || 'power'} on ${targetP?.character.name || 'enemy'}`;
      case 'spell':
        const targetS = enemy_characters.find(e => e.character.id === step.target_id);
        return `Cast ${step.ability_name || 'spell'} on ${targetS?.character.name || 'enemy'}`;
      case 'defend':
        return 'Defensive stance';
      case 'item':
        return `Use item`;
      default:
        return 'Unknown action';
    }
  };

  // Get available powers (not on cooldown)
  const availablePowers = character.unlocked_powers.filter(p => {
    const cooldown = character.power_cooldowns.get(p.id) || 0;
    return cooldown === 0;
  });

  // Get available spells (not on cooldown)
  const availableSpells = character.unlocked_spells.filter(s => {
    const cooldown = character.spell_cooldowns.get(s.id) || 0;
    return cooldown === 0;
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border-2 border-purple-500">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-white">Plan Turn - {character.character.name}</h2>
            <p className="text-gray-400">
              HP: {character.current_health} / Mana: {character.current_mana}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Timer Display - only shown when timer_enabled */}
            {timer_enabled && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 ${timeRemaining <= 10 ? 'border-red-500 bg-red-900/30' :
                timeRemaining <= 20 ? 'border-yellow-500 bg-yellow-900/20' :
                  'border-blue-500 bg-blue-900/20'
                }`}>
                <Clock className={`w-5 h-5 ${timeRemaining <= 10 ? 'text-red-400 animate-pulse' : 'text-blue-400'
                  }`} />
                <span className={`text-2xl font-bold ${timeRemaining <= 10 ? 'text-red-400 animate-pulse' :
                  timeRemaining <= 20 ? 'text-yellow-400' :
                    'text-white'
                  }`}>
                  {timeRemaining}s
                </span>
              </div>
            )}
            {/* AP Display */}
            <div className="text-right">
              <div className="text-3xl font-bold text-purple-400">{remainingAP} AP</div>
              <div className="text-sm text-gray-400">Remaining</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Psychology/Adherence Panel */}
        <div className="p-4 border-b border-gray-700 bg-gray-800/50">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Mental State & Adherence</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Adherence Score */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-400">Will Follow Plan:</span>
                <span className={`text-sm font-bold ${getAdherenceColor(adherenceCheck.adherence_score)}`}>
                  {getAdherenceStatus(adherenceCheck.adherence_score)} ({Math.round(adherenceCheck.adherence_score)}%)
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${adherenceCheck.adherence_score >= 75 ? 'bg-green-500' :
                    adherenceCheck.adherence_score >= 50 ? 'bg-yellow-500' :
                      adherenceCheck.adherence_score >= 25 ? 'bg-orange-500' :
                        'bg-red-500'
                    }`}
                  style={{ width: `${adherenceCheck.adherence_score}%` }}
                />
              </div>

              {/* Warning if low adherence */}
              {!adherenceCheck.will_follow && (
                <div className="mt-2 bg-red-500/20 border border-red-500 rounded p-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <div className="text-xs text-red-300">Low adherence - may not follow orders</div>
                  </div>
                </div>
              )}
            </div>

            {/* Psychology Factors */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 flex items-center gap-1">
                  <Brain className="w-3 h-3" /> Adherence:
                </span>
                <span className="text-white">{character.gameplan_adherence}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 flex items-center gap-1">
                  <Heart className="w-3 h-3" /> Mental Health:
                </span>
                <span className={character.mental_state.current_mental_health < 30 ? 'text-red-400' : 'text-white'}>
                  {character.mental_state.current_mental_health}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 flex items-center gap-1">
                  <Users className="w-3 h-3" /> Team Trust:
                </span>
                <span className="text-white">{character.mental_state.team_trust}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Stress:</span>
                <span className={character.psych_stats.stress_level > 70 ? 'text-red-400' : 'text-white'}>
                  {character.psych_stats.stress_level}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Team Morale:</span>
                <span className={team_morale < 30 ? 'text-red-400' : 'text-white'}>
                  {team_morale}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Current Action Sequence */}
        {action_sequence.length > 0 && (
          <div className="p-6 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Action Sequence:</h3>
            <div className="space-y-2">
              {action_sequence.map((step, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-800 p-3 rounded">
                  <div className="flex items-center gap-3">
                    <span className="text-purple-400 font-bold">Step {index + 1}</span>
                    <span className="text-white">{getActionDescription(step)}</span>
                    <span className="text-gray-400 text-sm">({step.ap_cost} AP)</span>
                  </div>
                  <button
                    onClick={() => handleRemoveStep(index)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Builder */}
        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Add Action:</h3>

            {/* Action Type Selector */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              <button
                onClick={() => setCurrentStep({ type: 'move', ap_cost: 1 })}
                disabled={remainingAP < 1}
                className={`p-4 rounded border-2 transition-all ${current_step.type === 'move'
                  ? 'border-purple-500 bg-purple-900 bg-opacity-30'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                  } ${remainingAP < 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Move className="w-6 h-6 mx-auto mb-2 text-purple-400" />
                <div className="text-white font-medium">Move (1 AP)</div>
              </button>

              <button
                onClick={() => setCurrentStep({ type: 'attack', ap_cost: 2, ability_type: 'basic_attack' })}
                disabled={remainingAP < 2}
                className={`p-4 rounded border-2 transition-all ${current_step.type === 'attack'
                  ? 'border-purple-500 bg-purple-900 bg-opacity-30'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                  } ${remainingAP < 2 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Swords className="w-6 h-6 mx-auto mb-2 text-red-400" />
                <div className="text-white font-medium">Attack (2 AP)</div>
              </button>

              <button
                onClick={() => setCurrentStep({ type: 'attack', ap_cost: 3, ability_type: 'power_attack' })}
                disabled={remainingAP < 3}
                className={`p-4 rounded border-2 transition-all ${current_step.type === 'attack' && current_step.ap_cost === 3
                  ? 'border-purple-500 bg-purple-900 bg-opacity-30'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                  } ${remainingAP < 3 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Swords className="w-6 h-6 mx-auto mb-2 text-orange-400" />
                <div className="text-white font-medium">Power Attack (3 AP)</div>
              </button>

              <button
                onClick={() => setCurrentStep({ type: 'defend', ap_cost: 1 })}
                disabled={remainingAP < 1}
                className={`p-4 rounded border-2 transition-all ${current_step.type === 'defend'
                  ? 'border-purple-500 bg-purple-900 bg-opacity-30'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                  } ${remainingAP < 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Shield className="w-6 h-6 mx-auto mb-2 text-blue-400" />
                <div className="text-white font-medium">Defend (1 AP)</div>
              </button>
            </div>

            {/* Hex Grid for Movement */}
            {showHexGrid && (
              <div className="mb-4 p-4 bg-gray-800 rounded border-2 border-purple-500">
                <h4 className="text-md font-semibold text-white mb-2">Select Movement Destination:</h4>
                <div className="flex justify-center">
                  <HexGrid
                    grid={grid}
                    hex_size={30}
                    onHexClick={handleHexClick}
                    onHexHover={handleHexHover}
                    selected_hex={selectedHex}
                    hovered_hex={hoveredHex}
                  />
                </div>
                {selectedHex && (
                  <div className="mt-2 text-center text-green-400">
                    Selected: ({selectedHex.q}, {selectedHex.r})
                  </div>
                )}
              </div>
            )}

            {/* Powers */}
            {availablePowers.length > 0 && (
              <div className="mb-4">
                <h4 className="text-md font-semibold text-white mb-2">Powers:</h4>
                <div className="grid grid-cols-2 gap-2">
                  {availablePowers.map(power => (
                    <button
                      key={power.id}
                      onClick={() => setCurrentStep({
                        type: 'power',
                        ap_cost: power.current_rank,
                        ability_id: power.id,
                        ability_type: 'power',
                        ability_name: power.name
                      })}
                      disabled={remainingAP < power.current_rank}
                      className={`p-3 rounded border-2 transition-all text-left ${current_step.ability_id === power.id
                        ? 'border-purple-500 bg-purple-900 bg-opacity-30'
                        : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                        } ${remainingAP < power.current_rank ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="text-white font-medium">{power.name}</div>
                      <div className="text-gray-400 text-sm">Rank {power.current_rank} ({power.current_rank} AP)</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Spells */}
            {availableSpells.length > 0 && (
              <div className="mb-4">
                <h4 className="text-md font-semibold text-white mb-2">Spells:</h4>
                <div className="grid grid-cols-2 gap-2">
                  {availableSpells.map(spell => (
                    <button
                      key={spell.id}
                      onClick={() => setCurrentStep({
                        type: 'spell',
                        ap_cost: spell.current_rank || 1,
                        ability_id: spell.id,
                        ability_type: 'spell',
                        ability_name: spell.name
                      })}
                      disabled={remainingAP < (spell.current_rank || 1)}
                      className={`p-3 rounded border-2 transition-all text-left ${current_step.ability_id === spell.id
                        ? 'border-purple-500 bg-purple-900 bg-opacity-30'
                        : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                        } ${remainingAP < (spell.current_rank || 1) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="text-white font-medium">{spell.name}</div>
                      <div className="text-gray-400 text-sm">
                        Rank {spell.current_rank || 1} ({spell.current_rank || 1} AP)
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Target Selector (for attacks, powers, spells) */}
            {(current_step.type === 'attack' || current_step.type === 'power' || current_step.type === 'spell') && (
              <div className="mb-4">
                <h4 className="text-md font-semibold text-white mb-2">Select Target:</h4>
                <div className="grid grid-cols-2 gap-2">
                  {enemy_characters.filter(e => e.current_health > 0).map(enemy => (
                    <button
                      key={enemy.character.id}
                      onClick={() => setCurrentStep({ ...current_step, target_id: enemy.character.id })}
                      className={`p-3 rounded border-2 transition-all text-left ${current_step.target_id === enemy.character.id
                        ? 'border-red-500 bg-red-900 bg-opacity-30'
                        : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                        }`}
                    >
                      <div className="text-white font-medium">{enemy.character.name}</div>
                      <div className="text-gray-400 text-sm">HP: {enemy.current_health}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Add Step Button */}
            <button
              onClick={handleAddStep}
              disabled={
                !current_step.type ||
                (current_step.type === 'move' && !current_step.target_hex) ||
                (current_step.type !== 'defend' && current_step.type !== 'move' && !current_step.target_id)
              }
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded transition-colors"
            >
              Add Action to Sequence
            </button>
          </div>

          {/* Plan B */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Plan B (if primary action unavailable):</h3>
            <p className="text-gray-400 text-sm mb-3">
              If your planned action can't be executed, what should the character prioritize?
            </p>
            <div className="grid grid-cols-4 gap-2">
              {(['aggressive', 'defensive', 'supportive', 'tactical'] as const).map(intent => (
                <button
                  key={intent}
                  onClick={() => setPlanB(intent)}
                  className={`p-3 rounded border-2 transition-all ${plan_b === intent
                    ? 'border-purple-500 bg-purple-900 bg-opacity-30'
                    : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                    }`}
                >
                  <div className="text-white font-medium capitalize">{intent}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 flex justify-between">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={action_sequence.length === 0}
            className="px-6 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded transition-colors"
          >
            Execute Turn
          </button>
        </div>
      </div>
    </div>
  );
};
