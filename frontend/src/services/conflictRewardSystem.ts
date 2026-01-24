// Conflict Resolution Rewards System
// Balances risk/reward to incentivize engaging with social conflicts

// Real database stats that can be modified by rewards
export type RewardStatName =
  | 'experience'
  | 'mental_health'
  | 'stress_level'
  | 'morale'
  | 'bond_level'
  | 'wallet'
  | 'training'
  | 'team_player'
  | 'ego'
  | 'communication'
  | 'fatigue_level'
  | 'financial_stress'
  | 'coach_trust_level';

export interface ConflictResolutionReward {
  type: 'stat_boost'; // Only real stat changes exist in this game
  stat_name: RewardStatName; // Which DB stat to modify
  name: string; // Display name for UI
  description: string;
  value: number; // Amount to add/subtract from stat
  duration?: number; // hours, if temporary boost
  permanent?: boolean; // Whether this is a permanent change
}

export interface ConflictReward {
  immediate: ConflictResolutionReward[];
  long_term: ConflictResolutionReward[];
  relationship_changes: Record<string, number>;
  experience_bonus: number;
}

export class ConflictRewardSystem {
  private static instance: ConflictRewardSystem;

  static getInstance(): ConflictRewardSystem {
    if (!ConflictRewardSystem.instance) {
      ConflictRewardSystem.instance = new ConflictRewardSystem();
    }
    return ConflictRewardSystem.instance;
  }

  // Calculate rewards based on conflict resolution approach
  calculateResolutionRewards(
    conflict_type: string,
    resolution_approach: 'aggressive' | 'diplomatic' | 'collaborative' | 'avoidant',
    conflict_severity: 'low' | 'medium' | 'high' | 'critical',
    characters_involved: string[]
  ): ConflictReward {
    const baseRewards = this.getBaseRewards(conflict_type, resolution_approach);
    const severityMultiplier = this.getSeverityMultiplier(conflict_severity);
    const groupSizeBonus = Math.max(1, characters_involved.length - 1) * 0.2;

    return {
      immediate: this.calculateImmediateRewards(baseRewards, severityMultiplier, resolution_approach),
      long_term: this.calculateLongTermRewards(conflict_type, resolution_approach, severityMultiplier),
      relationship_changes: this.calculateRelationshipChanges(resolution_approach, characters_involved),
      experience_bonus: Math.round((baseRewards.experience * severityMultiplier * (1 + groupSizeBonus)))
    };
  }

  private getBaseRewards(conflict_type: string, approach: string) {
    const rewardTemplates = {
      kitchen_disputes: {
        aggressive: { attack: 2, experience: 50, teamwork: -1 },
        diplomatic: { charisma: 3, experience: 100, teamwork: 2 },
        collaborative: { wisdom: 2, teamwork: 4, experience: 150 },
        avoidant: { experience: 10, stress: 2 }
      },
      sleeping_arrangements: {
        aggressive: { intimidation: 2, experience: 40, stress: 1 },
        diplomatic: { wisdom: 2, social_skills: 2, experience: 120 },
        collaborative: { empathy: 3, team_coordination: 3, experience: 180 },
        avoidant: { experience: 15, fatigue: 1 }
      },
      training_disputes: {
        aggressive: { combat_focus: 3, experience: 80, rivals: 1 },
        diplomatic: { leadership: 2, experience: 140, respect: 2 },
        collaborative: { teaching: 3, team_synergy: 4, experience: 200 },
        avoidant: { experience: 20, isolation: 1 }
      },
      resource_sharing: {
        aggressive: { selfishness: 2, resources: 1, experience: 60 },
        diplomatic: { negotiation: 3, fair_play: 2, experience: 130 },
        collaborative: { generosity: 3, community_bond: 4, experience: 190 },
        avoidant: { experience: 25, social_debt: 1 }
      },
      financial_jealousy: {
        aggressive: { intimidation: 2, experience: 70, stress: 2 },
        diplomatic: { charisma: 3, experience: 140, empathy: 2 },
        collaborative: { wisdom: 3, teamwork: 2, experience: 180 },
        avoidant: { experience: 30, isolation: 1 }
      },
      spending_addiction: {
        aggressive: { wisdom: -1, experience: 50, stress: 3 },
        diplomatic: { wisdom: 2, social_skills: 2, experience: 120 },
        collaborative: { empathy: 3, team_coordination: 3, experience: 170 },
        avoidant: { experience: 20, stress: 2 }
      },
      wealth_disparity_tension: {
        aggressive: { intimidation: 2, experience: 80, teamwork: -2 },
        diplomatic: { charisma: 3, empathy: 2, experience: 150 },
        collaborative: { generosity: 2, teamwork: 4, experience: 200 },
        avoidant: { experience: 35, stress: 1 }
      },
      debt_shame: {
        aggressive: { intimidation: 2, experience: 60, stress: -1 },
        diplomatic: { charisma: 3, wisdom: 2, experience: 130 },
        collaborative: { empathy: 3, social_skills: 3, experience: 180 },
        avoidant: { experience: 25, isolation: 2 }
      }
    };

    return rewardTemplates[conflict_type]?.[approach] || { experience: 30 };
  }

