/**
 * Battle Action Executor Service
 *
 * The central coordinator that executes battle actions by combining:
 * - @blankwars/hex-engine for movement validation
 * - battleMechanicsService for damage/effects
 * - battleActionsService for power/spell execution
 * - battleCharacterLoader for character data
 *
 * This is the single endpoint for all battle action execution.
 */

import {
  HexGridSystem,
  HexMovementEngine,
  HexPosition,
  HexBattleGrid,
  ACTION_COSTS,
  BASE_ACTION_POINTS,
  MoveValidation,
  CharacterActionState,
} from '@blankwars/hex-engine';

import {
  getAttackType,
  AttackType,
} from './attackTypesService';

import {
  BattleCharacter,
  calculateDamageWithResistance,
  applyStatusEffect,
  applyShields,
  markAsDead,
  isDamageImmune,
  StatusEffect,
  calculateDefenseReduction,
  calculateCritChance,
  calculateEvasionBonus,
} from './battleMechanicsService';

import {
  executePower,
  executeSpell,
  applyActionEffects,
  PowerExecutionContext,
  SpellExecutionContext,
  ActionResult,
  ActionEffect,
} from './battleActionsService';

import {
  loadBattleCharacter,
  BattleCharacterData,
  PowerDefinition,
  SpellDefinition,
} from './battleCharacterLoader';

import { db_adapter } from './databaseAdapter';

// ===== TYPES =====

// Discriminated union - each action type has REQUIRED fields, no optionals
export type BattleActionRequest =
  | MoveActionRequest
  | AttackActionRequest
  | PowerActionRequest
  | SpellActionRequest
  | DefendActionRequest
  | ItemActionRequest;

export interface MoveActionRequest {
  battle_id: string;
  character_id: string;
  action_type: 'move';
  target_hex: HexPosition;  // REQUIRED for move
}

export interface AttackActionRequest {
  battle_id: string;
  character_id: string;
  action_type: 'attack';
  target_id: string;           // REQUIRED for attack
  attack_type_id: string;      // 'jab', 'strike', 'heavy', 'all_out'
}

export interface PowerActionRequest {
  battle_id: string;
  character_id: string;
  action_type: 'power';
  power_id: string;           // REQUIRED - which power
  target_id: string;          // REQUIRED - target character (can be self)
}

export interface SpellActionRequest {
  battle_id: string;
  character_id: string;
  action_type: 'spell';
  spell_id: string;           // REQUIRED - which spell
  target_id: string;          // REQUIRED - target character (can be self)
}

export interface DefendActionRequest {
  battle_id: string;
  character_id: string;
  action_type: 'defend';
}

export interface ItemActionRequest {
  battle_id: string;
  character_id: string;
  action_type: 'item';
  item_id: string;            // REQUIRED - which item
  target_id: string;          // REQUIRED - target character (can be self)
  user_id: string;            // REQUIRED - who owns the item
}

export type ActionType = BattleActionRequest['action_type'];

// Discriminated union for results - each action type has specific required fields
export type BattleActionResult =
  | FailedActionResult
  | MoveActionResult
  | AttackActionResult
  | PowerActionResult
  | SpellActionResult
  | DefendActionResult
  | ItemActionResult;

// Failed action - same structure for all action types
export interface FailedActionResult {
  success: false;
  action_type: ActionType;
  errors: string[];  // REQUIRED for failures
  ap_cost: 0;        // No AP spent on failure
  narrative: string;
}

// Move result
export interface MoveActionResult {
  success: true;
  action_type: 'move';
  ap_cost: number;
  new_position: HexPosition;  // REQUIRED for move
  attacker_state: MoveStateUpdate;
  narrative: string;
}

export interface MoveStateUpdate {
  character_id: string;
  position: HexPosition;
  action_points: number;
}

// Attack result
export interface AttackActionResult {
  success: true;
  action_type: 'attack';
  ap_cost: number;
  damage_dealt: number;  // REQUIRED for attack (can be 0 if immune)
  attacker_state: AttackAttackerStateUpdate;
  target_state: AttackTargetStateUpdate;
  narrative: string;
}

export interface AttackAttackerStateUpdate {
  character_id: string;
  action_points: number;
}

export interface AttackTargetStateUpdate {
  character_id: string;
  health: number;
  is_dead: boolean;
}

// Power result
export interface PowerActionResult {
  success: true;
  action_type: 'power';
  ap_cost: number;
  damage_dealt: number;   // 0 if no damage
  healing_done: number;   // 0 if no healing
  effects_applied: ActionEffect[];
  cooldown_set: { ability_id: string; turns: number };
  attacker_state: PowerAttackerStateUpdate;
  target_state: PowerTargetStateUpdate;  // Always present (can be self)
  narrative: string;
}

export interface PowerAttackerStateUpdate {
  character_id: string;
  action_points: number;
}

export interface PowerTargetStateUpdate {
  character_id: string;
  health: number;
}

// Spell result
export interface SpellActionResult {
  success: true;
  action_type: 'spell';
  ap_cost: number;
  mana_cost: number;      // REQUIRED for spell
  damage_dealt: number;   // 0 if no damage
  healing_done: number;   // 0 if no healing
  effects_applied: ActionEffect[];
  cooldown_set: { ability_id: string; turns: number };
  attacker_state: SpellAttackerStateUpdate;
  target_state: SpellTargetStateUpdate;  // Always present (can be self)
  narrative: string;
}

