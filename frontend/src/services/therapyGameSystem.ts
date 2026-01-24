// Therapy Game System - Turn therapy into an engaging game experience
// Integrates with existing game balance and reward systems

import ConflictRewardSystem from './conflictRewardSystem';
import GameEventBus from './gameEventBus';
import { THERAPY_BALANCE } from './therapyBalance';

export interface TherapyGameState {
  session_id: string;
  character_id: string;
  therapist_id: string;

  // Progress tracking
  current_stage: 'initial' | 'resistance' | 'breakthrough' | 'mastery';
  stage_progress: number; // 0-100
  total_progress: number; // Overall therapy progress

  // Game mechanics
  insight_points: number; // Earned through revelations
  breakthrough_streak: number; // Consecutive meaningful exchanges
  vulnerability_score: number; // Willingness to open up
  empathy_bonus: number; // Understanding others/therapist

  // Achievement tracking
  achievements_unlocked: string[];
  milestones_reached: TherapyMilestone[];

  // Session stats
  messages_count: number;
  rounds_completed: number;
  last_speaker: 'none' | 'patient' | 'therapist';
  last_patient_msg: string;
  deep_thoughts_shared: number;
  emotional_breakthroughs: number;
  defensive_moments: number;

  // CamelCase variants
  vulnerabilityScore?: number;
  breakthroughStreak?: number;
  emotionalBreakthroughs?: number;
  messagesCount?: number;
}

export interface TherapyMilestone {
  id: string;
  title: string;
  description: string;
  requirement: string;
  reward: TherapyReward;
  unlocked: boolean;
  unlocked_at?: Date;
}

export interface TherapyReward {
  // Uses exact database column names from user_characters table
  // current_* prefixes = live gameplay instance values
  type:
  | 'bond_level'
  | 'current_communication'
  | 'current_confidence'
  | 'current_mental_health'
  | 'current_morale'
  | 'current_stress'
  | 'current_team_player'
  | 'experience';
  value: number;
  description: string;
  permanent?: boolean;
}

export interface TherapyAchievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'legendary';
  condition: (state: TherapyGameState, session_history: any[]) => boolean;
  reward: TherapyReward;
}

export class TherapyGameSystem {
  private static instance: TherapyGameSystem;
  private conflictRewardSystem = ConflictRewardSystem.getInstance();
  private eventBus = GameEventBus.getInstance();

  static getInstance(): TherapyGameSystem {
    const g = globalThis as any;
    if (!g.__TGS__) {
      g.__TGS__ = new TherapyGameSystem();
    }
    return g.__TGS__;
  }

  // Emit round completed event for judges
  private async emitRoundCompleted(data: { state: TherapyGameState; therapist_msg: string }): Promise<void> {
    const eventBus = GameEventBus.getInstance();
    try {
      console.log(`🎯 [THERAPY-GAME] Emitting therapy_round_completed event - rounds_completed: ${data.state.rounds_completed}`);
      await eventBus.publish({
        type: 'therapy_breakthrough',
        source: 'therapy_room',
        primary_character_id: data.state.character_id,
        severity: 'medium',
        category: 'therapy',
        description: data.therapist_msg,
        metadata: {
          session_id: data.state.session_id,
          rounds_completed: data.state.rounds_completed,
          last_patient_msg: data.state.last_patient_msg,
          therapist_response: data.therapist_msg,
        },
        tags: ['therapy', 'breakthrough', 'session'],
        resolved: false
      });
      console.log(`✅ [THERAPY-GAME] Event published successfully`);
    } catch (err) {
      console.error('Failed to emit round completed event:', err);
    }
  }

  // Initialize therapy game state for a new session
  initializeSession(character_id: string, therapist_id: string): TherapyGameState {
    const session_id = `therapy_game_${Date.now()}_${character_id}`;

    return {
      session_id,
      character_id,
      therapist_id,
      current_stage: 'initial',
      stage_progress: 0,
      total_progress: this.getExistingProgress(character_id),
      insight_points: 0,
      breakthrough_streak: 0,
      vulnerability_score: 0,
      empathy_bonus: 0,
      achievements_unlocked: [],
      milestones_reached: [],
      messages_count: 0,
      rounds_completed: 0,
      last_speaker: 'none',
      last_patient_msg: '',
      deep_thoughts_shared: 0,
      emotional_breakthroughs: 0,
      defensive_moments: 0
    };
  }

