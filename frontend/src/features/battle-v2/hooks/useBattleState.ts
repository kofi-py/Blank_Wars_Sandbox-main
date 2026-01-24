/**
 * Battle State Hook
 *
 * React hook that wraps the battle state machine.
 * Handles side effects (API calls, timers) and exposes actions.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  type BattleState,
  type BattleCharacterState,
  type CoachOrders,
  type SurveyChoiceId,
  type HexBattleGrid,
  getCurrentCharacterId,
  countAliveOnTeam,
} from '../state/battleTypes';
import {
  createInitialBattleState,
  applyEvent,
} from '../state/battleStateMachine';
import {
  performAdherenceCheckAPI,
  type BattleStateInput,
  type BattleActionRequest,
} from '@/services/battleAPI';
import { getBattleWebSocket } from '@/services/battleWebSocket';

// ============================================================================
// HOOK INTERFACE
// ============================================================================

export interface UseBattleStateReturn {
  // State
  state: BattleState;

  // Actions
  initializeBattle: (characters: BattleCharacterState[], grid: HexBattleGrid) => void;
  submitCoachOrders: (orders: CoachOrders) => void;
  triggerCoachingTimeout: () => void;

  // Computed values
  currentCharacter: BattleCharacterState | null;
  isPlayerTurn: boolean;
  canSubmitOrders: boolean;

  // Timer
  coachingTimeRemaining: number;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useBattleState(
  battle_id: string,
  mode: 'pvp' | 'pve',
  auth_token: string
): UseBattleStateReturn {
  // Core state
  const [state, setState] = useState<BattleState>(() =>
    createInitialBattleState(battle_id, mode)
  );

  // Timer ref for coaching countdown
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================================================
  // DISPATCH HELPER
  // ============================================================================

  const dispatch = useCallback((event: Parameters<typeof applyEvent>[1]) => {
    setState(current => applyEvent(current, event));
  }, []);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Initialize battle with loaded characters and grid
   */
  const initializeBattle = useCallback((
    characters: BattleCharacterState[],
    grid: HexBattleGrid
  ) => {
    dispatch({
      type: 'BATTLE_LOADED',
      characters,
      grid,
    });
  }, [dispatch]);

  /**
   * Submit coach orders and perform adherence check
   */
  const submitCoachOrders = useCallback(async (orders: CoachOrders) => {
    // Stop the timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Submit orders
    dispatch({ type: 'COACH_ORDERS_SUBMITTED', orders });

    // Get current character for adherence check
    const currentCharId = getCurrentCharacterId(state);
    if (!currentCharId) {
      console.error('No current character for adherence check');
      return;
    }

    const currentChar = state.characters.get(currentCharId);
    if (!currentChar) {
      console.error(`Character ${currentCharId} not found in state`);
      return;
    }

    // Build battle state for API
    const battleStateInput: BattleStateInput = {
      current_hp: currentChar.current_hp,
      max_hp: currentChar.max_hp,
      team_winning: calculateTeamWinning(state, currentChar.team),
      teammates_alive: countAliveOnTeam(state, currentChar.team),
      teammates_total: countTotalOnTeam(state, currentChar.team),
    };

    try {
      // Call backend adherence check
      const result = await performAdherenceCheckAPI(
        currentCharId,
        battleStateInput
      );

      dispatch({
        type: 'ADHERENCE_RESULT',
        result: {
          roll: result.roll,
          threshold: result.threshold,
          passed: result.passed,
          base_adherence: result.base_adherence,
          modifiers_applied: result.modifiers_applied,
          reasoning: result.reasoning,
        },
      });

      // If passed, execute deterministic action via WebSocket
      if (result.passed) {
        executeCoachOrdersViaSocket(battle_id, orders, currentCharId);
        // Note: Action result will come via socket.on('action_executed')
        // For now, optimistically update state
        dispatch({ type: 'ACTION_EXECUTED' });
        dispatch({ type: 'TURN_FINISHED' });
      } else {
        // Rebellion flow - get situation survey
        // TODO: Call situation analyst API
        console.log('Character rebelled! Situation analyst would be called here.');
        // For now, skip to turn complete
        dispatch({ type: 'TURN_FINISHED' });
      }
    } catch (error) {
      console.error('Adherence check failed:', error);
      // On error, default to pass and execute
      dispatch({ type: 'ACTION_EXECUTED' });
      dispatch({ type: 'TURN_FINISHED' });
    }
  }, [state, auth_token, dispatch]);

  /**
   * Handle coaching timeout
   */
  const triggerCoachingTimeout = useCallback(() => {
    // Stop the timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    dispatch({ type: 'COACHING_TIMEOUT' });

    // Default to defend action
    submitCoachOrders({
      action_type: 'defend',
      target_id: null,
      target_hex: null,
      power_id: null,
      spell_id: null,
      item_id: null,
    });
  }, [dispatch, submitCoachOrders]);

  // ============================================================================
  // TIMER EFFECT
  // ============================================================================

  useEffect(() => {
    // Only run timer during coaching window
    if (state.phase !== 'COACHING_WINDOW') {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Start countdown
    timerRef.current = setInterval(() => {
      setState(current => {
        const newTime = current.coaching_time_remaining - 1;
        if (newTime <= 0) {
          // Timer expired - will trigger timeout via separate effect
          return { ...current, coaching_time_remaining: 0 };
        }
        return { ...current, coaching_time_remaining: newTime };
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state.phase]);

  // Handle timeout when timer reaches 0
  useEffect(() => {
    if (state.phase === 'COACHING_WINDOW' && state.coaching_time_remaining === 0) {
      triggerCoachingTimeout();
    }
  }, [state.phase, state.coaching_time_remaining, triggerCoachingTimeout]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const currentCharacterId = getCurrentCharacterId(state);
  const currentCharacter = currentCharacterId
    ? state.characters.get(currentCharacterId) ?? null
    : null;

  const isPlayerTurn = currentCharacter?.team === 'player';

  const canSubmitOrders = state.phase === 'COACHING_WINDOW' && isPlayerTurn;

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    state,
    initializeBattle,
    submitCoachOrders,
    triggerCoachingTimeout,
    currentCharacter,
    isPlayerTurn,
    canSubmitOrders,
    coachingTimeRemaining: state.coaching_time_remaining,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateTeamWinning(state: BattleState, team: 'player' | 'opponent'): boolean {
  let teamHP = 0;
  let opponentHP = 0;

  for (const char of state.characters.values()) {
    if (char.team === team) {
      teamHP += char.current_hp;
    } else {
      opponentHP += char.current_hp;
    }
  }

  return teamHP >= opponentHP;
}

function countTotalOnTeam(state: BattleState, team: 'player' | 'opponent'): number {
  let count = 0;
  for (const char of state.characters.values()) {
    if (char.team === team) {
      count++;
    }
  }
  return count;
}

/**
 * Execute coach orders via WebSocket (Pure Socket Authority)
 *
 * Uses the two-step WebSocket flow:
 * 1. hex_submit_action - Submit the planned action
 * 2. hex_execute_turn - Execute the planned action
 *
 * Results are received via socket.on('action_executed')
 */
function executeCoachOrdersViaSocket(
  battle_id: string,
  orders: CoachOrders,
  character_id: string
): void {
  const socket = getBattleWebSocket();

  // Build planned action based on order type
  const planned_action: any = {
    type: orders.action_type,
  };

  // Add type-specific fields
  if (orders.action_type === 'move' && orders.target_hex) {
    planned_action.move_to_hex = orders.target_hex;
  } else if (orders.action_type === 'attack' && orders.target_id) {
    planned_action.attack_target_id = orders.target_id;
  } else if (orders.action_type === 'power' && orders.power_id) {
    planned_action.power_id = orders.power_id;
    planned_action.attack_target_id = orders.target_id;
  } else if (orders.action_type === 'spell' && orders.spell_id) {
    planned_action.spell_id = orders.spell_id;
    planned_action.attack_target_id = orders.target_id;
  } else if (orders.action_type === 'defend') {
    // Defend has no additional fields
  }

  console.log(`[WebSocket] Submitting ${orders.action_type} action for character ${character_id}`);

  // Step 1: Submit the planned action
  socket.emit('hex_submit_action', planned_action);

  // Step 2: Execute the action immediately (in real implementation, this might be on a button click)
  socket.emit('hex_execute_turn');

  console.log(`[WebSocket] Action submitted and execution triggered`);
}