export interface SpellAttackerStateUpdate {
  character_id: string;
  action_points: number;
  mana: number;
}

export interface SpellTargetStateUpdate {
  character_id: string;
  health: number;
}

// Defend result
export interface DefendActionResult {
  success: true;
  action_type: 'defend';
  ap_cost: number;
  effects_applied: ActionEffect[];
  attacker_state: DefendStateUpdate;
  narrative: string;
}

export interface DefendStateUpdate {
  character_id: string;
  action_points: number;
  effects_added: StatusEffect[];
}

// Item result
export interface ItemActionResult {
  success: true;
  action_type: 'item';
  ap_cost: number;
  effects_applied: ItemEffect[];
  item_consumed: boolean;
  attacker_state: ItemAttackerStateUpdate;
  target_state: ItemTargetStateUpdate;  // Always present (can be self)
  narrative: string;
}

export interface ItemAttackerStateUpdate {
  character_id: string;
  action_points: number;
}

export interface ItemTargetStateUpdate {
  character_id: string;
  health: number;
}

export interface ItemEffect {
  type: 'heal' | 'buff' | 'damage' | 'restore_ap' | 'status_effect';
  target_id: string;
  value: number;
  stat?: string;
  duration?: number;
  description?: string;
}

export interface BattleItem {
  id: string;
  name: string;
  battle_usable: boolean;
  effects: Array<{
    type: 'heal' | 'buff' | 'damage' | 'restore_ap' | 'status_effect';
    value: number;
    stat?: string;
    duration?: number;
  }>;
}

export interface BattleContext {
  battle_id: string;
  grid: HexBattleGrid;
  characters: Map<string, BattleCharacterData>;
  character_battle_state: Map<string, BattleCharacter>;  // Combat state (health, effects, etc.)
  action_states: Map<string, CharacterActionState>;
  cooldowns: Map<string, Map<string, number>>;  // character_id -> ability_id -> turns remaining
  current_turn_character_id: string;
}

// ===== MAIN EXECUTOR =====

/**
 * Execute a battle action
 * This is the main entry point for all action execution
 */
export async function executeAction(
  request: BattleActionRequest,
  context: BattleContext
): Promise<BattleActionResult> {

  // Validate it's this character's turn
  if (request.character_id !== context.current_turn_character_id) {
    return {
      success: false,
      errors: ['Not this character\'s turn'],
      action_type: request.action_type,
      ap_cost: 0,
      narrative: 'Action rejected - not your turn',
    };
  }

  // Get character data
  const character = context.characters.get(request.character_id);
  if (!character) {
    return {
      success: false,
      errors: ['Character not found'],
      action_type: request.action_type,
      ap_cost: 0,
      narrative: 'Character not found',
    };
  }

  // Get action state
  const action_state = context.action_states.get(request.character_id);
  if (!action_state) {
    return {
      success: false,
      errors: ['Action state not found'],
      action_type: request.action_type,
      ap_cost: 0,
      narrative: 'Action state not initialized',
    };
  }

  // Route to appropriate handler
  switch (request.action_type) {
    case 'move':
      return executeMove(request, context, character, action_state);
    case 'attack':
      return executeAttack(request, context, character, action_state);
    case 'power':
      return executePowerAction(request, context, character, action_state);
    case 'spell':
      return executeSpellAction(request, context, character, action_state);
    case 'defend':
      return executeDefend(request, context, character, action_state);
    case 'item':
      return executeItem(request, context, character, action_state);
    default:
      // Exhaustive check - if we get here, TypeScript didn't catch a new action type
      const _exhaustiveCheck: never = request;
      throw new Error(`Unhandled action type: ${(_exhaustiveCheck as BattleActionRequest).action_type}`);
  }
}

// ===== ACTION HANDLERS =====

/**
 * Execute a move action
 */
function executeMove(
  request: MoveActionRequest,
  context: BattleContext,
  character: BattleCharacterData,
  action_state: CharacterActionState
): BattleActionResult {
  // target_hex is REQUIRED by MoveActionRequest type - no null check needed

  // Get current position
  const current_pos = context.grid.character_positions.get(request.character_id);
  if (!current_pos) {
    return {
      success: false,
      errors: ['Character position not found'],
      action_type: 'move',
      ap_cost: 0,
      narrative: 'Move failed - current position unknown',
    };
  }

  // Validate movement
  const move_validation = HexMovementEngine.canMoveTo(
    request.character_id,
    current_pos,
    request.target_hex,
    context.grid,
    action_state.action_points_remaining
  );

  if (!move_validation.valid) {
    if (!move_validation.reason) {
      throw new Error('Movement validation failed but no reason provided - this is a bug in HexMovementEngine');
    }
    return {
      success: false,
      errors: [move_validation.reason],
      action_type: 'move',
      ap_cost: 0,
      narrative: `Move failed - ${move_validation.reason}`,
    };
  }

  // Execute the move
  const result = HexMovementEngine.executeAction(action_state, {
    type: 'move',
    ap_cost: move_validation.ap_cost,
    target_hex: request.target_hex,
  });

  if (!result.success) {
    if (!result.reason) {
      throw new Error('Movement execution failed but no reason provided - this is a bug in HexMovementEngine');
    }
    return {
      success: false,
      errors: [result.reason],
      action_type: 'move',
      ap_cost: 0,
      narrative: `Move failed - ${result.reason}`,
    };
  }

  // Update grid position
  context.grid.character_positions.set(request.character_id, request.target_hex);
  context.action_states.set(request.character_id, result.new_state);

  // Check for perimeter hazard
  let narrative = `${character.name} moves to position (${request.target_hex.q}, ${request.target_hex.r})`;
  if (move_validation.will_trigger_perimeter) {
    narrative += ' - entering shark-infested waters!';
  }

  return {
    success: true,
    action_type: 'move',
    ap_cost: move_validation.ap_cost,
    new_position: request.target_hex,
    attacker_state: {
      character_id: request.character_id,
      position: request.target_hex,
      action_points: result.new_state.action_points_remaining,
    },
    narrative,
  };
}