  // Process a therapy message and update game state
  processTherapyMessage(
    game_state: TherapyGameState,
    message: string,
    speaker_type: 'contestant' | 'therapist',
    message_analysis?: {
      emotional_depth: number; // 1-10
      vulnerability_level: number; // 1-10
      insight_quality: number; // 1-10
      defensive_patterns: number; // 1-10 (higher = more defensive)
      empathy_shown: number; // 1-10
    }
  ): {
    updated_state: TherapyGameState;
    points_earned: { type: string; amount: number; reason: string }[];
    achievements_unlocked: TherapyAchievement[];
    stage_progression?: { from: string; to: string; reason: string };
  } {
    const updatedState = { ...game_state };
    const points_earned: { type: string; amount: number; reason: string }[] = [];
    const achievements_unlocked: TherapyAchievement[] = [];
    let stageProgression;

    // Update message count
    updatedState.messagesCount++;

    // Round boundary logic
    const isBoundary = speaker_type === 'therapist' && updatedState.last_speaker === 'patient';

    if (isBoundary) {
      updatedState.rounds_completed++;
      void this.emitRoundCompleted({ state: updatedState, therapist_msg: message });
      updatedState.last_patient_msg = ''; // Clear after round completion
    }

    // Capture patient messages and update speaker state
    if (speaker_type === 'contestant') {
      updatedState.last_patient_msg = message;
      updatedState.last_speaker = 'patient';
    } else if (speaker_type === 'therapist') {
      updatedState.last_speaker = 'therapist';
    }

    if (message_analysis) {
      // Insight Points (main currency)
      if (message_analysis.insight_quality >= 7) {
        const insightGain = Math.floor(message_analysis.insight_quality * 2);
        updatedState.insight_points += insightGain;
        points_earned.push({
          type: 'insight',
          amount: insightGain,
          reason: 'Deep insight shared'
        });
      }

      // Vulnerability Score
      if (message_analysis.vulnerability_level >= 6) {
        updatedState.vulnerability_score += message_analysis.vulnerability_level;
        updatedState.deep_thoughts_shared++;
        points_earned.push({
          type: 'vulnerability',
          amount: message_analysis.vulnerability_level,
          reason: 'Opened up emotionally'
        });
      }

      // Empathy Bonus (for understanding therapist/others)
      if (message_analysis.empathy_shown >= 6) {
        updatedState.empathy_bonus += message_analysis.empathy_shown;
        points_earned.push({
          type: 'empathy',
          amount: message_analysis.empathy_shown,
          reason: 'Showed understanding'
        });
      }

      // Breakthrough Detection
      if (message_analysis.emotional_depth >= 8 && message_analysis.vulnerability_level >= 7) {
        updatedState.breakthrough_streak++;
        updatedState.emotional_breakthroughs++;
        points_earned.push({
          type: 'breakthrough',
          amount: 25,
          reason: 'Emotional breakthrough achieved!'
        });
      } else if (message_analysis.defensive_patterns >= 7) {
        updatedState.breakthrough_streak = 0;
        updatedState.defensive_moments++;
      }

      // Stage Progression
      const newStage = this.calculateStageProgression(updatedState, message_analysis);
      if (newStage !== updatedState.current_stage) {
        stageProgression = {
          from: updatedState.current_stage,
          to: newStage,
          reason: this.getStageProgressionReason(newStage, message_analysis)
        };
        updatedState.current_stage = newStage as any;
        updatedState.stage_progress = 0; // Reset for new stage
      } else {
        updatedState.stage_progress += this.calculateProgressGain(message_analysis);
      }
    }

    // Check for achievements
    const newAchievements = this.checkAchievements(updatedState, []);
    achievements_unlocked.push(...newAchievements);

    return {
      updated_state: updatedState,
      points_earned,
      achievements_unlocked: achievements_unlocked,
      stage_progression: stageProgression
    };
  }

