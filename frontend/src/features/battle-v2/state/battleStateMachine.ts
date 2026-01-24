/**
 * Battle State Machine
 *
 * Pure functions for battle phase transitions.
 * No side effects - all state changes return new state.
 *
 * Per BATTLE_SYSTEM_BLUEPRINT.md:
 * - Turn order is per-CHARACTER by initiative
 * - Initiative ties resolved by COIN FLIP (deterministic via battle seed)
 */

import {
  type BattlePhase,
  type BattleState,
  type BattleEvent,
  type BattleCharacterState,
  type TurnState,
  type HexBattleGrid,
  type CombatLogEntry,
  getCurrentCharacterId,
  isTeamKnockedOut,
} from './battleTypes';

// ============================================================================
// VALID PHASE TRANSITIONS
// ============================================================================

const VALID_TRANSITIONS: Record<BattlePhase, BattlePhase[]> = {
  'INITIALIZING': ['COACHING_WINDOW'],
  'COACHING_WINDOW': ['ADHERENCE_CHECK'],
  'ADHERENCE_CHECK': ['EXECUTING_DETERMINISTIC', 'REBELLION_SURVEY'],
  'EXECUTING_DETERMINISTIC': ['TURN_COMPLETE'],
  'REBELLION_SURVEY': ['REBELLION_AI_DECIDING'],
  'REBELLION_AI_DECIDING': ['REBELLION_EXECUTING'],
  'REBELLION_EXECUTING': ['JUDGE_EVALUATING'],
  'JUDGE_EVALUATING': ['TURN_COMPLETE'],
  'TURN_COMPLETE': ['COACHING_WINDOW', 'ROUND_END', 'BATTLE_END'],
  'ROUND_END': ['COACHING_WINDOW', 'BATTLE_END'],
  'BATTLE_END': [], // Terminal state
};

/**
 * Check if a phase transition is valid
 */
export function canTransition(from: BattlePhase, to: BattlePhase): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ============================================================================
// TURN ORDER CALCULATION
// ============================================================================

/**
 * Deterministic tiebreaker using battle seed.
 * Same inputs = same output (reproducible for replays).
 */
