import { query } from '../database';

export class PreferenceScoringService {
    // Impact values for each Rank (1-4)
    private static readonly RANK_IMPACT = {
        4: 20,  // Favorite: +20
        3: 10,  // Like: +10
        2: 0,   // Neutral: 0
        1: -20  // Dislike: -20
    };

    private static readonly BASE_SCORE = 50;

    // Track unmatched categories for debugging
    private static unmatchedCategories: Set<string> = new Set();

    /**
     * Log summary of unmatched categories after scoring.
     */
    private static logUnmatchedSummary(character_id: string): void {
        if (this.unmatchedCategories.size > 0) {
            console.warn(`⚠️ [PREFERENCE-SCORING] Character ${character_id} has ${this.unmatchedCategories.size} unmatched category values:`,
                Array.from(this.unmatchedCategories).slice(0, 10).join(', '),
                this.unmatchedCategories.size > 10 ? `... and ${this.unmatchedCategories.size - 10} more` : ''
            );
            this.unmatchedCategories.clear();
        }
    }

    /**
     * Get rank for a category, logging if not found.
     */
    private static getRankWithLogging(rankings: Map<string, number>, key: string): number {
        const rank = rankings.get(key);
        if (rank === undefined) {
            this.unmatchedCategories.add(key);
            return 2; // Neutral default
        }
        return rank;
    }

    /**
     * Extract damageType from effects JSON.
     * Handles both array format (rank-based) and object format.
     * Returns the first damageType found, or null if none.
     */
    private static extractDamageType(effects: any): string | null {
        if (!effects) return null;

        // If effects is an array, check each element for damageType
        if (Array.isArray(effects)) {
            for (const effect of effects) {
                if (effect?.damageType) {
                    return effect.damageType;
                }
            }
            return null;
        }

        // If effects is an object, check for damageType directly
        if (typeof effects === 'object' && effects.damageType) {
            return effects.damageType;
        }

        return null;
    }

    /**
     * Calculate and update Preference Scores for ALL items owned by a character.
     * This should be called whenever a character's Category Rankings change.
     */
    static async refreshCharacterScores(character_id: string): Promise<void> {
        try {
            // 1. Fetch Character's Category Rankings
            const rankings = await this.getCharacterRankings(character_id);

            // 2. Update Abstract Scores (Attributes, Resources) in the preferences table itself
            await this.updateAbstractScores(character_id, rankings);

            // 3. Update Concrete Item Scores
            await this.updateSpellScores(character_id, rankings);
            await this.updatePowerScores(character_id, rankings);
            await this.updateEquipmentScores(character_id, rankings);

            // Log any unmatched categories for debugging
            this.logUnmatchedSummary(character_id);

            console.log(`✅ Refreshed Preference Scores for character ${character_id}`);
        } catch (error) {
            console.error('Error refreshing preference scores:', error);
            throw error;
        }
    }

    /**
     * Fetch all category rankings for a character.
     * Returns a map of "CategoryType:Value" -> Rank.
     */
    private static async getCharacterRankings(character_id: string): Promise<Map<string, number>> {
        const result = await query(
            `SELECT category_type, category_value, rank 
       FROM character_category_preferences 
       WHERE character_id = $1`,
            [character_id]
        );

        const map = new Map<string, number>();
        for (const row of result.rows) {
            // Key format: "damage_type:fire", "equipment_type:sword"
            const key = `${row.category_type}:${row.category_value}`;
            map.set(key, row.rank);
        }
        return map;
    }

    /**
     * Update scores for Abstract Categories (Attributes, Resources) directly in the preferences table.
     * Score = 50 + RankImpact
     */
    private static async updateAbstractScores(character_id: string, rankings: Map<string, number>): Promise<void> {
        // We can do this in a single SQL update since the score depends only on the rank in the same row
        await query(
            `UPDATE character_category_preferences
       SET preference_score = 50 + CASE 
           WHEN rank = 4 THEN 20 
           WHEN rank = 3 THEN 10 
           WHEN rank = 2 THEN 0 
           WHEN rank = 1 THEN -20 
           ELSE 0 END
       WHERE character_id = $1`,
            [character_id]
        );
    }

