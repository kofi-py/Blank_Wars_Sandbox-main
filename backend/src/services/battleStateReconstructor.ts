/**
 * Battle State Reconstructor Service
 *
 * Rebuilds the current battle state by:
 * 1. Loading initial state from battles table (user_team_data, opponent_team_data)
 * 2. Fetching all battle_actions for the battle
 * 3. Replaying actions in sequence to derive current state
 *
 * This is the core of the event sourcing pattern - state is NEVER stored,
 * only derived from the action log.
 */

import { query } from '../database/index';
import {
  HexGridSystem,
  HexPosition,
  HexBattleGrid,
  CharacterActionState,
  BASE_ACTION_POINTS,
} from '@blankwars/hex-engine';

import {
  BattleCharacter,
} from './battleMechanicsService';

import {
  BattleContext,
  BattleActionRequest,
  BattleActionResult,
} from './battleActionExecutor';

import {
  BattleCharacterData,
} from './battleCharacterLoader';

// ===== TYPES =====

export interface BattleRecord {
  id: string;
  user_id: string;
  opponent_user_id: string | null;
  user_team_data: { characters: BattleCharacterData[] };
  opponent_team_data: { characters: BattleCharacterData[] };
  status: string;
  current_round: number;
  max_rounds: number;
}

export interface BattleAction {
  id: string;
  battle_id: string;
  sequence_num: number;
  character_id: string;
  action_type: string;
  request: BattleActionRequest;
  result: BattleActionResult;
  is_rebellion: boolean;
  judge_ruling_id: number | null;
  round_num: number;
  turn_num: number;
  created_at: Date;
}

export interface ReconstructedState {
  context: BattleContext;
  battle_record: BattleRecord;
  action_count: number;
  current_round: number;
  current_turn: number;
  last_action: BattleAction | null;
}

// ===== INITIAL STATE BUILDER =====

/**
 * Build the initial BattleContext from a fresh battle record (no actions yet)
 */
async function buildInitialContext(battle: BattleRecord): Promise<BattleContext> {
  const user_chars = battle.user_team_data.characters;
  const opponent_chars = battle.opponent_team_data.characters;
  const all_chars = [...user_chars, ...opponent_chars];

  // Build character map
  const characters = new Map<string, BattleCharacterData>();
  for (const char of all_chars) {
    characters.set(char.id, char);
  }

  // Build battle state map (health, effects, etc.)
  const character_battle_state = new Map<string, BattleCharacter>();
  for (const char of all_chars) {
    character_battle_state.set(char.id, {
      id: char.id,
      name: char.name,
      health: char.current_health,
      max_health: char.current_max_health,
      attack: char.attack,
      defense: char.defense,
      speed: char.speed,
      magic_attack: char.magic_attack,
      magic_defense: char.magic_defense,
      dexterity: char.dexterity,
      intelligence: char.intelligence,
      wisdom: char.wisdom,
      spirit: char.spirit,
      initiative: char.initiative,
      elemental_resistance: char.elemental_resistance,
      fire_resistance: char.fire_resistance,
      cold_resistance: char.cold_resistance,
      lightning_resistance: char.lightning_resistance,
      toxic_resistance: char.toxic_resistance,
      is_dead: false,
      effects: [],
      shields: [],
    });
  }

  // Build hex grid with initial positions
  const character_positions = new Map<string, HexPosition>();
  const action_states = new Map<string, CharacterActionState>();
  const cooldowns = new Map<string, Map<string, number>>();

  // User team positions (left side)
  const user_positions: HexPosition[] = [
    { q: 2, r: 4, s: -6 },
    { q: 2, r: 5, s: -7 },
    { q: 2, r: 6, s: -8 },
  ];

  for (let index = 0; index < user_chars.length; index++) {
    const char = user_chars[index];
    const pos = user_positions[index];

    // Use base_action_points loaded with character data
    const baseAP = char.base_action_points;

    character_positions.set(char.id, pos);
    action_states.set(char.id, {
      character_id: char.id,
      max_action_points: baseAP,
      action_points_remaining: baseAP,
      actions_this_turn: [],
      can_move: true,
      can_attack: true,
      can_defend: true,
    });
    cooldowns.set(char.id, new Map());
  }

  // Opponent team positions (right side)
  const opponent_positions: HexPosition[] = [
    { q: 9, r: 4, s: -13 },
    { q: 9, r: 5, s: -14 },
    { q: 9, r: 6, s: -15 },
  ];

  for (let index = 0; index < opponent_chars.length; index++) {
    const char = opponent_chars[index];
    const pos = opponent_positions[index];

    // Use base_action_points loaded with character data
    const baseAP = char.base_action_points;

    character_positions.set(char.id, pos);
    action_states.set(char.id, {
      character_id: char.id,
      max_action_points: baseAP,
      action_points_remaining: baseAP,
      actions_this_turn: [],
      can_move: true,
      can_attack: true,
      can_defend: true,
    });
    cooldowns.set(char.id, new Map());
  }

  // Build grid
  const grid: HexBattleGrid = {
    grid_size: { rows: 12, cols: 12 },
    character_positions,
    terrain: new Map(),
    perimeter_attempts: new Map(),
    perimeter_effects: new Map(),
  };

  // Calculate initial turn order (sorted by initiative - already calculated by DB)
  const turn_order = all_chars
    .map(char => ({
      id: char.id,
      initiative: char.initiative,
    }))
    .sort((a, b) => b.initiative - a.initiative)
    .map(c => c.id);

  return {
    battle_id: battle.id,
    grid,
    characters,
    character_battle_state,
    action_states,
    cooldowns,
    current_turn_character_id: turn_order[0],
  };
}