export function resolveTiebreaker(
  char_a_id: string,
  char_b_id: string,
  battle_seed: string
): string {
  // Create deterministic hash from seed + both IDs
  const combined = `${battle_seed}:${char_a_id}:${char_b_id}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Use absolute value and mod 2 for coin flip
  return Math.abs(hash) % 2 === 0 ? char_a_id : char_b_id;
}

/**
 * Calculate turn order for all characters by initiative.
 * Higher initiative goes first. Ties resolved by deterministic coin flip.
 */
export function calculateTurnOrder(
  characters: BattleCharacterState[],
  battle_seed: string
): string[] {
  // Sort by initiative (descending), then tiebreaker
  const sorted = [...characters].sort((a, b) => {
    const diff = b.initiative - a.initiative;
    if (diff !== 0) return diff;

    // Tiebreaker: deterministic coin flip
    const winner = resolveTiebreaker(a.id, b.id, battle_seed);
    return winner === a.id ? -1 : 1;
  });

  return sorted.map(c => c.id);
}

// ============================================================================
// PHASE TRANSITION LOGIC
// ============================================================================

/**
 * Get the next phase based on current state and event.
 * Pure function - returns the phase, doesn't modify state.
 */
export function getNextPhase(state: BattleState, event: BattleEvent): BattlePhase {
  switch (state.phase) {
    case 'INITIALIZING':
      if (event.type === 'BATTLE_LOADED') {
        return 'COACHING_WINDOW';
      }
      break;

    case 'COACHING_WINDOW':
      if (event.type === 'COACH_ORDERS_SUBMITTED' || event.type === 'COACHING_TIMEOUT') {
        return 'ADHERENCE_CHECK';
      }
      break;

    case 'ADHERENCE_CHECK':
      if (event.type === 'ADHERENCE_RESULT') {
        return event.result.passed ? 'EXECUTING_DETERMINISTIC' : 'REBELLION_SURVEY';
      }
      break;

    case 'EXECUTING_DETERMINISTIC':
      if (event.type === 'ACTION_EXECUTED') {
        return 'TURN_COMPLETE';
      }
      break;

    case 'REBELLION_SURVEY':
      if (event.type === 'SURVEY_GENERATED') {
        return 'REBELLION_AI_DECIDING';
      }
      break;

    case 'REBELLION_AI_DECIDING':
      if (event.type === 'CHARACTER_CHOSE') {
        return 'REBELLION_EXECUTING';
      }
      break;

    case 'REBELLION_EXECUTING':
      if (event.type === 'REBELLION_ACTION_EXECUTED') {
        return 'JUDGE_EVALUATING';
      }
      break;

    case 'JUDGE_EVALUATING':
      if (event.type === 'JUDGE_RULED') {
        return 'TURN_COMPLETE';
      }
      break;

    case 'TURN_COMPLETE':
      if (event.type === 'TURN_FINISHED') {
        // Check for battle end conditions
        if (isTeamKnockedOut(state, 'player') || isTeamKnockedOut(state, 'opponent')) {
          return 'BATTLE_END';
        }
        // Check if round is complete (all 6 have acted)
        if (state.turn.current_turn_index >= state.turn.turn_order.length - 1) {
          return 'ROUND_END';
        }
        // More characters to act this round
        return 'COACHING_WINDOW';
      }
      break;

    case 'ROUND_END':
      if (event.type === 'ROUND_FINISHED') {
        // Check for battle end (3 rounds max)
        if (state.turn.round >= 3) {
          return 'BATTLE_END';
        }
        // Check for knockout
        if (isTeamKnockedOut(state, 'player') || isTeamKnockedOut(state, 'opponent')) {
          return 'BATTLE_END';
        }
        // Start next round
        return 'COACHING_WINDOW';
      }
      break;

    case 'BATTLE_END':
      // Terminal state - no transitions
      break;
  }

  // Invalid event for current phase - stay in current phase
  console.warn(`Invalid event ${event.type} for phase ${state.phase}`);
  return state.phase;
}

// ============================================================================
// STATE CREATION
// ============================================================================

/**
 * Create initial battle state
 */
export function createInitialBattleState(
  battle_id: string,
  mode: 'pvp' | 'pve'
): BattleState {
  return {
    battle_id,
    phase: 'INITIALIZING',
    mode,

    turn: {
      turn_order: [],
      current_turn_index: 0,
      round: 1,
    },

    coaching_time_remaining: mode === 'pvp' ? 30 : 5,
    coach_orders: null,

    adherence_result: null,

    situation_survey: null,
    character_choice: null,
    character_reasoning: null,
    judge_ruling: null,

    characters: new Map(),
    grid: {
      grid_size: { rows: 12, cols: 12 },
      character_positions: new Map(),
      terrain: new Map(),
      perimeter_attempts: new Map(),
      perimeter_effects: new Map(),
    },
    combat_log: [],

    winner_team: null,
    end_reason: null,
  };
}

/**
 * Add a log entry to battle state (returns new state)
 */
export function addLogEntry(
  state: BattleState,
  entry: Omit<CombatLogEntry, 'id' | 'timestamp'>
): BattleState {
  const newEntry: CombatLogEntry = {
    ...entry,
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
  };

  return {
    ...state,
    combat_log: [...state.combat_log, newEntry],
  };
}

// ============================================================================
// STATE TRANSITIONS (REDUCERS)
// ============================================================================

/**
 * Apply an event to the battle state, returning a new state.
 * This is the main reducer function.
 */
export function applyEvent(state: BattleState, event: BattleEvent): BattleState {
  const nextPhase = getNextPhase(state, event);

  // If phase didn't change and event wasn't handled, return same state
  if (nextPhase === state.phase && !isEventHandled(state.phase, event)) {
    return state;
  }

  let newState: BattleState = { ...state, phase: nextPhase };

  // Apply event-specific state changes
  switch (event.type) {
    case 'BATTLE_LOADED':
      newState.characters = new Map(event.characters.map(c => [c.id, c]));
      newState.grid = event.grid;
      newState.turn = {
        ...newState.turn,
        turn_order: calculateTurnOrder(event.characters, state.battle_id),
        current_turn_index: 0,
      };
      newState = addLogEntry(newState, {
        type: 'turn_start',
        message: 'Battle begins!',
      });
      break;

    case 'COACH_ORDERS_SUBMITTED':
      newState.coach_orders = event.orders;
      break;

    case 'COACHING_TIMEOUT':
      // Default orders if timeout - defend
      if (!newState.coach_orders) {
        newState.coach_orders = {
          action_type: 'defend',
          target_id: null,
          target_hex: null,
          power_id: null,
          spell_id: null,
          item_id: null,
        };
      }
      break;

    case 'ADHERENCE_RESULT':
      newState.adherence_result = event.result;
      newState = addLogEntry(newState, {
        type: 'adherence_check',
        character_id: getCurrentCharacterId(state) ?? undefined,
        message: event.result.reasoning,
        details: {
          roll: event.result.roll,
          threshold: event.result.threshold,
          passed: event.result.passed,
        },
      });
      break;

    case 'SURVEY_GENERATED':
      newState.situation_survey = event.survey;
      break;

    case 'CHARACTER_CHOSE':
      newState.character_choice = event.choice;
      newState.character_reasoning = event.reasoning;
      break;

    case 'JUDGE_RULED':
      newState.judge_ruling = event.ruling;
      newState = addLogEntry(newState, {
        type: 'judge_ruling',
        character_id: getCurrentCharacterId(state) ?? undefined,
        message: `${event.ruling.judge_name}: ${event.ruling.verdict}`,
        details: {
          points_change: event.ruling.points_change,
          buffs: event.ruling.buffs,
          debuffs: event.ruling.debuffs,
        },
      });
      break;

    case 'TURN_FINISHED':
      // Clear turn-specific state
      newState.coach_orders = null;
      newState.adherence_result = null;
      newState.situation_survey = null;
      newState.character_choice = null;
      newState.character_reasoning = null;
      newState.judge_ruling = null;

      // Advance to next character
      newState.turn = {
        ...newState.turn,
        current_turn_index: newState.turn.current_turn_index + 1,
      };

      // Reset coaching timer
      newState.coaching_time_remaining = newState.mode === 'pvp' ? 30 : 5;
      break;

    case 'ROUND_FINISHED':
      // Advance to next round
      newState.turn = {
        ...newState.turn,
        round: newState.turn.round + 1,
        current_turn_index: 0,
      };
      newState = addLogEntry(newState, {
        type: 'round_end',
        message: `Round ${state.turn.round} complete!`,
      });
      break;

    case 'BATTLE_FINISHED':
      newState.winner_team = event.winner;
      newState.end_reason = event.reason;
      newState = addLogEntry(newState, {
        type: 'battle_end',
        message: `Battle over! ${event.winner === 'player' ? 'Victory!' : 'Defeat!'} (${event.reason})`,
      });
      break;
  }

  return newState;
}

/**
 * Check if an event is handled by the current phase
 */
function isEventHandled(phase: BattlePhase, event: BattleEvent): boolean {
  const handledEvents: Record<BattlePhase, string[]> = {
    'INITIALIZING': ['BATTLE_LOADED'],
    'COACHING_WINDOW': ['COACH_ORDERS_SUBMITTED', 'COACHING_TIMEOUT'],
    'ADHERENCE_CHECK': ['ADHERENCE_RESULT'],
    'EXECUTING_DETERMINISTIC': ['ACTION_EXECUTED'],
    'REBELLION_SURVEY': ['SURVEY_GENERATED'],
    'REBELLION_AI_DECIDING': ['CHARACTER_CHOSE'],
    'REBELLION_EXECUTING': ['REBELLION_ACTION_EXECUTED'],
    'JUDGE_EVALUATING': ['JUDGE_RULED'],
    'TURN_COMPLETE': ['TURN_FINISHED'],
    'ROUND_END': ['ROUND_FINISHED'],
    'BATTLE_END': ['BATTLE_FINISHED'],
  };

  return handledEvents[phase]?.includes(event.type) ?? false;
}
