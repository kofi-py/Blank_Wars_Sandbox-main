// Action Survey Generator
// Generates all possible actions a character could take during their turn
// Used when: 1) Planned action becomes unavailable, 2) Character fails adherence check

import { type BattleCharacter, type BattleState } from '@/data/battleFlow';
import { type PlannedAction, type ActionStep } from '@/components/battle/CharacterActionPlanner';
import { HexGridSystem, type HexPosition, type HexBattleGrid } from '@/systems/hexGridSystem';

export interface SurveyOption extends ActionStep {
  id: string; // Unique identifier for this option
  label: string; // Human-readable description
  priority_weight: number; // For Plan B weighting (default 0)
}

export interface ActionSurvey {
  options: SurveyOption[];
  context: {
    character_id: string;
    turn_number: number;
    ap_available: number;
  };
}

/**
 * Generate complete action survey for a character
 * Returns ALL possible actions they could take this turn
 * @param grid - Optional hex grid state for accurate position lookups
 */
export function generateActionSurvey(
  character: BattleCharacter,
  battle_state: BattleState,
  ap_available: number = 3,
  grid?: HexBattleGrid
): ActionSurvey {
  const options: SurveyOption[] = [];
  const character_id = character.character.id;

  // Store grid reference for helper functions
  _gridRef = grid;

  // Get current character position from grid (preferred) or fallback
  const currentPosition = grid
    ? grid.character_positions.get(character_id) || null
    : getCharacterPositionFallback(character_id, battle_state);

  console.log(`🎯 Survey: ${character.character.name} position:`, currentPosition, 'AP:', ap_available);

  // A. Movement Options
  if (currentPosition) {
    // Calculate max movement range based on available AP (1 AP per hex)
    const max_movement_range = Math.min(ap_available, 3); // Cap at 3 to prevent excessive options
    const reachableHexes = HexGridSystem.range(currentPosition, max_movement_range);
    for (const hex of reachableHexes) {
      // Check bounds - arena is bounded to |q| <= 6, |r| <= 6, |s| <= 6
      const isInBounds = Math.abs(hex.q) <= 6 && Math.abs(hex.r) <= 6 && Math.abs(hex.s) <= 6;
      if (!isInBounds) continue;

      // Check if hex is not occupied
      if (!isHexOccupied(hex, battle_state)) {
        // Calculate actual AP cost based on distance
        const distance = HexGridSystem.distance(currentPosition, hex);
        const move_ap_cost = distance; // 1 AP per hex

        // Only include if character has enough AP
        if (move_ap_cost <= ap_available) {
          options.push({
            id: `move_${hex.q}_${hex.r}`,
            type: 'move',
            label: `Move to (${hex.q}, ${hex.r})`,
            ap_cost: move_ap_cost,
            target_hex: hex,
            priority_weight: 0
          });
        }
      }
    }
  }

  // B. Attack Options (for each alive enemy IN RANGE)
  const enemies = getAliveEnemies(character, battle_state);
  const weaponName = character.character.equipped_items?.weapon?.name || 'basic attack';
  const attackRange = character.character.equipped_items?.weapon?.range || 1; // Default melee range

  for (const enemy of enemies) {
    // Check if enemy is in attack range
    const enemyPosition = getEnemyPosition(enemy.character.id);
    const distanceToEnemy = currentPosition && enemyPosition
      ? HexGridSystem.distance(currentPosition, enemyPosition)
      : Infinity;

    const inRange = distanceToEnemy <= attackRange;

    // Basic attack (2 AP) - only if in range
    if (ap_available >= 2 && inRange) {
      options.push({
        id: `attack_${enemy.character.id}_basic`,
        type: 'attack',
        label: `Attack ${enemy.character.name} with ${weaponName}`,
        ap_cost: 2,
        target_id: enemy.character.id,
        ability_type: 'basic_attack',
        priority_weight: 0
      });
    }

    // Power attack (3 AP) - only if in range
    if (ap_available >= 3 && inRange) {
      options.push({
        id: `attack_${enemy.character.id}_power`,
        type: 'attack',
        label: `Power Attack ${enemy.character.name}`,
        ap_cost: 3,
        target_id: enemy.character.id,
        ability_type: 'power_attack',
        priority_weight: 0
      });
    }

    // Powers (filter by cooldown, AP, and RANGE)
    for (const power of character.unlocked_powers) {
      const cooldown = character.power_cooldowns.get(power.id) || 0;
      const powerCost = power.current_rank;
      // Powers have range 3 by default (can be overridden by power.range if exists)
      const powerRange = (power as any).range || 3;
      const inPowerRange = distanceToEnemy <= powerRange;

      if (cooldown === 0 && ap_available >= powerCost && inPowerRange) {
        options.push({
          id: `power_${power.id}_${enemy.character.id}`,
          type: 'power',
          label: `Use ${power.name} on ${enemy.character.name}`,
          ap_cost: powerCost,
          ability_id: power.id,
          ability_type: 'power',
          ability_name: power.name,
          target_id: enemy.character.id,
          priority_weight: 0
        });
      }
    }

    // Spells (filter by cooldown, mana, AP, and RANGE)
    for (const spell of character.unlocked_spells) {
      const cooldown = character.spell_cooldowns.get(spell.id) || 0;
      const hasEnoughMana = character.current_mana >= spell.mana_cost;
      const spellCost = spell.current_rank || 1;
      // Spells have range 4 by default (can be overridden by spell.range if exists)
      const spellRange = (spell as any).range || 4;
      const inSpellRange = distanceToEnemy <= spellRange;

      if (cooldown === 0 && hasEnoughMana && ap_available >= spellCost && inSpellRange) {
        options.push({
          id: `spell_${spell.id}_${enemy.character.id}`,
          type: 'spell',
          label: `Cast ${spell.name} at ${enemy.character.name} (${spell.mana_cost} mana)`,
          ap_cost: spellCost,
          ability_id: spell.id,
          ability_type: 'spell',
          ability_name: spell.name,
          target_id: enemy.character.id,
          priority_weight: 0
        });
      }
    }
  }

  // C. Defensive Option
  options.push({
    id: 'defend',
    type: 'defend',
    label: 'Take defensive stance',
    ap_cost: 1,
    priority_weight: 0
  });

  // D. Wildcard Chaos Actions (for rebellion scenarios)
  options.push(...generateChaosActions(character, battle_state, ap_available));

  return {
    options,
    context: {
      character_id: character.character.id,
      turn_number: battle_state.current_round,
      ap_available
    }
  };
}

