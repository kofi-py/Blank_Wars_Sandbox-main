// Progression Integration System
// Connects post-battle analysis to real character improvements

import { CharacterStats } from '../services/apiClient';
import { Contestant as Character } from '@blankwars/types';
import { TrainingRecommendation, CharacterEvaluation, PostBattleAnalysis } from '../data/battleFlow';
import { TrainingActivity, TrainingEffect, TrainingResult, CharacterTrainingState } from './trainingSystem';
import { audioService } from '../services/audioService';

export interface ProgressionSession {
  character_id: string;
  type: 'training' | 'recovery' | 'development';
  recommendations: TrainingRecommendation[];
  selected_actions: ProgressionAction[];
  results: ProgressionResult[];
  timestamp: Date;
}

export interface ProgressionAction {
  type: TrainingRecommendation['type'];
  intensity: 'light' | 'moderate' | 'intensive';
  duration: number; // hours
  cost: {
    training_points: number;
    time: number;
  };
}

export interface ProgressionResult {
  character_id: string;
  stat_changes: {
    strength?: number;
    dexterity?: number;
    defense?: number;
    intelligence?: number;
    wisdom?: number;
    charisma?: number;
    spirit?: number;
  };
  mental_stateChanges: {
    stress?: number;
    confidence?: number;
    mental_health?: number;
    team_trust?: number;
  };
  skill_improvements: {
    gameplan_adherence?: number;
    training_level?: number;
    bond_level?: number;
  };
  experience_gained: number;
  description: string;
}

export class ProgressionIntegrationSystem {

  // Convert post-battle recommendations to actionable training
  static generateTrainingPlan(
    analysis: PostBattleAnalysis,
    characters: Character[]
  ): Map<string, ProgressionSession> {
    const sessions = new Map<string, ProgressionSession>();

    analysis.training_recommendations.forEach(recommendation => {
      const character = characters.find(c => c.id === recommendation.character_id);
      if (!character) return;

      let session = sessions.get(recommendation.character_id);
      if (!session) {
        session = {
          character_id: recommendation.character_id,
          type: 'training',
          recommendations: [],
          selected_actions: [],
          results: [],
          timestamp: new Date()
        };
        sessions.set(recommendation.character_id, session);
      }

      session.recommendations.push(recommendation);

      // Auto-generate suggested action based on recommendation
      const suggestedAction = this.createActionFromRecommendation(recommendation, character);
      session.selected_actions.push(suggestedAction);
    });

    return sessions;
  }

  private static createActionFromRecommendation(
    recommendation: TrainingRecommendation,
    character: Character
  ): ProgressionAction {
    // Map recommendation types to training intensities and costs
    const actionMapping: Record<string, Partial<ProgressionAction>> = {
      'mental_health': {
        intensity: recommendation.priority === 'urgent' ? 'intensive' : 'moderate',
        duration: 4,
        cost: { training_points: 15, time: 4 }
      },
      'strategy_focus': {
        intensity: 'moderate',
        duration: 3,
        cost: { training_points: 10, time: 3 }
      },
      'team_chemistry': {
        intensity: 'light',
        duration: 2,
        cost: { training_points: 8, time: 2 }
      },
      'combat_skills': {
        intensity: 'intensive',
        duration: 6,
        cost: { training_points: 20, time: 6 }
      },
      'stress_management': {
        intensity: 'moderate',
        duration: 3,
        cost: { training_points: 12, time: 3 }
      }
    };

    const baseAction = actionMapping[recommendation.type] || {
      intensity: 'moderate',
      duration: 3,
      cost: { training_points: 10, time: 3 }
    };

    return {
      type: recommendation.type,
      intensity: baseAction.intensity as 'light' | 'moderate' | 'intensive',
      duration: baseAction.duration!,
      cost: baseAction.cost!
    };
  }

