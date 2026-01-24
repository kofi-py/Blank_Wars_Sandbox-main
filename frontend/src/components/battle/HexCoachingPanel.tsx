// HexCoachingPanel - Spatial tactical planning interface for hex grid battles
// Coach clicks character → selects target hex → chooses action

import React, { useState, useCallback } from 'react';
import { HexGrid } from './HexGrid';
import { HexGridSystem, HexPosition, HexBattleGrid } from '@/systems/hexGridSystem';
import { HexMovementEngine } from '@/systems/hexMovementEngine';
import { HexLineOfSight } from '@/systems/hexLineOfSight';
import { TeamCharacter } from '@/data/teamBattleSystem';

interface HexCoachingPanelProps {
  is_open: boolean;
  player_team: TeamCharacter[];
  opponent_team: TeamCharacter[];
  grid: HexBattleGrid;
  onPlanSubmit: (plans: CoachPlan[]) => void;
  onClose: () => void;
  coaching_points: number;
}

export interface CoachPlan {
  character_id: string;
  move_to_hex?: HexPosition;
  attack_target_id?: string;
  action: 'move' | 'attack' | 'move_and_attack' | 'defend';
  reasoning: string;
}

export const HexCoachingPanel: React.FC<HexCoachingPanelProps> = ({
  is_open,
  player_team,
  opponent_team,
  grid,
  onPlanSubmit,
  onClose,
  coaching_points
}) => {
  const [selected_characterId, setSelectedCharacterId] = useState<string | null>(null);
  const [planningMode, setPlanningMode] = useState<'move' | 'attack' | null>(null);
  const [characterPlans, setCharacterPlans] = useState<Map<string, CoachPlan>>(new Map());
  const [hoveredHex, setHoveredHex] = useState<HexPosition | null>(null);

  const selected_character = selected_characterId
    ? player_team.find(c => c.id === selected_characterId)
    : null;

  const selected_characterPos = selected_characterId
    ? grid.character_positions.get(selected_characterId)
    : null;

  // Calculate reachable hexes for selected character
  const reachableHexes = selected_characterPos && planningMode === 'move'
    ? HexMovementEngine.getReachableHexes(
        selected_characterId!,
        selected_characterPos,
        3, // Base 3 AP
        grid
      )
    : [];

  // Calculate attackable enemies
  const attackableEnemies = selected_characterPos && planningMode === 'attack'
    ? HexLineOfSight.getVisibleCharacters(
        selected_characterPos,
        5, // Attack range
        grid,
        [selected_characterId!]
      ).filter(visible => opponent_team.some(e => e.id === visible.character_id))
    : [];

  // Handle hex click for movement planning
  const handleHexClick = useCallback((hexPos: HexPosition) => {
    if (!selected_characterId || !selected_character || !selected_characterPos) return;

    if (planningMode === 'move') {
      const isReachable = reachableHexes.some(hex => HexGridSystem.equals(hex, hexPos));

      if (isReachable) {
        const currentPlan = characterPlans.get(selected_characterId) || {
          character_id: selected_characterId,
          action: 'move' as const,
          reasoning: ''
        };

        setCharacterPlans(new Map(characterPlans.set(selected_characterId, {
          ...currentPlan,
          move_to_hex: hexPos,
          action: currentPlan.attack_target_id ? 'move_and_attack' : 'move',
          reasoning: `Move to position (${hexPos.q}, ${hexPos.r})`
        })));

        setPlanningMode(null);
      }
    }
  }, [selected_characterId, selected_character, selected_characterPos, planningMode, reachableHexes, characterPlans]);

  // Handle character click for attack planning
  const handleEnemySelect = useCallback((enemyId: string) => {
    if (!selected_characterId || !selected_character || planningMode !== 'attack') return;

    const canAttack = attackableEnemies.some(e => e.character_id === enemyId);

    if (canAttack) {
      const enemy = opponent_team.find(e => e.id === enemyId);
      const currentPlan = characterPlans.get(selected_characterId) || {
        character_id: selected_characterId,
        action: 'attack' as const,
        reasoning: ''
      };

      setCharacterPlans(new Map(characterPlans.set(selected_characterId, {
        ...currentPlan,
        attack_target_id: enemyId,
        action: currentPlan.move_to_hex ? 'move_and_attack' : 'attack',
        reasoning: `Attack ${enemy?.name || 'enemy'}`
      })));

      setPlanningMode(null);
    }
  }, [selected_characterId, selected_character, planningMode, attackableEnemies, opponent_team, characterPlans]);

  // Submit all plans
  const handleSubmit = useCallback(() => {
    const plans = Array.from(characterPlans.values());
    onPlanSubmit(plans);
    setCharacterPlans(new Map());
    setSelectedCharacterId(null);
    setPlanningMode(null);
  }, [characterPlans, onPlanSubmit]);

  if (!is_open) return null;

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
              hex_size={25}
              onHexClick={handleHexClick}
              onHexHover={setHoveredHex}
              selected_hex={hoveredHex}
              hovered_hex={hoveredHex}
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
            {!selected_characterId && (
              <>📌 Select a character from your team to start planning</>
            )}
            {selected_characterId && !planningMode && (
              <>🎯 Choose Move or Attack for {selected_character?.name}</>
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
              {player_team.map(char => {
                const plan = characterPlans.get(char.id);
                const isSelected = selected_characterId === char.id;

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
                          HP: {char.current_health}/{char.max_health}
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
          {selected_characterId && (
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
                    newPlans.set(selected_characterId, {
                      character_id: selected_characterId,
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
              <div className="text-3xl font-bold text-blue-400">{coaching_points}</div>
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