/**
 * Apply Plan B weighting to survey options
 * Adjusts priority weights based on coach's Plan B selection
 */
export function applyPlanBWeighting(
  survey: ActionSurvey,
  plan_b: PlannedAction['plan_b']
): ActionSurvey {
  const weightedOptions = survey.options.map(option => {
    let weight = 0;

    switch (plan_b) {
      case 'aggressive':
        // Prioritize damage-dealing actions
        if (option.type === 'attack') {
          weight = option.ability_type === 'power_attack' ? 75 : 50;
        } else if (option.type === 'power' || option.type === 'spell') {
          weight = 40;
        } else if (option.type === 'defend') {
          weight = -30;
        } else if (option.type === 'move') {
          weight = -20;
        }
        break;

      case 'defensive':
        // Prioritize survival and defense
        if (option.type === 'defend') {
          weight = 50;
        } else if (option.type === 'move') {
          weight = 30; // Repositioning to safety
        } else if (option.type === 'attack' && option.ability_type === 'power_attack') {
          weight = -40; // Risky all-in attacks
        }
        break;

      case 'supportive':
        // Prioritize helping teammates (when support abilities exist)
        // For now, deprioritize selfish aggressive actions
        if (option.type === 'attack' && option.ability_type === 'power_attack') {
          weight = -30;
        } else if (option.type === 'defend') {
          weight = 20; // Staying alive to help team
        }
        break;

      case 'tactical':
        // Balanced approach, slight preference for positioning
        if (option.type === 'move') {
          weight = 20;
        } else if (option.type === 'attack' && option.ability_type === 'basic_attack') {
          weight = 10; // Steady, reliable damage
        }
        break;
    }

    return {
      ...option,
      priority_weight: weight
    };
  });

  return {
    ...survey,
    options: weightedOptions
  };
}

