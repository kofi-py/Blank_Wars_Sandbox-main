// Game Balance System for Conflict Risk/Reward
// Ensures engaging with conflicts is more beneficial than avoiding them

import ConflictRewardSystem, { ConflictReward } from './conflictRewardSystem';
import GameEventBus, { GameEvent } from './gameEventBus';

export interface CharacterProgressionState {
  level: number;
  experience: number;
  stats: Record<string, number>;
  social_skills: number;
  conflict_resolution_streak: number;
  last_conflict_engagement: Date;
  avoidance_penalties: number;
  unresolved_conflicts: number;
}

export interface GameplayIncentives {
  risk_vs_reward: 'balanced' | 'risk_heavy' | 'reward_heavy';
  engagement_bonus: number;
  avoidance_penalty: number;
  collaborative_multiplier: number;
}

export class GameBalanceSystem {
  private static instance: GameBalanceSystem;
  private conflictRewardSystem = ConflictRewardSystem.getInstance();
  private eventBus = GameEventBus.getInstance();

  static getInstance(): GameBalanceSystem {
    if (!GameBalanceSystem.instance) {
      GameBalanceSystem.instance = new GameBalanceSystem();
    }
    return GameBalanceSystem.instance;
  }

  // Main function: Calculate if engaging with conflict is worth it
  analyzeConflictEngagementValue(
    character_id: string,
    conflict_type: string,
    conflict_severity: 'low' | 'medium' | 'high' | 'critical'
  ): {
    engagement_value: number; // 0-100 scale
    avoidance_value: number; // 0-100 scale
    recommendation: 'ENGAGE' | 'AVOID' | 'NEUTRAL';
    reasoning: string[];
    potential_rewards: ConflictReward;
    potential_penalties: any;
  } {
    const characterState = this.getCharacterState(character_id);
    const potentialRewards = this.conflictRewardSystem.calculateResolutionRewards(
      conflict_type,
      'collaborative', // Best case scenario
      conflict_severity,
      [character_id]
    );

    const potentialPenalties = this.conflictRewardSystem.calculateConflictPenalties(
      [{ type: conflict_type, severity: conflict_severity }],
      0
    );

    const engagementValue = this.calculateEngagementValue(
      characterState,
      potentialRewards,
      conflict_severity
    );

    const avoidanceValue = this.calculateAvoidanceValue(
      characterState,
      potentialPenalties
    );

    const recommendation = engagementValue > avoidanceValue + 10 ? 'ENGAGE' :
      avoidanceValue > engagementValue + 10 ? 'AVOID' : 'NEUTRAL';

    const reasoning = this.generateRecommendationReasoning(
      engagementValue,
      avoidanceValue,
      characterState,
      conflict_severity
    );

    return {
      engagement_value: engagementValue,
      avoidance_value: avoidanceValue,
      recommendation,
      reasoning,
      potential_rewards: potentialRewards,
      potential_penalties: potentialPenalties
    };
  }

  private calculateEngagementValue(
    state: CharacterProgressionState,
    rewards: ConflictReward,
    severity: string
  ): number {
    let value = 50; // Base value

    // Experience value (20-40 points)
    const expValue = Math.min(40, rewards.experience_bonus / 10);
    value += expValue;

    // Stat boost value (0-25 points)
    const statBoosts = rewards.immediate.filter(r => r.type === 'stat_boost');
    const statValue = Math.min(25, statBoosts.length * 8);
    value += statValue;

    // Long-term permanent rewards (0-30 points)
    const permanentRewards = rewards.long_term.filter(r => r.permanent);
    const permanentValue = permanentRewards.length * 15;
    value += permanentValue;

    // Streak bonus (0-20 points)
    const streakBonus = Math.min(20, state.conflict_resolution_streak * 3);
    value += streakBonus;

    // Severity bonus - higher risk = higher reward (0-15 points)
    const severityBonus = {
      'low': 0,
      'medium': 5,
      'high': 10,
      'critical': 15
    }[severity] || 0;
    value += severityBonus;

    // Relationship improvement value (0-15 points)
    const relationshipValue = Object.values(rewards.relationship_changes)
      .filter(change => change > 0)
      .reduce((sum, change) => sum + change, 0);
    value += Math.min(15, relationshipValue * 2);

    return Math.min(100, value);
  }

