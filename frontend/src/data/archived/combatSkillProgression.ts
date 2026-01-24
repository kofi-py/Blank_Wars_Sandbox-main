// Combat Skill Progression System
// Skill advancement through battle performance and combat actions

import { CharacterSkills } from './characterProgression';

export interface CombatAction {
  type: 'attack' | 'defend' | 'special' | 'dodge' | 'critical' | 'heal' | 'buff' | 'debuff';
  success: boolean;
  damage?: number;
  blocked?: number;
  healed?: number;
  skill_used?: string;
  target: 'self' | 'enemy' | 'ally';
  difficulty: number; // 1-10, based on opponent level difference
}

export interface BattlePerformance {
  character_id: string;
  battle_id: string;
  is_victory: boolean;
  battle_duration: number; // seconds
  opponent_level: number;
  level_difference: number;
  actions: CombatAction[];
  
  // Performance metrics
  total_damage_dealt: number;
  total_damage_taken: number;
  critical_hits: number;
  successful_dodges: number;
  perfect_blocks: number;
  abilities_used: number;
  strategic_decisions: number;
  social_interactions: number; // taunts, intimidation, etc.
  spiritual_moments: number; // meditation, prayer, etc.
  
  // Battle context
  environment: string;
  weather_conditions?: string;
  terrain_advantage?: boolean;
  outnumbered?: boolean;
  team_battle?: boolean;
}

export interface SkillGain {
  skill: string;
  experience: number;
  reason: string;
  multiplier: number;
  base_gain: number;
}

export interface CombatSkillReward {
  character_id: string;
  battle_id: string;
  skill_gains: SkillGain[];
  total_experience: number;
  skill_level_ups: { skill: string; new_level: number }[];
  new_interactions_unlocked: string[];
  performance_rating: 'poor' | 'average' | 'good' | 'excellent' | 'legendary';
}

// Combat Skill Progression Engine
export class CombatSkillEngine {
  
  static calculateSkillProgression(
    performance: BattlePerformance,
    current_skills: CharacterSkills
  ): CombatSkillReward {
    const skill_gains: SkillGain[] = [];
    
    // Base experience multipliers
    const victoryMultiplier = performance.is_victory ? 1.5 : 0.8;
    const difficulty_multiplier = Math.max(0.5, 1 + (performance.level_difference * 0.1));
    const durationMultiplier = this.getBattleDurationMultiplier(performance.battle_duration);
    
    // Calculate Combat skill progression
    const combatGain = this.calculateCombatSkillGain(performance, victoryMultiplier, difficulty_multiplier);
    if (combatGain.experience > 0) skill_gains.push(combatGain);
    
    // Calculate Survival skill progression
    const survivalGain = this.calculateSurvivalSkillGain(performance, victoryMultiplier, difficulty_multiplier);
    if (survivalGain.experience > 0) skill_gains.push(survivalGain);
    
    // Calculate Mental skill progression
    const mentalGain = this.calculateMentalSkillGain(performance, victoryMultiplier, difficulty_multiplier);
    if (mentalGain.experience > 0) skill_gains.push(mentalGain);
    
    // Calculate Social skill progression
    const socialGain = this.calculateSocialSkillGain(performance, victoryMultiplier, difficulty_multiplier);
    if (socialGain.experience > 0) skill_gains.push(socialGain);
    
    // Calculate Spiritual skill progression
    const spiritualGain = this.calculateSpiritualSkillGain(performance, victoryMultiplier, difficulty_multiplier);
    if (spiritualGain.experience > 0) skill_gains.push(spiritualGain);
    
    // Apply duration multiplier to all gains
    skill_gains.forEach(gain => {
      gain.experience = Math.floor(gain.experience * durationMultiplier);
      gain.multiplier *= durationMultiplier;
    });
    
    // Calculate total experience
    const total_experience = skill_gains.reduce((sum, gain) => sum + gain.experience, 0);

    // Check for level ups
    const skillLevelUps = this.checkForLevelUps(skill_gains, current_skills);

    // Check for new interactions
    const newInteractionsUnlocked = this.checkForNewInteractions(skillLevelUps, current_skills);

    // Calculate performance rating
    const performanceRating = this.calculatePerformanceRating(performance, total_experience);

    return {
      character_id: performance.character_id,
      battle_id: performance.battle_id,
      skill_gains,
      total_experience,
      skill_level_ups: skillLevelUps,
      new_interactions_unlocked: newInteractionsUnlocked,
      performance_rating: performanceRating
    };
  }
  