/**
 * Execute a basic attack action
 */
async function executeAttack(
  request: AttackActionRequest,
  context: BattleContext,
  character: BattleCharacterData,
  action_state: CharacterActionState
): Promise<BattleActionResult> {
  // Load attack type from database - throws if invalid
  const attack_type = await getAttackType(request.attack_type_id);

  // Check AP using attack type's cost
  if (action_state.action_points_remaining < attack_type.ap_cost) {
    return {
      success: false,
      errors: [`Insufficient AP for ${attack_type.name}: need ${attack_type.ap_cost}, have ${action_state.action_points_remaining}`],
      action_type: 'attack',
      ap_cost: 0,
      narrative: `${attack_type.name} failed - insufficient action points`,
    };
  }

  // Get target
  const target = context.characters.get(request.target_id);
  const target_battle_state = context.character_battle_state.get(request.target_id);
  if (!target || !target_battle_state) {
    return {
      success: false,
      errors: ['Target not found'],
      action_type: 'attack',
      ap_cost: 0,
      narrative: 'Attack failed - target not found',
    };
  }

  // Check if target is dead
  if (target_battle_state.is_dead) {
    return {
      success: false,
      errors: ['Target is already defeated'],
      action_type: 'attack',
      ap_cost: 0,
      narrative: 'Attack failed - target already defeated',
    };
  }

  // Check range (melee attacks require adjacent hex)
  const attacker_pos = context.grid.character_positions.get(request.character_id);
  const target_pos = context.grid.character_positions.get(request.target_id);
  if (!attacker_pos || !target_pos) {
    return {
      success: false,
      errors: ['Position data missing'],
      action_type: 'attack',
      ap_cost: 0,
      narrative: 'Attack failed - position data missing',
    };
  }

  const distance = HexGridSystem.distance(attacker_pos, target_pos);
  const attack_range = attack_type.requires_melee_range ? 1 : 3;
  if (distance > attack_range) {
    return {
      success: false,
      errors: [`Target out of range: ${distance} hexes, max range ${attack_range}`],
      action_type: 'attack',
      ap_cost: 0,
      narrative: `${attack_type.name} failed - target is ${distance} hexes away (range is ${attack_range})`,
    };
  }

  // Check if target is immune
  if (isDamageImmune(target_battle_state)) {
    // Still costs AP even if target is immune
    const new_action_state: CharacterActionState = {
      ...action_state,
      action_points_remaining: action_state.action_points_remaining - attack_type.ap_cost,
      actions_this_turn: [...action_state.actions_this_turn, {
        type: 'attack',
        ap_cost: attack_type.ap_cost,
        target_character_id: request.target_id,
      }],
    };
    context.action_states.set(request.character_id, new_action_state);

    return {
      success: true,
      action_type: 'attack',
      ap_cost: attack_type.ap_cost,
      damage_dealt: 0,
      narrative: `${character.name} uses ${attack_type.name} on ${target.name}, but they are immune to damage!`,
      attacker_state: {
        character_id: request.character_id,
        action_points: new_action_state.action_points_remaining,
      },
      target_state: {
        character_id: request.target_id,
        health: target_battle_state.health,
        is_dead: target_battle_state.is_dead,
      },
    };
  }

  // ==========================================
  // STEP 1: ACCURACY CHECK (with dexterity evasion)
  // ==========================================
  const base_hit_chance = 95 + attack_type.accuracy_modifier;
  const evasion_bonus = calculateEvasionBonus(target_battle_state.dexterity);
  const hit_chance = Math.min(100, Math.max(5, base_hit_chance - evasion_bonus));
  const roll = Math.random() * 100;
  const is_hit = roll < hit_chance;

  if (!is_hit) {
    // Missed!
    const new_action_state: CharacterActionState = {
      ...action_state,
      action_points_remaining: action_state.action_points_remaining - attack_type.ap_cost,
      actions_this_turn: [...action_state.actions_this_turn, {
        type: 'attack',
        ap_cost: attack_type.ap_cost,
        target_character_id: request.target_id,
      }],
    };
    context.action_states.set(request.character_id, new_action_state);

    return {
      success: true,
      action_type: 'attack',
      ap_cost: attack_type.ap_cost,
      damage_dealt: 0,
      narrative: `${character.name} uses ${attack_type.name} on ${target.name} but misses! (Hit chance: ${hit_chance}%)`,
      attacker_state: {
        character_id: request.character_id,
        action_points: new_action_state.action_points_remaining,
      },
      target_state: {
        character_id: request.target_id,
        health: target_battle_state.health,
        is_dead: target_battle_state.is_dead,
      },
    };
  }

  // ==========================================
  // STEP 2: BASE DAMAGE (with NaN validation)
  // ==========================================
  const base_damage = character.attack;
  if (typeof base_damage !== 'number' || isNaN(base_damage) || base_damage < 0) {
    console.error(`❌ Invalid attack stat for ${character.name}: ${base_damage}`);
    return {
      success: false,
      action_type: 'attack',
      ap_cost: 0,
      errors: ['Invalid character attack stat'],
      narrative: `${character.name} attempts to attack but their combat stats are corrupted!`,
    };
  }
  const scaled_damage = Math.floor(base_damage * attack_type.damage_multiplier);
  const damage_type = 'physical';

  // ==========================================
  // STEP 3: DEFENSE REDUCTION (hybrid flat + percentage)
  // ==========================================
  // TODO: Add armor equipment bonus here when armor system is integrated
  // Validate defense stat - default to 0 if invalid
  const total_defense = (typeof target_battle_state.defense === 'number' && !isNaN(target_battle_state.defense))
    ? Math.max(0, target_battle_state.defense)
    : 0;
  const damage_after_defense = calculateDefenseReduction(scaled_damage, total_defense);

  // ==========================================
  // STEP 4: ELEMENTAL RESISTANCE (from damage_type_reference)
  // ==========================================
  const damage_after_resist = await calculateDamageWithResistance(damage_after_defense, damage_type, target_battle_state);

  // ==========================================
  // STEP 5: SHIELDS (ablative HP buffer)
  // ==========================================
  // shield_result.damage_dealt = damage that got THROUGH shields
  const shield_result = applyShields(target_battle_state, damage_after_resist);
  const damage_after_shields = shield_result.damage_dealt;
  const damage_absorbed = damage_after_resist - shield_result.damage_dealt;

  // ==========================================
  // STEP 6: CRITICAL HIT (reduced by target dexterity)
  // ==========================================
  const base_crit_chance = 15;
  const final_crit_chance = calculateCritChance(base_crit_chance, target_battle_state.dexterity);
  const crit_roll = Math.random() * 100;
  const is_crit = crit_roll < final_crit_chance;
  const crit_multiplier = is_crit ? 1.5 : 1.0;

  // ==========================================
  // STEP 7: VARIANCE (±15%)
  // ==========================================
  const variance = 0.85 + Math.random() * 0.3;

  // ==========================================
  // FINAL DAMAGE (with NaN safety check)
  // ==========================================
  let final_damage = Math.max(1, Math.round(damage_after_shields * crit_multiplier * variance));

  // Final NaN safety check - if somehow damage is NaN, log and default to 1
  if (isNaN(final_damage)) {
    console.error(`❌ NaN damage detected! Pipeline: base=${base_damage}, scaled=${scaled_damage}, afterDef=${damage_after_defense}, afterShields=${damage_after_shields}`);
    final_damage = 1; // Minimum damage fallback
  }

  // Apply damage
  target_battle_state.health = Math.max(0, target_battle_state.health - final_damage);

  // Check if killed
  const was_killed = target_battle_state.health <= 0 && !target_battle_state.is_dead;
  if (was_killed) {
    markAsDead(target_battle_state);
  }

  // Update action state
  const new_action_state: CharacterActionState = {
    ...action_state,
    action_points_remaining: action_state.action_points_remaining - attack_type.ap_cost,
    actions_this_turn: [...action_state.actions_this_turn, {
      type: 'attack',
      ap_cost: attack_type.ap_cost,
      target_character_id: request.target_id,
    }],
  };
  context.action_states.set(request.character_id, new_action_state);

  // Apply defense penalty for all-out attacks (stored for next turn)
  if (attack_type.defense_penalty_next_turn > 0) {
    // TODO: Apply status effect for defense reduction next turn
    // This would be handled by the status effect system
  }

  // Build narrative based on attack type
  let narrative = '';
  const crit_text = is_crit ? ' CRITICAL HIT!' : '';

  if (attack_type.id === 'jab') {
    narrative = `${character.name} jabs ${target.name} for ${final_damage} damage!${crit_text}`;
  } else if (attack_type.id === 'heavy') {
    narrative = `${character.name} winds up and delivers a heavy blow to ${target.name} for ${final_damage} damage!${crit_text}`;
  } else if (attack_type.id === 'all_out') {
    narrative = `${character.name} puts everything into an all-out attack on ${target.name} for ${final_damage} damage!${crit_text}`;
  } else {
    narrative = `${character.name} strikes ${target.name} for ${final_damage} damage!${crit_text}`;
  }

  if (damage_absorbed > 0) {
    narrative += ` (${damage_absorbed} absorbed by shields)`;
  }
  if (was_killed) {
    narrative += ` ${target.name} has been defeated!`;
  }

  return {
    success: true,
    action_type: 'attack',
    ap_cost: attack_type.ap_cost,
    damage_dealt: final_damage,
    attacker_state: {
      character_id: request.character_id,
      action_points: new_action_state.action_points_remaining,
    },
    target_state: {
      character_id: request.target_id,
      health: target_battle_state.health,
      is_dead: target_battle_state.is_dead,
    },
    narrative,
  };
}

