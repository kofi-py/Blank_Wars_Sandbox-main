'use client';

import React, { useState, useEffect } from 'react';
import { X, Swords, Move, Shield, Sparkles, Package } from 'lucide-react';
import { type BattleCharacter } from '@/data/battleFlow';
import { type Power } from '@/services/powerAPI';
import { type Spell } from '@/services/spellAPI';
import { HexPosition, HexBattleGrid, HexGridSystem } from '@/systems/hexGridSystem';
import { HexGrid } from './HexGrid';

export interface ActionStep {
  type: 'move' | 'attack' | 'power' | 'spell' | 'defend' | 'item';
  apCost: number;

  // Movement
  targetHex?: HexPosition;

  // Attack/Power/Spell
  targetId?: string; // Which character to target
  abilityId?: string; // power_id or spell_id
  abilityType?: 'power' | 'spell' | 'basic_attack' | 'power_attack';
  abilityName?: string; // Display name

  // Item
  itemId?: string;
  itemTarget?: string;
}

export interface PlannedAction {
  actionSequence: ActionStep[];
  planB: 'aggressive' | 'defensive' | 'supportive' | 'tactical';
}

interface CharacterActionPlannerProps {
  character: BattleCharacter;
  enemyCharacters: BattleCharacter[];
  allyCharacters: BattleCharacter[];
  currentHex: HexPosition;
  reachableHexes: HexPosition[];
  grid: HexBattleGrid;
  onClose: () => void;
  onSavePlan: (plan: PlannedAction) => void;
  existingPlan?: PlannedAction;
}