  private static calculateCombatSkillGain(
    performance: BattlePerformance,
    victory_multiplier: number,
    difficulty_multiplier: number
  ): SkillGain {
    let base_gain = 20; // Base combat experience
    let multiplier = victory_multiplier * difficulty_multiplier;
    const reasons: string[] = [];
    
    // Damage dealt bonus
    if (performance.total_damage_dealt > 0) {
      const damageBonus = Math.min(50, Math.floor(performance.total_damage_dealt / 50));
      base_gain += damageBonus;
      reasons.push(`+${damageBonus} for dealing ${performance.total_damage_dealt} damage`);
    }
    
    // Critical hits bonus
    if (performance.critical_hits > 0) {
      const critBonus = performance.critical_hits * 10;
      base_gain += critBonus;
      reasons.push(`+${critBonus} for ${performance.critical_hits} critical hits`);
    }
    
    // Successful attacks bonus
    const successfulAttacks = performance.actions.filter(a => 
      a.type === 'attack' && a.success
    ).length;
    if (successfulAttacks > 0) {
      const attackBonus = successfulAttacks * 5;
      base_gain += attackBonus;
      reasons.push(`+${attackBonus} for ${successfulAttacks} successful attacks`);
    }
    
    // Special abilities bonus
    if (performance.abilities_used > 0) {
      const abilityBonus = performance.abilities_used * 8;
      base_gain += abilityBonus;
      reasons.push(`+${abilityBonus} for using ${performance.abilities_used} abilities`);
    }
    
    // Perfect victory bonus
    if (performance.is_victory && performance.total_damage_taken === 0) {
      base_gain += 30;
      multiplier += 0.5;
      reasons.push('+30 for flawless victory');
    }
    
    return {
      skill: 'combat',
      experience: Math.floor(base_gain * multiplier),
      reason: `Combat experience: ${reasons.join(', ')}`,
      multiplier,
      base_gain
    };
  }
  
  private static calculateSurvivalSkillGain(
    performance: BattlePerformance,
    victory_multiplier: number,
    difficulty_multiplier: number
  ): SkillGain {
    let base_gain = 15; // Base survival experience
    let multiplier = victory_multiplier * difficulty_multiplier;
    const reasons: string[] = [];
    
    // Damage mitigation bonus
    if (performance.total_damage_taken < performance.total_damage_dealt * 0.5) {
      base_gain += 20;
      reasons.push('+20 for taking minimal damage');
    }
    
    // Successful dodges bonus
    if (performance.successful_dodges > 0) {
      const dodgeBonus = performance.successful_dodges * 8;
      base_gain += dodgeBonus;
      reasons.push(`+${dodgeBonus} for ${performance.successful_dodges} successful dodges`);
    }
    
    // Perfect blocks bonus
    if (performance.perfect_blocks > 0) {
      const blockBonus = performance.perfect_blocks * 10;
      base_gain += blockBonus;
      reasons.push(`+${blockBonus} for ${performance.perfect_blocks} perfect blocks`);
    }
    
    // Environmental adaptation bonus
    if (performance.terrain_advantage === false) {
      base_gain += 15;
      reasons.push('+15 for fighting in adverse terrain');
    }
    
    // Outnumbered survival bonus
    if (performance.outnumbered) {
      base_gain += 25;
      multiplier += 0.3;
      reasons.push('+25 for surviving while outnumbered');
    }
    
    // Long battle endurance bonus
    if (performance.battle_duration > 180) {
      base_gain += 10;
      reasons.push('+10 for enduring long battle');
    }
    
    return {
      skill: 'survival',
      experience: Math.floor(base_gain * multiplier),
      reason: `Survival experience: ${reasons.join(', ')}`,
      multiplier,
      base_gain
    };
  }
  
