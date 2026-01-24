/**
 * Battle System V2 - Type Definitions
 *
 * Per BATTLE_SYSTEM_BLUEPRINT.md:
 * - Turn order is per-CHARACTER by initiative (NOT team-based)
 * - Judge ONLY for rogue actions (NOT every action)
 * - AI only decides when adherence FAILS
 * - No Plan B weighting
 */

// Import shared grid types from hex-engine package
import type { HexPosition, HexBattleGrid, TerrainType, PerimeterStatusEffect } from '@blankwars/hex-engine';

// Re-export for convenience
export type { HexPosition, HexBattleGrid, TerrainType, PerimeterStatusEffect };

// ============================================================================
// PHASE TYPES
// ============================================================================

export type BattlePhase =
  | 'INITIALIZING'           // Loading teams, calculating turn order
  | 'COACHING_WINDOW'        // Current character's coach has 30s/5s
  | 'ADHERENCE_CHECK'        // Rolling d100 vs gameplan_adherence
  | 'EXECUTING_DETERMINISTIC'// Pass: executing coach's orders (no AI)
  | 'REBELLION_SURVEY'       // Fail: Situation Analyst generating options
  | 'REBELLION_AI_DECIDING'  // Fail: Character AI picking from survey
  | 'REBELLION_EXECUTING'    // Fail: Executing character's choice
  | 'JUDGE_EVALUATING'       // Fail: Judge scoring rogue action
  | 'TURN_COMPLETE'          // Cleanup, advance to next character
  | 'ROUND_END'              // All 6 acted, chat break (45s)
  | 'BATTLE_END';            // Victory/defeat/3 round limit

// ============================================================================
// TURN & ORDER TYPES
// ============================================================================

export interface TurnState {
  turn_order: string[];           // All 6 character IDs by initiative
  current_turn_index: number;     // 0-5
  round: number;                  // 1-3
}

// ============================================================================
// COACHING TYPES
// ============================================================================

export type ActionType = 'attack' | 'defend' | 'move' | 'power' | 'spell' | 'item';

export interface CoachOrders {
  action_type: ActionType;
  target_id: string | null;       // Character ID for attack/power/spell (null if not targeting character)
  target_hex: HexPosition | null; // Hex position for move (null if not positional)
  power_id: string | null;        // Power ID (null if not using power)
  spell_id: string | null;        // Spell ID (null if not using spell)
  item_id: string | null;         // Item ID (null if not using item)
}

// ============================================================================
// ADHERENCE TYPES
// ============================================================================

export interface AdherenceResult {
  roll: number;                   // d100 result (1-100)
  threshold: number;              // Target to beat
  passed: boolean;                // roll <= threshold
  base_adherence: number;         // From DB gameplan_adherence
  modifiers_applied: string[];    // For display (e.g., "Wounded (-15)")
  reasoning: string;              // Human-readable explanation
}

// ============================================================================
// REBELLION / SURVEY TYPES
// ============================================================================

export type SurveyChoiceId = 'A' | 'B' | 'C' | 'D';

export type RebellionActionType =
  | 'attack'
  | 'defend'
  | 'move'
  | 'power'
  | 'spell'
  | 'flee'
  | 'friendly_fire';

export interface SurveyActionMapping {
  type: RebellionActionType;
  target_id?: string;
  target_hex?: HexPosition;
  ability_id?: string;
}

export interface SurveyOption {
  id: SurveyChoiceId;
  label: string;                  // e.g., "Attack Achilles (30% HP, killed your ally)"
  action_mapping: SurveyActionMapping;
  contextual_reasoning: string;   // Why this option makes sense given situation
}

export interface SituationSurvey {
  character_id: string;
  context_summary: string;
  options: SurveyOption[];
}

// ============================================================================
// JUDGE TYPES
// ============================================================================

export interface JudgeRuling {
  judge_name: string;             // "Eleanor Roosevelt", "King Solomon", "Anubis"
  verdict: string;                // The judge's statement
  points_change: number;          // +/- points
  buffs: string[];                // Buffs applied
  debuffs: string[];              // Debuffs applied
  commentary: string;             // In-character commentary
}

// ============================================================================
// CHARACTER STATE TYPES
// ============================================================================