  // Execute training session and apply real character improvements
  static executeTrainingSession(
    session: ProgressionSession,
    character: Character
  ): ProgressionResult {
    const result: ProgressionResult = {
      character_id: character.id,
      stat_changes: {},
      mental_stateChanges: {},
      skill_improvements: {},
      experience_gained: 0,
      description: ''
    };

    session.selected_actions.forEach(action => {
      this.applyTrainingAction(action, character, result);
    });

    // Calculate total experience gained
    result.experience_gained = this.calculateExperienceGain(session, character);

    // Generate description
    result.description = this.generateTrainingDescription(session, result);

    // Play training completion sound
    audioService.playSoundEffect('level_up');

    return result;
  }

  private static applyTrainingAction(
    action: ProgressionAction,
    character: Character,
    result: ProgressionResult
  ): void {
    const intensityMultiplier = {
      'light': 0.5,
      'moderate': 1.0,
      'intensive': 1.5
    }[action.intensity];

    switch (action.type) {
      case 'mental_health':
        result.mental_stateChanges.mental_health = (result.mental_stateChanges.mental_health || 0) +
          Math.floor(15 * intensityMultiplier);
        result.mental_stateChanges.stress = (result.mental_stateChanges.stress || 0) -
          Math.floor(10 * intensityMultiplier);
        break;

      case 'strategy_focus':
        result.skill_improvements.gameplan_adherence = (result.skill_improvements.gameplan_adherence || 0) +
          Math.floor(8 * intensityMultiplier);
        result.mental_stateChanges.confidence = (result.mental_stateChanges.confidence || 0) +
          Math.floor(5 * intensityMultiplier);
        break;

      case 'team_chemistry':
        result.mental_stateChanges.team_trust = (result.mental_stateChanges.team_trust || 0) +
          Math.floor(12 * intensityMultiplier);
        result.skill_improvements.bond_level = (result.skill_improvements.bond_level || 0) +
          Math.floor(6 * intensityMultiplier);
        break;

      case 'combat_skills':
        const statIncrease = Math.floor(2 * intensityMultiplier);
        result.stat_changes.strength = (result.stat_changes.strength || 0) + statIncrease;
        result.stat_changes.dexterity = (result.stat_changes.dexterity || 0) + statIncrease;
        break;

      case 'stress_management':
        result.mental_stateChanges.stress = (result.mental_stateChanges.stress || 0) -
          Math.floor(15 * intensityMultiplier);
        result.mental_stateChanges.confidence = (result.mental_stateChanges.confidence || 0) +
          Math.floor(8 * intensityMultiplier);
        break;
    }
  }

  private static calculateExperienceGain(
    session: ProgressionSession,
    character: Character
  ): number {
    let baseXP = 0;

    session.selected_actions.forEach(action => {
      const actionXP = {
        'mental_health': 50,
        'strategy_focus': 40,
        'team_chemistry': 30,
        'combat_skills': 60,
        'stress_management': 35
      }[action.type] || 30;

      const intensityMultiplier = {
        'light': 0.7,
        'moderate': 1.0,
        'intensive': 1.3
      }[action.intensity];

      baseXP += Math.floor(actionXP * intensityMultiplier);
    });

    // Bonus XP for urgent recommendations (shows dedication)
    const urgentCount = session.recommendations.filter(r => r.priority === 'urgent').length;
    baseXP += urgentCount * 25;

    return baseXP;
  }

  private static generateTrainingDescription(
    session: ProgressionSession,
    result: ProgressionResult
  ): string {
    const improvements: string[] = [];

    if (result.stat_changes.strength || result.stat_changes.dexterity) {
      improvements.push('enhanced combat abilities');
    }
    if (result.mental_stateChanges.mental_health && result.mental_stateChanges.mental_health > 0) {
      improvements.push('improved mental health');
    }
    if (result.skill_improvements.gameplan_adherence && result.skill_improvements.gameplan_adherence > 0) {
      improvements.push('better strategy adherence');
    }
    if (result.mental_stateChanges.team_trust && result.mental_stateChanges.team_trust > 0) {
      improvements.push('stronger team bonds');
    }
    if (result.mental_stateChanges.stress && result.mental_stateChanges.stress < 0) {
      improvements.push('reduced stress levels');
    }

    if (improvements.length === 0) {
      return 'Completed training session with minor improvements.';
    }

    return `Training session successful! Character gained: ${improvements.join(', ')}.`;
  }

