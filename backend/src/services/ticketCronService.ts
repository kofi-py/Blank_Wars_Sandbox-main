import * as cron from 'node-cron';
import { query } from '../database';
import { ticket_service } from './ticketService';

export class TicketCronService {
  private daily_reset_job: cron.ScheduledTask | null = null;
  private hourly_refresh_job: cron.ScheduledTask | null = null;

  /**
   * Start all scheduled ticket jobs
   */
  start(): void {
    console.log('🎫 Starting ticket cron jobs...');
    
    this.startDailyResetJob();
    this.startHourlyRefreshJob();
    
    console.log('✅ Ticket cron jobs started successfully');
  }

  /**
   * Stop all scheduled ticket jobs
   */
  stop(): void {
    console.log('🛑 Stopping ticket cron jobs...');
    
    if (this.daily_reset_job) {
      this.daily_reset_job.stop();
      this.daily_reset_job = null;
    }
    
    if (this.hourly_refresh_job) {
      this.hourly_refresh_job.stop();
      this.hourly_refresh_job = null;
    }
    
    console.log('✅ Ticket cron jobs stopped');
  }

  /**
   * Daily reset job - runs at midnight for all users
   * Uses cron expression: '0 0 * * *' (every day at 00:00)
   */
  private startDailyResetJob(): void {
    this.daily_reset_job = cron.schedule('0 0 * * *', async () => {
      console.log('🌅 Starting daily ticket reset for all users...');
      const start_time = Date.now();
      
      try {
        // Get all users who need daily reset
        const users_needing_reset = await query(`
          SELECT ut.user_id, ut.current_tickets, ut.last_daily_reset
          FROM user_tickets ut
          WHERE ut.last_daily_reset < CURRENT_DATE
        `);

        console.log(`📊 Found ${users_needing_reset.rows.length} users needing daily reset`);
        
        let success_count = 0;
        let error_count = 0;

        // Process each user
        for (const user of users_needing_reset.rows) {
          try {
            await ticket_service.performDailyReset(user.user_id);
            success_count++;
          } catch (error) {
            console.error(`❌ Daily reset failed for user ${user.user_id}:`, error);
            error_count++;
          }
        }

        const duration = Date.now() - start_time;
        console.log(`✅ Daily reset completed in ${duration}ms: ${success_count} success, ${error_count} errors`);

        // Log summary to database
        await this.logCronExecution('daily_reset', success_count, error_count, duration);

      } catch (error) {
        console.error('❌ Daily reset job failed:', error);
        await this.logCronExecution('daily_reset', 0, 1, Date.now() - start_time, error);
      }
    }, {
      timezone: "UTC" // Use UTC for consistency, individual resets handle user timezones
    });

    console.log('⏰ Daily reset job scheduled for midnight UTC');
  }

  /**
   * Hourly refresh job - runs every hour to check for users needing refresh
   * Uses cron expression: '0 * * * *' (every hour at minute 0)
   */
  private startHourlyRefreshJob(): void {
    this.hourly_refresh_job = cron.schedule('0 * * * *', async () => {
      console.log('⏱️ Starting hourly ticket refresh check...');
      const start_time = Date.now();
      
      try {
        // Get users who haven't had refresh in 2+ hours
        const users_needing_refresh = await query(`
          SELECT ut.user_id, ut.current_tickets, ut.last_hourly_refresh
          FROM user_tickets ut
          WHERE ut.last_hourly_refresh <= NOW() - INTERVAL '2 hours'
        `);

        console.log(`📊 Found ${users_needing_refresh.rows.length} users eligible for hourly refresh`);
        
        let success_count = 0;
        let error_count = 0;
        let total_tickets_added = 0;

        // Process each user
        for (const user of users_needing_refresh.rows) {
          try {
            const before_refresh = await ticket_service.getTicketBalance(user.user_id);
            await ticket_service.performHourlyRefresh(user.user_id);
            const after_refresh = await ticket_service.getTicketBalance(user.user_id);

            if (before_refresh && after_refresh) {
              const tickets_added = after_refresh.current_tickets - before_refresh.current_tickets;
              total_tickets_added += tickets_added;
            }

            success_count++;
          } catch (error) {
            console.error(`❌ Hourly refresh failed for user ${user.user_id}:`, error);
            error_count++;
          }
        }

        const duration = Date.now() - start_time;
        console.log(`✅ Hourly refresh completed in ${duration}ms: ${success_count} users, ${total_tickets_added} tickets added, ${error_count} errors`);

        // Log summary to database
        await this.logCronExecution('hourly_refresh', success_count, error_count, duration);

      } catch (error) {
        console.error('❌ Hourly refresh job failed:', error);
        await this.logCronExecution('hourly_refresh', 0, 1, Date.now() - start_time, error);
      }
    }, {
      timezone: "UTC"
    });

    console.log('⏰ Hourly refresh job scheduled for every hour');
  }