  private getSeverityMultiplier(severity: string): number {
    const multipliers = {
      low: 1.0,
      medium: 1.5,
      high: 2.2,
      critical: 3.5
    };
    return multipliers[severity] || 1.0;
  }

  private calculateImmediateRewards(
    base_rewards: any,
    multiplier: number,
    approach: string
  ): ConflictResolutionReward[] {
    const rewards: ConflictResolutionReward[] = [];

    // Stat boosts - mapped to real DB stats
    // Duration based on severity: 6-12h minor, 12-24h standard, 24-48h major
    if (base_rewards.attack) {
      rewards.push({
        type: 'stat_boost',
        stat_name: 'morale',
        name: 'Combat Confidence',
        description: 'Aggressive resolution built combat confidence',
        value: Math.round(base_rewards.attack * multiplier),
        duration: multiplier >= 2.2 ? 24 : 12, // Major conflicts = 24h, others = 12h
        permanent: false
      });
    }

    if (base_rewards.charisma) {
      rewards.push({
        type: 'stat_boost',
        stat_name: 'communication',
        name: 'Silver Tongue',
        description: 'Diplomatic success enhanced social abilities',
        value: Math.round(base_rewards.charisma * multiplier),
        duration: multiplier >= 2.2 ? 24 : 16, // Major = 24h, others = 16h
        permanent: false
      });
    }

    if (base_rewards.wisdom) {
      rewards.push({
        type: 'stat_boost',
        stat_name: 'mental_health',
        name: 'Emotional Intelligence',
        description: 'Wise conflict resolution increased understanding',
        value: Math.round(base_rewards.wisdom * multiplier),
        duration: multiplier >= 2.2 ? 36 : 18, // Major = 36h, others = 18h
        permanent: false
      });
    }

    // Special collaborative rewards - boost team_player stat
    if (approach === 'collaborative' && multiplier >= 2.0) {
      rewards.push({
        type: 'stat_boost',
        stat_name: 'team_player',
        name: 'Team Synergy Boost',
        description: 'Collaborative resolution improved teamwork abilities',
        value: Math.round(15 * multiplier),
        duration: 24, // Collaboration buff = full day
        permanent: false
      });
    }

    return rewards;
  }

