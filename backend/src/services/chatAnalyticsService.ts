import { query } from '../database/index';

// Row type for coach_xp_events query
interface ChatXPEventRow {
  event_type: string;
  event_subtype: string | null;
  xp_gained: number;  // NOT NULL in DB
  character_id: string | null;  // UUID, nullable
  description: string | null;
  created_at: Date;
}

// Row type for daily stats aggregation query
interface DailyStatsRow {
  chat_date: string;
  chats: string;  // COUNT returns bigint -> string
  successful_chats: string;  // COUNT returns bigint -> string
  xp_gained: string;  // SUM returns bigint -> string
}

export interface ChatPerformanceStats {
  user_id: string;
  total_chats: number;
  successful_chats: number;
  failed_chats: number;
  neutral_chats: number;
  total_xpGained: number;
  penalties_received: number;
  success_rate: number;
  avg_xp_per_chat: number;
  last_chat_at?: Date;
  character_breakdown: {
    [character_id: string]: {
      name: string;
      chats: number;
      success_rate: number;
      total_xp: number;
    };
  };
}

export class ChatAnalyticsService {
  
  /**
   * Get comprehensive chat performance analytics for a user
   */
  static async getChatPerformanceStats(user_id: string): Promise<ChatPerformanceStats> {
    try {
      // Get chat-related XP events from existing table
      const chat_events_result = await query(`
        SELECT 
          event_type,
          event_subtype,
          xp_gained,
          character_id,
          description,
          created_at
        FROM coach_xp_events 
        WHERE user_id = $1 
        AND (event_type = 'character_development' OR event_subtype LIKE '%chat%')
        ORDER BY created_at DESC
      `, [user_id]);

      const events: ChatXPEventRow[] = chat_events_result.rows;

      // Calculate aggregated stats
      const total_chats = events.length;
      const successful_chats = events.filter((e: ChatXPEventRow) => e.xp_gained >= 30).length; // 30-50 XP = success
      const failed_chats = events.filter((e: ChatXPEventRow) => e.xp_gained < 0).length; // Negative XP = failure
      const neutral_chats = total_chats - successful_chats - failed_chats;

      const total_xpGained = events.reduce((sum: number, e: ChatXPEventRow) => sum + e.xp_gained, 0);
      const penalties_received = events.filter((e: ChatXPEventRow) => e.xp_gained < 0).length;
      
      const success_rate = total_chats > 0 ? Math.round((successful_chats / total_chats) * 100) : 0;
      const avg_xp_per_chat = total_chats > 0 ? Math.round(total_xpGained / total_chats) : 0;
      
      const last_chat_at = events.length > 0 ? new Date(events[0].created_at) : undefined;

      // Character breakdown - internal tracking type (success_rate added after loop)
      const character_breakdown: { [key: string]: {
        name: string;
        chats: number;
        successful_chats: number;
        total_xp: number;
        success_rate: number;
      } } = {};
      
      for (const event of events) {
        if (!event.character_id) continue;
        
        if (!character_breakdown[event.character_id]) {
          character_breakdown[event.character_id] = {
            name: event.character_id.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
            chats: 0,
            successful_chats: 0,
            total_xp: 0,
            success_rate: 0
          };
        }
        
        character_breakdown[event.character_id].chats++;
        character_breakdown[event.character_id].total_xp += event.xp_gained;
        
        if (event.xp_gained >= 30) {
          character_breakdown[event.character_id].successful_chats++;
        }
      }
      
      // Calculate success rates for each character
      Object.keys(character_breakdown).forEach(char_id => {
        const char = character_breakdown[char_id];
        char.success_rate = char.chats > 0 ? Math.round((char.successful_chats / char.chats) * 100) : 0;
      });

      return {
        user_id,
        total_chats,
        successful_chats,
        failed_chats,
        neutral_chats,
        total_xpGained,
        penalties_received,
        success_rate,
        avg_xp_per_chat,
        last_chat_at,
        character_breakdown
      };

    } catch (error) {
      console.error('Error getting chat performance stats:', error);
      throw new Error('Failed to retrieve chat performance statistics');
    }
  }

  /**
   * Get recent chat performance trend (last 30 days)
   */
  static async getChatPerformanceTrend(user_id: string, days: number = 30): Promise<{
    daily_stats: Array<{
      date: string;
      chats: number;
      successful_chats: number;
      xp_gained: number;
    }>;
  }> {
    try {
      const result = await query(`
        SELECT 
          DATE(created_at) as chat_date,
          COUNT(*) as chats,
          COUNT(CASE WHEN xp_gained >= 30 THEN 1 END) as successful_chats,
          SUM(xp_gained) as xp_gained
        FROM coach_xp_events 
        WHERE user_id = $1 
        AND (event_type = 'character_development' OR event_subtype LIKE '%chat%')
        AND created_at >= CURRENT_DATE - INTERVAL '${days} days'
        GROUP BY DATE(created_at)
        ORDER BY chat_date DESC
      `, [user_id]);

      return {
        daily_stats: result.rows.map((row: DailyStatsRow) => ({
          date: row.chat_date,
          chats: parseInt(row.chats),
          successful_chats: parseInt(row.successful_chats),
          xp_gained: parseInt(row.xp_gained)
        }))
      };

    } catch (error) {
      console.error('Error getting chat performance trend:', error);
      throw new Error('Failed to retrieve chat performance trend');
    }
  }

  /**
   * Log additional context for better analytics (optional enhancement)
   */
  static async logChatContext(
    user_id: string,
    character_id: string,
    chat_result: 'success' | 'neutral' | 'failure',
    evaluation_reason: string
  ): Promise<void> {
    try {
      // This just adds a descriptive entry to track evaluation reasons
      // Uses existing coach_xp_events table with 0 XP to avoid double-counting
      await query(`
        INSERT INTO coach_xp_events (
          id, user_id, event_type, event_subtype, xp_gained, description, character_id
        ) VALUES (
          gen_random_uuid(), $1, 'character_development', 'chat_evaluation', 0, $2, $3
        )
      `, [
        user_id, 
        `Chat ${chat_result}: ${evaluation_reason}`,
        character_id
      ]);
    } catch (error) {
      console.error('Error logging chat context:', error);
      // Don't throw - this is optional analytics data
    }
  }
}