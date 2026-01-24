import { HexPosition, HexBattleGrid, PerimeterStatusEffect } from './hexGridSystem';
export interface MoveValidation {
    valid: boolean;
    reason?: string;
    ap_cost: number;
    will_trigger_perimeter?: boolean;
    path?: HexPosition[];
}
export interface CharacterActionState {
    character_id: string;
    max_action_points: number;
    action_points_remaining: number;
    actions_this_turn: ExecutedAction[];
    can_move: boolean;
    can_attack: boolean;
    can_defend: boolean;
}
export interface ExecutedAction {
    type: 'move' | 'attack' | 'defend' | 'power' | 'spell' | 'item';
    ap_cost: number;
    target_hex?: HexPosition;
    target_character_id?: string;
    ability_id?: string;
    details?: any;
}
export declare const BASE_ACTION_POINTS = 3;
export declare const ACTION_COSTS: {
    readonly MOVE_PER_HEX: 1;
    readonly ATTACK: 2;
    readonly DEFEND: 1;
    readonly POWER: 1;
    readonly SPELL: 1;
    readonly ITEM: 1;
    readonly WEAPON_SWAP: 1;
};
export declare class HexMovementEngine {
    /**
     * Check if a character can move to a target hex
     */
    static canMoveTo(character_id: string, from: HexPosition, to: HexPosition, grid: HexBattleGrid, action_points_available: number, movement_penalty?: number): MoveValidation;
    /**
     * Get all hexes reachable from a position within AP budget
     */
    static getReachableHexes(character_id: string, from: HexPosition, action_points_available: number, grid: HexBattleGrid, movement_penalty?: number): HexPosition[];
    /**
     * Find straight-line path between two hexes
     * (A* pathfinding can be added later for obstacle avoidance)
     */
    static findStraightPath(from: HexPosition, to: HexPosition): HexPosition[];
    /**
     * A* pathfinding around obstacles (future enhancement)
     * Returns null if no path exists
     */
    static findPathAroundObstacles(from: HexPosition, to: HexPosition, grid: HexBattleGrid, character_id: string, max_cost: number): {
        path: HexPosition[];
        cost: number;
    } | null;
    /**
     * Calculate movement penalty from status effects
     */
    static getMovementPenalty(status_effects: PerimeterStatusEffect[]): number;
    /**
     * Initialize action state for a character at turn start
     * @param max_ap - Maximum AP for this character this turn (includes buffs/debuffs)
     */
    static initializeActionState(character_id: string, max_ap?: number): CharacterActionState;
    /**
     * Execute an action and update action state
     */
    static executeAction(action_state: CharacterActionState, action: ExecutedAction): {
        success: boolean;
        reason?: string;
        new_state: CharacterActionState;
    };
    /**
     * Get available action types based on remaining AP
     */
    static getAvailableActions(actionState: CharacterActionState): string[];
    /**
     * Validate an action sequence (e.g., "move 2, attack" = 1*2 + 2 = 4 AP, invalid)
     */
    static validateActionSequence(actions: ExecutedAction[], max_ap?: number): {
        valid: boolean;
        reason?: string;
        totalCost: number;
    };
}