  // Calculate what stage the therapy should be in based on progress
  private calculateStageProgression(
    state: TherapyGameState,
    analysis: any
  ): string {
    const { vulnerabilityScore, breakthroughStreak, emotionalBreakthroughs, messagesCount } = state;
    const { STAGE_THRESHOLDS } = THERAPY_BALANCE;

    // Mastery stage - deeply engaged, consistent breakthroughs
    if (breakthroughStreak >= STAGE_THRESHOLDS.mastery.min_breakthrough_streak &&
      emotionalBreakthroughs >= STAGE_THRESHOLDS.mastery.min_breakthroughs &&
      vulnerabilityScore >= STAGE_THRESHOLDS.mastery.min_vulnerability) {
      return 'mastery';
    }

    // Breakthrough stage - having meaningful revelations
    if (emotionalBreakthroughs >= STAGE_THRESHOLDS.breakthrough.min_breakthroughs &&
      vulnerabilityScore >= STAGE_THRESHOLDS.breakthrough.min_vulnerability) {
      return 'breakthrough';
    }

    // Resistance stage - some engagement but defensive patterns
    if (messagesCount >= STAGE_THRESHOLDS.resistance.min_messages &&
      (state.defensive_moments > state.deep_thoughts_shared * STAGE_THRESHOLDS.resistance.defensive_ratio)) {
      return 'resistance';
    }

    // Initial stage - just starting, feeling things out
    return 'initial';
  }

  private calculateProgressGain(analysis: any): number {
    return Math.min(25,
      analysis.emotional_depth * 2 +
      analysis.vulnerability_level * 2 +
      analysis.insight_quality * 3 -
      analysis.defensive_patterns
    );
  }

  private getStageProgressionReason(stage: string, analysis: any): string {
    switch (stage) {
      case 'resistance':
        return 'Character showing defensive patterns but engaging';
      case 'breakthrough':
        return 'First emotional breakthrough achieved!';
      case 'mastery':
        return 'Deep therapeutic engagement with consistent insights';
      default:
        return 'Session beginning';
    }
  }

  // Get therapy achievements
  getTherapyAchievements(): TherapyAchievement[] {
    return [
      {
        id: 'first_breakthrough',
        title: 'First Light',
        description: 'Achieved your first emotional breakthrough in therapy',
        icon: '🌅',
        rarity: 'common',
        condition: (state) => state.emotional_breakthroughs >= 1,
        reward: { type: 'current_mental_health', value: 10, description: '+10 Mental Health' }
      },
      {
        id: 'vulnerability_master',
        title: 'Heart on Sleeve',
        description: 'Shared deep vulnerabilities (50+ vulnerability points)',
        icon: '💚',
        rarity: 'rare',
        condition: (state) => state.vulnerability_score >= 50,
        reward: { type: 'bond_level', value: 5, description: '+5 Bond Level with all characters' }
      },
      {
        id: 'breakthrough_streak',
        title: 'Rolling Thunder',
        description: 'Achieved 5 consecutive breakthrough moments',
        icon: '⚡',
        rarity: 'rare',
        condition: (state) => state.breakthrough_streak >= 5,
        reward: { type: 'experience', value: 100, description: '+100 Experience Points' }
      },
      {
        id: 'therapy_master',
        title: 'Therapeutic Wisdom',
        description: 'Reached mastery stage in therapy',
        icon: '🧠',
        rarity: 'legendary',
        condition: (state) => state.current_stage === 'mastery',
        reward: { type: 'current_confidence', value: 15, description: '+15 Confidence from therapeutic mastery' }
      },
      {
        id: 'empathy_champion',
        title: 'Understanding Soul',
        description: 'Showed exceptional empathy (100+ empathy points)',
        icon: '🤝',
        rarity: 'rare',
        condition: (state) => state.empathy_bonus >= 100,
        reward: { type: 'current_communication', value: 10, description: '+10 Communication from empathy practice' }
      },
      {
        id: 'insight_collector',
        title: 'Wisdom Seeker',
        description: 'Accumulated 200+ insight points in a session',
        icon: '💡',
        rarity: 'common',
        condition: (state) => state.insight_points >= 200,
        reward: { type: 'experience', value: 50, description: '+50 Experience Points' }
      }
    ];
  }

  // Check which achievements have been unlocked
  private checkAchievements(
    state: TherapyGameState,
    session_history: any[]
  ): TherapyAchievement[] {
    const achievements = this.getTherapyAchievements();
    const newlyUnlocked: TherapyAchievement[] = [];

    for (const achievement of achievements) {
      if (!state.achievements_unlocked.includes(achievement.id) &&
        achievement.condition(state, session_history)) {
        newlyUnlocked.push(achievement);
        state.achievements_unlocked.push(achievement.id);
      }
    }

    return newlyUnlocked;
  }

