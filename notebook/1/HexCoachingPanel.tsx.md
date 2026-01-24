// HexCoachingPanel - Spatial tactical planning interface for hex grid battles
// Coach clicks character → selects target hex → chooses action

import React, { useState, useCallback } from 'react';
import { HexGrid } from './HexGrid';
import { HexGridSystem, HexPosition, HexBattleGrid } from '@/systems/hexGridSystem';
import { HexMovementEngine } from '@/systems/hexMovementEngine';
import { HexLineOfSight } from '@/systems/hexLineOfSight';
import { TeamCharacter } from '@/data/teamBattleSystem';

interface HexCoachingPanelProps {
  isOpen: boolean;
  playerTeam: TeamCharacter[];
  opponentTeam: TeamCharacter[];
  grid: HexBattleGrid;
  onPlanSubmit: (plans: CoachPlan[]) => void;
  onClose: () => void;
  coachingPoints: number;
}

export interface CoachPlan {
  characterId: string;
  moveToHex?: HexPosition;
  attackTargetId?: string;
  action: 'move' | 'attack' | 'move_and_attack' | 'defend';
  reasoning: string;
}

export const HexCoachingPanel: React.FC<HexCoachingPanelProps> = ({
  isOpen,
  playerTeam,
  opponentTeam,
  grid,
  onPlanSubmit,
  onClose,
  coachingPoints
}) => {
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [planningMode, setPlanningMode] = useState<'move' | 'attack' | null>(null);
  const [characterPlans, setCharacterPlans] = useState<Map<string, CoachPlan>>(new Map());
  const [hoveredHex, setHoveredHex] = useState<HexPosition | null>(null);

  const selectedCharacter = selectedCharacterId
    ? playerTeam.find(c => c.id === selectedCharacterId)
    : null;

  const selectedCharacterPos = selectedCharacterId
    ? grid.characterPositions.get(selectedCharacterId)
    : null;

  // Calculate reachable hexes for selected character
  const reachableHexes = selectedCharacterPos && planningMode === 'move'
    ? HexMovementEngine.getReachableHexes(
        selectedCharacterId!,
        selectedCharacterPos,
        3, // Base 3 AP
        grid
      )
    : [];

  // Calculate attackable enemies
  const attackableEnemies = selectedCharacterPos && planningMode === 'attack'
    ? HexLineOfSight.getVisibleCharacters(
        selectedCharacterPos,
        5, // Attack range
        grid,
        [selectedCharacterId!]
      ).filter(visible => opponentTeam.some(e => e.id === visible.characterId))
    : [];

  // Handle hex click for movement planning
  const handleHexClick = useCallback((hexPos: HexPosition) => {
    if (!selectedCharacterId || !selectedCharacter || !selectedCharacterPos) return;

    if (planningMode === 'move') {
      const isReachable = reachableHexes.some(hex => HexGridSystem.equals(hex, hexPos));

      if (isReachable) {
        const currentPlan = characterPlans.get(selectedCharacterId) || {
          characterId: selectedCharacterId,
          action: 'move' as const,
          reasoning: ''
        };

        setCharacterPlans(new Map(characterPlans.set(selectedCharacterId, {
          ...currentPlan,
          moveToHex: hexPos,
          action: currentPlan.attackTargetId ? 'move_and_attack' : 'move',
          reasoning: `Move to position (${hexPos.q}, ${hexPos.r})`
        })));

        setPlanningMode(null);
      }
    }
  }, [selectedCharacterId, selectedCharacter, selectedCharacterPos, planningMode, reachableHexes, characterPlans]);

  // Handle character click for attack planning
  const handleEnemySelect = useCallback((enemyId: string) => {
    if (!selectedCharacterId || !selectedCharacter || planningMode !== 'attack') return;

    const canAttack = attackableEnemies.some(e => e.characterId === enemyId);

    if (canAttack) {
      const enemy = opponentTeam.find(e => e.id === enemyId);
      const currentPlan = characterPlans.get(selectedCharacterId) || {
        characterId: selectedCharacterId,
        action: 'attack' as const,
        reasoning: ''
      };

      setCharacterPlans(new Map(characterPlans.set(selectedCharacterId, {
        ...currentPlan,
        attackTargetId: enemyId,
        action: currentPlan.moveToHex ? 'move_and_attack' : 'attack',
        reasoning: `Attack ${enemy?.name || 'enemy'}`
      })));

      setPlanningMode(null);
    }
  }, [selectedCharacterId, selectedCharacter, planningMode, attackableEnemies, opponentTeam, characterPlans]);

  // Submit all plans
  const handleSubmit = useCallback(() => {
    const plans = Array.from(characterPlans.values());
    onPlanSubmit(plans);
    setCharacterPlans(new Map());
    setSelectedCharacterId(null);
    setPlanningMode(null);
  }, [characterPlans, onPlanSubmit]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl border border-gray-700 p-6 max-w-7xl w-full h-[90vh] flex gap-6">

        {/* Left Panel: Hex Grid */}
        <div className="flex-1 relative bg-gray-800 rounded-lg p-4">
          <h2 className="text-2xl font-bold text-white mb-4">
            📋 Tactical Planning Phase
          </h2>

          <div className="relative">
            <HexGrid
              grid={grid}
              hexSize={25}
              onHexClick={handleHexClick}
              onHexHover={setHoveredHex}
              selectedHex={hoveredHex}
              hoveredHex={hoveredHex}
            />

            {/* Show reachable hexes overlay */}
            {reachableHexes.length > 0 && (
              <div className="absolute top-2 right-2 bg-green-600 text-white px-3 py-1 rounded">
                {reachableHexes.length} hexes in range
              </div>
            )}

            {/* Show attackable enemies overlay */}
            {attackableEnemies.length > 0 && (
              <div className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1 rounded">
                {attackableEnemies.length} enemies in range
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-4 bg-blue-900/30 border border-blue-500/50 rounded p-3 text-sm text-blue-200">
            {!selectedCharacterId && (
              <>📌 Select a character from your team to start planning</>
            )}
            {selectedCharacterId && !planningMode && (
              <>🎯 Choose Move or Attack for {selectedCharacter?.name}</>
            )}
            {planningMode === 'move' && (
              <>👣 Click a green hex to plan movement</>
            )}
            {planningMode === 'attack' && (
              <>⚔️ Click an enemy character to plan attack</>
            )}
          </div>
        </div>

        {/* Right Panel: Team Planning */}
        <div className="w-96 flex flex-col gap-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-bold text-white mb-3">Your Team</h3>

            <div className="space-y-2">
              {playerTeam.map(char => {
                const plan = characterPlans.get(char.id);
                const isSelected = selectedCharacterId === char.id;

                return (
                  <div
                    key={char.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-600/30 border-blue-400'
                        : plan
                        ? 'bg-green-600/20 border-green-500'
                        : 'bg-gray-700/50 border-gray-600 hover:border-gray-500'
                    }`}
                    onClick={() => {
                      setSelectedCharacterId(char.id);
                      setPlanningMode(null);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-white">{char.name}</div>
                        <div className="text-xs text-gray-400">
                          HP: {char.currentHp}/{char.maxHp}
                        </div>
                      </div>
                      {plan && (
                        <div className="text-green-400 text-xs">
                          ✓ Planned
                        </div>
                      )}
                    </div>

                    {plan && (
                      <div className="mt-2 text-xs text-gray-300">
                        {plan.reasoning}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          {selectedCharacterId && (
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-bold text-white mb-3">Plan Actions</h3>

              <div className="space-y-2">
                <button
                  onClick={() => setPlanningMode('move')}
                  className={`w-full py-2 px-4 rounded-lg font-semibold transition-all ${
                    planningMode === 'move'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-white hover:bg-gray-600'
                  }`}
                >
                  👣 Plan Movement
                </button>

                <button
                  onClick={() => setPlanningMode('attack')}
                  className={`w-full py-2 px-4 rounded-lg font-semibold transition-all ${
                    planningMode === 'attack'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-700 text-white hover:bg-gray-600'
                  }`}
                >
                  ⚔️ Plan Attack
                </button>

                <button
                  onClick={() => {
                    const newPlans = new Map(characterPlans);
                    newPlans.set(selectedCharacterId, {
                      characterId: selectedCharacterId,
                      action: 'defend',
                      reasoning: 'Defensive stance'
                    });
                    setCharacterPlans(newPlans);
                    setPlanningMode(null);
                  }}
                  className="w-full py-2 px-4 rounded-lg font-semibold bg-gray-700 text-white hover:bg-gray-600 transition-all"
                >
                  🛡️ Defend
                </button>
              </div>
            </div>
          )}

          {/* Coaching Points */}
          <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400">{coachingPoints}</div>
              <div className="text-sm text-gray-400">Coaching Points</div>
            </div>
          </div>

          {/* Submit/Cancel */}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-all"
            >
              Cancel
            </button>

            <button
              onClick={handleSubmit}
              disabled={characterPlans.size === 0}
              className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                characterPlans.size > 0
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              Submit Plans ({characterPlans.size}/3)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
