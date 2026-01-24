import { db } from '../database';

/**
 * Temporary Buff Service
 * Manages time-based stat boosts for characters
 * Governance: NO FALLBACKS - fail loudly on invalid data
 */

export interface TemporaryBuff {
    id: string;
    character_id: string;
    stat_name: string;
    value: number;
    source: 'therapy' | 'conflict_resolution' | 'coaching' | 'equipment' | 'event' | 'other';
    source_id?: string;
    description: string;
    applied_at: Date;
    expires_at: Date;
    created_at: Date;
}

export interface BuffApplication {
    character_id: string;
    stat_name: string;
    value: number;
    duration_hours: number;
    source: string;
    source_id?: string;
    description: string;
}

export class TemporaryBuffService {
    private static instance: TemporaryBuffService;

    private constructor() { }

    static getInstance(): TemporaryBuffService {
        if (!TemporaryBuffService.instance) {
            TemporaryBuffService.instance = new TemporaryBuffService();
        }
        return TemporaryBuffService.instance;
    }

    /**
     * Apply a temporary buff to a character
     */
    async applyBuff(buff: BuffApplication): Promise<TemporaryBuff> {
        const expires_at = new Date();
        expires_at.setHours(expires_at.getHours() + buff.duration_hours);

        const result = await db.query(
            `INSERT INTO character_temporary_buffs
       (character_id, stat_name, value, source, source_id, description, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
            [
                buff.character_id,
                buff.stat_name,
                buff.value,
                buff.source,
                buff.source_id || null,
                buff.description,
                expires_at
            ]
        );

        console.log(
            `✨ Applied temporary buff: ${buff.stat_name} +${buff.value} for ${buff.duration_hours}h to ${buff.character_id}`
        );

        return result.rows[0];
    }

    /**
     * Apply multiple buffs in a transaction
     */
    async applyBuffs(buffs: BuffApplication[]): Promise<TemporaryBuff[]> {
        const client = await db.connect();
        const applied_buffs: TemporaryBuff[] = [];

        try {
            await client.query('BEGIN');

            for (const buff of buffs) {
                const expires_at = new Date();
                expires_at.setHours(expires_at.getHours() + buff.duration_hours);

                const result = await client.query(
                    `INSERT INTO character_temporary_buffs
           (character_id, stat_name, value, source, source_id, description, expires_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
                    [
                        buff.character_id,
                        buff.stat_name,
                        buff.value,
                        buff.source,
                        buff.source_id || null,
                        buff.description,
                        expires_at
                    ]
                );

                applied_buffs.push(result.rows[0]);
            }

            await client.query('COMMIT');

            console.log(`✨ Applied ${applied_buffs.length} temporary buffs`);

            return applied_buffs;
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error applying buffs:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get all active buffs for a character
     */
    async getActiveBuffs(character_id: string): Promise<TemporaryBuff[]> {
        const result = await db.query(
            `SELECT * FROM character_temporary_buffs
       WHERE character_id = $1 AND expires_at > NOW()
       ORDER BY applied_at DESC`,
            [character_id]
        );

        return result.rows;
    }

    /**
     * Get active buff totals by stat (aggregated)
     */
    async getActiveBuffTotals(character_id: string): Promise<Record<string, number>> {
        const result = await db.query(
            `SELECT stat_name, SUM(value) as total
       FROM character_temporary_buffs
       WHERE character_id = $1 AND expires_at > NOW()
       GROUP BY stat_name`,
            [character_id]
        );

        const totals: Record<string, number> = {};
        for (const row of result.rows) {
            totals[row.stat_name] = parseInt(row.total);
        }

        return totals;
    }

    /**
     * Remove expired buffs (cleanup job)
     */
    async cleanupExpiredBuffs(): Promise<number> {
        const result = await db.query(
            `DELETE FROM character_temporary_buffs
       WHERE expires_at <= NOW()
       RETURNING id`
        );

        const count = result.rows.length;
        if (count > 0) {
            console.log(`🧹 Cleaned up ${count} expired buffs`);
        }

        return count;
    }

    /**
     * Remove all buffs for a character (e.g., on character death)
     */
    async removeAllBuffs(character_id: string): Promise<number> {
        const result = await db.query(
            `DELETE FROM character_temporary_buffs
       WHERE character_id = $1
       RETURNING id`,
            [character_id]
        );

        const count = result.rows.length;
        console.log(`🗑️ Removed ${count} buffs from ${character_id}`);

        return count;
    }

    /**
     * Remove specific buff by ID
     */
    async removeBuff(buff_id: string): Promise<boolean> {
        const result = await db.query(
            `DELETE FROM character_temporary_buffs
       WHERE id = $1
       RETURNING id`,
            [buff_id]
        );

        return result.rows.length > 0;
    }
}

export default TemporaryBuffService;
