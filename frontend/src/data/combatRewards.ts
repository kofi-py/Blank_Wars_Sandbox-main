// Combat Rewards System for _____ Wars

export interface BattleStats {
  damage_dealt: number;
  damage_taken: number;
  rounds_survived: number;
  total_rounds: number;
  skills_used: number;
  critical_hits: number;
  perfect_blocks: number;
  combo_moves: number;
}

export interface BattleRewards {
  xp_gained: number;
  training_points: number;
  currency: number;
  stat_bonuses: {
    atk?: number;
    def?: number;
    spd?: number;
    hp?: number;
  };
  bond_increase: number;
  achievement_unlocked?: string;
  leveled_up?: boolean;
  new_level?: number;
  // New financial reward system
  character_earnings: {
    base_earnings: number;
    performance_bonus: number;
    difficulty_bonus: number;
    total_earnings: number;
    coach_earnings: number; // Coach gets less than characters
  };
}

export interface PerformanceMetrics {
  victory: boolean;
  perfect_victory: boolean; // No damage taken
  dominant_victory: boolean; // Won by large margin
  close_victory: boolean; // Won by small margin
  valiant_defeat: boolean; // Lost but performed well
  quick_victory: boolean; // Won in few rounds
  endurance_victory: boolean; // Won in many rounds
  style_points: number; // Based on skill usage and combos
}

class CombatRewardsCalculator {
  calculateRewards(
    is_winner: boolean,
    character_level: number,
    battle_stats: BattleStats,
    opponent_level: number,
    membership_multiplier: number = 1.0
  ): BattleRewards {
    const performance = this.analyzePerformance(is_winner, battle_stats, opponent_level);
    
    // Base XP calculation
    let baseXP = is_winner ? 100 : 25;
    
    // Level difference modifier
    const levelDiff = opponent_level - character_level;
    const difficulty_multiplier = Math.max(0.5, 1 + (levelDiff * 0.1));
    
    // Performance bonuses
    let performanceXP = 0;
    
    if (performance.victory) {
      if (performance.perfect_victory) performanceXP += 100;
      else if (performance.dominant_victory) performanceXP += 60;
      else if (performance.quick_victory) performanceXP += 40;
      else if (performance.endurance_victory) performanceXP += 30;
    } else {
      // Defeat bonuses (learning experience)
      if (performance.valiant_defeat) performanceXP += 20;
      performanceXP += Math.floor(battle_stats.rounds_survived * 5);
    }
    
    // Style and skill bonuses
    performanceXP += performance.style_points;
    performanceXP += battle_stats.skills_used * 10;
    performanceXP += battle_stats.critical_hits * 15;
    performanceXP += battle_stats.perfect_blocks * 10;
    performanceXP += battle_stats.combo_moves * 25;
    
    // Calculate final XP
    const total_xp = Math.floor(
      (baseXP + performanceXP) * difficulty_multiplier * membership_multiplier
    );
    
    // Training Points (for skill learning)
    let training_points = is_winner ? 2 : 1;
    if (performance.perfect_victory) training_points += 2;
    if (battle_stats.skills_used >= 3) training_points += 1;
    training_points = Math.floor(training_points * membership_multiplier);
    
    // Currency rewards
    let currency = is_winner ? 50 : 10;
    currency += Math.floor(performanceXP * 0.5);
    currency = Math.floor(currency * membership_multiplier);
    
    // Stat bonuses based on performance
    const stat_bonuses = this.calculateStatBonuses(battle_stats, performance);
    
    // Bond increase with character
    let bond_increase = is_winner ? 3 : 1;
    if (performance.perfect_victory) bond_increase += 2;
    if (battle_stats.damage_taken < battle_stats.damage_dealt * 0.3) bond_increase += 1;
    
    // Calculate character earnings (NEW FINANCIAL SYSTEM)
    const characterEarnings = this.calculateCharacterEarnings(
      is_winner, 
      character_level, 
      opponent_level, 
      performance, 
      battle_stats, 
      membership_multiplier
    );
    
    return {
      xp_gained: total_xp,
      training_points,
      currency,
      stat_bonuses,
      bond_increase,
      achievement_unlocked: this.checkAchievements(performance, battle_stats),
      leveled_up: false, // Will be calculated when applying rewards
      new_level: character_level,
      character_earnings: characterEarnings
    };
  }
  
  private analyzePerformance(
    is_winner: boolean,
    stats: BattleStats,
    opponent_level: number
  ): PerformanceMetrics {
    const damageRatio = stats.damage_dealt / Math.max(1, stats.damage_taken);
    const survivalRate = stats.rounds_survived / stats.total_rounds;
    
    return {
      victory: is_winner,
      perfect_victory: is_winner && stats.damage_taken === 0,
      dominant_victory: is_winner && damageRatio >= 3,
      close_victory: is_winner && damageRatio < 1.5 && damageRatio >= 1,
      valiant_defeat: !is_winner && (damageRatio >= 0.8 || survivalRate >= 0.7),
      quick_victory: is_winner && stats.total_rounds <= 3,
      endurance_victory: is_winner && stats.total_rounds >= 8,
      style_points: this.calculateStylePoints(stats)
    };
  }
  
  private calculateStylePoints(stats: BattleStats): number {
    let points = 0;
    
    // Skill variety bonus
    if (stats.skills_used >= 3) points += 25;
    else if (stats.skills_used >= 2) points += 15;
    
    // Combat prowess
    points += stats.critical_hits * 10;
    points += stats.perfect_blocks * 8;
    points += stats.combo_moves * 20;
    
    // Efficiency bonus
    if (stats.damage_dealt > stats.damage_taken * 2) points += 15;
    
    return points;
  }
  
