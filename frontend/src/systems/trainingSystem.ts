/**
 * Training System
 * Between-battle character development and psychology management
 * Part of the revolutionary _____ WARS psychology-based battle system
 */

import { Contestant as Character } from '@blankwars/types';
import RealEstateAgentBonusService from '../services/realEstateAgentBonusService';
import { characterAPI } from '../services/apiClient';

export interface TrainingActivity {
  id: string;
  name: string;
  description: string;
  category: 'mental-health' | 'skill-development' | 'relationship' | 'therapy';
  duration: number; // in minutes
  cost: number; // training points
  requirements: string[];
  effects: TrainingEffect[];
  unlock_level: number;
}

export interface TrainingEffect {
  type: 'psychology' | 'skill' | 'relationship' | 'stat';
  target: string; // character trait, skill, or relationship
  change: number;
  duration?: number; // temporary effects (in battles)
  description: string;
}

export interface TrainingSession {
  id: string;
  character_id: string;
  activity_id: string;
  start_time: Date;
  duration: number;
  completed: boolean;
  results?: TrainingResult[];
}

export interface TrainingResult {
  type: string;
  before: number;
  after: number;
  improvement: number;
  description: string;
}

export interface CharacterTrainingState {
  character_id: string;
  training_points: number;
  mental_health: number;
  current_stress: number;
  focus_level: number;
  training_history: TrainingSession[];
  available_activities: string[];
  completed_sessions: number;
  specializations: string[];
}