/**
 * Select action from weighted survey
 * Higher priority weights are more likely to be selected
 */
export function selectFromSurvey(survey: ActionSurvey): SurveyOption {
  const options = survey.options;

  // Normalize weights to positive values
  const minWeight = Math.min(...options.map(o => o.priority_weight));
  const normalizedOptions = options.map(o => ({
    ...o,
    normalized_weight: o.priority_weight - minWeight + 1 // Ensure all weights are >= 1
  }));

  // Calculate total weight
  const totalWeight = normalizedOptions.reduce((sum, o) => sum + o.normalized_weight, 0);

  // Weighted random selection
  let random = Math.random() * totalWeight;
  for (const option of normalizedOptions) {
    random -= option.normalized_weight;
    if (random <= 0) {
      return option;
    }
  }

  // Fallback: return first option
  return options[0];
}

// ===== Helper Functions =====

function getCharacterPositionFallback(
  character_id: string,
  battle_state: BattleState
): HexPosition | null {
  // Fallback when grid is not provided - should not normally be used
  console.warn('⚠️ getCharacterPositionFallback called - grid should be passed to generateActionSurvey');
  return null;
}

// Grid-aware version for checking hex occupation
let _gridRef: HexBattleGrid | undefined;

function isHexOccupied(hex: HexPosition, battle_state: BattleState): boolean {
  if (_gridRef) {
    // Use actual grid positions
    for (const [_, pos] of _gridRef.character_positions) {
      if (pos.q === hex.q && pos.r === hex.r && pos.s === hex.s) {
        return true;
      }
    }
    return false;
  }
  // Fallback - assume not occupied (less accurate)
  return false;
}

// Get enemy position from grid
function getEnemyPosition(enemy_id: string): HexPosition | null {
  if (!_gridRef) {
    console.warn('⚠️ getEnemyPosition called without grid - range checks will fail');
    return null;
  }
  return _gridRef.character_positions.get(enemy_id) || null;
}

function getAliveEnemies(
  character: BattleCharacter,
  battle_state: BattleState
): BattleCharacter[] {
  // Determine if character is on player or opponent team
  const isPlayerTeam = battle_state.teams.player.characters.some(
    c => c.character.id === character.character.id
  );

  const enemyTeam = isPlayerTeam
    ? battle_state.teams.opponent.characters
    : battle_state.teams.player.characters;

  return enemyTeam.filter(e => e.current_health > 0);
}

function generateChaosActions(
  character: BattleCharacter,
  battle_state: BattleState,
  ap_available: number
): SurveyOption[] {
  const chaosOptions: SurveyOption[] = [];

  // Flee attempt (always fails but character can try)
  chaosOptions.push({
    id: 'chaos_flee',
    type: 'move',
    label: 'Attempt to flee battle (will fail)',
    ap_cost: 3,
    priority_weight: -100, // Very unlikely unless severely stressed
    target_hex: { q: -99, r: -99, s: 198 } // Invalid hex = flee attempt
  });

  // Refuse to fight
  chaosOptions.push({
    id: 'chaos_refuse',
    type: 'defend',
    label: 'Refuse to fight this turn',
    ap_cost: 0,
    priority_weight: -80
  });

  // Attack teammate (friendly fire) - only if VERY low team trust
  const teammates = battle_state.teams.player.characters.filter(
    c => c.character.id !== character.character.id && c.current_health > 0
  );

  if (character.mental_state.team_trust < 20 && teammates.length > 0) {
    for (const teammate of teammates) {
      chaosOptions.push({
        id: `chaos_friendly_fire_${teammate.character.id}`,
        type: 'attack',
        label: `Attack teammate ${teammate.character.name} (rebellion!)`,
        ap_cost: 2,
        target_id: teammate.character.id,
        ability_type: 'basic_attack',
        priority_weight: -90
      });
    }
  }

  return chaosOptions;
}