  private calculateStatBonuses(
    stats: BattleStats,
    performance: PerformanceMetrics
  ): { atk?: number; def?: number; spd?: number; hp?: number } {
    const bonuses: any = {};
    
    // Attack bonus for damage dealers
    if (stats.damage_dealt >= 150 || stats.critical_hits >= 3) {
      bonuses.atk = 1;
    }
    
    // Defense bonus for tanks
    if (stats.perfect_blocks >= 2 || (stats.damage_taken < 50 && stats.rounds_survived >= 5)) {
      bonuses.def = 1;
    }
    
    // Speed bonus for quick victories or many skills
    if (performance.quick_victory || stats.skills_used >= 4) {
      bonuses.spd = 1;
    }
    
    // HP bonus for endurance fights
    if (performance.endurance_victory || stats.rounds_survived >= 10) {
      bonuses.hp = 5;
    }
    
    return bonuses;
  }
  
  private checkAchievements(
    performance: PerformanceMetrics,
    stats: BattleStats
  ): string | undefined {
    if (performance.perfect_victory) return "Flawless Victory";
    if (stats.critical_hits >= 5) return "Critical Master";
    if (stats.combo_moves >= 3) return "Combo Artist";
    if (performance.endurance_victory) return "Endurance Champion";
    if (stats.skills_used >= 5) return "Skill Virtuoso";
    
    return undefined;
  }
  
  /**
   * Calculate character earnings from battle performance
   * Characters earn significantly more than the coach to create financial decisions
   */
  private calculateCharacterEarnings(
    is_winner: boolean,
    character_level: number,
    opponent_level: number,
    performance: PerformanceMetrics,
    battle_stats: BattleStats,
    membership_multiplier: number
  ): { base_earnings: number; performance_bonus: number; difficulty_bonus: number; total_earnings: number; coach_earnings: number } {
    
    // Base earnings scale with character level and victory
    let baseEarnings = is_winner ? 2000 : 500; // $2000 for win, $500 for loss
    baseEarnings += character_level * 100; // $100 per level
    
    // Performance bonuses (characters get rewarded for style)
    let performanceBonus = 0;
    
    if (performance.victory) {
      if (performance.perfect_victory) performanceBonus += 2000; // $2000 for perfect victory
      else if (performance.dominant_victory) performanceBonus += 1200;
      else if (performance.quick_victory) performanceBonus += 800;
      else if (performance.endurance_victory) performanceBonus += 600;
    } else {
      // Even in defeat, good performance is rewarded
      if (performance.valiant_defeat) performanceBonus += 300;
      performanceBonus += battle_stats.rounds_survived * 50; // $50 per round survived
    }
    
    // Style bonuses
    performanceBonus += performance.style_points * 10; // $10 per style point
    performanceBonus += battle_stats.critical_hits * 100; // $100 per critical hit
    performanceBonus += battle_stats.combo_moves * 200; // $200 per combo
    performanceBonus += battle_stats.perfect_blocks * 75; // $75 per perfect block
    
    // Difficulty bonus based on opponent level difference
    const levelDiff = opponent_level - character_level;
    let difficultyBonus = 0;
    if (levelDiff > 0) {
      // Bonus for fighting higher level opponents
      difficultyBonus = Math.floor(baseEarnings * (levelDiff * 0.15)); // 15% per level difference
    }
    
    // Apply membership multiplier
    baseEarnings = Math.floor(baseEarnings * membership_multiplier);
    performanceBonus = Math.floor(performanceBonus * membership_multiplier);
    difficultyBonus = Math.floor(difficultyBonus * membership_multiplier);
    
    const totalEarnings = baseEarnings + performanceBonus + difficultyBonus;
    
    // Coach gets significantly less (about 25% of character earnings)
    // This creates the financial decision dynamic where characters have more money to manage
    const coachEarnings = Math.floor(totalEarnings * 0.25);
    
    return {
      base_earnings: baseEarnings,
      performance_bonus: performanceBonus,
      difficulty_bonus: difficultyBonus,
      total_earnings: totalEarnings,
      coach_earnings: coachEarnings
    };
  }
}

// Singleton instance
export const combatRewards = new CombatRewardsCalculator();

// Helper function for battle tracking
export function createBattleStats(): BattleStats {
  return {
    damage_dealt: 0,
    damage_taken: 0,
    rounds_survived: 0,
    total_rounds: 0,
    skills_used: 0,
    critical_hits: 0,
    perfect_blocks: 0,
    combo_moves: 0
  };
}

// Achievement definitions
export const ACHIEVEMENTS = {
  "Flawless Victory": {
    icon: "👑",
    description: "Win a battle without taking damage",
    rarity: "legendary"
  },
  "Critical Master": {
    icon: "💥",
    description: "Land 5+ critical hits in one battle",
    rarity: "epic"
  },
  "Combo Artist": {
    icon: "🎭",
    description: "Execute 3+ combo moves in one battle",
    rarity: "rare"
  },
  "Endurance Champion": {
    icon: "⏰",
    description: "Win a battle lasting 8+ rounds",
    rarity: "rare"
  },
  "Skill Virtuoso": {
    icon: "🎯",
    description: "Use 5+ different skills in one battle",
    rarity: "epic"
  }
} as const;