  private calculateAvoidanceValue(
    state: CharacterProgressionState,
    penalties: any
  ): number {
    let value = 30; // Base avoidance value (lower than engagement base)

    // Avoid immediate penalties (0-20 points)
    const penaltyAvoidance = Math.abs(penalties.battle_performance) +
      Math.abs(penalties.training_efficiency);
    value += Math.min(20, penaltyAvoidance / 2);

    // Short-term peace value (0-15 points)
    if (state.unresolved_conflicts === 0) {
      value += 15; // High value if character has no conflicts
    } else {
      value -= state.unresolved_conflicts * 3; // Diminishing value with existing conflicts
    }

    // Avoidance penalties accumulate over time (-30 to 0 points)
    const daysSinceLastEngagement = Math.floor(
      (Date.now() - state.last_conflict_engagement.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastEngagement > 7) {
      value -= (daysSinceLastEngagement - 7) * 3; // -3 per day after a week
    }

    // Social isolation penalty (-20 to 0 points)
    if (state.social_skills < 30) {
      value -= (30 - state.social_skills) / 2;
    }

    return Math.max(0, value);
  }

  private generateRecommendationReasoning(
    engagement_value: number,
    avoidance_value: number,
    state: CharacterProgressionState,
    severity: string
  ): string[] {
    const reasoning: string[] = [];

    if (engagement_value > avoidance_value + 10) {
      reasoning.push(`✅ Engagement highly recommended (${engagement_value} vs ${avoidance_value})`);

      if (severity === 'high' || severity === 'critical') {
        reasoning.push('🎯 High-severity conflicts offer the best rewards');
      }

      if (state.conflict_resolution_streak >= 2) {
        reasoning.push(`🔥 Streak bonus active (${state.conflict_resolution_streak} resolved)`);
      }

      if (state.social_skills < 50) {
        reasoning.push('📈 Great opportunity to build social skills');
      }
    } else if (avoidance_value > engagement_value + 10) {
      reasoning.push(`⚠️ Avoidance may be safer (${avoidance_value} vs ${engagement_value})`);

      if (state.unresolved_conflicts === 0) {
        reasoning.push('😌 Character is conflict-free, may want to preserve peace');
      }

      if (state.level < 5) {
        reasoning.push('🆙 Consider building basic skills before major conflicts');
      }
    } else {
      reasoning.push(`⚖️ Balanced choice (${engagement_value} vs ${avoidance_value})`);
      reasoning.push('🎲 Outcome depends on resolution approach');
    }

    // Always show potential missed opportunities for avoidance
    if (avoidance_value > engagement_value) {
      const daysSinceLastEngagement = Math.floor(
        (Date.now() - state.last_conflict_engagement.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceLastEngagement > 7) {
        reasoning.push('⏰ Long avoidance period reducing growth potential');
      }

      if (state.unresolved_conflicts > 2) {
        reasoning.push('🌪️ Multiple unresolved conflicts creating mounting pressure');
      }
    }

    return reasoning;
  }

  private getCharacterState(character_id: string): CharacterProgressionState {
    // This would integrate with the actual character data system
    // For now, returning mock data structure
    return {
      level: 10,
      experience: 2500,
      stats: { strength: 75, charisma: 45, wisdom: 60 },
      social_skills: 35,
      conflict_resolution_streak: 2,
      last_conflict_engagement: new Date(Date.now() - (5 * 24 * 60 * 60 * 1000)), // 5 days ago
      avoidance_penalties: 0,
      unresolved_conflicts: 1
    };
  }

  // Key insight: Make collaborative approaches significantly more rewarding
  getOptimalStrategy(
    conflict_type: string,
    characters_involved: string[],
    current_team_dynamics: any
  ): {
    recommended_approach: 'aggressive' | 'diplomatic' | 'collaborative' | 'avoidant';
    expected_outcome: string;
    reward_potential: 'low' | 'medium' | 'high' | 'exceptional';
    risk_level: 'low' | 'medium' | 'high';
  } {
    const groupSize = characters_involved.length;

    // Collaborative approach becomes exponentially better with more people
    if (groupSize >= 3) {
      return {
        recommended_approach: 'collaborative',
        expected_outcome: 'Strong team bonding, skill unlocks, major experience gains',
        reward_potential: 'exceptional',
        risk_level: 'low'
      };
    }

    // Diplomatic is usually the safe bet
    if (groupSize === 2) {
      return {
        recommended_approach: 'diplomatic',
        expected_outcome: 'Relationship improvement, moderate experience gains',
        reward_potential: 'medium',
        risk_level: 'low'
      };
    }

    // Solo conflicts favor aggressive if character is strong
    return {
      recommended_approach: 'aggressive',
      expected_outcome: 'Personal strength building, some relationship damage',
      reward_potential: 'medium',
      risk_level: 'medium'
    };
  }

  // Generate in-game UI hints for players
  generatePlayerGuidance(character_id: string): {
    current_status: string;
    next_best_action: string;
    longterm_strategy: string;
    warning_flags: string[];
  } {
    const state = this.getCharacterState(character_id);
    const guidance = {
      current_status: '',
      next_best_action: '',
      longterm_strategy: '',
      warning_flags: [] as string[]
    };

    // Current status
    if (state.conflict_resolution_streak >= 3) {
      guidance.current_status = `🔥 ON FIRE! ${state.conflict_resolution_streak} conflicts resolved. Keep the streak going!`;
    } else if (state.unresolved_conflicts > 2) {
      guidance.current_status = `🌪️ OVERWHELMED: ${state.unresolved_conflicts} unresolved conflicts creating stress`;
    } else if (state.social_skills > 70) {
      guidance.current_status = `😎 SOCIAL MASTER: High social skills opening new opportunities`;
    } else {
      guidance.current_status = `🎯 BUILDING: Developing conflict resolution abilities`;
    }

    // Next best action
    if (state.unresolved_conflicts > 0) {
      guidance.next_best_action = 'Resolve pending conflicts to prevent accumulating penalties';
    } else if (state.conflict_resolution_streak >= 2) {
      guidance.next_best_action = 'Seek challenging conflicts to maximize streak bonuses';
    } else {
      guidance.next_best_action = 'Practice diplomatic approaches to build social skills';
    }

    // Long-term strategy
    if (state.social_skills < 50) {
      guidance.longterm_strategy = 'Focus on collaborative resolutions to unlock advanced social abilities';
    } else {
      guidance.longterm_strategy = 'Balance conflict types to develop well-rounded leadership skills';
    }

    // Warning flags
    const daysSinceLastEngagement = Math.floor(
      (Date.now() - state.last_conflict_engagement.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastEngagement > 7) {
      guidance.warning_flags.push('⏰ Long avoidance period - growth opportunities being missed');
    }

    if (state.unresolved_conflicts > 3) {
      guidance.warning_flags.push('🌪️ Too many unresolved conflicts - battle performance suffering');
    }

    if (state.social_skills < 25) {
      guidance.warning_flags.push('📉 Low social skills limiting advanced character development');
    }

    return guidance;
  }
}

export default GameBalanceSystem;