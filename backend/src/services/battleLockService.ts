/**
 * Battle Lock Service
 * 
 * Manages character locking during battles:
 * - Characters in battle cannot be modified (train, equip, heal, etc.)
 * - Lock is set when battle starts, cleared when battle ends
 * - All services that modify characters must check this lock
 */

import { query } from '../database/index';

export class BattleLockError extends Error {
    constructor(character_id: string, battle_id: string) {
        super(`Character ${character_id} is currently in battle ${battle_id} and cannot be modified`);
        this.name = 'BattleLockError';
    }
}

/**
 * Check if a character is currently in a battle
 */
export async function isCharacterInBattle(character_id: string): Promise<boolean> {
    const result = await query(
        'SELECT current_battle_id FROM user_characters WHERE id = $1',
        [character_id]
    );

    if (result.rows.length === 0) {
        return false;
    }

    return result.rows[0].current_battle_id !== null;
}

/**
 * Get the battle ID a character is locked in (null if not in battle)
 */
export async function getCharacterBattleId(character_id: string): Promise<string | null> {
    const result = await query(
        'SELECT current_battle_id FROM user_characters WHERE id = $1',
        [character_id]
    );

    if (result.rows.length === 0) {
        return null;
    }

    return result.rows[0].current_battle_id;
}

/**
 * Guard function - throws BattleLockError if character is in battle
 * Use this at the start of any function that modifies character state
 */
export async function requireNotInBattle(character_id: string): Promise<void> {
    const battle_id = await getCharacterBattleId(character_id);

    if (battle_id !== null) {
        throw new BattleLockError(character_id, battle_id);
    }
}

/**
 * Lock characters for a battle (called when battle starts)
 * Uses atomic check-and-lock to prevent race conditions
 */
export async function lockCharactersForBattle(
    battle_id: string,
    character_ids: string[]
): Promise<void> {
    if (character_ids.length === 0) return;

    try {
        // Atomic check-and-lock: Only lock characters that are NOT already in a battle
        // This prevents race conditions where two requests pass the check before either locks
        const result = await query(
            `UPDATE user_characters
             SET current_battle_id = $1
             WHERE id = ANY($2) AND current_battle_id IS NULL
             RETURNING id`,
            [battle_id, character_ids]
        );

        // Check if all characters were successfully locked
        if (result.rows.length !== character_ids.length) {
            // Some characters couldn't be locked - they're in another battle
            // Rollback: unlock any characters we just locked
            if (result.rows.length > 0) {
                await query(
                    `UPDATE user_characters SET current_battle_id = NULL WHERE current_battle_id = $1`,
                    [battle_id]
                );
                console.log(`🔄 Rolled back ${result.rows.length} locks due to partial failure`);
            }

            // Find which characters were already locked
            const locked_check = await query(
                `SELECT id, current_battle_id FROM user_characters
                 WHERE id = ANY($1) AND current_battle_id IS NOT NULL AND current_battle_id != $2`,
                [character_ids, battle_id]
            );

            if (locked_check.rows.length > 0) {
                // Report ALL locked characters, not just the first one
                const locked_details = locked_check.rows.map((r: { id: string; current_battle_id: string }) => `${r.id} (battle: ${r.current_battle_id})`).join(', ');
                throw new Error(
                    `Cannot start battle: ${locked_check.rows.length} character(s) already in battles: ${locked_details}`
                );
            }

            throw new Error('Failed to lock all characters - some may not exist');
        }

        console.log(`🔒 Locked ${character_ids.length} characters for battle ${battle_id}`);
    } catch (error) {
        console.error(`❌ Failed to lock characters for battle ${battle_id}:`, error);
        throw error;
    }
}

/**
 * Unlock all characters from a battle (called when battle ends)
 */
export async function unlockCharactersFromBattle(battle_id: string): Promise<void> {
    try {
        const result = await query(
            `UPDATE user_characters SET current_battle_id = NULL
         WHERE current_battle_id = $1
         RETURNING id`,
            [battle_id]
        );

        console.log(`🔓 Unlocked ${result.rows.length} characters from battle ${battle_id}`);
    } catch (error) {
        console.error(`❌ CRITICAL: Failed to unlock characters from battle ${battle_id}:`, error);
        // Re-throw so caller knows unlock failed - they may need to retry
        const errorMsg = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to unlock characters from battle ${battle_id}: ${errorMsg}`);
    }
}

/**
 * Emergency unlock - force unlock a specific character (admin use only)
 */
export async function forceUnlockCharacter(character_id: string): Promise<void> {
    try {
        await query(
            'UPDATE user_characters SET current_battle_id = NULL WHERE id = $1',
            [character_id]
        );

        console.log(`⚠️ Force unlocked character ${character_id}`);
    } catch (error) {
        console.error(`❌ CRITICAL: Failed to force unlock character ${character_id}:`, error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to force unlock character ${character_id}: ${errorMsg}`);
    }
}

export default {
    isCharacterInBattle,
    getCharacterBattleId,
    requireNotInBattle,
    lockCharactersForBattle,
    unlockCharactersFromBattle,
    forceUnlockCharacter,
    BattleLockError,
};