export interface BattleCharacterState {
  id: string;                     // user_character_id
  character_id: string;           // canonical character id
  name: string;
  team: 'player' | 'opponent';

  // Position
  position: HexPosition;

  // Health
  current_hp: number;
  max_hp: number;
  is_knocked_out: boolean;

  // Resources
  current_mana: number;
  max_mana: number;
  action_points: number;
  max_action_points: number;

  // Initiative (from DB current_initiative)
  initiative: number;

  // Adherence (from DB gameplan_adherence)
  gameplan_adherence: number;

  // Status effects
  status_effects: string[];

  // Cooldowns
  power_cooldowns: Map<string, number>;
  spell_cooldowns: Map<string, number>;
}

// ============================================================================
// COMBAT LOG TYPES
// ============================================================================

export type CombatLogEntryType =
  | 'turn_start'
  | 'coaching'
  | 'adherence_check'
  | 'action'
  | 'damage'
  | 'heal'
  | 'status_effect'
  | 'rebellion'
  | 'judge_ruling'
  | 'knockout'
  | 'round_end'
  | 'battle_end';

export interface CombatLogEntry {
  id: string;
  timestamp: number;
  type: CombatLogEntryType;
  character_id?: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// MAIN BATTLE STATE
// ============================================================================

export interface BattleState {
  // Core
  battle_id: string;
  phase: BattlePhase;
  mode: 'pvp' | 'pve';

  // Turn tracking
  turn: TurnState;

  // Coaching
  coaching_time_remaining: number;   // Seconds
  coach_orders: CoachOrders | null;

  // Adherence
  adherence_result: AdherenceResult | null;

  // Rebellion (only if adherence failed)
  situation_survey: SituationSurvey | null;
  character_choice: SurveyChoiceId | null;
  character_reasoning: string | null;
  judge_ruling: JudgeRuling | null;

  // Battle data
  characters: Map<string, BattleCharacterState>;
  grid: HexBattleGrid;
  combat_log: CombatLogEntry[];

  // Result
  winner_team: 'player' | 'opponent' | null;
  end_reason: 'knockout' | 'rounds_completed' | 'forfeit' | null;
}

// ============================================================================
// EVENT TYPES (for state machine transitions)
// ============================================================================

export type BattleEvent =
  | { type: 'BATTLE_LOADED'; characters: BattleCharacterState[]; grid: HexBattleGrid }
  | { type: 'COACH_ORDERS_SUBMITTED'; orders: CoachOrders }
  | { type: 'COACHING_TIMEOUT' }
  | { type: 'ADHERENCE_RESULT'; result: AdherenceResult }
  | { type: 'ACTION_EXECUTED' }
  | { type: 'SURVEY_GENERATED'; survey: SituationSurvey }
  | { type: 'CHARACTER_CHOSE'; choice: SurveyChoiceId; reasoning: string }
  | { type: 'REBELLION_ACTION_EXECUTED' }
  | { type: 'JUDGE_RULED'; ruling: JudgeRuling }
  | { type: 'TURN_FINISHED' }
  | { type: 'ROUND_FINISHED' }
  | { type: 'BATTLE_FINISHED'; winner: 'player' | 'opponent'; reason: 'knockout' | 'rounds_completed' | 'forfeit' };

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Get the current character whose turn it is
 */
export function getCurrentCharacterId(state: BattleState): string | null {
  if (state.turn.current_turn_index < 0 || state.turn.current_turn_index >= state.turn.turn_order.length) {
    return null;
  }
  return state.turn.turn_order[state.turn.current_turn_index];
}

/**
 * Check if all characters in a team are knocked out
 */
export function isTeamKnockedOut(state: BattleState, team: 'player' | 'opponent'): boolean {
  for (const char of state.characters.values()) {
    if (char.team === team && !char.is_knocked_out) {
      return false;
    }
  }
  return true;
}

/**
 * Count alive characters on a team
 */
export function countAliveOnTeam(state: BattleState, team: 'player' | 'opponent'): number {
  let count = 0;
  for (const char of state.characters.values()) {
    if (char.team === team && !char.is_knocked_out) {
      count++;
    }
  }
  return count;
}