  /**
   * Manual trigger for daily reset (for testing or manual execution)
   */
  async triggerDailyReset(): Promise<{ success: number; errors: number; duration: number }> {
    console.log('🔧 Manual daily reset triggered');
    const start_time = Date.now();
    
    try {
      const users_needing_reset = await query(`
        SELECT ut.user_id FROM user_tickets ut
        WHERE ut.last_daily_reset < CURRENT_DATE
      `);

      let success_count = 0;
      let error_count = 0;

      for (const user of users_needing_reset.rows) {
        try {
          await ticket_service.performDailyReset(user.user_id);
          success_count++;
        } catch (error) {
          console.error(`❌ Manual reset failed for user ${user.user_id}:`, error);
          error_count++;
        }
      }

      const duration = Date.now() - start_time;
      console.log(`✅ Manual daily reset completed: ${success_count} success, ${error_count} errors`);
      
      return { success: success_count, errors: error_count, duration };
    } catch (error) {
      console.error('❌ Manual daily reset failed:', error);
      throw error;
    }
  }

  /**
   * Manual trigger for hourly refresh (for testing or manual execution)
   */
  async triggerHourlyRefresh(): Promise<{ success: number; errors: number; duration: number }> {
    console.log('🔧 Manual hourly refresh triggered');
    const start_time = Date.now();
    
    try {
      const users_needing_refresh = await query(`
        SELECT ut.user_id FROM user_tickets ut
        WHERE ut.last_hourly_refresh <= NOW() - INTERVAL '2 hours'
      `);

      let success_count = 0;
      let error_count = 0;

      for (const user of users_needing_refresh.rows) {
        try {
          await ticket_service.performHourlyRefresh(user.user_id);
          success_count++;
        } catch (error) {
          console.error(`❌ Manual refresh failed for user ${user.user_id}:`, error);
          error_count++;
        }
      }

      const duration = Date.now() - start_time;
      console.log(`✅ Manual hourly refresh completed: ${success_count} success, ${error_count} errors`);
      
      return { success: success_count, errors: error_count, duration };
    } catch (error) {
      console.error('❌ Manual hourly refresh failed:', error);
      throw error;
    }
  }

  /**
   * Get cron job status
   */
  getStatus(): { daily_reset: boolean; hourly_refresh: boolean } {
    return {
      daily_reset: this.daily_reset_job !== null,
      hourly_refresh: this.hourly_refresh_job !== null
    };
  }

  /**
   * Log cron execution to database for monitoring
   */
  private async logCronExecution(
    job_type: 'daily_reset' | 'hourly_refresh',
    success_count: number,
    error_count: number,
    duration: number,
    error?: any
  ): Promise<void> {
    try {
      await query(`
        INSERT INTO cron_logs (job_type, success_count, error_count, duration_ms, description, metadata, error_message)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        job_type,
        success_count,
        error_count,
        duration,
        `Cron ${job_type}: ${success_count} success, ${error_count} errors in ${duration}ms`,
        JSON.stringify({
          job_type: job_type,
          success_count: success_count,
          error_count: error_count,
          duration_ms: duration,
          executed_at: new Date().toISOString()
        }),
        error?.message || null
      ]);
    } catch (logError) {
      console.error('❌ Failed to log cron execution:', logError);
    }
  }
}

// Export singleton instance
export const ticket_cron_service = new TicketCronService();