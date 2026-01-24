import { query } from '../database/postgres';
import { InternalMailService } from './internalMailService';

export class DailyLoginService {
  private mail_service: InternalMailService;

  constructor() {
    this.mail_service = new InternalMailService();
  }

  /**
   * Check and award daily login rewards
   * Returns true if reward was given, false if already claimed today
   * Note: Tickets are handled separately by ticketService (hourly refresh + daily reset)
   */
  async checkAndAwardDailyLogin(user_id: string): Promise<{
    rewarded: boolean;
    day_streak: number;
    rewards?: { coins: number };
  }> {
    try {
      // Get user's last login and current date
      const user_result = await query(
        'SELECT last_login FROM users WHERE id = $1',
        [user_id]
      );

      if (user_result.rows.length === 0) {
        throw new Error('User not found');
      }

      const last_login = user_result.rows[0].last_login;
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Check if user logged in today already
      if (last_login) {
        const last_login_date = new Date(last_login);
        const last_login_day = new Date(
          last_login_date.getFullYear(),
          last_login_date.getMonth(),
          last_login_date.getDate()
        );

        // Already logged in today - no reward
        if (last_login_day.getTime() === today.getTime()) {
          return {
            rewarded: false,
            day_streak: 0
          };
        }
      }

      // Calculate streak
      let day_streak = 1;
      if (last_login) {
        const last_login_date = new Date(last_login);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const last_login_day = new Date(
          last_login_date.getFullYear(),
          last_login_date.getMonth(),
          last_login_date.getDate()
        );

        // Check if logged in yesterday (consecutive day)
        if (last_login_day.getTime() === yesterday.getTime()) {
          // Get existing streak from user metadata (or calculate)
          // For now, we'll use a simple calculation based on days
          // In production, you'd store this in a separate table or user field
          day_streak = await this.calculateStreak(user_id, last_login_date);
          day_streak++;

          // Reset after 7 days
          if (day_streak > 7) {
            day_streak = 1;
          }
        }
      }

      // Calculate rewards based on streak
      const rewards = this.calculateRewards(day_streak);

      // Update last_login
      await query(
        'UPDATE users SET last_login = $1 WHERE id = $2',
        [now, user_id]
      );

      // Award coins only (tickets handled by ticketService separately)
      await query(
        `INSERT INTO user_currency (user_id, coins)
         VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET
           coins = user_currency.coins + $2`,
        [user_id, rewards.coins]
      );

      // Send mail notification
      await this.mail_service.sendDailyLogin_rewardMail(user_id, day_streak, rewards);

      return {
        rewarded: true,
        day_streak,
        rewards
      };
    } catch (error) {
      console.error('Error awarding daily login:', error);
      throw error;
    }
  }

  /**
   * Calculate streak (simple implementation)
   * In production, store this in a dedicated login_streak table
   */
  private async calculateStreak(user_id: string, last_login_date: Date): Promise<number> {
    // Simple calculation: count consecutive days from login history
    // This is a placeholder - in production, store streak in database
    return 1; // Default to 1 if we can't determine
  }

  /**
   * Calculate rewards based on day streak
   * Only coins are awarded (tickets handled by ticketService separately)
   */
  private calculateRewards(day_streak: number): { coins: number } {
    switch (day_streak) {
      case 1:
      case 2:
        return { coins: 100 };
      case 3:
      case 4:
      case 5:
      case 6:
        return { coins: 200 };
      case 7:
        return { coins: 500 }; // Week completion bonus
      default:
        return { coins: 100 };
    }
  }
}