/**
 * Execute a power action
 */
async function executePowerAction(
  request: PowerActionRequest,
  context: BattleContext,
  character: BattleCharacterData,
  action_state: CharacterActionState
): Promise<BattleActionResult> {
  // power_id is REQUIRED by PowerActionRequest type - no null check needed

  // Find the power in character's equipped powers
  const power = character.equipped_powers.find(p => p.id === request.power_id);
  if (!power) {
    return {
      success: false,
      errors: ['Power not equipped'],
      action_type: 'power',
      ap_cost: 0,
      narrative: 'Power failed - power not in loadout',
    };
  }

  // Get cooldowns for this character - must be initialized in BattleContext
  const character_cooldowns = context.cooldowns.get(request.character_id);
  if (!character_cooldowns) {
    throw new Error(`Cooldowns not initialized for character ${request.character_id} - BattleContext must initialize cooldown Maps for all characters`);
  }
  // Cooldown of 0 means ability is ready - abilities not in the map haven't been used yet (ready)
  const current_cooldown = character_cooldowns.has(request.power_id) ? character_cooldowns.get(request.power_id)! : 0;

  // Get positions
  const caster_pos = context.grid.character_positions.get(request.character_id);
  if (!caster_pos) {
    return {
      success: false,
      errors: ['Caster position not found'],
      action_type: 'power',
      ap_cost: 0,
      narrative: 'Power failed - position unknown',
    };
  }

  // Build target context - target_id is always required
  const target_char = context.characters.get(request.target_id);
  const target_battle_state = context.character_battle_state.get(request.target_id);
  const target_pos = context.grid.character_positions.get(request.target_id);

  if (!target_char) {
    throw new Error(`Target character ${request.target_id} not found in BattleContext.characters`);
  }
  if (!target_battle_state) {
    throw new Error(`Target battle state ${request.target_id} not found in BattleContext.character_battle_state`);
  }
  if (!target_pos) {
    throw new Error(`Target position ${request.target_id} not found in BattleContext.grid.character_positions`);
  }

  const target = {
    id: request.target_id,
    name: target_char.name,
    position: target_pos,
    health: target_battle_state.health,
    max_health: target_battle_state.max_health,
  };

  const power_context: PowerExecutionContext = {
    power,
    caster: {
      id: request.character_id,
      name: character.name,
      position: caster_pos,
      current_ap: action_state.action_points_remaining,
      max_ap: action_state.max_action_points,
    },
    target,
  };

  // Execute power (throws if invalid - UI should prevent this)
  const result = executePower(power_context, current_cooldown);

  // Apply effects
  if (result.effects.length > 0 && request.target_id) {
    const target_state = context.character_battle_state.get(request.target_id);
    if (target_state) {
      const effect_results = applyActionEffects(result.effects, { characters: context.character_battle_state });

      // Apply health changes (validate effect_results exists and has health_changes)
      if (effect_results && effect_results.health_changes) {
        for (const [char_id, change] of effect_results.health_changes) {
          const char_state = context.character_battle_state.get(char_id);
          if (char_state) {
            char_state.health = Math.max(0, Math.min(char_state.max_health, char_state.health + change));
            if (char_state.health <= 0 && !char_state.is_dead) {
              markAsDead(char_state);
            }
          }
        }
      }
    }
  }

  // Update action state
  const new_action_state: CharacterActionState = {
    ...action_state,
    action_points_remaining: action_state.action_points_remaining - result.ap_cost,
    actions_this_turn: [...action_state.actions_this_turn, {
      type: 'power',
      ap_cost: result.ap_cost,
      target_character_id: request.target_id,
      ability_id: request.power_id,
    }],
  };
  context.action_states.set(request.character_id, new_action_state);

  // Set cooldown
  character_cooldowns.set(request.power_id, result.cooldown_turns);
  context.cooldowns.set(request.character_id, character_cooldowns);

  // Calculate damage dealt from effects (with type validation)
  let damage_dealt = 0;
  let healing_done = 0;
  for (const effect of result.effects) {
    // Validate effect has required fields before using
    if (typeof effect?.type === 'string' && typeof effect?.value === 'number' && !isNaN(effect.value)) {
      if (effect.type === 'damage') damage_dealt += effect.value;
      if (effect.type === 'heal') healing_done += effect.value;
    }
  }

  // Build target state - target_id is always required
  const target_battle_state_after = context.character_battle_state.get(request.target_id);
  if (!target_battle_state_after) {
    throw new Error(`Target battle state ${request.target_id} not found after power execution - BattleContext is corrupted`);
  }
  const target_state: PowerTargetStateUpdate = {
    character_id: request.target_id,
    health: target_battle_state_after.health,
  };

  return {
    success: true,
    action_type: 'power',
    ap_cost: result.ap_cost,
    damage_dealt: damage_dealt,
    healing_done: healing_done,
    effects_applied: result.effects,
    attacker_state: {
      character_id: request.character_id,
      action_points: new_action_state.action_points_remaining,
    },
    target_state: target_state,
    narrative: result.narrative,
    cooldown_set: { ability_id: request.power_id, turns: result.cooldown_turns },
  };
}