// Training Activities Database
export const trainingActivities: TrainingActivity[] = [
  // Mental Health Recovery
  {
    id: 'meditation',
    name: 'Meditation & Mindfulness',
    description: 'Reduce stress and improve mental clarity through focused meditation practices.',
    category: 'mental-health',
    duration: 30,
    cost: 10,
    requirements: [],
    unlock_level: 1,
    effects: [
      {
        type: 'psychology',
        target: 'stress',
        change: -15,
        description: 'Significantly reduces stress levels'
      },
      {
        type: 'psychology',
        target: 'focus',
        change: 10,
        description: 'Improves mental focus and clarity'
      }
    ]
  },
  {
    id: 'therapy-session',
    name: 'Psychological Therapy',
    description: 'Professional therapy session to address deep-rooted psychological issues.',
    category: 'therapy',
    duration: 60,
    cost: 25,
    requirements: ['high-stress'],
    unlock_level: 2,
    effects: [
      {
        type: 'psychology',
        target: 'trauma',
        change: -20,
        description: 'Helps process and reduce trauma effects'
      },
      {
        type: 'psychology',
        target: 'emotional-stability',
        change: 15,
        description: 'Improves emotional regulation'
      }
    ]
  },
  {
    id: 'anger-management',
    name: 'Anger Management Workshop',
    description: 'Specialized training for characters with anger control issues.',
    category: 'therapy',
    duration: 45,
    cost: 20,
    requirements: ['anger-issues'],
    unlock_level: 1,
    effects: [
      {
        type: 'psychology',
        target: 'rage-control',
        change: 25,
        description: 'Significantly improves anger management'
      },
      {
        type: 'psychology',
        target: 'patience',
        change: 15,
        description: 'Increases patience and tolerance'
      }
    ]
  },

  // Skill Development
  {
    id: 'tactical-training',
    name: 'Advanced Tactical Training',
    description: 'Improve battle strategy and tactical decision-making skills.',
    category: 'skill-development',
    duration: 90,
    cost: 30,
    requirements: [],
    unlock_level: 1,
    effects: [
      {
        type: 'skill',
        target: 'tactics',
        change: 20,
        description: 'Enhances tactical thinking abilities'
      },
      {
        type: 'psychology',
        target: 'confidence',
        change: 10,
        description: 'Builds confidence in decision-making'
      }
    ]
  },
  {
    id: 'leadership-development',
    name: 'Leadership Development',
    description: 'Develop leadership skills and team management abilities.',
    category: 'skill-development',
    duration: 75,
    cost: 35,
    requirements: ['leadership-potential'],
    unlock_level: 3,
    effects: [
      {
        type: 'skill',
        target: 'leadership',
        change: 30,
        description: 'Dramatically improves leadership capabilities'
      },
      {
        type: 'psychology',
        target: 'charisma',
        change: 15,
        description: 'Increases natural charisma and influence'
      }
    ]
  },

  // Relationship Building
  {
    id: 'team-bonding',
    name: 'Team Bonding Exercise',
    description: 'Structured activities to improve relationships with teammates.',
    category: 'relationship',
    duration: 60,
    cost: 15,
    requirements: ['team-conflict'],
    unlock_level: 1,
    effects: [
      {
        type: 'relationship',
        target: 'all-teammates',
        change: 10,
        description: 'Improves relationships with all team members'
      },
      {
        type: 'psychology',
        target: 'social-skills',
        change: 8,
        description: 'Enhances social interaction abilities'
      }
    ]
  },
  {
    id: 'conflict-resolution',
    name: 'Conflict Resolution Training',
    description: 'Learn to mediate and resolve interpersonal conflicts.',
    category: 'relationship',
    duration: 45,
    cost: 18,
    requirements: [],
    unlock_level: 2,
    effects: [
      {
        type: 'skill',
        target: 'diplomacy',
        change: 25,
        description: 'Significantly improves diplomatic skills'
      },
      {
        type: 'psychology',
        target: 'empathy',
        change: 12,
        description: 'Increases empathy and understanding'
      }
    ]
  },
  {
    id: 'trust-building',
    name: 'Trust Building Workshop',
    description: 'Exercises designed to build trust between team members.',
    category: 'relationship',
    duration: 90,
    cost: 22,
    requirements: ['trust-issues'],
    unlock_level: 2,
    effects: [
      {
        type: 'psychology',
        target: 'trustworthiness',
        change: 20,
        description: 'Increases perceived trustworthiness'
      },
      {
        type: 'relationship',
        target: 'team-trust',
        change: 15,
        description: 'Builds stronger trust with team'
      }
    ]
  },

  // Specialized Therapy
  {
    id: 'trauma-therapy',
    name: 'Trauma Processing Therapy',
    description: 'Specialized therapy for characters dealing with battle trauma.',
    category: 'therapy',
    duration: 120,
    cost: 40,
    requirements: ['ptsd', 'battle-trauma'],
    unlock_level: 3,
    effects: [
      {
        type: 'psychology',
        target: 'trauma',
        change: -30,
        description: 'Significantly reduces trauma symptoms'
      },
      {
        type: 'psychology',
        target: 'resilience',
        change: 20,
        description: 'Builds psychological resilience'
      }
    ]
  },
  {
    id: 'addiction-counseling',
    name: 'Addiction Counseling',
    description: 'Professional support for characters with addictive behaviors.',
    category: 'therapy',
    duration: 90,
    cost: 35,
    requirements: ['addiction-issues'],
    unlock_level: 2,
    effects: [
      {
        type: 'psychology',
        target: 'addiction-resistance',
        change: 25,
        description: 'Improves resistance to addictive behaviors'
      },
      {
        type: 'psychology',
        target: 'self-control',
        change: 18,
        description: 'Enhances self-control and discipline'
      }
    ]
  }
];

export class TrainingSystemManager {
  private character_states: Map<string, CharacterTrainingState> = new Map();
  private active_sessions: Map<string, TrainingSession> = new Map();

  constructor(savedData?: {
    character_states?: Record<string, CharacterTrainingState>;
    active_sessions?: Record<string, TrainingSession>;
  }) {
    if (savedData) {
      this.loadFromSaveData(savedData);
    }
  }

  // Initialize character for training
  initializeCharacter(character_id: string): void {
    if (!this.character_states.has(character_id)) {
      const state: CharacterTrainingState = {
        character_id,
        training_points: 50, // Starting points
        mental_health: 100,
        current_stress: 20,
        focus_level: 80,
        training_history: [],
        available_activities: this.getAvailableActivities(character_id, 1),
        completed_sessions: 0,
        specializations: []
      };
      this.character_states.set(character_id, state);
    }
  }

