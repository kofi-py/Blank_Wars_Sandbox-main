/**
 * Battle API Service
 *
 * Frontend service for battle-related API calls.
 * Per BATTLE_SYSTEM_BLUEPRINT.md, the frontend should only DISPLAY adherence results
 * from the backend - no frontend calculation.
 */

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

/**
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export interface BattleStateInput {
  current_hp: number;
  max_hp: number;
  team_winning: boolean;
  teammates_alive: number;
  teammates_total: number;
}

export interface AdherenceCheckResult {
  passed: boolean;
  roll: number;
  threshold: number;
  base_adherence: number;
  modifiers_applied: string[];
  reasoning: string;
}

/**
 * Perform an adherence check via the backend API with retry logic.
 * The backend queries the DB for gameplan_adherence and applies battle-state modifiers.
 *
 * Retries up to MAX_RETRIES times on transient failures to avoid
 * false auto-passes due to network issues.
 *
 * @param user_character_id - The user_character ID (not character_id)
 * @param battle_state - Current battle conditions (HP, team status, etc.)
 * @returns AdherenceCheckResult with roll, threshold, and pass/fail
 */
export async function performAdherenceCheckAPI(
  user_character_id: string,
  battle_state: BattleStateInput
): Promise<AdherenceCheckResult> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${API_BASE}/api/battles/adherence-check`, {
        method: 'POST',
        credentials: 'include', // Send httpOnly cookies for authentication
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_character_id,
          battle_state
        })
      });

      if (!response.ok) {
        let errorMsg = `Adherence check failed with status ${response.status}`;
        try {
          const error = await response.json();
          errorMsg = error.error || errorMsg;
        } catch (e) {
          // Response wasn't JSON
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Adherence check failed');
      }

      // Success - return result
      if (attempt > 1) {
        console.log(`✅ Adherence check succeeded on attempt ${attempt}`);
      }
      return data.result;

    } catch (error: any) {
      lastError = error;
      console.warn(`⚠️ Adherence check attempt ${attempt}/${MAX_RETRIES} failed:`, error?.message);

      // Don't retry on the last attempt
      if (attempt < MAX_RETRIES) {
        // Exponential backoff: 500ms, 1000ms, 2000ms...
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`🔄 Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  // All retries exhausted
  throw lastError || new Error('Adherence check failed after all retries');
}

/**
 * Legacy-compatible wrapper for code that expects the old synchronous format.
 * Returns a structure matching the old AdherenceCheckResult from adherenceCheckSystem.ts
 *
 * NOTE: This is for transitional use only. New code should use performAdherenceCheckAPI directly.
 */
export interface LegacyAdherenceFactors {
  base_adherence: number;
  mental_healthModifier: number;
  stress_modifier: number;
  team_trustModifier: number;
  battle_contextModifier: number;
  total_modifier: number;
  final_threshold: number;
}

export interface LegacyAdherenceCheckResult {
  passed: boolean;
  roll_value: number;
  threshold: number;
  factors: LegacyAdherenceFactors;
  reasoning: string;
}

/**
 * Convert API result to legacy format for backwards compatibility
 */
export function convertToLegacyFormat(result: AdherenceCheckResult): LegacyAdherenceCheckResult {
  // The new API doesn't return individual modifiers, so we provide zeros
  // except for the final values which we have
  return {
    passed: result.passed,
    roll_value: result.roll,
    threshold: result.threshold,
    factors: {
      base_adherence: result.base_adherence,
      mental_healthModifier: 0, // Now calculated in DB
      stress_modifier: 0, // Now calculated in DB
      team_trustModifier: 0, // Now calculated in DB
      battle_contextModifier: result.threshold - result.base_adherence, // Approximate
      total_modifier: result.threshold - result.base_adherence,
      final_threshold: result.threshold
    },
    reasoning: result.reasoning
  };
}

// ============================================================================
// ACTION EXECUTION - NOW VIA WEBSOCKET
// ============================================================================

/**
 * REMOVED: executeActionAPI
 *
 * Battle actions are now executed via WebSocket only (Pure Socket Authority).
 * Use socket.emit('hex_execute_turn', {...}) instead of REST API.
 *
 * Migration guide:
 * - OLD: await executeActionAPI(battle_id, action, auth_token)
 * - NEW: socket.emit('hex_execute_turn', { battle_id, character_id, action_type, ... })
 * - Results come via: socket.on('action_executed', (data) => { ... })
 *
 * Type definitions kept for reference:
 */

export type ActionType = 'move' | 'attack' | 'power' | 'spell' | 'defend' | 'item';

export interface HexPosition {
  q: number;
  r: number;
  s: number;
}

export interface BattleActionRequest {
  character_id: string;
  action_type: ActionType;
  target_id: string | null;
  target_hex: HexPosition | null;
  power_id: string | null;
  spell_id: string | null;
  item_id: string | null;
}

export interface BattleActionResult {
  success: boolean;
  action_type: ActionType;
  ap_cost: number;
  errors?: string[];
  narrative: string;
  // Action-specific fields vary by type
  damage_dealt?: number;
  healing_done?: number;
  new_position?: HexPosition;
  effects_applied?: any[];
  attacker_state?: any;
  target_state?: any;
}

export interface ExecuteActionResponse {
  success: boolean;
  action_id: string;
  sequence_num: number;
  result: BattleActionResult;
}