/**
 * Execute a spell action
 */
async function executeSpellAction(
  request: SpellActionRequest,
  context: BattleContext,
  character: BattleCharacterData,
  action_state: CharacterActionState
): Promise<BattleActionResult> {
  // spell_id is REQUIRED by SpellActionRequest type - no null check needed

  // Find the spell in character's equipped spells
  const spell = character.equipped_spells.find(s => s.id === request.spell_id);
  if (!spell) {
    return {
      success: false,
      errors: ['Spell not equipped'],
      action_type: 'spell',
      ap_cost: 0,
      narrative: 'Spell failed - spell not in loadout',
    };
  }

  // Get character battle state for mana
  const caster_state = context.character_battle_state.get(request.character_id);
  if (!caster_state) {
    return {
      success: false,
      errors: ['Caster state not found'],
      action_type: 'spell',
      ap_cost: 0,
      narrative: 'Spell failed - caster state unknown',
    };
  }

  // Get cooldowns - must be initialized in BattleContext
  const character_cooldowns = context.cooldowns.get(request.character_id);
  if (!character_cooldowns) {
    throw new Error(`Cooldowns not initialized for character ${request.character_id} - BattleContext must initialize cooldown Maps for all characters`);
  }
  const current_cooldown = character_cooldowns.has(request.spell_id) ? character_cooldowns.get(request.spell_id)! : 0;

  // Get positions
  const caster_pos = context.grid.character_positions.get(request.character_id);
  if (!caster_pos) {
    return {
      success: false,
      errors: ['Caster position not found'],
      action_type: 'spell',
      ap_cost: 0,
      narrative: 'Spell failed - position unknown',
    };
  }

  // Build target context - target_id is always required
  const target_char = context.characters.get(request.target_id);
  const target_battle_state = context.character_battle_state.get(request.target_id);
  const target_pos = context.grid.character_positions.get(request.target_id);

  if (!target_char) {
    throw new Error(`Target character ${request.target_id} not found in BattleContext.characters`);
  }
  if (!target_battle_state) {
    throw new Error(`Target battle state ${request.target_id} not found in BattleContext.character_battle_state`);
  }
  if (!target_pos) {
    throw new Error(`Target position ${request.target_id} not found in BattleContext.grid.character_positions`);
  }

  const target = {
    id: request.target_id,
    name: target_char.name,
    position: target_pos,
    health: target_battle_state.health,
    max_health: target_battle_state.max_health,
  };

  const spell_context: SpellExecutionContext = {
    spell,
    caster: {
      id: request.character_id,
      name: character.name,
      position: caster_pos,
      current_ap: action_state.action_points_remaining,
      max_ap: action_state.max_action_points,
      current_mana: character.current_mana,
      max_mana: character.current_max_mana,
    },
    target,
  };

  // Execute spell (throws if invalid - UI should prevent this)
  const result = executeSpell(spell_context, current_cooldown);

  // Validate mana_cost before deducting
  if (result.mana_cost === undefined) {
    throw new Error(`Spell ${request.spell_id} executed successfully but mana_cost is undefined - this is a bug in executeSpell`);
  }

  // Apply effects BEFORE deducting mana (so failed effects don't waste mana)
  let effects_applied = false;
  if (result.effects.length > 0 && request.target_id) {
    const effect_results = applyActionEffects(result.effects, { characters: context.character_battle_state });

    // Validate effect_results exists and has health_changes before iterating
    if (effect_results && effect_results.health_changes) {
      for (const [char_id, change] of effect_results.health_changes) {
        const char_state = context.character_battle_state.get(char_id);
        if (char_state) {
          char_state.health = Math.max(0, Math.min(char_state.max_health, char_state.health + change));
          if (char_state.health <= 0 && !char_state.is_dead) {
            markAsDead(char_state);
          }
          effects_applied = true;
        }
      }
    }
  }

  // Deduct mana after effects are applied (or if spell has no effects, still costs mana)
  if (effects_applied || result.effects.length === 0) {
    character.current_mana -= result.mana_cost;
  } else {
    console.warn(`⚠️ Spell ${request.spell_id} effects failed to apply - mana not consumed`);
  }

  // Update action state
  const new_action_state: CharacterActionState = {
    ...action_state,
    action_points_remaining: action_state.action_points_remaining - result.ap_cost,
    actions_this_turn: [...action_state.actions_this_turn, {
      type: 'spell',
      ap_cost: result.ap_cost,
      target_character_id: request.target_id,
      ability_id: request.spell_id,
    }],
  };
  context.action_states.set(request.character_id, new_action_state);

  // Set cooldown
  character_cooldowns.set(request.spell_id, result.cooldown_turns);
  context.cooldowns.set(request.character_id, character_cooldowns);

  // Calculate damage/healing from effects (with type validation)
  let damage_dealt = 0;
  let healing_done = 0;
  for (const effect of result.effects) {
    // Validate effect has required fields before using
    if (typeof effect?.type === 'string' && typeof effect?.value === 'number' && !isNaN(effect.value)) {
      if (effect.type === 'damage') damage_dealt += effect.value;
      if (effect.type === 'heal') healing_done += effect.value;
    }
  }

  // Build target state - target_id is always required
  const spell_target_battle_state = context.character_battle_state.get(request.target_id);
  if (!spell_target_battle_state) {
    throw new Error(`Target battle state ${request.target_id} not found after spell execution - BattleContext is corrupted`);
  }
  const spell_target_state: SpellTargetStateUpdate = {
    character_id: request.target_id,
    health: spell_target_battle_state.health,
  };

  return {
    success: true,
    action_type: 'spell',
    ap_cost: result.ap_cost,
    mana_cost: result.mana_cost,
    damage_dealt: damage_dealt,
    healing_done: healing_done,
    effects_applied: result.effects,
    attacker_state: {
      character_id: request.character_id,
      action_points: new_action_state.action_points_remaining,
      mana: character.current_mana,
    },
    target_state: spell_target_state,
    narrative: result.narrative,
    cooldown_set: { ability_id: request.spell_id, turns: result.cooldown_turns },
  };
}