// ===== ACTION REPLAY =====

/**
 * Apply a single action result to update the context
 * This replays what happened without re-executing the logic
 */
function applyActionResult(
  context: BattleContext,
  action: BattleAction
): void {
  const result = action.result;

  if (!result.success) {
    // Failed actions don't change state
    return;
  }

  // Apply state changes based on action type
  switch (result.action_type) {
    case 'move': {
      const move_result = result as any; // MoveActionResult
      context.grid.character_positions.set(action.character_id, move_result.new_position);
      const action_state = context.action_states.get(action.character_id);
      if (action_state) {
        action_state.action_points_remaining = move_result.attacker_state.action_points;
      }
      break;
    }

    case 'attack': {
      const attack_result = result as any; // AttackActionResult
      // Update attacker AP
      const attacker_state = context.action_states.get(action.character_id);
      if (attacker_state) {
        attacker_state.action_points_remaining = attack_result.attacker_state.action_points;
      }
      // Update target health/death
      const target_battle_state = context.character_battle_state.get(attack_result.target_state.character_id);
      if (target_battle_state) {
        target_battle_state.health = attack_result.target_state.health;
        target_battle_state.is_dead = attack_result.target_state.is_dead;
      }
      break;
    }

    case 'power': {
      const power_result = result as any; // PowerActionResult
      // Update attacker AP
      const attacker_state = context.action_states.get(action.character_id);
      if (attacker_state) {
        attacker_state.action_points_remaining = power_result.attacker_state.action_points;
      }
      // Update cooldown
      if (power_result.cooldown_set) {
        const char_cooldowns = context.cooldowns.get(action.character_id);
        if (char_cooldowns) {
          char_cooldowns.set(power_result.cooldown_set.ability_id, power_result.cooldown_set.turns);
        }
      }
      // Update target if exists
      if (power_result.target_state) {
        const target_battle_state = context.character_battle_state.get(power_result.target_state.character_id);
        if (target_battle_state) {
          target_battle_state.health = power_result.target_state.health;
        }
      }
      break;
    }

    case 'spell': {
      const spell_result = result as any; // SpellActionResult
      // Update attacker AP and mana
      const attacker_state = context.action_states.get(action.character_id);
      if (attacker_state) {
        attacker_state.action_points_remaining = spell_result.attacker_state.action_points;
      }
      const caster_char = context.characters.get(action.character_id);
      if (caster_char) {
        caster_char.current_mana = spell_result.attacker_state.mana;
      }
      // Update cooldown
      if (spell_result.cooldown_set) {
        const char_cooldowns = context.cooldowns.get(action.character_id);
        if (char_cooldowns) {
          char_cooldowns.set(spell_result.cooldown_set.ability_id, spell_result.cooldown_set.turns);
        }
      }
      // Update target if exists
      if (spell_result.target_state) {
        const target_battle_state = context.character_battle_state.get(spell_result.target_state.character_id);
        if (target_battle_state) {
          target_battle_state.health = spell_result.target_state.health;
        }
      }
      break;
    }

    case 'defend': {
      const defend_result = result as any; // DefendActionResult
      const attacker_state = context.action_states.get(action.character_id);
      if (attacker_state) {
        attacker_state.action_points_remaining = defend_result.attacker_state.action_points;
        attacker_state.can_defend = false;
      }
      // Effects are stored in attacker_state.effects_added - apply to battle state
      const battle_state = context.character_battle_state.get(action.character_id);
      if (battle_state && defend_result.attacker_state.effects_added) {
        battle_state.effects.push(...defend_result.attacker_state.effects_added);
      }
      break;
    }

    // Note: 'item' actions will be handled when item system is implemented
  }
}

