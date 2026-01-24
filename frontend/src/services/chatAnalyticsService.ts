import { apiClient } from './apiClient';

export interface ChatPerformanceStats {
  user_id: string;
  total_chats: number;
  successful_chats: number;
  failed_chats: number;
  neutral_chats: number;
  total_xp_gained: number;
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

export interface ChatPerformanceTrend {
  daily_stats: Array<{
    date: string;
    chats: number;
    successful_chats: number;
    xp_gained: number;
  }>;
}

export interface ChatSummary {
  total_chats: number;
  success_rate: number;
  total_xp_gained: number;
  avg_xp_per_chat: number;
  last_chat_at?: Date;
  top_characters: Array<{
    character_id: string;
    name: string;
    total_xp: number;
    success_rate: number;
    chats: number;
  }>;
}

export interface CharacterChatStats {
  character_id: string;
  name: string;
  chats: number;
  success_rate: number;
  total_xp: number;
  last_chat_at?: Date;
}

export class ChatAnalyticsServiceClient {
  
  /**
   * Get comprehensive chat performance statistics
   */
  static async getChatPerformanceStats(): Promise<ChatPerformanceStats> {
    try {
      const response = await apiClient.get('/analytics/chat/performance');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching chat performance stats:', error);
      throw new Error('Failed to load chat performance statistics');
    }
  }

  /**
   * Get chat performance trend over time
   */
  static async getChatPerformanceTrend(days: number = 30): Promise<ChatPerformanceTrend> {
    try {
      const response = await apiClient.get(`/analytics/chat/trend?days=${days}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching chat performance trend:', error);
      throw new Error('Failed to load chat performance trend');
    }
  }

  /**
   * Get quick chat summary for dashboard
   */
  static async getChatSummary(): Promise<ChatSummary> {
    try {
      const response = await apiClient.get('/analytics/chat/summary');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching chat summary:', error);
      throw new Error('Failed to load chat summary');
    }
  }

  /**
   * Get analytics for specific character
   */
  static async getCharacterChatStats(character_id: string): Promise<CharacterChatStats> {
    try {
      const response = await apiClient.get(`/analytics/chat/character/${character_id}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching character chat stats:', error);
      throw new Error('Failed to load character chat statistics');
    }
  }

  /**
   * Get chat analytics dashboard data (combines multiple endpoints)
   */
  static async getDashboardData(): Promise<{
    summary: ChatSummary;
    recent_trend: ChatPerformanceTrend;
    full_stats: ChatPerformanceStats;
  }> {
    try {
      const [summary, recentTrend, fullStats] = await Promise.all([
        this.getChatSummary(),
        this.getChatPerformanceTrend(7), // Last 7 days for trend
        this.getChatPerformanceStats()
      ]);

      return {
        summary,
        recent_trend: recentTrend,
        full_stats: fullStats
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw new Error('Failed to load chat analytics dashboard');
    }
  }

  /**
   * Calculate coaching performance insights
   */
  static calculateInsights(stats: ChatPerformanceStats): {
    insights: string[];
    recommendations: string[];
    achievements: string[];
  } {
    const insights: string[] = [];
    const recommendations: string[] = [];
    const achievements: string[] = [];

    // Success rate insights
    if (stats.success_rate >= 80) {
      achievements.push('🌟 Exceptional Coach - 80%+ success rate!');
    } else if (stats.success_rate >= 60) {
      insights.push(`👍 Good success rate at ${stats.success_rate}%`);
    } else if (stats.success_rate < 40 && stats.total_chats > 5) {
      recommendations.push('💡 Try asking more specific questions about character concerns');
    }

    // XP insights
    if (stats.avg_xp_per_chat >= 50) {
      achievements.push('🎯 High-Impact Coaching - Excellent XP per chat!');
    } else if (stats.avg_xp_per_chat < 20 && stats.total_chats > 10) {
      recommendations.push('📈 Focus on providing specific advice and solutions');
    }

    // Problem resolution insights
    const problemResolutions = Math.floor(stats.total_xp_gained / 130); // Rough estimate
    if (problemResolutions >= 5) {
      achievements.push(`🏆 Problem Solver - ${problemResolutions} major breakthroughs!`);
    }

    // Character diversity
    const charactersCoached = Object.keys(stats.character_breakdown).length;
    if (charactersCoached >= 5) {
      achievements.push(`🌍 Well-Rounded Coach - Working with ${charactersCoached} characters`);
    } else if (charactersCoached <= 2 && stats.total_chats > 10) {
      recommendations.push('🔄 Try coaching different characters for varied experience');
    }

    // Penalty insights
    if (stats.penalties_received === 0 && stats.total_chats > 5) {
      achievements.push('✨ Penalty-Free Coaching - Great communication!');
    } else if (stats.penalties_received > stats.successful_chats) {
      recommendations.push('🤝 Focus on positive, supportive communication');
    }

    return { insights, recommendations, achievements };
  }
}

export default ChatAnalyticsServiceClient;