/**
 * Execute a defend action
 */
function executeDefend(
  request: DefendActionRequest,
  context: BattleContext,
  character: BattleCharacterData,
  action_state: CharacterActionState
): BattleActionResult {

  // Check AP
  if (action_state.action_points_remaining < ACTION_COSTS.DEFEND) {
    return {
      success: false,
      errors: [`Insufficient AP: need ${ACTION_COSTS.DEFEND}, have ${action_state.action_points_remaining}`],
      action_type: 'defend',
      ap_cost: 0,
      narrative: 'Defend failed - insufficient action points',
    };
  }

  // Get battle state
  const battle_state = context.character_battle_state.get(request.character_id);
  if (!battle_state) {
    return {
      success: false,
      errors: ['Battle state not found'],
      action_type: 'defend',
      ap_cost: 0,
      narrative: 'Defend failed - state unknown',
    };
  }

  // Apply defense buff
  const defense_effect: StatusEffect = {
    type: 'defending',
    category: 'buff',
    duration: 1,
    defense_reduction: -25,  // Negative = increase (reduces incoming damage by 25%)
    source: 'defend_action',
  };

  battle_state.effects.push(defense_effect);

  // Update action state
  const new_action_state: CharacterActionState = {
    ...action_state,
    action_points_remaining: action_state.action_points_remaining - ACTION_COSTS.DEFEND,
    actions_this_turn: [...action_state.actions_this_turn, {
      type: 'defend',
      ap_cost: ACTION_COSTS.DEFEND,
    }],
    can_defend: false,  // Can only defend once per turn
  };
  context.action_states.set(request.character_id, new_action_state);

  return {
    success: true,
    action_type: 'defend',
    ap_cost: ACTION_COSTS.DEFEND,
    effects_applied: [{
      type: 'buff',
      value: 25,
      description: 'Defending - 25% damage reduction until next turn',
    }],
    attacker_state: {
      character_id: request.character_id,
      action_points: new_action_state.action_points_remaining,
      effects_added: [defense_effect],
    },
    narrative: `${character.name} takes a defensive stance!`,
  };
}

