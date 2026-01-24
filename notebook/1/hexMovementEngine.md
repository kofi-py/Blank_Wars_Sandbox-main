// Hex Movement Engine - Movement validation, pathfinding, and action point management
import { HexGridSystem, HexPosition, HexBattleGrid, PerimeterStatusEffect } from './hexGridSystem';

export interface MoveValidation {
  valid: boolean;
  reason?: string;
  apCost: number;
  willTriggerPerimeter?: boolean;
  path?: HexPosition[];
}

export interface CharacterActionState {
  characterId: string;
  actionPointsRemaining: number;
  actionsThisTurn: ExecutedAction[];
  canMove: boolean;
  canAttack: boolean;
  canDefend: boolean;
}

export interface ExecutedAction {
  type: 'move' | 'attack' | 'defend' | 'power' | 'spell' | 'item';
  apCost: number;
  targetHex?: HexPosition;
  targetCharacterId?: string;
  abilityId?: string; // For powers and spells
  details?: any;
}

export const ACTION_COSTS = {
  MOVE_PER_HEX: 1,
  ATTACK: 2,
  DEFEND: 1,
  POWER: 1, // Variable 1-3 based on rank, this is minimum
  SPELL: 1, // Variable 1-3 based on rank, this is minimum
  ITEM: 1,
  WEAPON_SWAP: 1
} as const;

export class HexMovementEngine {

  /**
   * Check if a character can move to a target hex
   */
  static canMoveTo(
    characterId: string,
    from: HexPosition,
    to: HexPosition,
    grid: HexBattleGrid,
    actionPointsAvailable: number,
    movementPenalty: number = 0  // From status effects like 'mauled' (-50% = 0.5)
  ): MoveValidation {

    const distance = HexGridSystem.distance(from, to);
    let apCost = distance * ACTION_COSTS.MOVE_PER_HEX;

    // Apply movement penalty (e.g., mauled status increases cost)
    if (movementPenalty > 0) {
      apCost = Math.ceil(apCost * (1 + movementPenalty));
    }

    // Check AP availability
    if (apCost > actionPointsAvailable) {
      return {
        valid: false,
        reason: `Not enough action points (need ${apCost}, have ${actionPointsAvailable})`,
        apCost
      };
    }

    // Check if destination is in bounds
    if (!HexGridSystem.isInBounds(to)) {
      return {
        valid: false,
        reason: 'Destination out of bounds',
        apCost
      };
    }

    // Check if destination is occupied by another character
    for (const [charId, charPos] of grid.characterPositions) {
      if (charId === characterId) continue;  // Ignore self

      if (HexGridSystem.equals(charPos, to)) {
        return {
          valid: false,
          reason: `Hex occupied by ${charId}`,
          apCost
        };
      }
    }

    // Check for blocking terrain
    const terrainKey = HexGridSystem.toKey(to);
    const terrain = grid.terrain.get(terrainKey);

    if (terrain === 'broadcast_tower') {
      return {
        valid: false,
        reason: 'Cannot move into broadcast tower',
        apCost
      };
    }

    // Check for perimeter water (allows movement but triggers hazard)
    const willTriggerPerimeter = terrain === 'perimeter_water';

    // Find path (basic straight-line for now)
    const path = this.findStraightPath(from, to);

    return {
      valid: true,
      apCost,
      willTriggerPerimeter,
      path
    };
  }

  /**
   * Get all hexes reachable from a position within AP budget
   */
  static getReachableHexes(
    characterId: string,
    from: HexPosition,
    actionPointsAvailable: number,
    grid: HexBattleGrid,
    movementPenalty: number = 0
  ): HexPosition[] {

    const maxDistance = Math.floor(actionPointsAvailable / (ACTION_COSTS.MOVE_PER_HEX * (1 + movementPenalty)));
    const reachableHexes: HexPosition[] = [];

    // Get all hexes within max distance
    const candidateHexes = HexGridSystem.range(from, maxDistance);

    for (const hex of candidateHexes) {
      // Skip source hex
      if (HexGridSystem.equals(hex, from)) continue;

      // Validate movement to this hex
      const validation = this.canMoveTo(characterId, from, hex, grid, actionPointsAvailable, movementPenalty);

      if (validation.valid) {
        reachableHexes.push(hex);
      }
    }

    return reachableHexes;
  }