  // Apply progression results to character data
  static applyProgressionToCharacter(
    character: Character,
    result: ProgressionResult
  ): Character {
    const updatedCharacter = { ...character };

    // Apply stat changes
    if (result.stat_changes) {
      updatedCharacter.strength = (updatedCharacter.strength || 0) + (result.stat_changes.strength || 0);
      updatedCharacter.dexterity = (updatedCharacter.dexterity || 0) + (result.stat_changes.dexterity || 0);
      updatedCharacter.intelligence = (updatedCharacter.intelligence || 0) + (result.stat_changes.intelligence || 0);
      updatedCharacter.wisdom = (updatedCharacter.wisdom || 0) + (result.stat_changes.wisdom || 0);
      updatedCharacter.charisma = (updatedCharacter.charisma || 0) + (result.stat_changes.charisma || 0);

      // Defense only exists on some character types
      if ('defense' in updatedCharacter) {
        (updatedCharacter as any).defense = ((updatedCharacter as any).defense || 0) + (result.stat_changes.defense || 0);
      }
    }

    // Apply skill improvements
    if (result.skill_improvements.training_level) {
      updatedCharacter.training_level = Math.min(100,
        updatedCharacter.training_level + result.skill_improvements.training_level
      );
    }

    if (result.skill_improvements.bond_level) {
      updatedCharacter.bond_level = Math.min(100,
        updatedCharacter.bond_level + result.skill_improvements.bond_level
      );
    }

    // Apply experience gain
    // Apply experience gain
    const currentXp = typeof updatedCharacter.experience === 'number' ? updatedCharacter.experience : 0;
    updatedCharacter.experience = currentXp + result.experience_gained;

    // Check for level up
    const newLevelData = this.checkForLevelUp(updatedCharacter);
    if (newLevelData) {
      updatedCharacter.level = newLevelData.level;
      updatedCharacter.level = newLevelData.level;
      // updatedCharacter.experience.current_level = newLevelData.level; // Removed as experience is flat number

      // Update character points (unified system)
      const currentPoints = updatedCharacter.character_points || 0;
      updatedCharacter.character_points = currentPoints + newLevelData.statPointsGained;

      // Play level up sound
      audioService.playSoundEffect('level_up');
    }

    // Update last training date
    // Update last training date if property exists
    if ('last_training_date' in updatedCharacter) {
      (updatedCharacter as any).last_training_date = new Date();
    }

    return updatedCharacter;
  }

  private static checkForLevelUp(character: Character): { level: number; statPointsGained: number } | null {
    // Simple level up calculation
    const xpPerLevel = 1000;
    const currentXp = typeof character.experience === 'number' ? character.experience : 0;
    const newLevel = Math.floor(currentXp / xpPerLevel) + 1;

    if (newLevel > character.level) {
      const statPointsGained = (newLevel - character.level) * 3; // 3 stat points per level
      return { level: newLevel, statPointsGained };
    }

    return null;
  }

  // Generate battle performance-based XP
  static calculateBattleExperience(
    evaluation: CharacterEvaluation,
    battle_result: 'victory' | 'defeat' | 'draw'
  ): number {
    let baseXP = 100; // Base battle participation XP

    // Battle result bonus
    const resultBonus = {
      'victory': 50,
      'draw': 25,
      'defeat': 10
    }[battle_result];

    baseXP += resultBonus;

    // Performance bonuses
    baseXP += Math.floor(evaluation.battle_rating * 0.5); // Up to 50 XP for perfect performance
    baseXP += Math.floor(evaluation.gameplan_adherenceScore * 0.3); // Up to 30 XP for perfect adherence
    baseXP += Math.floor(evaluation.teamplay_score * 0.3); // Up to 30 XP for perfect teamwork

    // Growth area penalties (learning opportunity)
    const growthPenalty = evaluation.growth_areas.length * 5;
    baseXP = Math.max(50, baseXP - growthPenalty); // Minimum 50 XP

    // Notable actions bonus
    baseXP += evaluation.notable_actions.length * 10;

    return Math.floor(baseXP);
  }
}

export default ProgressionIntegrationSystem;