export const CharacterActionPlanner: React.FC<CharacterActionPlannerProps> = ({
  character,
  enemyCharacters,
  allyCharacters,
  currentHex,
  reachableHexes,
  grid,
  onClose,
  onSavePlan,
  existingPlan
}) => {
  const MAX_AP = 3;
  const [actionSequence, setActionSequence] = useState<ActionStep[]>(existingPlan?.actionSequence || []);
  const [planB, setPlanB] = useState<PlannedAction['planB']>(
    existingPlan?.planB || 'tactical'
  );
  const [currentStep, setCurrentStep] = useState<Partial<ActionStep>>({});
  const [selectedHex, setSelectedHex] = useState<HexPosition | null>(null);
  const [hoveredHex, setHoveredHex] = useState<HexPosition | null>(null);
  const [showHexGrid, setShowHexGrid] = useState(false);

  const usedAP = actionSequence.reduce((sum, step) => sum + step.apCost, 0);
  const remainingAP = MAX_AP - usedAP;

  // When "Move" is selected, show hex grid
  useEffect(() => {
    setShowHexGrid(currentStep.type === 'move');
  }, [currentStep.type]);

  // When hex is selected, update current step
  const handleHexClick = (hex: HexPosition) => {
    // Check if hex is reachable
    const isReachable = reachableHexes.some(h => HexGridSystem.equals(h, hex));
    if (!isReachable) return;

    setSelectedHex(hex);
    setCurrentStep({ ...currentStep, targetHex: hex });
  };

  const handleHexHover = (hex: HexPosition | null) => {
    setHoveredHex(hex);
  };

  const handleAddStep = () => {
    if (!currentStep.type) return;

    const step: ActionStep = {
      type: currentStep.type,
      apCost: currentStep.apCost || 1,
      targetHex: currentStep.targetHex,
      targetId: currentStep.targetId,
      abilityId: currentStep.abilityId,
      abilityType: currentStep.abilityType,
      abilityName: currentStep.abilityName,
      itemId: currentStep.itemId,
      itemTarget: currentStep.itemTarget
    };

    setActionSequence([...actionSequence, step]);
    setCurrentStep({});
    setSelectedHex(null);
  };

  const handleRemoveStep = (index: number) => {
    setActionSequence(actionSequence.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (actionSequence.length === 0) {
      alert('Please add at least one action to the plan');
      return;
    }

    const plan: PlannedAction = {
      actionSequence,
      planB
    };

    onSavePlan(plan);
  };

  const getActionDescription = (step: ActionStep): string => {
    switch (step.type) {
      case 'move':
        return `Move to (${step.targetHex?.q}, ${step.targetHex?.r})`;
      case 'attack':
        const target = enemyCharacters.find(e => e.character.id === step.targetId);
        if (step.abilityType === 'power_attack') {
          return `Power Attack ${target?.character.name || 'enemy'}`;
        }
        return `Attack ${target?.character.name || 'enemy'} with basic attack`;
      case 'power':
        const targetP = enemyCharacters.find(e => e.character.id === step.targetId);
        return `Use ${step.abilityName || 'power'} on ${targetP?.character.name || 'enemy'}`;
      case 'spell':
        const targetS = enemyCharacters.find(e => e.character.id === step.targetId);
        return `Cast ${step.abilityName || 'spell'} on ${targetS?.character.name || 'enemy'}`;
      case 'defend':
        return 'Defensive stance';
      case 'item':
        return `Use item`;
      default:
        return 'Unknown action';
    }
  };

  // Get available powers (not on cooldown)
  const availablePowers = character.unlockedPowers.filter(p => {
    const cooldown = character.powerCooldowns.get(p.id) || 0;
    return cooldown === 0;
  });

  // Get available spells (not on cooldown)
  const availableSpells = character.unlockedSpells.filter(s => {
    const cooldown = character.spellCooldowns.get(s.id) || 0;
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
              HP: {character.currentHealth} / Mana: {character.currentMana}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-purple-400">{remainingAP} AP</div>
            <div className="text-sm text-gray-400">Remaining</div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Current Action Sequence */}
        {actionSequence.length > 0 && (
          <div className="p-6 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Action Sequence:</h3>
            <div className="space-y-2">
              {actionSequence.map((step, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-800 p-3 rounded">
                  <div className="flex items-center gap-3">
                    <span className="text-purple-400 font-bold">Step {index + 1}</span>
                    <span className="text-white">{getActionDescription(step)}</span>
                    <span className="text-gray-400 text-sm">({step.apCost} AP)</span>
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
                onClick={() => setCurrentStep({ type: 'move', apCost: 1 })}
                disabled={remainingAP < 1}
                className={`p-4 rounded border-2 transition-all ${
                  currentStep.type === 'move'
                    ? 'border-purple-500 bg-purple-900 bg-opacity-30'
                    : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                } ${remainingAP < 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Move className="w-6 h-6 mx-auto mb-2 text-purple-400" />
                <div className="text-white font-medium">Move (1 AP)</div>
              </button>

              <button
                onClick={() => setCurrentStep({ type: 'attack', apCost: 2, abilityType: 'basic_attack' })}
                disabled={remainingAP < 2}
                className={`p-4 rounded border-2 transition-all ${
                  currentStep.type === 'attack'
                    ? 'border-purple-500 bg-purple-900 bg-opacity-30'
                    : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                } ${remainingAP < 2 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Swords className="w-6 h-6 mx-auto mb-2 text-red-400" />
                <div className="text-white font-medium">Attack (2 AP)</div>
              </button>

              <button
                onClick={() => setCurrentStep({ type: 'attack', apCost: 3, abilityType: 'power_attack' })}
                disabled={remainingAP < 3}
                className={`p-4 rounded border-2 transition-all ${
                  currentStep.type === 'attack' && currentStep.apCost === 3
                    ? 'border-purple-500 bg-purple-900 bg-opacity-30'
                    : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                } ${remainingAP < 3 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Swords className="w-6 h-6 mx-auto mb-2 text-orange-400" />
                <div className="text-white font-medium">Power Attack (3 AP)</div>
              </button>

              <button
                onClick={() => setCurrentStep({ type: 'defend', apCost: 1 })}
                disabled={remainingAP < 1}
                className={`p-4 rounded border-2 transition-all ${
                  currentStep.type === 'defend'
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
                    hexSize={30}
                    onHexClick={handleHexClick}
                    onHexHover={handleHexHover}
                    selectedHex={selectedHex}
                    hoveredHex={hoveredHex}
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
                        apCost: power.current_rank,
                        abilityId: power.id,
                        abilityType: 'power',
                        abilityName: power.name
                      })}
                      disabled={remainingAP < power.current_rank}
                      className={`p-3 rounded border-2 transition-all text-left ${
                        currentStep.abilityId === power.id
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
                        apCost: spell.current_rank || 1,
                        abilityId: spell.id,
                        abilityType: 'spell',
                        abilityName: spell.name
                      })}
                      disabled={remainingAP < (spell.current_rank || 1)}
                      className={`p-3 rounded border-2 transition-all text-left ${
                        currentStep.abilityId === spell.id
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
            {(currentStep.type === 'attack' || currentStep.type === 'power' || currentStep.type === 'spell') && (
              <div className="mb-4">
                <h4 className="text-md font-semibold text-white mb-2">Select Target:</h4>
                <div className="grid grid-cols-2 gap-2">
                  {enemyCharacters.filter(e => e.currentHealth > 0).map(enemy => (
                    <button
                      key={enemy.character.id}
                      onClick={() => setCurrentStep({ ...currentStep, targetId: enemy.character.id })}
                      className={`p-3 rounded border-2 transition-all text-left ${
                        currentStep.targetId === enemy.character.id
                          ? 'border-red-500 bg-red-900 bg-opacity-30'
                          : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                      }`}
                    >
                      <div className="text-white font-medium">{enemy.character.name}</div>
                      <div className="text-gray-400 text-sm">HP: {enemy.currentHealth}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Add Step Button */}
            <button
              onClick={handleAddStep}
              disabled={
                !currentStep.type ||
                (currentStep.type === 'move' && !currentStep.targetHex) ||
                (currentStep.type !== 'defend' && currentStep.type !== 'move' && !currentStep.targetId)
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
                  className={`p-3 rounded border-2 transition-all ${
                    planB === intent
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
            disabled={actionSequence.length === 0}
            className="px-6 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded transition-colors"
          >
            Save Plan
          </button>
        </div>
      </div>
    </div>
  );
};
