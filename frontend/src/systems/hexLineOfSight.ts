// Line of Sight System for Hex Grid Combat
// Ray-tracing algorithm to determine if attacks can reach their target

import { HexGridSystem, HexPosition, HexBattleGrid, TerrainType } from './hexGridSystem';

export interface BlockingEntity {
  type: 'contestant' | 'terrain';
  position: HexPosition;
  id?: string;  // Character ID if blocking entity is a character
  terrain_type?: TerrainType;
}

export interface LoSResult {
  has_lo_s: boolean;
  blocked_by?: BlockingEntity[];
  path: HexPosition[];
}

export class HexLineOfSight {

  /**
   * Check if there is unobstructed line of sight between two hexes
   */
  static hasLoS(
    from: HexPosition,
    to: HexPosition,
    grid: HexBattleGrid,
    ignore_characters: string[] = []  // Character IDs to ignore (e.g., attacker itself)
  ): boolean {
    const result = this.checkLoS(from, to, grid, ignore_characters);
    return result.has_lo_s;
  }

  /**
   * Full LoS check with detailed blocking information
   */
  static checkLoS(
    from: HexPosition,
    to: HexPosition,
    grid: HexBattleGrid,
    ignore_characters: string[] = []
  ): LoSResult {
    const path = this.tracePath(from, to);
    const blockers: BlockingEntity[] = [];

    // Check each hex along the path (excluding start and end points)
    for (let i = 1; i < path.length - 1; i++) {
      const hex = path[i];
      const key = HexGridSystem.toKey(hex);

      // Check for blocking terrain
      const terrain = grid.terrain.get(key);
      if (terrain === 'broadcast_tower') {
        blockers.push({
          type: 'terrain',
          position: hex,
          terrain_type: terrain
        });
      }

      // Check for blocking characters
      for (const [charId, charPos] of grid.character_positions) {
        if (ignore_characters.includes(charId)) continue;

        if (HexGridSystem.equals(charPos, hex)) {
          blockers.push({
            type: 'contestant',
            position: hex,
            id: charId
          });
        }
      }
    }

    return {
      has_lo_s: blockers.length === 0,
      blocked_by: blockers.length > 0 ? blockers : undefined,
      path
    };
  }

  /**
   * Trace a path from one hex to another using hex lerp
   * Returns all hexes the ray passes through
   */
  static tracePath(from: HexPosition, to: HexPosition): HexPosition[] {
    const distance = HexGridSystem.distance(from, to);
    const path: HexPosition[] = [];

    // Include start point
    path.push(from);

    // Trace intermediate points
    for (let i = 1; i < distance; i++) {
      const t = i / distance;
      const lerpHex = HexGridSystem.lerp(from, to, t);
      const roundedHex = HexGridSystem.round(lerpHex);

      // Avoid duplicates
      const lastHex = path[path.length - 1];
      if (!HexGridSystem.equals(roundedHex, lastHex)) {
        path.push(roundedHex);
      }
    }

    // Include end point
    if (!HexGridSystem.equals(path[path.length - 1], to)) {
      path.push(to);
    }

    return path;
  }

  /**
   * Get all hexes visible from a position (within range and LoS)
   */
  static getVisibleHexes(
    from: HexPosition,
    max_range: number,
    grid: HexBattleGrid,
    ignore_characters: string[] = []
  ): HexPosition[] {
    const visibleHexes: HexPosition[] = [];
    const hexesInRange = HexGridSystem.range(from, max_range);

    for (const hex of hexesInRange) {
      // Skip the source hex itself
      if (HexGridSystem.equals(hex, from)) continue;

      // Check if hex is in bounds
      if (!HexGridSystem.isInBounds(hex)) continue;

      // Check LoS
      if (this.hasLoS(from, hex, grid, ignore_characters)) {
        visibleHexes.push(hex);
      }
    }

    return visibleHexes;
  }