/**
 * Execute an item action
 */
async function executeItem(
  request: ItemActionRequest,
  context: BattleContext,
  character: BattleCharacterData,
  action_state: CharacterActionState
): Promise<BattleActionResult> {
  // item_id and user_id are REQUIRED by ItemActionRequest type

  // 1. Load item from user inventory
  const item = await loadItemFromInventory(request.user_id, request.item_id);
  if (!item) {
    return {
      success: false,
      errors: ['Item not found in inventory'],
      action_type: 'item',
      ap_cost: 0,
      narrative: 'Item use failed - item not found',
    };
  }

  // 2. Validate item is usable in battle
  if (!item.battle_usable) {
    return {
      success: false,
      errors: ['Item cannot be used in battle'],
      action_type: 'item',
      ap_cost: 0,
      narrative: `${item.name} cannot be used in battle`,
    };
  }

  // 3. Check AP cost (use ACTION_COSTS.ITEM from hex-engine)
  const ap_cost = ACTION_COSTS.ITEM;
  if (action_state.action_points_remaining < ap_cost) {
    return {
      success: false,
      errors: [`Not enough AP. Need ${ap_cost}, have ${action_state.action_points_remaining}`],
      action_type: 'item',
      ap_cost: 0,
      narrative: 'Item use failed - insufficient action points',
    };
  }

  // 4. Apply item effects
  const effects = await applyItemEffects(
    context,
    request.character_id,
    request.target_id,
    item
  );

  // 5. Consume item
  await consumeItem(request.user_id, request.item_id);

  // 6. Update action state
  const new_action_state: CharacterActionState = {
    ...action_state,
    action_points_remaining: action_state.action_points_remaining - ap_cost,
    actions_this_turn: [...action_state.actions_this_turn, {
      type: 'item',
      ap_cost: ap_cost,
      target_character_id: request.target_id,
    }],
  };
  context.action_states.set(request.character_id, new_action_state);

  // 7. Build target state - target_id is always required
  const item_target_battle_state = context.character_battle_state.get(request.target_id);
  if (!item_target_battle_state) {
    throw new Error(`Target battle state ${request.target_id} not found after item use - BattleContext is corrupted`);
  }
  const target_state: ItemTargetStateUpdate = {
    character_id: request.target_id,
    health: item_target_battle_state.health,
  };

  return {
    success: true,
    action_type: 'item',
    ap_cost: ap_cost,
    effects_applied: effects,
    item_consumed: true,
    attacker_state: {
      character_id: request.character_id,
      action_points: new_action_state.action_points_remaining,
    },
    target_state: target_state,
    narrative: `${character.name} used ${item.name}!`,
  };
}

// ===== ITEM HELPER FUNCTIONS =====

/**
 * Load item from user inventory
 */
