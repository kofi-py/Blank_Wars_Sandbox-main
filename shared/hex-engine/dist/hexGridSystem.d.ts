export interface HexPosition {
    q: number;
    r: number;
    s: number;
}
export interface HexBattleGrid {
    grid_size: {
        rows: number;
        cols: number;
    };
    character_positions: Map<string, HexPosition>;
    terrain: Map<string, TerrainType>;
    perimeter_attempts: Map<string, number>;
    perimeter_effects: Map<string, PerimeterStatusEffect>;
}
export type TerrainType = 'open' | 'broadcast_tower' | 'perimeter_water';
export interface PerimeterStatusEffect {
    status: 'bitten' | 'bleeding' | 'mauled';
    turns_remaining: number;
    damage_per_turn?: number;
    movement_penalty?: number;
}
export declare class HexGridSystem {
    /**
     * Create a valid hex position with cube coordinate validation
     */
    static createHex(q: number, r: number): HexPosition;
    /**
     * Validate that a hex position satisfies cube coordinate constraint (q + r + s = 0)
     */
    static isValidHex(pos: HexPosition): boolean;
    /**
     * Calculate Manhattan distance between two hexes in cube space
     */
    static distance(a: HexPosition, b: HexPosition): number;
    /**
     * Check if two hex positions are equal
     */
    static equals(a: HexPosition, b: HexPosition): boolean;
    /**
     * Get all 6 neighboring hexes
     */
    static neighbors(center: HexPosition): HexPosition[];
    /**
     * Get all hexes within a certain range (radius)
     */
    static range(center: HexPosition, radius: number): HexPosition[];
    /**
     * Get hexes in a ring at exact distance
     */
    static ring(center: HexPosition, radius: number): HexPosition[];
    /**
     * Linear interpolation between two hexes (for line-of-sight ray tracing)
     */
    static lerp(a: HexPosition, b: HexPosition, t: number): HexPosition;
    /**
     * Round fractional hex coordinates to nearest valid hex
     * Maintains cube coordinate constraint (q + r + s = 0)
     */
    static round(hex: HexPosition): HexPosition;
    /**
     * Convert hex position to pixel coordinates for rendering
     * Assumes flat-top hexagon orientation
     */
    static toPixel(hex: HexPosition, hex_size: number): {
        x: number;
        y: number;
    };
    /**
     * Convert pixel coordinates to hex position
     * Assumes flat-top hexagon orientation
     */
    static fromPixel(x: number, y: number, hex_size: number): HexPosition;
    /**
     * Convert hex position to unique string key for Map storage
     */
    static toKey(hex: HexPosition): string;
    /**
     * Parse hex position from string key
     */
    static fromKey(key: string): HexPosition;
    /**
     * Get direction vector from one hex to another (normalized)
     */
    static direction(from: HexPosition, to: HexPosition): HexPosition;
    /**
     * Initialize a 12x12 hex battle grid with terrain
     */
    static initializeBattleGrid(): HexBattleGrid;
    /**
     * Get starting positions for Team 1 (slightly closer for faster combat)
     */
    static getTeam1StartPositions(): HexPosition[];
    /**
     * Get starting positions for Team 2 (slightly closer for faster combat)
     */
    static getTeam2StartPositions(): HexPosition[];
    /**
     * Check if a hex is within the playable grid bounds
     */
    static isInBounds(hex: HexPosition): boolean;
    /**
     * Check if a hex is on the perimeter (shark zone)
     */
    static isPerimeter(hex: HexPosition): boolean;
    /**
     * Get the nearest hex toward grid center (for pushback from perimeter)
     */
    static getNearestCenterHex(hex: HexPosition, distance?: number): HexPosition;
}
