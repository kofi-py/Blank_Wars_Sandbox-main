// Re-export from shared package - the shared package is the single source of truth
// This file exists for backwards compatibility with existing imports

export {
  HexMovementEngine,
  ACTION_COSTS,
  type MoveValidation,
  type CharacterActionState,
  type ExecutedAction,
} from '@blankwars/hex-engine';