// ===== MAIN RECONSTRUCTOR =====

/**
 * Load a battle and reconstruct its current state from the action log
 */
export async function reconstructBattleState(battle_id: string): Promise<ReconstructedState> {
  // 1. Load battle record
  const battle_result = await query(
    `SELECT id, user_id, opponent_user_id, user_team_data, opponent_team_data,
            status, current_round, max_rounds
     FROM battles WHERE id = $1`,
    [battle_id]
  );

  if (battle_result.rows.length === 0) {
    throw new Error(`Battle ${battle_id} not found`);
  }

  const battle_row = battle_result.rows[0];
  const battle: BattleRecord = {
    id: battle_row.id,
    user_id: battle_row.user_id,
    opponent_user_id: battle_row.opponent_user_id,
    user_team_data: typeof battle_row.user_team_data === 'string'
      ? JSON.parse(battle_row.user_team_data)
      : battle_row.user_team_data,
    opponent_team_data: typeof battle_row.opponent_team_data === 'string'
      ? JSON.parse(battle_row.opponent_team_data)
      : battle_row.opponent_team_data,
    status: battle_row.status,
    current_round: battle_row.current_round,
    max_rounds: battle_row.max_rounds,
  };

  // 2. Build initial context
  const context = await buildInitialContext(battle);

  // 3. Load all actions for this battle
  const actions_result = await query(
    `SELECT id, battle_id, sequence_num, character_id, action_type,
            request, result, is_rebellion, judge_ruling_id, round_num, turn_num, created_at
     FROM battle_actions
     WHERE battle_id = $1
     ORDER BY sequence_num ASC`,
    [battle_id]
  );

  const actions: BattleAction[] = actions_result.rows.map((row: any) => ({
    id: row.id,
    battle_id: row.battle_id,
    sequence_num: row.sequence_num,
    character_id: row.character_id,
    action_type: row.action_type,
    request: typeof row.request === 'string' ? JSON.parse(row.request) : row.request,
    result: typeof row.result === 'string' ? JSON.parse(row.result) : row.result,
    is_rebellion: row.is_rebellion,
    judge_ruling_id: row.judge_ruling_id,
    round_num: row.round_num,
    turn_num: row.turn_num,
    created_at: row.created_at,
  }));

  // 4. Replay all actions to derive current state
  let current_round = 1;
  let current_turn = 0;
  for (const action of actions) {
    applyActionResult(context, action);
    current_round = action.round_num;
    current_turn = action.turn_num;
  }

  return {
    context,
    battle_record: battle,
    action_count: actions.length,
    current_round,
    current_turn,
    last_action: actions.length > 0 ? actions[actions.length - 1] : null,
  };
}

/**
 * Get the next sequence number for a battle
 */
export async function getNextSequenceNum(battle_id: string): Promise<number> {
  const result = await query(
    `SELECT COALESCE(MAX(sequence_num), 0) + 1 as next_seq FROM battle_actions WHERE battle_id = $1`,
    [battle_id]
  );
  return result.rows[0].next_seq;
}

/**
 * Persist a battle action to the database
 */
export async function persistBattleAction(
  battle_id: string,
  character_id: string,
  request: BattleActionRequest,
  result: BattleActionResult,
  round_num: number,
  turn_num: number,
  is_rebellion: boolean = false,
  judge_ruling_id: number | null = null
): Promise<BattleAction> {
  const sequence_num = await getNextSequenceNum(battle_id);

  const insert_result = await query(
    `INSERT INTO battle_actions
       (battle_id, sequence_num, character_id, action_type, request, result,
        is_rebellion, judge_ruling_id, round_num, turn_num)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      battle_id,
      sequence_num,
      character_id,
      request.action_type,
      JSON.stringify(request),
      JSON.stringify(result),
      is_rebellion,
      judge_ruling_id,
      round_num,
      turn_num,
    ]
  );

  const row = insert_result.rows[0];
  return {
    id: row.id,
    battle_id: row.battle_id,
    sequence_num: row.sequence_num,
    character_id: row.character_id,
    action_type: row.action_type,
    request: typeof row.request === 'string' ? JSON.parse(row.request) : row.request,
    result: typeof row.result === 'string' ? JSON.parse(row.result) : row.result,
    is_rebellion: row.is_rebellion,
    judge_ruling_id: row.judge_ruling_id,
    round_num: row.round_num,
    turn_num: row.turn_num,
    created_at: row.created_at,
  };
}

// ===== EXPORTS =====

export const BattleStateReconstructor = {
  reconstructBattleState,
  getNextSequenceNum,
  persistBattleAction,
};

export default BattleStateReconstructor;