  private static calculateMentalSkillGain(
    performance: BattlePerformance,
    victory_multiplier: number,
    difficulty_multiplier: number
  ): SkillGain {
    let base_gain = 12; // Base mental experience
    let multiplier = victory_multiplier * difficulty_multiplier;
    const reasons: string[] = [];
    
    // Strategic decisions bonus
    if (performance.strategic_decisions > 0) {
      const strategyBonus = performance.strategic_decisions * 15;
      base_gain += strategyBonus;
      reasons.push(`+${strategyBonus} for ${performance.strategic_decisions} strategic decisions`);
    }
    
    // Complex ability usage bonus
    const complexAbilities = performance.actions.filter(a => 
      a.type === 'special' && a.success
    ).length;
    if (complexAbilities > 0) {
      const complexBonus = complexAbilities * 12;
      base_gain += complexBonus;
      reasons.push(`+${complexBonus} for ${complexAbilities} complex abilities`);
    }
    
    // Adaptation bonus (successful actions after failures)
    const adaptationScore = this.calculateAdaptationScore(performance.actions);
    if (adaptationScore > 0) {
      base_gain += adaptationScore;
      reasons.push(`+${adaptationScore} for tactical adaptation`);
    }
    
    // Victory against higher level opponent
    if (performance.is_victory && performance.level_difference > 0) {
      const levelBonus = performance.level_difference * 5;
      base_gain += levelBonus;
      reasons.push(`+${levelBonus} for defeating stronger opponent`);
    }
    
    // Efficient victory bonus (quick decisive battles)
    if (performance.is_victory && performance.battle_duration < 60) {
      base_gain += 18;
      reasons.push('+18 for efficient victory');
    }
    
    return {
      skill: 'mental',
      experience: Math.floor(base_gain * multiplier),
      reason: `Mental experience: ${reasons.join(', ')}`,
      multiplier,
      base_gain
    };
  }
  
  private static calculateSocialSkillGain(
    performance: BattlePerformance,
    victory_multiplier: number,
    difficulty_multiplier: number
  ): SkillGain {
    let base_gain = 8; // Base social experience
    let multiplier = victory_multiplier * difficulty_multiplier;
    const reasons: string[] = [];
    
    // Social interactions bonus
    if (performance.social_interactions > 0) {
      const socialBonus = performance.social_interactions * 12;
      base_gain += socialBonus;
      reasons.push(`+${socialBonus} for ${performance.social_interactions} social interactions`);
    }
    
    // Team battle coordination bonus
    if (performance.team_battle) {
      base_gain += 20;
      multiplier += 0.2;
      reasons.push('+20 for team coordination');
    }
    
    // Intimidation success bonus
    const intimidationActions = performance.actions.filter(a => 
      a.type === 'debuff' && a.target === 'enemy' && a.success
    ).length;
    if (intimidationActions > 0) {
      const intimidationBonus = intimidationActions * 10;
      base_gain += intimidationBonus;
      reasons.push(`+${intimidationBonus} for successful intimidation`);
    }
    
    // Leadership in adversity bonus
    if (performance.outnumbered && performance.is_victory) {
      base_gain += 25;
      reasons.push('+25 for leading through adversity');
    }
    
    // Mercy/honor bonus (non-lethal victory)
    if (performance.is_victory && performance.total_damage_dealt < performance.opponent_level * 20) {
      base_gain += 15;
      reasons.push('+15 for honorable victory');
    }
    
    return {
      skill: 'social',
      experience: Math.floor(base_gain * multiplier),
      reason: `Social experience: ${reasons.join(', ')}`,
      multiplier,
      base_gain
    };
  }
  
