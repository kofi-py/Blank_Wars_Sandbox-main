import { usage_tracking_service } from './usageTrackingService';
import { requireNotInBattle } from './battleLockService';

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
  stress_level: number;
  focus_level: number;
  training_history: TrainingSession[];
  available_activities: string[];
  completed_sessions: number;
  specializations: string[];
}

// Training Activities Database
export const training_activities: TrainingActivity[] = [
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
  }
];

export class TrainingService {
  /**
   * Start training session with usage tracking
   */
  async startTraining(
    character_id: string,
    activity_id: string,
    user_id: string,
    gym_tier: string = 'community',
    db: any
  ): Promise<{ session: TrainingSession | null; usage_limit_reached?: boolean }> {
    try {
      // Check if character is in battle
      await requireNotInBattle(character_id);

      // Check usage limits with gym bonuses (following aiChatService pattern)
      const can_train = await usage_tracking_service.trackTrainingUsage(user_id, db, gym_tier);
      if (!can_train) {
        return {
          session: null,
          usage_limit_reached: true
        };
      }

      const activity = training_activities.find(a => a.id === activity_id);
      if (!activity) {
        return { session: null };
      }

      // Create training session
      const session: TrainingSession = {
        id: `${character_id}-${activity_id}-${Date.now()}`,
        character_id,
        activity_id,
        start_time: new Date(),
        duration: activity.duration,
        completed: false
      };

      return { session };
    } catch (error) {
      console.error('Training service error:', error);
      throw new Error(`Training failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Complete training session and apply effects
   */
  async completeTraining(
    session_id: string,
    character_id: string,
    xp_gain: number,
    stat_type: string,
    stat_bonus: number,
    training_points_gain: number = 0
  ): Promise<{ character: any; leveled_up: boolean; new_level?: number }> {
    // Check if character is in battle
    await requireNotInBattle(character_id);

    const { query } = await import('../database/index');
    const { CharacterProgressionService } = await import('./characterProgressionService');

    // Award experience using the central service
    const xp_result = await CharacterProgressionService.awardExperience(
      character_id,
      xp_gain,
      'training', // Source
      `Training: ${stat_type} (+${stat_bonus})`
    );

    // Column name is current_{stat_type} - no mapping needed
    const stat_column = `current_${stat_type}`;

    // Update character stats (XP is already handled by awardExperience)
    await query(`
      UPDATE user_characters
      SET ${stat_column} = ${stat_column} + $1
      WHERE id = $2
    `, [
      stat_bonus,
      character_id
    ]);

    // Get updated character
    const updated_result = await query('SELECT * FROM user_characters WHERE id = $1', [character_id]);
    // Calculate experience_to_next for return
    const next_level_req = await CharacterProgressionService.getLevelRequirement(updated_result.rows[0].level + 1);

    const updated_character = {
      ...updated_result.rows[0],
      experience_to_next: next_level_req
        ? parseInt(next_level_req.total_xp_required) - parseInt(updated_result.rows[0].experience)
        : 0
    };

    return {
      character: updated_character,
      leveled_up: xp_result.leveled_up,
      new_level: xp_result.new_level
    };
  }

  /**
   * Get available training activities for character
   */
  getAvailableActivities(character_level: number, character_requirements: string[]): TrainingActivity[] {
    return training_activities.filter(activity => {
      // Check level requirement
      if (activity.unlock_level > character_level) return false;

      // Check specific requirements
      return activity.requirements.every(req =>
        character_requirements.includes(req)
      );
    });
  }

  /**
   * Calculate training limits with gym bonuses
   */
  getTrainingLimitsWithGymBonus(subscription_tier: string, gym_tier: string): number {
    const base_limits = {
      free: 3,
      premium: 5,
      legendary: 10
    };

    const gym_bonuses = {
      community: 0,
      bronze: 2,
      elite: 5,
      legendary: 10
    };

    const base_limit = base_limits[subscription_tier as keyof typeof base_limits] || 3;
    const gym_bonus = gym_bonuses[gym_tier as keyof typeof gym_bonuses] || 0;

    return base_limit + gym_bonus;
  }
}

// Export singleton instance
export const training_service = new TrainingService();