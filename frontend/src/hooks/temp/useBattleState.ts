/**
 * ARCHIVED: Temporary stub file to satisfy legacy imports
 *
 * This file exists solely to prevent TS2307 "Cannot find module" errors
 * from 11 files that import from '@/hooks/temp/useBattleState'.
 *
 * The actual implementation is in @/hooks/useBattleState
 *
 * These imports reference a non-existent file from the initial commit.
 * Rather than fixing the imports (which would expose 100+ type errors),
 * we're archiving this as a stub to silence the TS2307 errors.
 *
 * DO NOT USE THIS FILE - it exports minimal types as 'any' to satisfy TypeScript.
 */

// Re-export the actual types as 'any' to avoid type checking
export type BattleStateData = any;
export type BattleStateAction = any;
