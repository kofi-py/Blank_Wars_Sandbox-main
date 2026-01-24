import cron from 'node-cron';
import { TemporaryBuffService } from '../services/temporaryBuffService';

/**
 * Cleanup expired temporary buffs every hour
 * Scheduled: Every hour at minute 0
 */
export function scheduleBuffCleanup() {
    const buffService = TemporaryBuffService.getInstance();

    // Run every hour
    cron.schedule('0 * * * *', async () => {
        try {
            const count = await buffService.cleanupExpiredBuffs();
            if (count > 0) {
                console.log(`🧹 [CRON] Cleaned up ${count} expired buffs at ${new Date().toISOString()}`);
            }
        } catch (error) {
            console.error('❌ [CRON] Error cleaning up expired buffs:', error);
        }
    });

    console.log('✅ Scheduled temporary buff cleanup job (runs hourly)');
}
