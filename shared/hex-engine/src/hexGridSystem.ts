// Hex Grid System - Core hex math and grid state management
// Based on cube coordinate system for reliable distance and neighbor calculations

export interface HexPosition {
  q: number;  // Column (axial coordinate)
  r: number;  // Row (axial coordinate)
  s: number;  // Derived cube coordinate: -(q + r)
}

export interface HexBattleGrid {
  grid_size: { rows: number; cols: number };  // 12x12
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

export class HexGridSystem {

  /**
   * Create a valid hex position with cube coordinate validation
   */
  static createHex(q: number, r: number): HexPosition {
    const s = -q - r;
    return { q, r, s };
  }

  /**
   * Validate that a hex position satisfies cube coordinate constraint (q + r + s = 0)
   */
  static isValidHex(pos: HexPosition): boolean {
    return pos.q + pos.r + pos.s === 0;
  }

  /**
   * Calculate Manhattan distance between two hexes in cube space
   */
  static distance(a: HexPosition, b: HexPosition): number {
    return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.s - b.s)) / 2;
  }

  /**
   * Check if two hex positions are equal
   */
  static equals(a: HexPosition, b: HexPosition): boolean {
    return a.q === b.q && a.r === b.r && a.s === b.s;
  }

  /**
   * Get all 6 neighboring hexes
   */
  static neighbors(center: HexPosition): HexPosition[] {
    const directions = [
      { q: 1, r: 0, s: -1 },   // East
      { q: 1, r: -1, s: 0 },   // Northeast
      { q: 0, r: -1, s: 1 },   // Northwest
      { q: -1, r: 0, s: 1 },   // West
      { q: -1, r: 1, s: 0 },   // Southwest
      { q: 0, r: 1, s: -1 }    // Southeast
    ];

    return directions.map(dir => ({
      q: center.q + dir.q,
      r: center.r + dir.r,
      s: center.s + dir.s
    }));
  }

  /**
   * Get all hexes within a certain range (radius)
   */
  static range(center: HexPosition, radius: number): HexPosition[] {
    const results: HexPosition[] = [];

    for (let q = -radius; q <= radius; q++) {
      for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
        const hex = this.createHex(center.q + q, center.r + r);
        results.push(hex);
      }
    }

    return results;
  }

  /**
   * Get hexes in a ring at exact distance
   */
  static ring(center: HexPosition, radius: number): HexPosition[] {
    if (radius === 0) return [center];

    const results: HexPosition[] = [];
    let hex = this.createHex(
      center.q + radius,
      center.r - radius
    );

    const directions = [
      { q: -1, r: 1, s: 0 },   // Southwest
      { q: -1, r: 0, s: 1 },   // West
      { q: 0, r: -1, s: 1 },   // Northwest
      { q: 1, r: -1, s: 0 },   // Northeast
      { q: 1, r: 0, s: -1 },   // East
      { q: 0, r: 1, s: -1 }    // Southeast
    ];

    for (const dir of directions) {
      for (let i = 0; i < radius; i++) {
        results.push({ ...hex });
        hex = {
          q: hex.q + dir.q,
          r: hex.r + dir.r,
          s: hex.s + dir.s
        };
      }
    }

    return results;
  }

  /**
   * Linear interpolation between two hexes (for line-of-sight ray tracing)
   */
  static lerp(a: HexPosition, b: HexPosition, t: number): HexPosition {
    return {
      q: a.q * (1 - t) + b.q * t,
      r: a.r * (1 - t) + b.r * t,
      s: a.s * (1 - t) + b.s * t
    };
  }

  /**
   * Round fractional hex coordinates to nearest valid hex
   * Maintains cube coordinate constraint (q + r + s = 0)
   */
  static round(hex: HexPosition): HexPosition {
    let q = Math.round(hex.q);
    let r = Math.round(hex.r);
    let s = Math.round(hex.s);

    const qDiff = Math.abs(q - hex.q);
    const rDiff = Math.abs(r - hex.r);
    const sDiff = Math.abs(s - hex.s);

    // Correct the coordinate with largest rounding error to maintain q + r + s = 0
    if (qDiff > rDiff && qDiff > sDiff) {
      q = -r - s;
    } else if (rDiff > sDiff) {
      r = -q - s;
    } else {
      s = -q - r;
    }

    return { q, r, s };
  }

  /**
   * Convert hex position to pixel coordinates for rendering
   * Assumes flat-top hexagon orientation
   */
  static toPixel(hex: HexPosition, hex_size: number): { x: number; y: number } {
    const x = hex_size * (3/2 * hex.q);
    const y = hex_size * (Math.sqrt(3)/2 * hex.q + Math.sqrt(3) * hex.r);
    return { x, y };
  }

  /**
   * Convert pixel coordinates to hex position
   * Assumes flat-top hexagon orientation
   */
  static fromPixel(x: number, y: number, hex_size: number): HexPosition {
    const q = (2/3 * x) / hex_size;
    const r = (-1/3 * x + Math.sqrt(3)/3 * y) / hex_size;
    return this.round(this.createHex(q, r));
  }

  /**
   * Convert hex position to unique string key for Map storage
   */
  static toKey(hex: HexPosition): string {
    return `${hex.q},${hex.r}`;
  }

  /**
   * Parse hex position from string key
   */
  static fromKey(key: string): HexPosition {
    const [q, r] = key.split(',').map(Number);
    return this.createHex(q, r);
  }

  /**
   * Get direction vector from one hex to another (normalized)
   */
  static direction(from: HexPosition, to: HexPosition): HexPosition {
    const dq = to.q - from.q;
    const dr = to.r - from.r;
    const ds = to.s - from.s;

    const magnitude = Math.sqrt(dq * dq + dr * dr + ds * ds);

    if (magnitude === 0) {
      return this.createHex(0, 0);
    }

    return {
      q: dq / magnitude,
      r: dr / magnitude,
      s: ds / magnitude
    };
  }

  /**
   * Initialize a 12x12 hex battle grid with terrain
   */
  static initializeBattleGrid(): HexBattleGrid {
    const grid: HexBattleGrid = {
      grid_size: { rows: 12, cols: 12 },
      character_positions: new Map(),
      terrain: new Map(),
      perimeter_attempts: new Map(),
      perimeter_effects: new Map()
    };

    // Define broadcast tower terrain (3-hex cluster in center)
    const towerHexes: HexPosition[] = [
      this.createHex(0, 0),      // Center
      this.createHex(1, -1),     // Northeast
      this.createHex(0, 1)       // South
    ];

    towerHexes.forEach(pos => {
      grid.terrain.set(this.toKey(pos), 'broadcast_tower');
    });

    // Define perimeter water (outermost ring of 12x12 grid)
    // Grid spans from -6 to +6 in each axis
    for (let q = -6; q <= 6; q++) {
      for (let r = -6; r <= 6; r++) {
        const s = -q - r;

        // Perimeter is defined as hexes where any coordinate is at max/min
        if (Math.abs(q) === 6 || Math.abs(r) === 6 || Math.abs(s) === 6) {
          const hex = this.createHex(q, r);
          grid.terrain.set(this.toKey(hex), 'perimeter_water');
        }
      }
    }

    return grid;
  }

  /**
   * Get starting positions for Team 1 (slightly closer for faster combat)
   */
  static getTeam1StartPositions(): HexPosition[] {
    return [
      this.createHex(-2, 3),  // Left character
      this.createHex(0, 3),   // Center character
      this.createHex(2, 3)    // Right character
    ];
  }

  /**
   * Get starting positions for Team 2 (slightly closer for faster combat)
   */
  static getTeam2StartPositions(): HexPosition[] {
    return [
      this.createHex(-2, -3),  // Left character
      this.createHex(0, -3),   // Center character
      this.createHex(2, -3)    // Right character
    ];
  }

  /**
   * Check if a hex is within the playable grid bounds
   */
  static isInBounds(hex: HexPosition): boolean {
    return Math.abs(hex.q) <= 6 && Math.abs(hex.r) <= 6 && Math.abs(hex.s) <= 6;
  }

  /**
   * Check if a hex is on the perimeter (shark zone)
   */
  static isPerimeter(hex: HexPosition): boolean {
    return Math.abs(hex.q) === 6 || Math.abs(hex.r) === 6 || Math.abs(hex.s) === 6;
  }

  /**
   * Get the nearest hex toward grid center (for pushback from perimeter)
   */
  static getNearestCenterHex(hex: HexPosition, distance: number = 1): HexPosition {
    const center = this.createHex(0, 0);
    const dir = this.direction(hex, center);

    // Scale direction by distance and round to valid hex
    return this.round({
      q: hex.q + dir.q * distance,
      r: hex.r + dir.r * distance,
      s: hex.s + dir.s * distance
    });
  }
}
