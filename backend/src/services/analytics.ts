/**
 * Analytics Service for Battle System
 * Tracks battle performance, user engagement, and system metrics
 */

interface BattleAnalytics {
  battle_id: string;
  duration: number;
  rounds: number;
  winner: string;
  loser: string;
  combat_events: number;
  chat_messages: number;
  disconnections: number;
  forfeit: boolean;
}

interface UserAnalytics {
  user_id: string;
  action: string;
  data: Record<string, any>;
  timestamp: Date;
}

class AnalyticsService {
  private events: UserAnalytics[] = [];
  private battle_metrics: BattleAnalytics[] = [];

  /**
   * Track user action
   */
  trackUserAction(user_id: string, action: string, data: Record<string, any> = {}): void {
    this.events.push({
      user_id,
      action,
      data,
      timestamp: new Date()
    });

    // Log important events
    if (['battle_start', 'battle_end', 'matchmaking_start'].includes(action)) {
      console.log(`📊 Analytics: User ${user_id} - ${action}`, data);
    }
  }

  /**
   * Track battle completion
   */
  trackBattleCompletion(analytics: BattleAnalytics): void {
    this.battle_metrics.push(analytics);

    console.log(`⚔️ Battle Analytics: ${analytics.battle_id}`, {
      duration: `${analytics.duration}s`,
      rounds: analytics.rounds,
      winner: analytics.winner,
      forfeit: analytics.forfeit
    });

    // Track user-level analytics
    this.trackUserAction(analytics.winner, 'battle_won', {
      battle_id: analytics.battle_id,
      duration: analytics.duration,
      rounds: analytics.rounds
    });

    this.trackUserAction(analytics.loser, 'battle_lost', {
      battle_id: analytics.battle_id,
      duration: analytics.duration,
      rounds: analytics.rounds
    });
  }

  /**
   * Track matchmaking metrics
   */
  trackMatchmaking(user_id: string, wait_time: number, queue_size: number): void {
    this.trackUserAction(user_id, 'matchmaking_complete', {
      wait_time,
      queue_size,
      timestamp: new Date()
    });

    console.log(`🎯 Matchmaking: User ${user_id} waited ${wait_time}s (queue: ${queue_size})`);
  }

  /**
   * Track character interaction
   */
  trackCharacterInteraction(user_id: string, character_id: string, interaction_type: string, data: Record<string, any> = {}): void {
    this.trackUserAction(user_id, 'character_interaction', {
      character_id,
      interaction_type,
      ...data
    });
  }

  /**
   * Track system performance
   */
  trackSystemPerformance(metric: string, value: number, unit: string): void {
    console.log(`📈 System Metric: ${metric} = ${value}${unit}`);
    
    // Store for monitoring (in production, send to monitoring service)
    this.events.push({
      user_id: 'system',
      action: 'performance_metric',
      data: { metric, value, unit },
      timestamp: new Date()
    });
  }

  /**
   * Get user analytics summary
   */
  getUserAnalytics(user_id: string): UserAnalytics[] {
    return this.events.filter(event => event.user_id === user_id);
  }

  /**
   * Get battle analytics summary
   */
  getBattleAnalytics(limit = 10): BattleAnalytics[] {
    return this.battle_metrics.slice(-limit);
  }

  /**
   * Get system health metrics
   */
  getSystemMetrics(): Record<string, any> {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recent_events = this.events.filter(event => event.timestamp >= last24h);
    const recent_battles = this.battle_metrics.filter(battle => 
      new Date(battle.battle_id.split('_')[1]) >= last24h
    );

    return {
      total_events: this.events.length,
      recent_events: recent_events.length,
      total_battles: this.battle_metrics.length,
      recent_battles: recent_battles.length,
      average_battle_duration: recent_battles.length > 0 
        ? recent_battles.reduce((sum, b) => sum + b.duration, 0) / recent_battles.length 
        : 0,
      active_users: new Set(recent_events.map(e => e.user_id)).size,
      top_actions: this.getTopActions(recent_events)
    };
  }

  /**
   * Helper: Get most common actions
   */
  private getTopActions(events: UserAnalytics[]): Record<string, number> {
    const action_counts: Record<string, number> = {};
    
    events.forEach(event => {
      action_counts[event.action] = (action_counts[event.action] || 0) + 1;
    });

    return Object.entries(action_counts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .reduce((obj, [action, count]) => ({ ...obj, [action]: count }), {});
  }

  /**
   * Clear old analytics data (for memory management)
   */
  cleanup(older_than_days = 7): void {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - older_than_days);

    const before_count = this.events.length;
    this.events = this.events.filter(event => event.timestamp >= cutoff);

    const removed = before_count - this.events.length;
    if (removed > 0) {
      console.log(`🧹 Analytics cleanup: Removed ${removed} old events`);
    }
  }
}

// Export singleton instance
export const analytics_service = new AnalyticsService();

// Auto-cleanup old data every 6 hours
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    analytics_service.cleanup();
  }, 6 * 60 * 60 * 1000);
}

export default analytics_service;