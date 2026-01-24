import { query } from '../database';

export interface UserTicketBalance {
  user_id: string;
  current_tickets: number;
  last_hourly_refresh: Date;
  last_daily_reset: Date;
  total_earned: number;
  total_purchased: number;
  total_spent: number;
}

export interface TicketTransaction {
  id: string;
  user_id: string;
  transaction_type: 'earned' | 'purchased' | 'spent' | 'daily_reset' | 'hourly_refresh';
  amount: number;
  source: string;
  description?: string;
  metadata?: any;
  created_at: Date;
}

export interface MembershipTier {
  tier: 'free' | 'premium' | 'legendary';
  daily_allowance: number;
}

export class TicketService {
  private membership_tiers: Record<string, number> = {
    'free': 18,
    'premium': 35,
    'legendary': 100
  };

  /**
   * Get user's current ticket balance
   */
  async getTicketBalance(user_id: string): Promise<UserTicketBalance | null> {
    try {
      const result = await query(
        'SELECT * FROM user_tickets WHERE user_id = $1',
        [user_id]
      );
      
      if (result.rows.length === 0) {
        // Create initial ticket record for new user
        await this.initializeUserTickets(user_id);
        return await this.getTicketBalance(user_id);
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error getting ticket balance:', error);
      throw error;
    }
  }

  /**
   * Initialize ticket balance for new user
   */
  private async initializeUserTickets(user_id: string): Promise<void> {
    await query(
      `INSERT INTO user_tickets (user_id, current_tickets) 
       VALUES ($1, $2) 
       ON CONFLICT (user_id) DO NOTHING`,
      [user_id, this.membership_tiers.free]
    );

    // Log the initialization
    await this.logTransaction(user_id, 'daily_reset', this.membership_tiers.free, 'initial_setup', 'Initial ticket setup for new user');
  }

  /**
   * Check if user has enough tickets for a chat interaction
   */
  async can_useTicket(user_id: string): Promise<boolean> {
    const balance = await this.getTicketBalance(user_id);
    return balance ? balance.current_tickets > 0 : false;
  }

  /**
   * Consume a ticket for chat interaction
   */
  async consumeTicket(user_id: string, source: string, description?: string, metadata?: any): Promise<boolean> {
    try {
      // Direct atomic consumption with double-check
      const result = await query(
        `UPDATE user_tickets 
         SET current_tickets = current_tickets - 1,
             total_spent = total_spent + 1,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND current_tickets > 0
         RETURNING current_tickets, total_spent`,
        [user_id]
      );

      if (result.rows.length === 0) {
        // Either user doesn't exist or has no tickets
        const balance = await this.getTicketBalance(user_id);
        if (!balance) {
          console.error('User not found for ticket consumption:', user_id);
        } else {
          console.log(`❌ User ${user_id} has insufficient tickets: ${balance.current_tickets}`);
        }
        return false;
      }

      // Log the transaction (use positive amount for consistency)
      await this.logTransaction(user_id, 'spent', 1, source, description, metadata);
      
      console.log(`🎫 Consumed 1 ticket for user ${user_id}: ${result.rows[0].current_tickets} remaining`);
      return true;
    } catch (error) {
      console.error('Error consuming ticket:', error);
      return false;
    }
  }

  /**
   * Add tickets to user's balance (from purchases or earning)
   */
  async addTickets(user_id: string, amount: number, transaction_type: 'earned' | 'purchased', source: string, description?: string, metadata?: any): Promise<boolean> {
    try {
      // Validate amount
      if (amount <= 0) {
        console.error('Invalid ticket amount:', amount);
        return false;
      }

      // Update balance atomically with existence check
      const update_field = transaction_type === 'purchased' ? 'total_purchased' : 'total_earned';
      const result = await query(
        `UPDATE user_tickets
         SET current_tickets = current_tickets + $2,
             ${update_field} = ${update_field} + $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1
         RETURNING current_tickets, ${update_field}`,
        [user_id, amount]
      );

      // Check if user was found and updated
      if (result.rows.length === 0) {
        console.error('User not found for ticket addition:', user_id);
        return false;
      }

      // Log the transaction
      await this.logTransaction(user_id, transaction_type, amount, source, description, metadata);
      
      console.log(`✅ Added ${amount} tickets to user ${user_id}: ${result.rows[0].current_tickets} total`);
      return true;
    } catch (error) {
      console.error('Error adding tickets:', error);
      return false;
    }
  }

  /**
   * Get daily allowance based on user's membership tier
   */
  async getUserDailyAllowance(user_id: string): Promise<number> {
    try {
      const result = await query(
        'SELECT subscription_tier FROM users WHERE id = $1',
        [user_id]
      );
      
      if (result.rows.length === 0) {
        // User not found, default to free tier
        return this.membership_tiers.free;
      }
      
      const tier = result.rows[0].subscription_tier;
      return this.membership_tiers[tier] || this.membership_tiers.free;
    } catch (error) {
      console.error('Error getting user daily allowance:', error);
      // Fallback to free tier on error
      return this.membership_tiers.free;
    }
  }

  /**
   * Perform daily reset - top up to daily allowance with caps
   */
  async performDailyReset(user_id: string): Promise<void> {
    try {
      const daily_allowance = await this.getUserDailyAllowance(user_id);
      const balance = await this.getTicketBalance(user_id);
      
      if (!balance) return;

      // Cap total tickets at 3x daily allowance to prevent infinite accumulation
      const max_total_tickets = daily_allowance * 3;
      const target_tickets = Math.max(daily_allowance, Math.min(balance.current_tickets + daily_allowance, max_total_tickets));

      // Only reset if current tickets are below target
      if (balance.current_tickets < target_tickets) {
        const tickets_to_add = target_tickets - balance.current_tickets;
        
        const result = await query(
          `UPDATE user_tickets 
           SET current_tickets = $2,
               last_daily_reset = CURRENT_DATE,
               updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $1
           RETURNING current_tickets`,
          [user_id, target_tickets]
        );

        if (result.rows.length > 0 && tickets_to_add > 0) {
          // Log the reset
          await this.logTransaction(user_id, 'daily_reset', tickets_to_add, 'daily_reset', 
            `Daily reset: +${tickets_to_add} tickets to ${target_tickets} total`);
          
          console.log(`🌅 Daily reset for user ${user_id}: ${balance.current_tickets} → ${target_tickets} tickets`);
        }
      } else {
        // Just update the reset date even if no tickets added
        await query(
          'UPDATE user_tickets SET last_daily_reset = CURRENT_DATE WHERE user_id = $1',
          [user_id]
        );
        
        console.log(`🌅 Daily reset for user ${user_id}: No change (${balance.current_tickets} ≥ ${target_tickets})`);
      }
    } catch (error) {
      console.error('Error performing daily reset:', error);
      throw error;
    }
  }

  /**
   * Perform hourly refresh - add 1 ticket every 2 hours with caps
   */
  async performHourlyRefresh(user_id: string): Promise<void> {
    try {
      const balance = await this.getTicketBalance(user_id);
      if (!balance) return;

      const now = new Date();
      const last_refresh = new Date(balance.last_hourly_refresh);
      const hours_since_refresh = (now.getTime() - last_refresh.getTime()) / (1000 * 60 * 60);

      // Add 1 ticket for every 2 hours passed, but cap at 7 days worth (84 tickets max)
      const max_tickets_from_refresh = Math.floor(7 * 24 / 2); // 84 tickets (7 days worth)
      const raw_tickets_to_add = Math.floor(hours_since_refresh / 2);
      const tickets_to_add = Math.min(raw_tickets_to_add, max_tickets_from_refresh);

      if (tickets_to_add > 0) {
        // Get user's daily allowance to enforce overall cap
        const daily_allowance = await this.getUserDailyAllowance(user_id);
        const max_total_tickets = daily_allowance * 3; // Allow up to 3x daily allowance total
        
        const result = await query(
          `UPDATE user_tickets 
           SET current_tickets = LEAST(current_tickets + $2, $3),
               last_hourly_refresh = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $1
           RETURNING current_tickets`,
          [user_id, tickets_to_add, max_total_tickets]
        );

        if (result.rows.length > 0) {
          const new_ticket_count = result.rows[0].current_tickets;
          const actual_tickets_added = new_ticket_count - balance.current_tickets;
          if (actual_tickets_added > 0) {
            // Log the refresh
            await this.logTransaction(user_id, 'hourly_refresh', actual_tickets_added, 'hourly_refresh',
              `Hourly refresh: +${actual_tickets_added} tickets (capped at ${max_total_tickets})`);

            if (raw_tickets_to_add > tickets_to_add) {
              console.log(`⚠️ Capped hourly refresh for user ${user_id}: ${raw_tickets_to_add} → ${tickets_to_add} tickets`);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error performing hourly refresh:', error);
      throw error;
    }
  }

  /**
   * Log a ticket transaction
   */
  private async logTransaction(
    user_id: string, 
    type: TicketTransaction['transaction_type'], 
    amount: number, 
    source: string, 
    description?: string, 
    metadata?: any
  ): Promise<void> {
    try {
      await query(
        `INSERT INTO ticket_transactions (user_id, transaction_type, amount, source, description, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [user_id, type, amount, source, description, metadata ? JSON.stringify(metadata) : null]
      );
    } catch (error) {
      console.error('Error logging ticket transaction:', error);
      // Don't throw here - transaction logging shouldn't break the main operation
    }
  }

  /**
   * Award tickets for battle victory with transaction safety
   */
  async awardBattleTickets(user_id: string, total_wins: number, battle_id: string, character_id: string): Promise<boolean> {
    try {
      // Calculate milestone rewards (2 tickets per 5 wins)
      const current_milestone = Math.floor(total_wins / 5);
      const previous_milestone = Math.floor((total_wins - 1) / 5);

      if (current_milestone <= previous_milestone) {
        return true; // No new milestone reached
      }
      
      const tickets_to_award = 2;
      
      // Use transaction to ensure atomicity
      await query('BEGIN');
      
      try {
        // Award tickets
        const success = await this.addTickets(
          user_id,
          tickets_to_award,
          'earned',
          'battle_victories',
          `Battle victory milestone: ${total_wins} wins (${tickets_to_award} tickets earned)`,
          {
            battle_id: battle_id,
            character_id: character_id,
            total_wins: total_wins,
            milestone: current_milestone,
            previous_milestone: previous_milestone
          }
        );
        
        if (!success) {
          await query('ROLLBACK');
          return false;
        }
        
        await query('COMMIT');
        console.log(`🏆 Awarded ${tickets_to_award} tickets to user ${user_id} for ${total_wins} wins milestone`);
        return true;
        
      } catch (error) {
        await query('ROLLBACK');
        throw error;
      }
      
    } catch (error) {
      console.error('Error awarding battle tickets:', error);
      return false;
    }
  }

  /**
   * Get user's transaction history
   */
  async getTransactionHistory(user_id: string, limit: number = 50): Promise<TicketTransaction[]> {
    try {
      const result = await query(
        `SELECT * FROM ticket_transactions 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2`,
        [user_id, limit]
      );
      
      return result.rows;
    } catch (error) {
      console.error('Error getting transaction history:', error);
      return [];
    }
  }
}

// Export singleton instance
export const ticket_service = new TicketService();