async function loadItemFromInventory(user_id: string, item_id: string): Promise<BattleItem | null> {
  // Input validation to prevent invalid queries
  if (!user_id || typeof user_id !== 'string' || user_id.trim().length === 0) {
    console.error('loadItemFromInventory: Invalid user_id');
    return null;
  }
  if (!item_id || typeof item_id !== 'string' || item_id.trim().length === 0) {
    console.error('loadItemFromInventory: Invalid item_id');
    return null;
  }

  try {
    // Check if user has the item
    const userItemResult = await db_adapter.query(
      'SELECT quantity FROM user_items WHERE user_id = $1 AND item_id = $2',
      [user_id, item_id]
    );

    if (userItemResult.rows.length === 0 || userItemResult.rows[0].quantity <= 0) {
      return null;
    }

    // Load item definition
    const itemResult = await db_adapter.query(
      'SELECT id, name, effects, usage_context FROM items WHERE id = $1',
      [item_id]
    );

    if (itemResult.rows.length === 0) {
      return null;
    }

    const item = itemResult.rows[0];

    // Parse effects from JSON string
    const effects = typeof item.effects === 'string'
      ? JSON.parse(item.effects)
      : item.effects;

    // Check if item can be used in battle
    const battle_usable = item.usage_context === 'battle' || item.usage_context === 'anytime';

    return {
      id: item.id,
      name: item.name,
      battle_usable,
      effects,
    };
  } catch (error) {
    console.error('Error loading item from inventory:', error);
    return null;
  }
}

/**
 * Consume item from user inventory
 */
async function consumeItem(user_id: string, item_id: string): Promise<void> {
  try {
    await db_adapter.user_items.remove(user_id, item_id, 1);
  } catch (error) {
    console.error('Error consuming item:', error);
    throw new Error('Failed to consume item');
  }
}

/**
 * Apply item effects to battle
 */
async function applyItemEffects(
  context: BattleContext,
  user_id: string,
  target_id: string | null,
  item: BattleItem
): Promise<ItemEffect[]> {
  const effects: ItemEffect[] = [];

  for (const effect of item.effects) {
    switch (effect.type) {
      case 'heal': {
        const target = target_id
          ? context.character_battle_state.get(target_id)
          : context.character_battle_state.get(user_id);

        if (target) {
          const healAmount = Math.min(effect.value, target.max_health - target.health);
          target.health += healAmount;
          effects.push({
            type: 'heal',
            target_id: target_id || user_id,
            value: healAmount,
            description: `Restored ${healAmount} HP`
          });
        }
        break;
      }

      case 'buff': {
        const target_char_id = target_id || user_id;
        const target = context.character_battle_state.get(target_char_id);

        if (target && effect.stat && effect.duration) {
          // Apply stat buff as status effect
          const buff_effect: StatusEffect = {
            type: `${effect.stat}_buff`,
            category: 'buff',
            duration: effect.duration,
            stat_modifiers: {
              [effect.stat]: effect.value
            },
            source: 'item',
          };
          target.effects.push(buff_effect);

          effects.push({
            type: 'buff',
            target_id: target_char_id,
            value: effect.value,
            stat: effect.stat,
            duration: effect.duration,
            description: `+${effect.value} ${effect.stat} for ${effect.duration} turns`
          });
        }
        break;
      }

      case 'damage': {
        if (target_id) {
          const target = context.character_battle_state.get(target_id);
          if (target) {
            const damage = await calculateDamageWithResistance(effect.value, 'physical', target);
            target.health = Math.max(0, target.health - damage);

            // Check if killed
            if (target.health <= 0 && !target.is_dead) {
              markAsDead(target);
            }

            effects.push({
              type: 'damage',
              target_id,
              value: damage,
              description: `Dealt ${damage} damage`
            });
          }
        }
        break;
      }

      case 'restore_ap': {
        const action_state = context.action_states.get(user_id);
        if (action_state) {
          const restored = Math.min(
            effect.value,
            action_state.max_action_points - action_state.action_points_remaining
          );
          action_state.action_points_remaining += restored;
          effects.push({
            type: 'restore_ap',
            target_id: user_id,
            value: restored,
            description: `Restored ${restored} AP`
          });
        }
        break;
      }

      case 'status_effect': {
        const target_char_id = target_id || user_id;
        const target = context.character_battle_state.get(target_char_id);

        if (target && effect.stat && effect.duration) {
          const status_effect: StatusEffect = {
            type: effect.stat,
            category: 'buff',
            duration: effect.duration,
            value: effect.value,
            source: 'item',
          };
          await applyStatusEffect(target, status_effect);

          effects.push({
            type: 'status_effect',
            target_id: target_char_id,
            value: effect.value,
            stat: effect.stat,
            duration: effect.duration,
            description: `Applied ${effect.stat} effect`
          });
        }
        break;
      }
    }
  }

  return effects;
}

// ===== TURN MANAGEMENT =====

/**
 * Refresh a character's AP at the start of their turn
 * This should be called when the turn order advances to a new character
 */
export function refreshCharacterAP(
  context: BattleContext,
  character_id: string,
  base_action_points: number
): void {
  const action_state = context.action_states.get(character_id);
  if (action_state) {
    action_state.action_points_remaining = base_action_points;
    action_state.max_action_points = base_action_points;
    action_state.actions_this_turn = [];
    action_state.can_move = true;
    action_state.can_attack = true;
    action_state.can_defend = true;
  }
}

// ===== EXPORTS =====

export const BattleActionExecutor = {
  executeAction,
  refreshCharacterAP,
};

export default BattleActionExecutor;