  private calculateLongTermRewards(
    conflict_type: string,
    approach: string,
    multiplier: number
  ): ConflictResolutionReward[] {
    const rewards: ConflictResolutionReward[] = [];

    // Permanent stat increases for high-value resolutions
    if (multiplier >= 2.2) { // High or Critical severity
      if (approach === 'diplomatic') {
        rewards.push({
          type: 'stat_boost',
          stat_name: 'communication',
          name: 'Master Negotiator',
          description: 'Permanent improvement to communication skills',
          value: Math.round(3 * multiplier),
          permanent: true
        });
      }

      if (approach === 'collaborative') {
        rewards.push({
          type: 'stat_boost',
          stat_name: 'team_player',
          name: 'Team Builder',
          description: 'Permanent improvement to teamwork abilities',
          value: Math.round(4 * multiplier),
          permanent: true
        });
      }

      if (approach === 'aggressive' && conflict_type === 'training_disputes') {
        rewards.push({
          type: 'stat_boost',
          stat_name: 'ego',
          name: 'Alpha Presence',
          description: 'Permanent boost to confidence and assertiveness',
          value: Math.round(3 * multiplier),
          permanent: true
        });
      }
    }

    // Experience bonus for sustained good conflict resolution
    if (approach !== 'avoidant') {
      rewards.push({
        type: 'stat_boost',
        stat_name: 'experience',
        name: 'Conflict Wisdom',
        description: 'Experience bonus for handling conflict wisely',
        value: Math.round(50 * multiplier),
        permanent: true
      });
    }

    return rewards;
  }

  private calculateRelationshipChanges(
    approach: string,
    characters_involved: string[]
  ): Record<string, number> {
    const changes: Record<string, number> = {};

    const relationshipEffects = {
      aggressive: -2, // Damages relationships but shows strength
      diplomatic: +3, // Builds respect and trust
      collaborative: +5, // Creates strong bonds
      avoidant: -1 // Slight relationship decay from avoiding issues
    };

    const baseChange = relationshipEffects[approach] || 0;

    characters_involved.forEach(character_id => {
      changes[character_id] = baseChange;
    });

    return changes;
  }

  // Calculate the penalty for unresolved conflicts
  calculateConflictPenalties(
    unresolved_conflicts: any[],
    days_since_last_resolution: number
  ): {
    battle_performance: number;
    training_efficiency: number;
    social_penalties: number;
    stress_level: number;
  } {
    const conflictCount = unresolved_conflicts.length;
    const timeMultiplier = Math.min(2.0, 1 + (days_since_last_resolution / 7));

    return {
      battle_performance: Math.round(-5 * conflictCount * timeMultiplier), // -5% per conflict
      training_efficiency: Math.round(-3 * conflictCount * timeMultiplier), // -3% per conflict
      social_penalties: Math.round(-10 * conflictCount), // -10 social points per conflict
      stress_level: Math.round(conflictCount * 15 * timeMultiplier) // Stress builds over time
    };
  }

  // Special rewards for conflict resolution streaks
  calculateStreakBonuses(
    consecutive_resolutions: number,
    resolution_approach: string
  ): ConflictResolutionReward[] {
    const rewards: ConflictResolutionReward[] = [];

    if (consecutive_resolutions >= 3) {
      rewards.push({
        type: 'stat_boost',
        stat_name: 'experience',
        name: 'Conflict Resolution Streak',
        description: `${consecutive_resolutions} conflicts resolved! Bonus experience`,
        value: Math.round(100 * consecutive_resolutions),
        permanent: true
      });
    }

    if (consecutive_resolutions >= 5) {
      rewards.push({
        type: 'stat_boost',
        stat_name: 'communication',
        name: 'Master Mediator',
        description: 'Permanent boost to communication and social skills',
        value: 5,
        permanent: true
      });
    }

    if (consecutive_resolutions >= 7 && resolution_approach === 'collaborative') {
      rewards.push({
        type: 'stat_boost',
        stat_name: 'stress_level',
        name: 'Harmony Aura',
        description: 'Significant stress reduction from mastering conflict resolution',
        value: -20, // Negative value reduces stress
        permanent: true
      });
    }

    return rewards;
  }
}

export default ConflictRewardSystem;