  // Generate therapy session summary with game elements
  generateSessionSummary(state: TherapyGameState): {
    stage: string;
    stage_description: string;
    key_metrics: { label: string; value: number; change?: string }[];
    achievements: string[];
    next_session_goals: string[];
    therapeutic_gains: TherapyReward[];
  } {
    const stageDescriptions = {
      initial: 'Getting comfortable and establishing trust',
      resistance: 'Working through defensive patterns',
      breakthrough: 'Experiencing meaningful insights',
      mastery: 'Deep therapeutic engagement'
    };

    return {
      stage: state.current_stage,
      stage_description: stageDescriptions[state.current_stage],
      key_metrics: [
        { label: 'Insight Points', value: state.insight_points, change: '+15' },
        { label: 'Vulnerability Score', value: state.vulnerability_score, change: '+8' },
        { label: 'Breakthrough Streak', value: state.breakthrough_streak },
        { label: 'Empathy Bonus', value: state.empathy_bonus, change: '+5' },
        { label: 'Deep Thoughts Shared', value: state.deep_thoughts_shared }
      ],
      achievements: state.achievements_unlocked,
      next_session_goals: this.generateNextSessionGoals(state),
      therapeutic_gains: this.calculateSessionRewards(state)
    };
  }

  private generateNextSessionGoals(state: TherapyGameState): string[] {
    const goals: string[] = [];

    if (state.vulnerability_score < 25) {
      goals.push('Share more personal experiences to build vulnerability score');
    }

    if (state.breakthrough_streak === 0) {
      goals.push('Work toward your first breakthrough moment');
    }

    if (state.empathy_bonus < 20) {
      goals.push('Practice understanding the therapist\'s perspective');
    }

    if (state.current_stage === 'resistance') {
      goals.push('Work through defensive patterns to reach breakthrough stage');
    }

    return goals.length > 0 ? goals : ['Continue building therapeutic rapport'];
  }

  private calculateSessionRewards(state: TherapyGameState): TherapyReward[] {
    const rewards: TherapyReward[] = [];

    // Base session reward
    rewards.push({
      type: 'current_mental_health',
      value: Math.min(15, state.insight_points / 10),
      description: 'Mental health improvement from therapy session'
    });

    // Breakthrough bonus
    if (state.emotional_breakthroughs > 0) {
      rewards.push({
        type: 'experience',
        value: state.emotional_breakthroughs * 25,
        description: 'Experience from emotional breakthroughs'
      });
    }

    // Vulnerability bonus
    if (state.vulnerability_score >= 20) {
      rewards.push({
        type: 'bond_level',
        value: 2,
        description: 'Bond level increase from opening up'
      });
    }

    return rewards;
  }

  private getExistingProgress(character_id: string): number {
    // This would integrate with character database to get existing therapy progress
    return 0;
  }

  // Integration point for applying rewards to character
  async applyTherapyRewards(character_id: string, rewards: TherapyReward[], therapist_id: string): Promise<void> {
    // Import apiClient to avoid circular imports
    const { characterAPI } = await import('./apiClient');

    // Transform rewards to match API format
    const apiRewards = rewards.map(reward => ({
      type: reward.type,
      value: reward.value,
      description: reward.description
    }));

    // Apply rewards via API - FAIL FAST, NO ERROR HANDLING
    console.log(`🎖️ Applying therapy rewards to character ${character_id} (therapist: ${therapist_id}):`, apiRewards);
    const result = await characterAPI.apply_therapy_rewards(character_id, apiRewards, therapist_id);

    if (!result.success) {
      throw new Error(`Failed to apply therapy rewards: ${result.error}`);
    }

    console.log(`✅ Therapy rewards applied successfully:`, result.rewards);

    // Publish events for UI updates only after successful API call
    for (const reward of rewards) {
      this.eventBus.publish({
        type: 'achievement_earned',
        source: 'therapy_room',
        primary_character_id: character_id,
        severity: 'low',
        category: 'therapy',
        description: reward.description,
        metadata: {
          reward_type: reward.type,
          reward_value: reward.value
        },
        tags: ['therapy', 'reward', 'achievement'],
        resolved: true
      });
    }
  }
}

export default TherapyGameSystem;