  private static calculateSpiritualSkillGain(
    performance: BattlePerformance,
    victory_multiplier: number,
    difficulty_multiplier: number
  ): SkillGain {
    let base_gain = 6; // Base spiritual experience
    let multiplier = victory_multiplier * difficulty_multiplier;
    const reasons: string[] = [];
    
    // Spiritual moments bonus
    if (performance.spiritual_moments > 0) {
      const spiritualBonus = performance.spiritual_moments * 20;
      base_gain += spiritualBonus;
      reasons.push(`+${spiritualBonus} for ${performance.spiritual_moments} spiritual moments`);
    }
    
    // Healing actions bonus
    const healingActions = performance.actions.filter(a => 
      a.type === 'heal' && a.success
    ).length;
    if (healingActions > 0) {
      const healingBonus = healingActions * 15;
      base_gain += healingBonus;
      reasons.push(`+${healingBonus} for ${healingActions} healing actions`);
    }
    
    // Buff/support actions bonus
    const supportActions = performance.actions.filter(a => 
      a.type === 'buff' && a.target !== 'enemy' && a.success
    ).length;
    if (supportActions > 0) {
      const supportBonus = supportActions * 12;
      base_gain += supportBonus;
      reasons.push(`+${supportBonus} for ${supportActions} support actions`);
    }
    
    // Spiritual resilience bonus (fighting despite low health)
    if (performance.total_damage_taken > performance.opponent_level * 15 && performance.is_victory) {
      base_gain += 20;
      reasons.push('+20 for spiritual resilience');
    }
    
    // Inner peace bonus (calm under pressure)
    if (performance.battle_duration > 120 && performance.actions.filter(a => !a.success).length < 3) {
      base_gain += 15;
      reasons.push('+15 for maintaining composure');
    }
    
    // Connection with nature/environment bonus
    if (performance.environment === 'natural' && performance.terrain_advantage) {
      base_gain += 10;
      reasons.push('+10 for environmental harmony');
    }
    
    return {
      skill: 'spiritual',
      experience: Math.floor(base_gain * multiplier),
      reason: `Spiritual experience: ${reasons.join(', ')}`,
      multiplier,
      base_gain
    };
  }
  
  private static getBattleDurationMultiplier(duration: number): number {
    if (duration < 30) return 0.7; // Too quick, less learning
    if (duration < 60) return 1.0; // Optimal short battle
    if (duration < 180) return 1.2; // Good learning opportunity
    if (duration < 300) return 1.1; // Extended engagement
    return 0.9; // Overly long battles can be inefficient
  }
  
  private static calculateAdaptationScore(actions: CombatAction[]): number {
    let score = 0;
    let consecutiveFailures = 0;
    
    for (const action of actions) {
      if (!action.success) {
        consecutiveFailures++;
      } else {
        if (consecutiveFailures >= 2) {
          score += Math.min(15, consecutiveFailures * 3);
        }
        consecutiveFailures = 0;
      }
    }
    
    return score;
  }
  
  private static checkForLevelUps(
    skill_gains: SkillGain[],
    current_skills: CharacterSkills
  ): { skill: string; new_level: number }[] {
    const level_ups: { skill: string; new_level: number }[] = [];
    
    for (const gain of skill_gains) {
      const currentSkill = current_skills.core_skills[gain.skill as keyof typeof current_skills.core_skills];
      if (currentSkill) {
        const newExperience = currentSkill.experience + gain.experience;
        const experienceNeeded = this.getExperienceForLevel(currentSkill.level + 1);
        
        if (newExperience >= experienceNeeded && currentSkill.level < currentSkill.max_level) {
          level_ups.push({
            skill: gain.skill,
            new_level: currentSkill.level + 1
          });
        }
      }
    }
    
    return level_ups;
  }
  
  private static getExperienceForLevel(level: number): number {
    // Experience required for each level (exponential growth)
    return Math.floor(100 * Math.pow(1.15, level - 1));
  }
  