  // Get available training activities for character
  getAvailableActivities(character_id: string, level: number): string[] {
    const character = this.getCharacterState(character_id);

    return trainingActivities
      .filter(activity => {
        // Check level requirement
        if (activity.unlock_level > level) return false;

        // Check specific requirements
        return activity.requirements.every(req =>
          this.checkRequirement(character_id, req)
        );
      })
      .map(activity => activity.id);
  }

  // Start training session with usage tracking
  async startTraining(character_id: string, activity_id: string, user_id: string, gym_tier: string = 'community'): Promise<TrainingSession | null> {
    try {
      // Use training API
      const response = await fetch('/api/training/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          character_id,
          activity_id: activity_id,
          user_id,
          gym_tier
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start training');
      }

      const result = await response.json();

      if (result.usageLimitReached) {
        throw new Error('Daily training limit reached. Upgrade to premium or use a better gym for more training sessions!');
      }

      if (!result.session) {
        return null;
      }

      const character = this.getCharacterState(character_id);
      const activity = trainingActivities.find(a => a.id === activity_id);

      if (!character || !activity) return null;

      // Check if character can afford the training
      if (character.training_points < activity.cost) return null;

      // Check if character is already training
      if (this.active_sessions.has(character_id)) return null;

      // Deduct training points
      character.training_points -= activity.cost;

      // Store session locally
      this.active_sessions.set(character_id, result.session);
      return result.session;

    } catch (error) {
      console.error('Training failed:', error);
      throw error;
    }
  }

  private getBaseLimit(subscriptionTier: string): number {
    switch (subscriptionTier) {
      case 'free': return 3;
      case 'premium': return 5;
      case 'legendary': return 10;
      default: return 3;
    }
  }

  private getGymBonus(gymTier: string): number {
    switch (gymTier) {
      case 'community': return 0;
      case 'bronze': return 2;
      case 'elite': return 5;
      case 'legendary': return 10;
      default: return 0;
    }
  }

  private getPerCharacterLimit(gymTier: string): number {
    switch (gymTier) {
      case 'community': return 2;
      case 'bronze': return 3;
      case 'elite': return 4;
      case 'legendary': return 5;
      default: return 2;
    }
  }

  private getCharacterUsageToday(character_id: string): number {
    const today = new Date().toISOString().split('T')[0];
    const character = this.getCharacterState(character_id);
    if (!character) return 0;

    return character.training_history.filter(session =>
      session.start_time.toISOString().split('T')[0] === today && session.completed
    ).length;
  }


  // Complete training session
  async completeTraining(character_id: string): Promise<TrainingResult[] | null> {
    const session = this.active_sessions.get(character_id);
    if (!session) return null;

    const character = this.getCharacterState(character_id);
    const activity = trainingActivities.find(a => a.id === session.activity_id);

    if (!character || !activity) return null;

    const results: TrainingResult[] = [];

    // Apply training effects
    await Promise.all(activity.effects.map(async effect => {
      const before = this.getTraitValue(character, effect.target);
      const after = Math.max(0, Math.min(100, before + effect.change));

      await this.applyTrainingEffect(character, effect);

      results.push({
        type: effect.type,
        before,
        after,
        improvement: after - before,
        description: effect.description
      });
    }));

    // Update session
    session.completed = true;
    session.results = results;
    character.training_history.push(session);
    character.completed_sessions++;

    // Remove from active sessions
    this.active_sessions.delete(character_id);

    // Award bonus training points based on performance
    const bonus = Math.floor(results.reduce((sum, r) => sum + Math.abs(r.improvement), 0) / 10);
    character.training_points += bonus;

    return results;
  }

  // Get character training state
  getCharacterState(character_id: string): CharacterTrainingState | null {
    return this.character_states.get(character_id) || null;
  }

  // Get active training session
  getActiveSession(character_id: string): TrainingSession | null {
    return this.active_sessions.get(character_id) || null;
  }

