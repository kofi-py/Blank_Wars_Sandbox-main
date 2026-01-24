// Bond Tracking Service
// Centralized service for managing character-coach relationship bonds

import { query } from '../database/postgres';
import { BondActivityType, BondActivityParams, BondActivityLog } from '../types';

// ============================================================================
// BOND EFFECT LOOKUP (from database - no hardcoded values)
// ============================================================================

async function getBondEffect(activity_type: string): Promise<number> {
    const result = await query(
        'SELECT bond_change FROM bond_activity_effects WHERE activity_type = $1',
        [activity_type]
    );

    if (result.rows.length === 0) {
        throw new Error(`[BondTracking] No bond effect defined in database for activity type: ${activity_type}`);
    }

    return result.rows[0].bond_change;
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Record a bond activity and update character's bond_level
 */
export async function recordBondActivity(params: BondActivityParams): Promise<BondActivityLog> {
    const { user_character_id, activity_type, context = {}, source, therapist_id } = params;

    try {
        // 1. Get current character data
        const char_result = await query(
            `SELECT bond_level, personality_traits FROM user_characters uc
       JOIN characters c ON uc.character_id = c.id
       WHERE uc.id = $1`,
            [user_character_id]
        );

        if (char_result.rows.length === 0) {
            throw new Error(`Character not found: ${user_character_id}`);
        }

        const character = char_result.rows[0];
        const current_bond = character.bond_level || 0;

        // GOVERNANCE: No fallbacks - validate field exists and is array
        const personality = character.personality_traits || [];
        if (!Array.isArray(personality)) {
            throw new Error(`personality_traits must be an array for character ${user_character_id}, got ${typeof personality}`);
        }

        // 2. Get base bond change from database (no hardcoded values)
        let bond_change = await getBondEffect(activity_type);

        // 3. Apply personality modifiers
        bond_change = applyPersonalityModifier(bond_change, activity_type, personality);

        // 4. Apply diminishing returns for high bond levels
        bond_change = applyDiminishingReturns(bond_change, current_bond);

        // 4.5. Apply therapist bonus (only for therapy calls that pass therapist_id)
        if (therapist_id && bond_change > 0) {
            const bonus_result = await query(
                `SELECT multiplier FROM therapist_bonuses
                 WHERE character_id = $1 AND bonus_type = 'bond_level'`,
                [therapist_id]
            );
            if (bonus_result.rows.length > 0) {
                const multiplier = parseFloat(bonus_result.rows[0].multiplier);
                const original_change = bond_change;
                bond_change = Math.round(bond_change * multiplier);
                console.log(`🔗 [BOND] Therapist ${therapist_id} bonus: ${original_change} * ${multiplier} = ${bond_change}`);
            }
        }

        // 5. Calculate new bond level (clamped 0-100)
        const new_bond = Math.max(0, Math.min(100, current_bond + bond_change));

        // 6. Update character's bond_level
        await query(
            'UPDATE user_characters SET bond_level = $1 WHERE id = $2',
            [new_bond, user_character_id]
        );

        // 7. Log the activity
        const log_result = await query(
            `INSERT INTO bond_activity_log 
        (user_character_id, activity_type, bond_change, bond_level_before, bond_level_after, context, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
            [
                user_character_id,
                activity_type,
                bond_change,
                current_bond,
                new_bond,
                JSON.stringify(context),
                source
            ]
        );

        const activity_log: BondActivityLog = {
            id: log_result.rows[0].id,
            user_character_id,
            activity_type,
            bond_change,
            bond_level_before: current_bond,
            bond_level_after: new_bond,
            context,
            source,
            created_at: log_result.rows[0].created_at
        };

        console.log(`🔗 [BOND] ${activity_type}: ${current_bond} → ${new_bond} (${bond_change > 0 ? '+' : ''}${bond_change})`);

        return activity_log;

    } catch (error) {
        console.error('❌ Error recording bond activity:', error);
        throw error;
    }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Apply personality trait modifiers to bond changes
 */
function applyPersonalityModifier(
    base_change: number,
    activity_type: BondActivityType,
    personality_traits: string[]
): number {
    if (!personality_traits || personality_traits.length === 0) {
        return base_change;
    }

    let modifier = 1.0;
    const traits_lower = personality_traits.map(t => t.toLowerCase());

    // Positive modifiers (bond more easily)
    if (traits_lower.includes('trusting') || traits_lower.includes('loyal')) {
        modifier += 0.2;  // +20% bond gains
    }

    if (traits_lower.includes('emotionally open') || traits_lower.includes('vulnerable')) {
        if (activity_type.includes('therapy') || activity_type.includes('personal_problems')) {
            modifier += 0.3;  // +30% for emotional activities
        }
    }

    // Negative modifiers (bond less easily)
    if (traits_lower.includes('distrustful') || traits_lower.includes('independent')) {
        modifier -= 0.2;  // -20% bond gains
    }

    if (traits_lower.includes('impulsive') || traits_lower.includes('rebellious')) {
        if (activity_type.includes('coaching') || activity_type.includes('advice')) {
            modifier -= 0.25;  // -25% for authority-based bonding
        }
    }

    // Apply modifier (minimum 0.25x, maximum 1.75x)
    modifier = Math.max(0.25, Math.min(1.75, modifier));

    return Math.round(base_change * modifier);
}

/**
 * Apply diminishing returns for high bond levels
 */
function applyDiminishingReturns(bond_change: number, current_bond: number): number {
    // Only apply to positive bond changes
    if (bond_change <= 0) {
        return bond_change;
    }

    // No diminishing returns below 60 bond
    if (current_bond < 60) {
        return bond_change;
    }

    // 60-79: 75% effectiveness
    if (current_bond < 80) {
        return Math.round(bond_change * 0.75);
    }

    // 80-89: 50% effectiveness
    if (current_bond < 90) {
        return Math.round(bond_change * 0.5);
    }

    // 90+: 25% effectiveness (very hard to max out)
    return Math.round(bond_change * 0.25);
}

/**
 * Get recent bond activity history for a character
 */
export async function getBondActivityHistory(
    user_character_id: string,
    limit: number = 20
): Promise<BondActivityLog[]> {
    const result = await query(
        `SELECT * FROM bond_activity_log
     WHERE user_character_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
        [user_character_id, limit]
    );

    return result.rows as BondActivityLog[];
}

/**
 * Special handler for group activity completion (future-ready)
 */
export async function recordGroupActivityCompletion(params: {
    user_character_id: string;
    activity_type: string;
    participants: string[];
    outcome: 'success' | 'mediocre' | 'conflict';
    context?: any;
}) {
    const activity_bond_type: BondActivityType =
        params.outcome === 'conflict' ? 'group_activity_conflict' :
            params.outcome === 'success' ? 'group_activity_success' :
                'group_activity_mediocre';

    return recordBondActivity({
        user_character_id: params.user_character_id,
        activity_type: activity_bond_type,
        context: {
            activity_name: params.activity_type,
            participants: params.participants,
            outcome: params.outcome,
            ...params.context
        },
        source: 'group_activities'
    });
}

export default {
    recordBondActivity,
    getBondActivityHistory,
    recordGroupActivityCompletion
};