  private static checkForNewInteractions(
    level_ups: { skill: string; new_level: number }[],
    current_skills: CharacterSkills
  ): string[] {
    const newInteractions: string[] = [];
    
    // This would integrate with the skill interaction system
    // to check if any new interactions are unlocked
    for (const levelUp of level_ups) {
      if (levelUp.new_level % 5 === 0) { // Every 5 levels might unlock interactions
        newInteractions.push(`${levelUp.skill}_mastery_${levelUp.new_level}`);
      }
    }
    
    return newInteractions;
  }
  
  private static calculatePerformanceRating(
    performance: BattlePerformance,
    total_experience: number
  ): 'poor' | 'average' | 'good' | 'excellent' | 'legendary' {
    let score = 0;

    // Victory bonus
    if (performance.is_victory) score += 30;

    // Efficiency score
    if (performance.battle_duration < 60) score += 15;
    if (performance.total_damage_dealt > performance.total_damage_taken * 2) score += 20;

    // Skill demonstration
    score += Math.min(20, performance.critical_hits * 3);
    score += Math.min(15, performance.successful_dodges * 2);
    score += Math.min(25, performance.abilities_used * 4);
    score += Math.min(20, performance.strategic_decisions * 5);

    // Difficulty bonus
    if (performance.level_difference > 0) score += performance.level_difference * 10;
    if (performance.outnumbered) score += 25;

    // Experience gained reflects learning
    score += Math.min(30, total_experience / 5);
    
    if (score >= 150) return 'legendary';
    if (score >= 120) return 'excellent';
    if (score >= 90) return 'good';
    if (score >= 60) return 'average';
    return 'poor';
  }
}

// Helper function to create battle performance from battle data
export function createBattlePerformance(
  character_id: string,
  battle_data: {
    is_victory: boolean;
    battle_duration: number;
    player_level: number;
    opponent_level: number;
    damage_dealt: number;
    damage_taken: number;
    critical_hits: number;
    abilities_used: number;
    environment?: string;
  }
): BattlePerformance {
  return {
    character_id,
    battle_id: `battle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    is_victory: battle_data.is_victory,
    battle_duration: battle_data.battle_duration,
    opponent_level: battle_data.opponent_level,
    level_difference: battle_data.opponent_level - battle_data.player_level,
    actions: [], // Would be populated with actual combat actions
    
    total_damage_dealt: battle_data.damage_dealt,
    total_damage_taken: battle_data.damage_taken,
    critical_hits: battle_data.critical_hits,
    successful_dodges: Math.floor(Math.random() * 3), // Mock data
    perfect_blocks: Math.floor(Math.random() * 2), // Mock data
    abilities_used: battle_data.abilities_used,
    strategic_decisions: Math.floor(battle_data.abilities_used / 2), // Mock data
    social_interactions: Math.floor(Math.random() * 2), // Mock data
    spiritual_moments: Math.floor(Math.random() * 1), // Mock data
    
    environment: battle_data.environment || 'arena',
    terrain_advantage: Math.random() > 0.5,
    outnumbered: Math.random() > 0.8,
    team_battle: false
  };
}

// Demo function for testing
export function createDemoCombatSkillReward(character_id: string): CombatSkillReward {
  const demoPerformance = createBattlePerformance(character_id, {
    is_victory: true,
    battle_duration: 95,
    player_level: 15,
    opponent_level: 17,
    damage_dealt: 450,
    damage_taken: 180,
    critical_hits: 3,
    abilities_used: 4,
    environment: 'forest'
  });
  
  const demoSkills: CharacterSkills = {
    character_id,
    core_skills: {
      combat: { level: 20, experience: 850, max_level: 100 },
      survival: { level: 18, experience: 600, max_level: 100 },
      mental: { level: 16, experience: 420, max_level: 100 },
      social: { level: 12, experience: 250, max_level: 100 },
      spiritual: { level: 10, experience: 180, max_level: 100 }
    },
    signature_skills: {},
    archetype_skills: {},
    passive_abilities: [],
    active_abilities: [],
    unlocked_nodes: [],
    skill_points: 5,
    last_updated: new Date()
  };
  
  return CombatSkillEngine.calculateSkillProgression(demoPerformance, demoSkills);
}