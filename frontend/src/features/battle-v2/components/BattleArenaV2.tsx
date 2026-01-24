/**
 * Battle Arena V2
 *
 * Thin orchestrator component (< 300 lines).
 * Uses useBattleState hook for all state management.
 * Renders phase-specific UI.
 *
 * Per BATTLE_SYSTEM_BLUEPRINT.md:
 * - Turn order by initiative, all 6 characters mixed
 * - Coaching window with timer
 * - Adherence check visible
 * - Pass = deterministic (no AI), Fail = rebellion flow with judge
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useBattleState } from '../hooks/useBattleState';
import {
  type BattleCharacterState,
  type HexBattleGrid,
  type CoachOrders,
  getCurrentCharacterId,
} from '../state/battleTypes';
import { HexGrid } from '@/components/battle/HexGrid';
import { HexPosition, HexGridSystem } from '@/systems/hexGridSystem';

// ============================================================================
// COMPONENT PROPS
// ============================================================================

interface BattleArenaV2Props {
  battle_id: string;
  mode: 'pvp' | 'pve';
  auth_token: string;
  initial_characters: BattleCharacterState[];
  initial_grid: HexBattleGrid;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BattleArenaV2({
  battle_id,
  mode,
  auth_token,
  initial_characters,
  initial_grid,
}: BattleArenaV2Props) {
  const {
    state,
    initializeBattle,
    submitCoachOrders,
    currentCharacter,
    isPlayerTurn,
    canSubmitOrders,
    coachingTimeRemaining,
  } = useBattleState(battle_id, mode, auth_token);

  // Hex grid interaction state
  const [selected_hex, setSelectedHex] = useState<HexPosition | null>(null);
  const [hovered_hex, setHoveredHex] = useState<HexPosition | null>(null);

  // Action targeting mode
  type ActionMode = 'idle' | 'selecting_target' | 'selecting_hex';
  const [action_mode, setActionMode] = useState<ActionMode>('idle');
  const [pending_action, setPendingAction] = useState<CoachOrders['action_type'] | null>(null);

  // Initialize battle on mount
  useEffect(() => {
    initializeBattle(initial_characters, initial_grid);
  }, [initializeBattle, initial_characters, initial_grid]);

  // Start targeting mode when action button clicked
  const startTargeting = useCallback((action_type: CoachOrders['action_type']) => {
    if (action_type === 'defend') {
      // Defend doesn't need a target - submit immediately
      submitCoachOrders({
        action_type: 'defend',
        target_id: null,
        target_hex: null,
        power_id: null,
        spell_id: null,
        item_id: null,
      });
    } else if (action_type === 'move') {
      setActionMode('selecting_hex');
      setPendingAction('move');
    } else {
      // attack, power, spell need a target character
      setActionMode('selecting_target');
      setPendingAction(action_type);
    }
  }, [submitCoachOrders]);

  // Cancel targeting mode
  const cancelTargeting = useCallback(() => {
    setActionMode('idle');
    setPendingAction(null);
    setSelectedHex(null);
  }, []);

  // Complete action with selected target
  const completeAction = useCallback((target_id: string | null, target_hex: HexPosition | null) => {
    if (!pending_action) return;

    submitCoachOrders({
      action_type: pending_action,
      target_id,
      target_hex,
      power_id: null,  // TODO: Wire power/spell selection
      spell_id: null,
      item_id: null,
    });

    // Reset targeting state
    setActionMode('idle');
    setPendingAction(null);
    setSelectedHex(null);
  }, [pending_action, submitCoachOrders]);

  // Hex click handler
  const handleHexClick = useCallback((pos: HexPosition) => {
    console.log('Hex clicked:', pos, 'action_mode:', action_mode);
    setSelectedHex(pos);

    if (action_mode === 'selecting_hex') {
      // Move action - use hex position
      completeAction(null, pos);
    } else if (action_mode === 'selecting_target') {
      // Check if there's a character at this hex
      const char_at_hex = Array.from(state.characters.entries()).find(([id, char]) => {
        const char_pos = state.grid.character_positions.get(id);
        return char_pos && char_pos.q === pos.q && char_pos.r === pos.r;
      });
      if (char_at_hex) {
        completeAction(char_at_hex[0], null);
      }
    }
  }, [action_mode, completeAction, state.characters, state.grid.character_positions]);

  // Character token click handler
  const handleCharacterClick = useCallback((character_id: string) => {
    console.log('Character clicked:', character_id, 'action_mode:', action_mode);
    if (action_mode === 'selecting_target') {
      completeAction(character_id, null);
    }
  }, [action_mode, completeAction]);

  // Hex hover handler
  const handleHexHover = useCallback((pos: HexPosition | null) => {
    setHoveredHex(pos);
  }, []);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="battle-arena-v2 w-full h-full flex flex-col bg-gray-900 text-white">
      {/* Header: Turn Order */}
      <TurnOrderBar
        turn_order={state.turn.turn_order}
        current_index={state.turn.current_turn_index}
        characters={state.characters}
        round={state.turn.round}
      />

      {/* Main Battle Area */}
      <div className="flex-1 flex">
        {/* Left: Hex Grid with Character Tokens */}
        <div className="flex-1 flex items-center justify-center border border-gray-700 overflow-hidden relative">
          <HexGrid
            grid={state.grid}
            hex_size={40}
            onHexClick={handleHexClick}
            onHexHover={handleHexHover}
            selected_hex={selected_hex}
            hovered_hex={hovered_hex}
          />
          {/* Character Tokens Overlay */}
          <CharacterTokensOverlay
            characters={state.characters}
            grid={state.grid}
            hex_size={40}
            current_character_id={currentCharacter?.id ?? null}
            action_mode={action_mode}
            onCharacterClick={handleCharacterClick}
          />
        </div>

        {/* Right: Phase-specific Panel */}
        <div className="w-80 border-l border-gray-700 p-4">
          <PhasePanel
            phase={state.phase}
            currentCharacter={currentCharacter}
            isPlayerTurn={isPlayerTurn}
            canSubmitOrders={canSubmitOrders}
            coachingTimeRemaining={coachingTimeRemaining}
            adherenceResult={state.adherence_result}
            judgeRuling={state.judge_ruling}
            onStartTargeting={startTargeting}
            actionMode={action_mode}
            pendingAction={pending_action}
            onCancelTargeting={cancelTargeting}
          />
        </div>
      </div>

      {/* Footer: Combat Log */}
      <CombatLog entries={state.combat_log} />

      {/* Battle End Overlay */}
      {state.phase === 'BATTLE_END' && (
        <BattleEndOverlay
          winner={state.winner_team}
          reason={state.end_reason}
        />
      )}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface TurnOrderBarProps {
  turn_order: string[];
  current_index: number;
  characters: Map<string, BattleCharacterState>;
  round: number;
}