    /**
     * Update scores for Spells.
     * Score = 50 + (SpellCategory Rank) + (DamageType Rank)
     */
    private static async updateSpellScores(character_id: string, rankings: Map<string, number>): Promise<void> {
        // Fetch all spells owned by character with their definitions
        const spells = await query(
            `SELECT cs.spell_id, sd.tier, sd.effects
       FROM character_spells cs
       JOIN spell_definitions sd ON cs.spell_id = sd.id
       WHERE cs.character_id = $1`,
            [character_id]
        );

        for (const spell of spells.rows) {
            let score = this.BASE_SCORE;

            // 1. Check Spell Tier (universal, archetype, species, signature)
            // Note: spell.category is mostly NULL, so we use tier for classification
            if (spell.tier) {
                const rank = this.getRankWithLogging(rankings, `spell_tier:${spell.tier}`);
                score += this.RANK_IMPACT[rank as keyof typeof this.RANK_IMPACT];
            }

            // 2. Check Damage Type (from effects json)
            // Effects can be array [{rank:1, damageType:"fire"},...] or object {damageType:"fire"}
            const damageType = this.extractDamageType(spell.effects);
            if (damageType) {
                const rank = this.getRankWithLogging(rankings, `damage_type:${damageType}`);
                score += this.RANK_IMPACT[rank as keyof typeof this.RANK_IMPACT];
            }

            // Clamp Score 1-100
            score = Math.max(1, Math.min(100, score));

            // Update DB
            await query(
                `UPDATE character_spells 
         SET preference_score = $1 
         WHERE character_id = $2 AND spell_id = $3`,
                [score, character_id, spell.spell_id]
            );
        }
    }

    /**
     * Update scores for Powers.
     * Score = 50 + (PowerCategory Rank) + (DamageType Rank)
     */
    private static async updatePowerScores(character_id: string, rankings: Map<string, number>): Promise<void> {
        const powers = await query(
            `SELECT cp.power_id, pd.category, pd.effects 
       FROM character_powers cp
       JOIN power_definitions pd ON cp.power_id = pd.id
       WHERE cp.character_id = $1`,
            [character_id]
        );

        for (const power of powers.rows) {
            let score = this.BASE_SCORE;

            if (power.category) {
                const rank = this.getRankWithLogging(rankings, `power_category:${power.category}`);
                score += this.RANK_IMPACT[rank as keyof typeof this.RANK_IMPACT];
            }

            // Check Damage Type (from effects json)
            // Effects can be array [{rank:1, damageType:"physical"},...] or object {damageType:"physical"}
            const damageType = this.extractDamageType(power.effects);
            if (damageType) {
                const rank = this.getRankWithLogging(rankings, `damage_type:${damageType}`);
                score += this.RANK_IMPACT[rank as keyof typeof this.RANK_IMPACT];
            }

            score = Math.max(1, Math.min(100, score));

            await query(
                `UPDATE character_powers 
         SET preference_score = $1 
         WHERE character_id = $2 AND power_id = $3`,
                [score, character_id, power.power_id]
            );
        }
    }

    /**
     * Update scores for Equipment.
     * Score = 50 + (EquipmentType Rank)
     */
    private static async updateEquipmentScores(character_id: string, rankings: Map<string, number>): Promise<void> {
        const equipment = await query(
            `SELECT ce.equipment_id, e.equipment_type 
       FROM character_equipment ce
       JOIN equipment e ON ce.equipment_id = e.id
       WHERE ce.character_id = $1`,
            [character_id]
        );

        for (const item of equipment.rows) {
            let score = this.BASE_SCORE;

            if (item.equipment_type) {
                const rank = this.getRankWithLogging(rankings, `equipment_type:${item.equipment_type}`);
                score += this.RANK_IMPACT[rank as keyof typeof this.RANK_IMPACT];
            }

            score = Math.max(1, Math.min(100, score));

            await query(
                `UPDATE character_equipment 
         SET preference_score = $1 
         WHERE character_id = $2 AND equipment_id = $3`,
                [score, character_id, item.equipment_id]
            );
        }
    }
}
