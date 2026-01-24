"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HexMovementEngine = exports.ACTION_COSTS = exports.BASE_ACTION_POINTS = void 0;
// Hex Movement Engine - Movement validation, pathfinding, and action point management
const hexGridSystem_1 = require("./hexGridSystem");
exports.BASE_ACTION_POINTS = 3; // AP per turn - game constant
exports.ACTION_COSTS = {
    MOVE_PER_HEX: 1,
    ATTACK: 2,
    DEFEND: 1,
    POWER: 1, // Variable 1-3 based on rank, this is minimum
    SPELL: 1, // Variable 1-3 based on rank, this is minimum
    ITEM: 1,
    WEAPON_SWAP: 1
};
class HexMovementEngine {
    /**
     * Check if a character can move to a target hex
     */
    static canMoveTo(character_id, from, to, grid, action_points_available, movement_penalty = 0 // From status effects like 'mauled' (-50% = 0.5)
    ) {
        const distance = hexGridSystem_1.HexGridSystem.distance(from, to);
        let ap_cost = distance * exports.ACTION_COSTS.MOVE_PER_HEX;
        // Apply movement penalty (e.g., mauled status increases cost)
        if (movement_penalty > 0) {
            ap_cost = Math.ceil(ap_cost * (1 + movement_penalty));
        }
        // Check AP availability
        if (ap_cost > action_points_available) {
            return {
                valid: false,
                reason: `Not enough action points (need ${ap_cost}, have ${action_points_available})`,
                ap_cost
            };
        }
        // Check if destination is in bounds
        if (!hexGridSystem_1.HexGridSystem.isInBounds(to)) {
            return {
                valid: false,
                reason: 'Destination out of bounds',
                ap_cost
            };
        }
        // Check if destination is occupied by another character
        for (const [charId, charPos] of grid.character_positions) {
            if (charId === character_id)
                continue; // Ignore self
            if (hexGridSystem_1.HexGridSystem.equals(charPos, to)) {
                return {
                    valid: false,
                    reason: `Hex occupied by ${charId}`,
                    ap_cost
                };
            }
        }
        // Check for blocking terrain
        const terrainKey = hexGridSystem_1.HexGridSystem.toKey(to);
        const terrain = grid.terrain.get(terrainKey);
        if (terrain === 'broadcast_tower') {
            return {
                valid: false,
                reason: 'Cannot move into broadcast tower',
                ap_cost
            };
        }
        // Check for perimeter water (allows movement but triggers hazard)
        const willTriggerPerimeter = terrain === 'perimeter_water';
        // Find path (basic straight-line for now)
        const path = this.findStraightPath(from, to);
        return {
            valid: true,
            ap_cost,
            will_trigger_perimeter: willTriggerPerimeter,
            path
        };
    }
    /**
     * Get all hexes reachable from a position within AP budget
     */
    static getReachableHexes(character_id, from, action_points_available, grid, movement_penalty = 0) {
        const maxDistance = Math.floor(action_points_available / (exports.ACTION_COSTS.MOVE_PER_HEX * (1 + movement_penalty)));
        const reachableHexes = [];
        // Get all hexes within max distance
        const candidateHexes = hexGridSystem_1.HexGridSystem.range(from, maxDistance);
        let rejected_count = 0;
        const rejection_reasons = {};
        for (const hex of candidateHexes) {
            // Skip source hex
            if (hexGridSystem_1.HexGridSystem.equals(hex, from))
                continue;
            // Validate movement to this hex
            const validation = this.canMoveTo(character_id, from, hex, grid, action_points_available, movement_penalty);
            if (validation.valid) {
                reachableHexes.push(hex);
            }
            else {
                rejected_count++;
                const reason = validation.reason || 'unknown';
                rejection_reasons[reason] = (rejection_reasons[reason] || 0) + 1;
            }
        }
        // Rejections are normal (out of bounds, occupied, etc) - no logging needed
        return reachableHexes;
    }
    /**
     * Find straight-line path between two hexes
     * (A* pathfinding can be added later for obstacle avoidance)
     */
    static findStraightPath(from, to) {
        const distance = hexGridSystem_1.HexGridSystem.distance(from, to);
        const path = [];
        for (let i = 0; i <= distance; i++) {
            const t = distance === 0 ? 0 : i / distance;
            const lerpHex = hexGridSystem_1.HexGridSystem.lerp(from, to, t);
            const roundedHex = hexGridSystem_1.HexGridSystem.round(lerpHex);
            // Avoid duplicates
            if (path.length === 0 || !hexGridSystem_1.HexGridSystem.equals(roundedHex, path[path.length - 1])) {
                path.push(roundedHex);
            }
        }
        return path;
    }
    /**
     * A* pathfinding around obstacles (future enhancement)
     * Returns null if no path exists
     */
    static findPathAroundObstacles(from, to, grid, character_id, max_cost) {
        // A* implementation
        const openSet = new Set([hexGridSystem_1.HexGridSystem.toKey(from)]);
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();
        gScore.set(hexGridSystem_1.HexGridSystem.toKey(from), 0);
        fScore.set(hexGridSystem_1.HexGridSystem.toKey(from), hexGridSystem_1.HexGridSystem.distance(from, to));
        while (openSet.size > 0) {
            // Find hex with lowest fScore
            let current = null;
            let lowestFScore = Infinity;
            for (const hexKey of openSet) {
                const score = fScore.get(hexKey) || Infinity;
                if (score < lowestFScore) {
                    lowestFScore = score;
                    current = hexKey;
                }
            }
            if (!current)
                break;
            const currentHex = hexGridSystem_1.HexGridSystem.fromKey(current);
            // Check if we reached the goal
            if (hexGridSystem_1.HexGridSystem.equals(currentHex, to)) {
                // Reconstruct path
                const path = [currentHex];
                let key = current;
                while (cameFrom.has(key)) {
                    key = cameFrom.get(key);
                    path.unshift(hexGridSystem_1.HexGridSystem.fromKey(key));
                }
                return {
                    path,
                    cost: gScore.get(current) || 0
                };
            }
            openSet.delete(current);
            // Check neighbors
            const neighbors = hexGridSystem_1.HexGridSystem.neighbors(currentHex);
            for (const neighbor of neighbors) {
                // Skip if out of bounds
                if (!hexGridSystem_1.HexGridSystem.isInBounds(neighbor))
                    continue;
                // Skip if occupied by terrain
                const terrain = grid.terrain.get(hexGridSystem_1.HexGridSystem.toKey(neighbor));
                if (terrain === 'broadcast_tower')
                    continue;
                // Skip if occupied by another character (unless it's the destination)
                let occupied = false;
                if (!hexGridSystem_1.HexGridSystem.equals(neighbor, to)) {
                    for (const [charId, charPos] of grid.character_positions) {
                        if (charId === character_id)
                            continue;
                        if (hexGridSystem_1.HexGridSystem.equals(charPos, neighbor)) {
                            occupied = true;
                            break;
                        }
                    }
                }
                if (occupied)
                    continue;
                // Calculate tentative gScore
                const currentGScore = gScore.get(current) || 0;
                const tentativeGScore = currentGScore + exports.ACTION_COSTS.MOVE_PER_HEX;
                // Skip if exceeds max cost
                if (tentativeGScore > max_cost)
                    continue;
                const neighborKey = hexGridSystem_1.HexGridSystem.toKey(neighbor);
                const neighborGScore = gScore.get(neighborKey) || Infinity;
                if (tentativeGScore < neighborGScore) {
                    cameFrom.set(neighborKey, current);
                    gScore.set(neighborKey, tentativeGScore);
                    fScore.set(neighborKey, tentativeGScore + hexGridSystem_1.HexGridSystem.distance(neighbor, to));
                    if (!openSet.has(neighborKey)) {
                        openSet.add(neighborKey);
                    }
                }
            }
        }
        return null; // No path found
    }
    /**
     * Calculate movement penalty from status effects
     */
    static getMovementPenalty(status_effects) {
        let totalPenalty = 0;
        for (const effect of status_effects) {
            if (effect.status === 'mauled' && effect.movement_penalty) {
                totalPenalty += effect.movement_penalty;
            }
        }
        return Math.min(totalPenalty, 0.9); // Cap at 90% penalty (can't fully immobilize)
    }
    /**
     * Initialize action state for a character at turn start
     * @param max_ap - Maximum AP for this character this turn (includes buffs/debuffs)
     */
    static initializeActionState(character_id, max_ap = exports.BASE_ACTION_POINTS) {
        return {
            character_id,
            max_action_points: max_ap,
            action_points_remaining: max_ap,
            actions_this_turn: [],
            can_move: true,
            can_attack: true,
            can_defend: true
        };
    }
    /**
     * Execute an action and update action state
     */
    static executeAction(action_state, action) {
        // Check if character has enough AP
        if (action.ap_cost > action_state.action_points_remaining) {
            return {
                success: false,
                reason: `Not enough action points (need ${action.ap_cost}, have ${action_state.action_points_remaining})`,
                new_state: action_state
            };
        }
        // Check if action type is allowed
        if (action.type === 'move' && !action_state.can_move) {
            return {
                success: false,
                reason: 'Cannot move this turn',
                new_state: action_state
            };
        }
        if (action.type === 'attack' && !action_state.can_attack) {
            return {
                success: false,
                reason: 'Cannot attack this turn',
                new_state: action_state
            };
        }
        // Execute action
        const new_state = {
            ...action_state,
            action_points_remaining: action_state.action_points_remaining - action.ap_cost,
            actions_this_turn: [...action_state.actions_this_turn, action]
        };
        // Update availability flags based on remaining AP
        if (new_state.action_points_remaining < exports.ACTION_COSTS.MOVE_PER_HEX) {
            new_state.can_move = false;
        }
        if (new_state.action_points_remaining < exports.ACTION_COSTS.ATTACK) {
            new_state.can_attack = false;
        }
        return {
            success: true,
            new_state
        };
    }
    /**
     * Get available action types based on remaining AP
     */
    static getAvailableActions(actionState) {
        const available = [];
        if (actionState.action_points_remaining >= exports.ACTION_COSTS.MOVE_PER_HEX && actionState.can_move) {
            available.push('move');
        }
        if (actionState.action_points_remaining >= exports.ACTION_COSTS.ATTACK && actionState.can_attack) {
            available.push('attack');
        }
        if (actionState.action_points_remaining >= exports.ACTION_COSTS.DEFEND) {
            available.push('defend');
        }
        if (actionState.action_points_remaining >= exports.ACTION_COSTS.POWER) {
            available.push('power');
        }
        if (actionState.action_points_remaining >= exports.ACTION_COSTS.SPELL) {
            available.push('spell');
        }
        if (actionState.action_points_remaining >= exports.ACTION_COSTS.ITEM) {
            available.push('item');
        }
        return available;
    }
    /**
     * Validate an action sequence (e.g., "move 2, attack" = 1*2 + 2 = 4 AP, invalid)
     */
    static validateActionSequence(actions, max_ap = 3) {
        const totalCost = actions.reduce((sum, action) => sum + action.ap_cost, 0);
        if (totalCost > max_ap) {
            return {
                valid: false,
                reason: `Action sequence costs ${totalCost} AP, but only ${max_ap} available`,
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
exports.HexMovementEngine = HexMovementEngine;