  /**
   * Get all characters visible from a position
   */
  static getVisibleCharacters(
    from: HexPosition,
    max_range: number,
    grid: HexBattleGrid,
    ignore_characters: string[] = []
  ): Array<{ character_id: string; position: HexPosition; distance: number }> {
    const visibleChars: Array<{ character_id: string; position: HexPosition; distance: number }> = [];

    for (const [charId, charPos] of grid.character_positions) {
      if (ignore_characters.includes(charId)) continue;

      const distance = HexGridSystem.distance(from, charPos);

      // Check range
      if (distance > max_range) continue;

      // Check LoS
      if (this.hasLoS(from, charPos, grid, ignore_characters)) {
        visibleChars.push({
          character_id: charId,
          position: charPos,
          distance
        });
      }
    }

    return visibleChars.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Check if an area-of-effect attack can hit a target hex
   * (for future AoE abilities)
   */
  static canAoEReach(
    origin: HexPosition,
    target: HexPosition,
    aoe_radius: number,
    grid: HexBattleGrid,
    requires_lo_sto_origin: boolean = true
  ): { can_hit: boolean; affected_hexes: HexPosition[] } {

    // Check LoS to target hex if required
    if (requires_lo_sto_origin && !this.hasLoS(origin, target, grid)) {
      return { can_hit: false, affected_hexes: [] };
    }

    // Get all hexes in AoE radius around target
    const affectedHexes = HexGridSystem.range(target, aoe_radius);

    return {
      can_hit: true,
      affected_hexes: affectedHexes.filter(hex => HexGridSystem.isInBounds(hex))
    };
  }

  /**
   * Find the best position to attack a target from (closest with LoS)
   */
  static findBestAttackPosition(
    target: HexPosition,
    max_range: number,
    grid: HexBattleGrid,
    character_id: string  // To ignore this character in LoS checks
  ): HexPosition | null {

    const candidateHexes = HexGridSystem.range(target, max_range);
    let bestHex: HexPosition | null = null;
    let bestDistance = Infinity;

    for (const hex of candidateHexes) {
      // Skip if out of bounds
      if (!HexGridSystem.isInBounds(hex)) continue;

      // Skip if occupied by terrain
      const terrain = grid.terrain.get(HexGridSystem.toKey(hex));
      if (terrain === 'broadcast_tower' || terrain === 'perimeter_water') continue;

      // Skip if occupied by another character
      let occupied = false;
      for (const [charId, charPos] of grid.character_positions) {
        if (charId === character_id) continue;  // Ignore self
        if (HexGridSystem.equals(charPos, hex)) {
          occupied = true;
          break;
        }
      }
      if (occupied) continue;

      // Check LoS to target
      if (!this.hasLoS(hex, target, grid, [character_id])) continue;

      // Track closest valid position
      const distance = HexGridSystem.distance(hex, target);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestHex = hex;
      }
    }

    return bestHex;
  }

  /**
   * Check if a character can be flanked (attacked from multiple directions)
   */
  static getFlankingPositions(
    target: HexPosition,
    grid: HexBattleGrid
  ): Array<{ position: HexPosition; isOccupied: boolean; occupantId?: string }> {

    const neighbors = HexGridSystem.neighbors(target);
    const flankingPositions: Array<{ position: HexPosition; isOccupied: boolean; occupantId?: string }> = [];

    for (const hex of neighbors) {
      if (!HexGridSystem.isInBounds(hex)) continue;

      // Check if position is occupied
      let isOccupied = false;
      let occupantId: string | undefined;

      for (const [charId, charPos] of grid.character_positions) {
        if (HexGridSystem.equals(charPos, hex)) {
          isOccupied = true;
          occupantId = charId;
          break;
        }
      }

      flankingPositions.push({
        position: hex,
        isOccupied,
        occupantId
      });
    }

    return flankingPositions;
  }

  /**
   * Generate a visual description of what's blocking LoS
   */
  static describeBlockers(blockers: BlockingEntity[]): string {
    if (blockers.length === 0) return 'Clear line of sight';

    const descriptions = blockers.map(blocker => {
      if (blocker.type === 'terrain') {
        if (blocker.terrain_type === 'broadcast_tower') {
          return 'broadcast tower';
        }
        return 'terrain';
      } else if (blocker.type === 'contestant') {
        return `character ${blocker.id}`;
      }
      return 'obstacle';
    });

    if (descriptions.length === 1) {
      return `Blocked by ${descriptions[0]}`;
    } else {
      return `Blocked by ${descriptions.slice(0, -1).join(', ')} and ${descriptions[descriptions.length - 1]}`;
    }
  }
}