  /**
   * Find straight-line path between two hexes
   * (A* pathfinding can be added later for obstacle avoidance)
   */
  static findStraightPath(from: HexPosition, to: HexPosition): HexPosition[] {
    const distance = HexGridSystem.distance(from, to);
    const path: HexPosition[] = [];

    for (let i = 0; i <= distance; i++) {
      const t = distance === 0 ? 0 : i / distance;
      const lerpHex = HexGridSystem.lerp(from, to, t);
      const roundedHex = HexGridSystem.round(lerpHex);

      // Avoid duplicates
      if (path.length === 0 || !HexGridSystem.equals(roundedHex, path[path.length - 1])) {
        path.push(roundedHex);
      }
    }

    return path;
  }

  /**
   * A* pathfinding around obstacles (future enhancement)
   * Returns null if no path exists
   */
  static findPathAroundObstacles(
    from: HexPosition,
    to: HexPosition,
    grid: HexBattleGrid,
    characterId: string,
    maxCost: number
  ): { path: HexPosition[]; cost: number } | null {

    // A* implementation
    const openSet = new Set<string>([HexGridSystem.toKey(from)]);
    const cameFrom = new Map<string, string>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();

    gScore.set(HexGridSystem.toKey(from), 0);
    fScore.set(HexGridSystem.toKey(from), HexGridSystem.distance(from, to));

    while (openSet.size > 0) {
      // Find hex with lowest fScore
      let current: string | null = null;
      let lowestFScore = Infinity;

      for (const hexKey of openSet) {
        const score = fScore.get(hexKey) || Infinity;
        if (score < lowestFScore) {
          lowestFScore = score;
          current = hexKey;
        }
      }

      if (!current) break;

      const currentHex = HexGridSystem.fromKey(current);

      // Check if we reached the goal
      if (HexGridSystem.equals(currentHex, to)) {
        // Reconstruct path
        const path: HexPosition[] = [currentHex];
        let key = current;

        while (cameFrom.has(key)) {
          key = cameFrom.get(key)!;
          path.unshift(HexGridSystem.fromKey(key));
        }

        return {
          path,
          cost: gScore.get(current) || 0
        };
      }

      openSet.delete(current);

      // Check neighbors
      const neighbors = HexGridSystem.neighbors(currentHex);

      for (const neighbor of neighbors) {
        // Skip if out of bounds
        if (!HexGridSystem.isInBounds(neighbor)) continue;

        // Skip if occupied by terrain
        const terrain = grid.terrain.get(HexGridSystem.toKey(neighbor));
        if (terrain === 'broadcast_tower') continue;

        // Skip if occupied by another character (unless it's the destination)
        let occupied = false;
        if (!HexGridSystem.equals(neighbor, to)) {
          for (const [charId, charPos] of grid.characterPositions) {
            if (charId === characterId) continue;
            if (HexGridSystem.equals(charPos, neighbor)) {
              occupied = true;
              break;
            }
          }
        }
        if (occupied) continue;

        // Calculate tentative gScore
        const currentGScore = gScore.get(current) || 0;
        const tentativeGScore = currentGScore + ACTION_COSTS.MOVE_PER_HEX;

        // Skip if exceeds max cost
        if (tentativeGScore > maxCost) continue;

        const neighborKey = HexGridSystem.toKey(neighbor);
        const neighborGScore = gScore.get(neighborKey) || Infinity;

        if (tentativeGScore < neighborGScore) {
          cameFrom.set(neighborKey, current);
          gScore.set(neighborKey, tentativeGScore);
          fScore.set(neighborKey, tentativeGScore + HexGridSystem.distance(neighbor, to));

          if (!openSet.has(neighborKey)) {
            openSet.add(neighborKey);
          }
        }
      }
    }

    return null;  // No path found
  }

