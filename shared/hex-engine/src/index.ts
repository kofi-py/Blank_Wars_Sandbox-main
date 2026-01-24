// Shared Hex Engine - Used by both frontend and backend
// Single source of truth for hex grid logic and movement validation

export {
  HexGridSystem,
  type HexPosition,
  type HexBattleGrid,
  type TerrainType,
  type PerimeterStatusEffect,
} from './hexGridSystem';

export {
  HexMovementEngine,
  ACTION_COSTS,
  BASE_ACTION_POINTS,
  type MoveValidation,
  type CharacterActionState,
  type ExecutedAction,
} from './hexMovementEngine';
