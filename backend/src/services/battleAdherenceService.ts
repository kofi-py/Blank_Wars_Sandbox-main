/**
 * Battle Adherence Service
 *
 * Handles adherence checks during battle. Reads gameplan_adherence from DB
 * and applies ephemeral battle-state modifiers.
 *
 * Architecture:
 * - DB column `gameplan_adherence` is the base value (generated column with stat modifiers)
 * - This service applies EPHEMERAL battle-state modifiers (HP%, team winning, teammates)
 * - Callers should NOT read gameplan_adherence directly - use this service
 */

import { query } from '../database/index';

export interface BattleState {
    current_hp: number;
    max_hp: number;
    team_winning: boolean;
    teammates_alive: number;
    teammates_total: number;
}

export interface BattleAdherenceResult {
    roll: number;
    threshold: number;
    passed: boolean;
    base_adherence: number;
    modifiers_applied: {
        hp_modifier: number;
        team_modifier: number;
        teammate_modifier: number;
        preference_modifier: number;
    };
}

/**
 * Internal: Apply battle-state modifiers to base adherence.
 */
function applyBattleStateModifiers(
    base_adherence: number,
    battle_state: BattleState
): { modified: number; hp_modifier: number; team_modifier: number; teammate_modifier: number } {
    let hp_modifier = 0;
    let team_modifier = 0;
    let teammate_modifier = 0;

    // HP-based modifiers
    const hp_percent = battle_state.current_hp / battle_state.max_hp;
    if (hp_percent <= 0.1) {
        hp_modifier = -50; // Near death desperation
    } else if (hp_percent <= 0.25) {
        hp_modifier = -30; // Critical injuries
    } else if (hp_percent <= 0.5) {
        hp_modifier = -15; // Wounded/pain
    }

    // Team losing penalty
    if (!battle_state.team_winning) {
        team_modifier = -10;
    }

    // Teammates down penalty (up to -20 if all teammates KO'd)
    // Guard against division by zero when there are no teammates
    if (battle_state.teammates_total > 0) {
        const teammate_loss_ratio =
            (battle_state.teammates_total - battle_state.teammates_alive) / battle_state.teammates_total;
        teammate_modifier = -Math.floor(teammate_loss_ratio * 20);
    }

    const modified = Math.max(0, Math.min(100, Math.round(
        base_adherence + hp_modifier + team_modifier + teammate_modifier
    )));

    return { modified, hp_modifier, team_modifier, teammate_modifier };
}

/**
 * Check battle adherence for a character.
 * Reads gameplan_adherence from DB and applies battle-state modifiers.
 *
 * @param character_id - The user_character ID
 * @param battle_state - Current battle conditions
 * @param preference_modifier - Optional modifier for order preference
 * @returns Complete adherence result with roll, threshold, and breakdown
 */
export async function checkBattleAdherence(
    character_id: string,
    battle_state: BattleState,
    preference_modifier: number = 0
): Promise<BattleAdherenceResult> {
    // Read gameplan_adherence from DB
    const result = await query(
        'SELECT gameplan_adherence FROM user_characters WHERE id = $1',
        [character_id]
    );

    if (result.rows.length === 0) {
        throw new Error(`Character ${character_id} not found`);
    }

    const base_adherence = result.rows[0].gameplan_adherence;
    if (base_adherence === null || base_adherence === undefined) {
        throw new Error(`gameplan_adherence is NULL for character ${character_id}`);
    }

    // Apply battle-state modifiers
    const { modified, hp_modifier, team_modifier, teammate_modifier } =
        applyBattleStateModifiers(base_adherence, battle_state);

    // Apply preference modifier
    const threshold = Math.max(0, Math.min(100, modified + preference_modifier));

    // Roll d100
    const roll = Math.floor(Math.random() * 100) + 1;
    const passed = roll <= threshold;

    console.log(`🎲 [BATTLE-ADHERENCE] Character: ${character_id}, Base: ${base_adherence}, ` +
        `HP Mod: ${hp_modifier}, Team Mod: ${team_modifier}, Teammate Mod: ${teammate_modifier}, ` +
        `Pref Mod: ${preference_modifier}, Threshold: ${threshold}, Roll: ${roll}, Passed: ${passed}`);

    return {
        roll,
        threshold,
        passed,
        base_adherence,
        modifiers_applied: {
            hp_modifier,
            team_modifier,
            teammate_modifier,
            preference_modifier
        }
    };
}

/**
 * Simple adherence roll for non-battle contexts (loadout, progression, etc.)
 * Used by loadoutAdherenceService and characterProgressionService.
 * 
 * Note: This is kept as a pure function because the callers already have
 * the character data loaded. For new code, prefer using the domain-specific
 * services directly.
 */
export function performSimpleAdherenceRoll(
    adherence_score: number,
    preference_score: number = 50
): { roll: number; adherence_score: number; passed: boolean; modifier: number } {
    // Calculate modifier: (Score - 50) / 2
    const modifier = Math.floor((preference_score - 50) / 2);
    const effective_adherence = Math.max(0, Math.min(100, adherence_score + modifier));

    const roll = Math.floor(Math.random() * 100) + 1;
    const passed = roll <= effective_adherence;

    console.log(`🎲 [ADHERENCE-ROLL] Roll: ${roll}, Base: ${adherence_score}, ` +
        `Pref: ${preference_score} (Mod: ${modifier}), Effective: ${effective_adherence}, Passed: ${passed}`);

    return {
        roll,
        adherence_score: effective_adherence,
        passed,
        modifier
    };
}

// Legacy exports for backward compatibility during migration
export { applyBattleStateModifiers as applyBattleStateModifiersLegacy };
export const performAdherenceCheck = async (
    base_adherence: number,
    battle_state: BattleState,
    preference_modifier: number = 0
) => {
    // This is a shim - logs a warning that caller should migrate
    console.warn('[DEPRECATED] performAdherenceCheck called with raw adherence value. ' +
        'Caller should use checkBattleAdherence(character_id, battle_state) instead.');

    const { modified, hp_modifier, team_modifier, teammate_modifier } =
        applyBattleStateModifiers(base_adherence, battle_state);
    const threshold = Math.max(0, Math.min(100, modified + preference_modifier));
    const roll = Math.floor(Math.random() * 100) + 1;

    return {
        roll,
        threshold,
        passed: roll <= threshold
    };
};