  /**
   * Calculate movement penalty from status effects
   */
  static getMovementPenalty(statusEffects: PerimeterStatusEffect[]): number {
    let totalPenalty = 0;

    for (const effect of statusEffects) {
      if (effect.status === 'mauled' && effect.movementPenalty) {
        totalPenalty += effect.movementPenalty;
      }
    }

    return Math.min(totalPenalty, 0.9);  // Cap at 90% penalty (can't fully immobilize)
  }

  /**
   * Initialize action state for a character at turn start
   */
  static initializeActionState(characterId: string): CharacterActionState {
    return {
      characterId,
      actionPointsRemaining: 3,  // Base 3 AP per turn
      actionsThisTurn: [],
      canMove: true,
      canAttack: true,
      canDefend: true
    };
  }

  /**
   * Execute an action and update action state
   */
  static executeAction(
    actionState: CharacterActionState,
    action: ExecutedAction
  ): { success: boolean; reason?: string; newState: CharacterActionState } {

    // Check if character has enough AP
    if (action.apCost > actionState.actionPointsRemaining) {
      return {
        success: false,
        reason: `Not enough action points (need ${action.apCost}, have ${actionState.actionPointsRemaining})`,
        newState: actionState
      };
    }

    // Check if action type is allowed
    if (action.type === 'move' && !actionState.canMove) {
      return {
        success: false,
        reason: 'Cannot move this turn',
        newState: actionState
      };
    }

    if (action.type === 'attack' && !actionState.canAttack) {
      return {
        success: false,
        reason: 'Cannot attack this turn',
        newState: actionState
      };
    }

    // Execute action
    const newState: CharacterActionState = {
      ...actionState,
      actionPointsRemaining: actionState.actionPointsRemaining - action.apCost,
      actionsThisTurn: [...actionState.actionsThisTurn, action]
    };

    // Update availability flags based on remaining AP
    if (newState.actionPointsRemaining < ACTION_COSTS.MOVE_PER_HEX) {
      newState.canMove = false;
    }

    if (newState.actionPointsRemaining < ACTION_COSTS.ATTACK) {
      newState.canAttack = false;
    }

    return {
      success: true,
      newState
    };
  }

  /**
   * Get available action types based on remaining AP
   */
  static getAvailableActions(actionState: CharacterActionState): string[] {
    const available: string[] = [];

    if (actionState.actionPointsRemaining >= ACTION_COSTS.MOVE_PER_HEX && actionState.canMove) {
      available.push('move');
    }

    if (actionState.actionPointsRemaining >= ACTION_COSTS.ATTACK && actionState.canAttack) {
      available.push('attack');
    }

    if (actionState.actionPointsRemaining >= ACTION_COSTS.DEFEND) {
      available.push('defend');
    }

    if (actionState.actionPointsRemaining >= ACTION_COSTS.POWER) {
      available.push('power');
    }

    if (actionState.actionPointsRemaining >= ACTION_COSTS.SPELL) {
      available.push('spell');
    }

    if (actionState.actionPointsRemaining >= ACTION_COSTS.ITEM) {
      available.push('item');
    }

    return available;
  }

  /**
   * Validate an action sequence (e.g., "move 2, attack" = 1*2 + 2 = 4 AP, invalid)
   */
  static validateActionSequence(
    actions: ExecutedAction[],
    maxAP: number = 3
  ): { valid: boolean; reason?: string; totalCost: number } {

    const totalCost = actions.reduce((sum, action) => sum + action.apCost, 0);

    if (totalCost > maxAP) {
      return {
        valid: false,
        reason: `Action sequence costs ${totalCost} AP, but only ${maxAP} available`,
        totalCost
      };
    }

    // No artificial restrictions - only AP limit matters
    // Powers and spells can be combined freely as long as you have the AP

    return {
      valid: true,
      totalCost
    };
  }
}
