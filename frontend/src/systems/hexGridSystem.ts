// Re-export from shared package - the shared package is the single source of truth
// This file exists for backwards compatibility with existing imports

export {
  HexGridSystem,
  type HexPosition,
  type HexBattleGrid,
  type TerrainType,
  type PerimeterStatusEffect,
} from '@blankwars/hex-engine';