  // Get training recommendations for character
  getRecommendations(character_id: string): TrainingActivity[] {
    const character = this.getCharacterState(character_id);
    if (!character) return [];

    const recommendations: TrainingActivity[] = [];

    // High stress - recommend stress reduction
    if (character.current_stress > 70) {
      recommendations.push(...trainingActivities.filter(a =>
        a.effects.some(e => e.target === 'stress' && e.change < 0)
      ));
    }

    // Low mental health - recommend therapy
    if (character.mental_health < 60) {
      recommendations.push(...trainingActivities.filter(a =>
        a.category === 'therapy' || a.category === 'mental-health'
      ));
    }

    // Relationship issues - recommend social training
    const avgRelationship = this.getAverageRelationshipLevel(character_id);
    if (avgRelationship < 50) {
      recommendations.push(...trainingActivities.filter(a =>
        a.category === 'relationship'
      ));
    }

    return recommendations.slice(0, 3); // Top 3 recommendations
  }

  // Private helper methods
  private checkRequirement(character_id: string, requirement: string): boolean {
    const character = this.getCharacterState(character_id);
    if (!character) return false;

    switch (requirement) {
      case 'high-stress':
        return character.current_stress > 70;
      case 'anger-issues':
        return this.hasAngerIssues(character_id);
      case 'leadership-potential':
        return this.hasLeadershipPotential(character_id);
      case 'team-conflict':
        return this.hasTeamConflict(character_id);
      case 'trust-issues':
        return this.hasTrustIssues(character_id);
      case 'ptsd':
      case 'battle-trauma':
        return this.hasBattleTrauma(character_id);
      case 'addiction-issues':
        return this.hasAddictionIssues(character_id);
      default:
        return false;
    }
  }

  private getTraitValue(character: CharacterTrainingState, trait: string): number {
    switch (trait) {
      case 'stress':
        return character.current_stress;
      case 'focus':
        return character.focus_level;
      case 'mental-health':
        return character.mental_health;
      default:
        return 50; // Default value
    }
  }

  private async applyTrainingEffect(character: CharacterTrainingState, effect: TrainingEffect): Promise<void> {
    // Get Zyxthala's training bonus if applicable
    const agentService = RealEstateAgentBonusService.getInstance();
    const agentEffects = agentService.getAgentBonusEffects();
    const trainingBonus = agentEffects.training_speed_boost / 100;

    // Apply agent bonus to effect change for gameplan adherence related training
    let effectiveChange = effect.change;
    const isGameplanRelatedTraining = [
      'tactics', 'strategy', 'discipline', 'focus', 'mental-health',
      'leadership', 'communication', 'team-cooperation'
    ].includes(effect.target);

    if (isGameplanRelatedTraining && trainingBonus > 0) {
      effectiveChange = Math.floor(effect.change * (1 + trainingBonus));
      console.log(`🦎 Zyxthala training bonus applied: ${effect.change} → ${effectiveChange} (+${effectiveChange - effect.change})`);
    }

    switch (effect.target) {
      case 'stress':
        character.current_stress = Math.max(0, Math.min(100, character.current_stress + effectiveChange));
        break;
      case 'focus':
        character.focus_level = Math.max(0, Math.min(100, character.focus_level + effectiveChange));
        break;
      case 'mental-health':
        character.mental_health = Math.max(0, Math.min(100, character.mental_health + effectiveChange));
        // ALSO improve character's actual psych_stats.mental_health
        await this.updateCharacterPsychStats(character.character_id, 'mental_health', effectiveChange * 0.3);
        break;

      // Map training effects to character psych_stats improvements
      case 'tactics':
      case 'strategy':
      case 'discipline':
        // Tactical training improves ability to follow instructions
        await this.updateCharacterPsychStats(character.character_id, 'training', effectiveChange * 0.4);
        break;

      case 'leadership':
      case 'charisma':
      case 'communication':
        // Leadership training improves communication abilities
        await this.updateCharacterPsychStats(character.character_id, 'communication', effectiveChange * 0.4);
        break;

      case 'social-skills':
      case 'empathy':
      case 'team-cooperation':
        // Social training improves teamwork
        await this.updateCharacterPsychStats(character.character_id, 'team_player', effectiveChange * 0.4);
        break;

      case 'confidence':
      case 'self-esteem':
        // Confidence training affects ego
        await this.updateCharacterPsychStats(character.character_id, 'ego', effectiveChange * 0.3);
        break;

      case 'rage-control':
      case 'patience':
      case 'emotional-stability':
      case 'self-control':
        // Anger management improves mental health and reduces ego
        await this.updateCharacterPsychStats(character.character_id, 'mental_health', effect.change * 0.4);
        await this.updateCharacterPsychStats(character.character_id, 'ego', -effect.change * 0.2);
        break;

      case 'resilience':
      case 'trauma':
        // Trauma therapy and resilience training improve mental health
        await this.updateCharacterPsychStats(character.character_id, 'mental_health', effect.change * 0.5);
        break;

      case 'team-trust':
      case 'trustworthiness':
        // Trust-building improves teamwork
        await this.updateCharacterPsychStats(character.character_id, 'team_player', effect.change * 0.4);
        break;

      case 'addiction-resistance':
        // Addiction counseling improves mental health and training discipline
        await this.updateCharacterPsychStats(character.character_id, 'mental_health', effect.change * 0.3);
        await this.updateCharacterPsychStats(character.character_id, 'training', effect.change * 0.2);
        break;

      // Add more trait handling as needed
    }
  }

