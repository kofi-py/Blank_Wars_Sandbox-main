
import {
  CharacterActionState,
  ACTION_COSTS
} from '@blankwars/hex-engine';
import { BattleContext } from './battleActionExecutor';
import { BattleCharacterData } from './battleCharacterLoader';
import { db_adapter } from './databaseAdapter';

export interface BattleActionOption {
  type: 'move' | 'attack' | 'power' | 'spell' | 'defend' | 'item' | 'end_turn' | 'refuse' | 'flee' | 'friendly_fire';
  id: string | number; // Unique ID for this option
  label: string; // Display name
  ap_cost: number;
  description?: string;
  is_valid: boolean;
  invalid_reason?: string;
  metadata?: any; // Extra data like range, damage multiplier, etc.
  is_coach_order?: boolean;
  target_id?: string;
  ability_id?: string;
}

export interface CoachOrder {
  action_type: string;
  target_id?: string;
  attack_type_id?: string;
  ability_id?: string;
  target_hex?: { q: number; r: number; s: number };  // For move actions
  label: string;
}



import { getAllAttackTypes } from './attackTypesService';

/**
 * Generate all possible actions for a character in their current state
 */
export async function generateActionOptions(
  character_id: string,
  context: BattleContext,
  coach_order?: CoachOrder
): Promise<BattleActionOption[]> {
  const options: BattleActionOption[] = [];
  const action_state = context.action_states.get(character_id);
  const character = context.characters.get(character_id);

  if (!action_state || !character) return [];

  // Helper to check if option matches coach order
  const isCoachOrder = (opt: Partial<BattleActionOption>) => {
    if (!coach_order) return false;
    if (opt.type !== coach_order.action_type) return false;

    if (opt.type === 'attack') {
      return opt.target_id === coach_order.target_id &&
        opt.metadata?.attack_type_id === coach_order.attack_type_id;
    }
    if (opt.type === 'power' || opt.type === 'spell') {
      return opt.ability_id === coach_order.ability_id &&
        opt.target_id === coach_order.target_id;
    }
    return true; // For simple actions like defend/end_turn
  };

  // 1. ATTACK OPTIONS - Generate per target per attack type
  if (action_state.can_attack) {
    const attack_types = await getAllAttackTypes();

    // Find all enemy targets (characters with different user_id)
    const enemies: BattleCharacterData[] = [];
    for (const [char_id, char_data] of context.characters) {
      if (char_id !== character_id && char_data.user_id !== character.user_id) {
        // Check if enemy is alive (health > 0)
        const enemy_battle_state = context.character_battle_state.get(char_id);
        if (enemy_battle_state && enemy_battle_state.health > 0) {
          enemies.push(char_data);
        }
      }
    }

    // Generate attack option for each attack type x each target
    for (const type of attack_types) {
      const hasEnoughAP = action_state.action_points_remaining >= type.ap_cost;

      for (const target of enemies) {
        const option: BattleActionOption = {
          type: 'attack',
          id: `attack_${type.id}_${target.id}`,
          label: `${type.name} on ${target.name}`,
          ap_cost: type.ap_cost,
          description: `Dmg: ${type.damage_multiplier}x | Acc: ${type.accuracy_modifier > 0 ? '+' : ''}${type.accuracy_modifier}`,
          is_valid: hasEnoughAP,
          invalid_reason: hasEnoughAP ? undefined : 'Insufficient AP',
          metadata: {
            attack_type_id: type.id,
            damage_multiplier: type.damage_multiplier,
            accuracy_modifier: type.accuracy_modifier
          },
          target_id: target.id
        };

        // Mark if this is exactly the coach's order
        if (coach_order &&
          coach_order.action_type === 'attack' &&
          coach_order.attack_type_id === type.id &&
          coach_order.target_id === target.id) {
          option.is_coach_order = true;
        }

        options.push(option);
      }
    }
  }

  // 2. DEFEND OPTION
  const canDefend = action_state.can_defend && action_state.action_points_remaining >= ACTION_COSTS.DEFEND;
  options.push({
    type: 'defend',
    id: 'defend_standard',
    label: 'Defend',
    ap_cost: ACTION_COSTS.DEFEND,
    description: 'Reduce incoming damage by 25%',
    is_valid: canDefend,
    invalid_reason: !action_state.can_defend ? 'Already defended' : (!canDefend ? 'Insufficient AP' : undefined),
    is_coach_order: coach_order?.action_type === 'defend'
  });

  // 3. END TURN OPTION
  options.push({
    type: 'end_turn',
    id: 'end_turn',
    label: 'End Turn',
    ap_cost: 0,
    is_valid: true
  });

  return options;
}

/**
 * Filter options to find valid rebellion choices (excluding the coach's order)
 */
export function getRebellionOptions(options: BattleActionOption[]): BattleActionOption[] {
  return options.filter(o => o.is_valid && !o.is_coach_order);
}

/**
 * Format options for LLM prompt
 */
export function formatOptionsForPrompt(options: BattleActionOption[]): string {
  return options.map((o, index) => `${index + 1}. ${o.label} (${o.description || ''})`).join('\n');
}

/**
 * Find option by index (1-based from prompt)
 */
export function findOptionById(options: BattleActionOption[], index: number): BattleActionOption | undefined {
  return options[index - 1];
}