function TurnOrderBar({ turn_order, current_index, characters, round }: TurnOrderBarProps) {
  return (
    <div className="h-16 bg-gray-800 border-b border-gray-700 flex items-center px-4">
      <span className="text-sm text-gray-400 mr-4">Round {round}/3</span>
      <div className="flex gap-2">
        {turn_order.map((charId, idx) => {
          const char = characters.get(charId);
          const isCurrent = idx === current_index;
          const isPast = idx < current_index;

          return (
            <div
              key={charId}
              className={`
                w-12 h-12 rounded-full flex items-center justify-center text-xs font-bold
                ${isCurrent ? 'ring-2 ring-yellow-400 bg-yellow-600' : ''}
                ${isPast ? 'opacity-50 bg-gray-600' : 'bg-gray-700'}
                ${char?.team === 'player' ? 'border-2 border-blue-500' : 'border-2 border-red-500'}
              `}
              title={char?.name ?? charId}
            >
              {char?.name?.charAt(0) ?? '?'}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface PhasePanelProps {
  phase: string;
  currentCharacter: BattleCharacterState | null;
  isPlayerTurn: boolean;
  canSubmitOrders: boolean;
  coachingTimeRemaining: number;
  adherenceResult: any;
  judgeRuling: any;
  onStartTargeting: (action_type: CoachOrders['action_type']) => void;
  actionMode: 'idle' | 'selecting_target' | 'selecting_hex';
  pendingAction: CoachOrders['action_type'] | null;
  onCancelTargeting: () => void;
}

function PhasePanel({
  phase,
  currentCharacter,
  isPlayerTurn,
  canSubmitOrders,
  coachingTimeRemaining,
  adherenceResult,
  judgeRuling,
  onStartTargeting,
  actionMode,
  pendingAction,
  onCancelTargeting,
}: PhasePanelProps) {
  if (phase === 'INITIALIZING') {
    return <div className="text-gray-400">Loading battle...</div>;
  }

  if (phase === 'COACHING_WINDOW') {
    return (
      <CoachingPanel
        character={currentCharacter}
        isPlayerTurn={isPlayerTurn}
        timeRemaining={coachingTimeRemaining}
        canSubmit={canSubmitOrders}
        onStartTargeting={onStartTargeting}
        actionMode={actionMode}
        pendingAction={pendingAction}
        onCancelTargeting={onCancelTargeting}
      />
    );
  }

  if (phase === 'ADHERENCE_CHECK' && adherenceResult) {
    return (
      <AdherenceDisplay
        result={adherenceResult}
        characterName={currentCharacter?.name ?? 'Unknown'}
      />
    );
  }

  if (phase === 'JUDGE_EVALUATING' && judgeRuling) {
    return <JudgeDisplay ruling={judgeRuling} />;
  }

  return (
    <div className="text-gray-400">
      Phase: {phase}
      {currentCharacter && <div>Current: {currentCharacter.name}</div>}
    </div>
  );
}

interface CoachingPanelProps {
  character: BattleCharacterState | null;
  isPlayerTurn: boolean;
  timeRemaining: number;
  canSubmit: boolean;
  onStartTargeting: (action_type: CoachOrders['action_type']) => void;
  actionMode: 'idle' | 'selecting_target' | 'selecting_hex';
  pendingAction: CoachOrders['action_type'] | null;
  onCancelTargeting: () => void;
}

function CoachingPanel({
  character,
  isPlayerTurn,
  timeRemaining,
  canSubmit,
  onStartTargeting,
  actionMode,
  pendingAction,
  onCancelTargeting,
}: CoachingPanelProps) {
  const isTargeting = actionMode !== 'idle';

  return (
    <div className="space-y-4">
      <div className="text-lg font-bold">
        {isPlayerTurn ? 'Your Turn' : 'Opponent Turn'}
      </div>

      {character && (
        <div className="text-sm text-gray-400">
          {character.name} - HP: {character.current_hp}/{character.max_hp}
        </div>
      )}

      <div className={`text-2xl font-bold ${timeRemaining <= 5 ? 'text-red-500' : 'text-white'}`}>
        {timeRemaining}s
      </div>

      {/* Targeting mode indicator */}
      {isTargeting && (
        <div className="p-3 bg-yellow-600 rounded text-center">
          <div className="font-bold">
            {actionMode === 'selecting_target' ? 'Select a target' : 'Select a hex to move to'}
          </div>
          <div className="text-sm mt-1">
            Action: {pendingAction}
          </div>
          <button
            onClick={onCancelTargeting}
            className="mt-2 px-4 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Action buttons - only show when not targeting */}
      {canSubmit && !isTargeting && (
        <div className="space-y-2">
          <button
            onClick={() => onStartTargeting('attack')}
            className="w-full p-2 bg-red-600 hover:bg-red-700 rounded"
          >
            Attack (select target)
          </button>
          <button
            onClick={() => onStartTargeting('defend')}
            className="w-full p-2 bg-blue-600 hover:bg-blue-700 rounded"
          >
            Defend
          </button>
          <button
            onClick={() => onStartTargeting('move')}
            className="w-full p-2 bg-green-600 hover:bg-green-700 rounded"
          >
            Move (select hex)
          </button>
        </div>
      )}
    </div>
  );
}

interface AdherenceDisplayProps {
  result: any;
  characterName: string;
}

function AdherenceDisplay({ result, characterName }: AdherenceDisplayProps) {
  return (
    <div className="space-y-2">
      <div className="text-lg font-bold">Adherence Check</div>
      <div className={`text-2xl font-bold ${result.passed ? 'text-green-500' : 'text-red-500'}`}>
        {result.passed ? 'FOLLOWS ORDERS' : 'REBELS!'}
      </div>
      <div className="text-sm">
        Roll: {result.roll} vs Threshold: {result.threshold}
      </div>
      <div className="text-xs text-gray-400">{result.reasoning}</div>
    </div>
  );
}

function JudgeDisplay({ ruling }: { ruling: any }) {
  return (
    <div className="space-y-2">
      <div className="text-lg font-bold">Judge: {ruling.judge_name}</div>
      <div className="text-sm">{ruling.verdict}</div>
      <div className={`font-bold ${ruling.points_change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
        {ruling.points_change >= 0 ? '+' : ''}{ruling.points_change} points
      </div>
    </div>
  );
}

function CombatLog({ entries }: { entries: any[] }) {
  return (
    <div className="h-32 bg-gray-800 border-t border-gray-700 p-2 overflow-y-auto">
      <div className="text-xs text-gray-400 mb-1">Combat Log</div>
      {entries.slice(-10).map((entry) => (
        <div key={entry.id} className="text-xs text-gray-300">
          {entry.message}
        </div>
      ))}
    </div>
  );
}

function BattleEndOverlay({ winner, reason }: { winner: 'player' | 'opponent' | null; reason: string | null }) {
  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
      <div className="text-center">
        <div className={`text-4xl font-bold ${winner === 'player' ? 'text-green-500' : 'text-red-500'}`}>
          {winner === 'player' ? 'VICTORY!' : 'DEFEAT'}
        </div>
        <div className="text-gray-400 mt-2">{reason}</div>
      </div>
    </div>
  );
}

// ============================================================================
// CHARACTER TOKENS OVERLAY
// ============================================================================

interface CharacterTokensOverlayProps {
  characters: Map<string, BattleCharacterState>;
  grid: HexBattleGrid;
  hex_size: number;
  current_character_id: string | null;
  action_mode: 'idle' | 'selecting_target' | 'selecting_hex';
  onCharacterClick: (character_id: string) => void;
}

function CharacterTokensOverlay({
  characters,
  grid,
  hex_size,
  current_character_id,
  action_mode,
  onCharacterClick,
}: CharacterTokensOverlayProps) {
  // Canvas center offset (matches HexGrid component)
  const center_offset_x = 600; // Half of canvas width (1200)
  const center_offset_y = 450; // Half of canvas height (900)

  return (
    <div className="absolute inset-0 pointer-events-none">
      {Array.from(characters.entries()).map(([char_id, char]) => {
        const position = grid.character_positions.get(char_id);
        if (!position) return null;

        // Convert hex to pixel
        const pixel = HexGridSystem.toPixel(position, hex_size);
        const x = pixel.x + center_offset_x;
        const y = pixel.y + center_offset_y;

        const is_current = char_id === current_character_id;
        const is_player_team = char.team === 'player';
        const hp_percentage = (char.current_hp / char.max_hp) * 100;
        const is_valid_target = action_mode === 'selecting_target' && !char.is_knocked_out;

        return (
          <div
            key={char_id}
            className={`absolute pointer-events-auto cursor-pointer transition-all duration-200 hover:scale-110
              ${is_valid_target ? 'ring-4 ring-yellow-400 ring-opacity-75' : ''}`}
            style={{
              left: `${x}px`,
              top: `${y}px`,
              transform: 'translate(-50%, -50%)',
              zIndex: is_current ? 20 : 10,
            }}
            onClick={() => onCharacterClick(char_id)}
          >
            {/* Token Circle */}
            <div
              className={`
                relative w-12 h-12 rounded-full flex items-center justify-center
                ${is_player_team ? 'bg-blue-600' : 'bg-red-600'}
                ${is_current ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-gray-800' : ''}
                ${char.is_knocked_out ? 'opacity-50 grayscale' : ''}
              `}
            >
              <span className="text-white font-bold text-lg">
                {char.name.charAt(0)}
              </span>

              {/* Active Turn Indicator */}
              {is_current && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-white animate-pulse" />
              )}
            </div>

            {/* HP Bar */}
            <div className="absolute top-14 left-1/2 transform -translate-x-1/2 w-16">
              <div className="bg-gray-700 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    hp_percentage > 50 ? 'bg-green-500' : hp_percentage > 25 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${hp_percentage}%` }}
                />
              </div>

              {/* Name */}
              <div className="text-center mt-0.5">
                <span className="text-xs text-white font-semibold bg-gray-900/75 px-1 rounded whitespace-nowrap">
                  {char.name}
                </span>
              </div>

              {/* HP Numbers */}
              <div className="text-center">
                <span className="text-xs text-gray-300 font-mono">
                  {char.current_hp}/{char.max_hp}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default BattleArenaV2;