  private hasAngerIssues(character_id: string): boolean {
    // Check character's psychology profile for anger issues
    return character_id === 'achilles';
  }

  /**
   * Updates the character's actual psych_stats used in battle psychology
   * This is the critical connection between training and battle performance
   */
  private async updateCharacterPsychStats(
    character_id: string,
    stat_type: 'training' | 'team_player' | 'ego' | 'mental_health' | 'communication',
    change: number
  ): Promise<void> {
    // Only update if localStorage is available (browser environment)
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      console.log(`Training improvement skipped (SSR): ${character_id}'s ${stat_type} +${change.toFixed(1)}`);
      return;
    }

    // Update persistent character data via API - let backend validate character exists
    await characterAPI.save_training_progress(character_id, {
      stat_type,
      improvement: change,
      training_type: 'psychology',
      timestamp: new Date()
    });

    // Increment character stats with the improvement
    await characterAPI.increment_stats(character_id, {
      [stat_type]: change
    });

    console.log(`Training improved ${character_id}'s ${stat_type} by ${change.toFixed(1)} - saved to backend`);
  }

  private hasLeadershipPotential(character_id: string): boolean {
    return character_id === 'cleopatra' || character_id === 'achilles';
  }

  private hasTeamConflict(character_id: string): boolean {
    return this.getAverageRelationshipLevel(character_id) < 40;
  }

  private hasTrustIssues(character_id: string): boolean {
    return character_id === 'dracula' || this.getAverageRelationshipLevel(character_id) < 30;
  }

  private hasBattleTrauma(character_id: string): boolean {
    return character_id === 'achilles'; // Achilles has PTSD from Trojan War
  }

  private hasAddictionIssues(character_id: string): boolean {
    return character_id === 'sherlock-holmes'; // Holmes has cocaine addiction
  }

  private getAverageRelationshipLevel(character_id: string): number {
    // Simplified - would integrate with relationship system
    return 50;
  }

  // Save/Load functionality
  private loadFromSaveData(data: {
    character_states?: Record<string, CharacterTrainingState>;
    active_sessions?: Record<string, TrainingSession>;
  }): void {
    if (data.character_states) {
      this.character_states = new Map(Object.entries(data.character_states));
    }
    if (data.active_sessions) {
      this.active_sessions = new Map(Object.entries(data.active_sessions));
    }
  }

  saveProgress(): {
    character_states: Record<string, CharacterTrainingState>;
    active_sessions: Record<string, TrainingSession>;
  } {
    return {
      character_states: Object.fromEntries(this.character_states),
      active_sessions: Object.fromEntries(this.active_sessions)
    };
  }

  static loadProgress(): TrainingSystemManager {
    // Only access localStorage in browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return new TrainingSystemManager({});
    }

    const saved = localStorage.getItem('training-system');
    const data = saved ? JSON.parse(saved) : {};
    return new TrainingSystemManager(data);
  }

  saveToStorage(): void {
    // Only access localStorage in browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem('training-system', JSON.stringify(this.saveProgress()));
  }
}