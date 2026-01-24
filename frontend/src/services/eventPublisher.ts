// Event Publisher Service
// Provides easy-to-use methods for different game systems to publish events

import GameEventBus, { GameEvent, EventType, EventSeverity, EventCategory, EventSource } from './gameEventBus';

export interface BattleEventData {
  winner_id: string;
  loser_id: string;
  participants: string[];
  battle_duration: number;
  strategy_used: string;
  mvp_player?: string;
  teamwork_rating: number;
  battle_type: 'arena' | 'tournament' | 'sparring' | 'practice';
}

export interface ChatEventData {
  character_id: string;
  chat_type: 'performance' | 'equipment' | 'skills' | 'training' | 'casual';
  message: string;
  coach_id?: string;
  outcome?: 'helpful' | 'confusing' | 'breakthrough' | 'resistance';
}

export interface TrainingEventData {
  character_id: string;
  trainer_id?: string;
  training_type: 'strength' | 'agility' | 'endurance' | 'skill' | 'mental';
  intensity: number; // 1-10
  duration: number; // minutes
  improvements: string[];
  fatigue_level: number; // 1-10
  skills_focused?: string[];
}

export interface SocialEventData {
  initiator_id: string;
  participant_ids: string[];
  location: 'kitchen' | 'living_room' | 'training_area' | 'bedroom' | 'common_area';
  event_type: 'conversation' | 'argument' | 'activity' | 'meal' | 'conflict';
  topic?: string;
  outcome: 'positive' | 'negative' | 'neutral' | 'unresolved';
  witnesses?: string[];
}

export interface TherapyEventData {
  character_id: string;
  therapist_id: string;
  session_type: 'individual' | 'group' | 'couples' | 'family';
  stage: 'initial' | 'resistance' | 'breakthrough' | 'maintenance';
  topics_discussed: string[];
  insights: string[];
  resistance_level: number; // 1-10
  breakthrough_achieved: boolean;
  breakthroughs?: string[];
  conflicts_addressed?: string[];
}

export interface ProgressionEventData {
  character_id: string;
  progress_type: 'level_up' | 'stat_increase' | 'skill_learned' | 'equipment_change' | 'achievement';
  details: Record<string, any>;
  previous_value?: any;
  new_value?: any;
}

export class EventPublisher {
  private static instance: EventPublisher;
  private eventBus: GameEventBus;

  private constructor() {
    this.eventBus = GameEventBus.getInstance();
  }

  static getInstance(): EventPublisher {
    if (!EventPublisher.instance) {
      EventPublisher.instance = new EventPublisher();
    }
    return EventPublisher.instance;
  }

  // Battle System Events
  async publishBattleStart(data: BattleEventData): Promise<string> {
    return await this.eventBus.publish({
      type: 'battle_start',
      source: 'battle_arena',
      primary_character_id: data.winner_id,
      secondary_character_ids: data.participants.filter(id => id !== data.winner_id),
      severity: 'medium',
      category: 'battle',
      description: `Battle started: ${data.participants.length} participants using ${data.strategy_used} strategy`,
      metadata: {
        battle_type: data.battle_type,
        strategy_used: data.strategy_used,
        participants: data.participants,
        expected_duration: data.battle_duration
      },
      tags: ['battle', 'combat', data.battle_type, data.strategy_used]
    });
  }

  async publishBattleEnd(data: BattleEventData): Promise<string> {
    const battleEndEvent = await this.eventBus.publish({
      type: 'battle_end',
      source: 'battle_arena',
      primary_character_id: data.winner_id,
      secondary_character_ids: data.participants.filter(id => id !== data.winner_id),
      severity: 'high',
      category: 'battle',
      description: `Battle ended: ${data.winner_id} victorious over ${data.loser_id}`,
      metadata: {
        winner_id: data.winner_id,
        loser_id: data.loser_id,
        battle_duration: data.battle_duration,
        teamwork_rating: data.teamwork_rating,
        mvp_player: data.mvp_player,
        battle_type: data.battle_type
      },
      tags: ['battle', 'victory', 'defeat', data.battle_type],
      emotional_impact: [
        { character_id: data.winner_id, impact: 'positive', intensity: 8 },
        { character_id: data.loser_id, impact: 'negative', intensity: 6 }
      ]
    });

    // Also publish individual victory/defeat events
    await this.eventBus.publish({
      type: 'battle_victory',
      source: 'battle_arena',
      primary_character_id: data.winner_id,
      secondary_character_ids: [data.loser_id],
      severity: 'medium',
      category: 'battle',
      description: `Won battle against ${data.loser_id} using ${data.strategy_used}`,
      metadata: data,
      tags: ['victory', 'combat', 'achievement']
    });

    await this.eventBus.publish({
      type: 'battle_defeat',
      source: 'battle_arena',
      primary_character_id: data.loser_id,
      secondary_character_ids: [data.winner_id],
      severity: 'medium',
      category: 'battle',
      description: `Lost battle to ${data.winner_id} despite ${data.strategy_used} strategy`,
      metadata: data,
      tags: ['defeat', 'setback', 'learning']
    });

    return battleEndEvent;
  }

  // Alias for backwards compatibility
  async publishBattleEvent(data: BattleEventData): Promise<string> {
    return this.publishBattleEnd(data);
  }

  // Chat System Events
  async publishChatInteraction(data: ChatEventData): Promise<string> {
    const severity: EventSeverity = data.outcome === 'breakthrough' ? 'high' : 
                                   data.outcome === 'resistance' ? 'medium' : 'low';

    return await this.eventBus.publish({
      type: this.getChatEventType(data.chat_type),
      source: 'chat_system',
      primary_character_id: data.character_id,
      secondary_character_ids: data.coach_id ? [data.coach_id] : [],
      severity,
      category: 'communication',
      description: `${data.chat_type} chat session with ${data.outcome || 'neutral'} outcome`,
      metadata: {
        chat_type: data.chat_type,
        message: data.message.substring(0, 100) + '...', // Truncate for storage
        outcome: data.outcome,
        coach_id: data.coach_id
      },
      tags: ['communication', data.chat_type, data.outcome || 'neutral']
    });
  }

  // Training System Events
  async publishTrainingSession(data: TrainingEventData): Promise<string> {
    const severity: EventSeverity = data.intensity > 8 ? 'high' : 
                                   data.intensity > 5 ? 'medium' : 'low';

    return await this.eventBus.publish({
      type: 'training_session',
      source: 'training_grounds',
      primary_character_id: data.character_id,
      secondary_character_ids: data.trainer_id ? [data.trainer_id] : [],
      severity,
      category: 'training',
      description: `${data.training_type} training session (intensity ${data.intensity}/10)`,
      metadata: {
        training_type: data.training_type,
        intensity: data.intensity,
        duration: data.duration,
        improvements: data.improvements,
        fatigue_level: data.fatigue_level,
        trainer_id: data.trainer_id
      },
      tags: ['training', data.training_type, `intensity_${data.intensity}`],
      emotional_impact: [{
        character_id: data.character_id,
        impact: data.improvements.length > 0 ? 'positive' : 'neutral',
        intensity: Math.min(data.intensity, data.improvements.length * 2)
      }]
    });
  }

  async publishSkillLearned(character_id: string, skill_name: string, skill_type: string): Promise<string> {
    return await this.eventBus.publish({
      type: 'new_technique_learned',
      source: 'training_grounds',
      primary_character_id: character_id,
      severity: 'medium',
      category: 'training',
      description: `Learned new ${skill_type} skill: ${skill_name}`,
      metadata: {
        skill_name: skill_name,
        skill_type: skill_type,
        learning_method: 'training'
      },
      tags: ['skill', 'learning', 'progression', skill_type],
      emotional_impact: [{
        character_id,
        impact: 'positive',
        intensity: 6
      }]
    });
  }

  // Social System Events
  async publishSocialInteraction(data: SocialEventData): Promise<string> {
    const event_type = this.getSocialEventType(data.event_type, data.outcome);
    const severity: EventSeverity = data.event_type === 'conflict' || data.event_type === 'argument' ? 'high' :
                                   data.outcome === 'negative' ? 'medium' : 'low';

    return await this.eventBus.publish({
      type: event_type,
      source: 'kitchen_table',
      primary_character_id: data.initiator_id,
      secondary_character_ids: data.participant_ids,
      severity,
      category: 'social',
      description: `${data.event_type} in ${data.location.replace('_', ' ')}${data.topic ? ` about ${data.topic}` : ''}`,
      metadata: {
        location: data.location,
        event_type: data.event_type,
        topic: data.topic,
        outcome: data.outcome,
        witnesses: data.witnesses,
        duration: Date.now() // Could be passed in
      },
      tags: ['social', data.location, data.event_type, data.outcome],
      resolved: data.outcome === 'positive',
      emotional_impact: [data.initiator_id, ...data.participant_ids].map(character_id => ({
        character_id,
        impact: data.outcome === 'positive' ? 'positive' : 
               data.outcome === 'negative' ? 'negative' : 'neutral',
        intensity: severity === 'high' ? 7 : severity === 'medium' ? 4 : 2
      }))
    });
  }

  // Therapy System Events
  async publishTherapySession(data: TherapyEventData): Promise<string> {
    const event_type: EventType = data.breakthrough_achieved ? 'therapy_breakthrough' :
                                data.resistance_level > 7 ? 'therapy_resistance' :
                                'therapy_session_start';

    return await this.eventBus.publish({
      type: event_type,
      source: 'therapy_room',
      primary_character_id: data.character_id,
      secondary_character_ids: [data.therapist_id],
      severity: data.breakthrough_achieved ? 'high' : 'medium',
      category: 'therapy',
      description: `${data.session_type} therapy session with ${data.stage} stage${data.breakthrough_achieved ? ' breakthrough' : ''}`,
      metadata: {
        therapist_id: data.therapist_id,
        session_type: data.session_type,
        stage: data.stage,
        topics_discussed: data.topics_discussed,
        insights: data.insights,
        resistance_level: data.resistance_level,
        breakthrough_achieved: data.breakthrough_achieved
      },
      tags: ['therapy', data.session_type, data.stage],
      resolved: data.breakthrough_achieved,
      emotional_impact: [{
        character_id: data.character_id,
        impact: data.breakthrough_achieved ? 'positive' : 
               data.resistance_level > 7 ? 'negative' : 'neutral',
        intensity: data.breakthrough_achieved ? 8 : data.resistance_level
      }]
    });
  }

  // Progression System Events
  async publishLevelUp(character_id: string, new_level: number, old_level: number): Promise<string> {
    return await this.eventBus.publish({
      type: 'level_up',
      source: 'battle_arena',
      primary_character_id: character_id,
      severity: 'medium',
      category: 'progression',
      description: `Leveled up from ${old_level} to ${new_level}`,
      metadata: {
        new_level,
        old_level,
        level_gain: new_level - old_level
      },
      tags: ['progression', 'level_up', 'achievement'],
      emotional_impact: [{
        character_id,
        impact: 'positive',
        intensity: 7
      }]
    });
  }

  async publishEquipmentChange(character_id: string, action: 'equipped' | 'unequipped' | 'upgraded', item_name: string, item_type: string): Promise<string> {
    return await this.eventBus.publish({
      type: action === 'upgraded' ? 'equipment_upgraded' : 'equipment_equipped',
      source: 'equipment_room',
      primary_character_id: character_id,
      severity: 'low',
      category: 'progression',
      description: `${action} ${item_type}: ${item_name}`,
      metadata: {
        action,
        item_name: item_name,
        item_type: item_type,
        timestamp: new Date()
      },
      tags: ['equipment', action, item_type],
      emotional_impact: [{
        character_id,
        impact: action === 'upgraded' ? 'positive' : 'neutral',
        intensity: action === 'upgraded' ? 4 : 2
      }]
    });
  }

  // Kitchen Table Specific Events
  async publishKitchenConflict(initiatorId: string, target_id: string, conflict_type: string, severity: EventSeverity, description: string): Promise<string> {
    return await this.eventBus.publish({
      type: 'kitchen_argument',
      source: 'kitchen_table',
      primary_character_id: initiatorId,
      secondary_character_ids: [target_id],
      severity,
      category: 'social',
      description,
      metadata: {
        conflict_type,
        location: 'kitchen',
        trigger: conflict_type,
        escalation_level: severity === 'critical' ? 10 : severity === 'high' ? 7 : severity === 'medium' ? 4 : 2,
        resolution_attempted: false
      },
      tags: ['kitchen', 'conflict', conflict_type, severity],
      resolved: false
    });
  }

  async publishConflictResolution(event_id: string, resolution_method: string, mediator_id?: string): Promise<string> {
    // Update the original conflict event
    // Note: In a real implementation, you'd want to update the original event
    // For now, we'll create a resolution event

    return await this.eventBus.publish({
      type: 'conflict_resolved',
      source: 'therapy_room',
      primary_character_id: mediator_id || 'system',
      severity: 'medium',
      category: 'therapy',
      description: `Conflict resolved through ${resolution_method}`,
      metadata: {
        original_event_id: event_id,
        resolution_method: resolution_method,
        mediator_id: mediator_id,
        timestamp: new Date()
      },
      tags: ['resolution', 'conflict_management', resolution_method],
      resolved: true
    });
  }

  // Helper methods
  private getChatEventType(chat_type: string): EventType {
    const typeMap: Record<string, EventType> = {
      'performance': 'performance_coaching',
      'equipment': 'equipment_advice',
      'skills': 'skill_consultation',
      'training': 'personal_training',
      'casual': 'casual_conversation'
    };
    
    return typeMap[chat_type] || 'casual_conversation';
  }

  private getSocialEventType(event_type: string, outcome: string): EventType {
    if (event_type === 'conflict' || event_type === 'argument') {
      return 'kitchen_argument';
    }
    if (event_type === 'conversation' && outcome === 'positive') {
      return 'late_night_conversation';
    }
    if (event_type === 'activity') {
      return 'group_activity';
    }
    if (event_type === 'meal') {
      return 'meal_sharing';
    }
    
    return 'casual_conversation';
  }

  // Batch event publishing for complex scenarios
  async publishBattleSequence(battleData: BattleEventData): Promise<string[]> {
    const event_ids: string[] = [];
    
    // Start event
    event_ids.push(await this.publishBattleStart(battleData));
    
    // Individual actions (could be expanded)
    if (battleData.mvp_player) {
      event_ids.push(await this.eventBus.publish({
        type: 'individual_heroics',
        source: 'battle_arena',
        primary_character_id: battleData.mvp_player,
        severity: 'medium',
        category: 'battle',
        description: `Displayed exceptional performance as team MVP`,
        metadata: { battle_type: battleData.battle_type, mvp_reason: 'outstanding_performance' },
        tags: ['mvp', 'heroics', 'leadership']
      }));
    }
    
    // End event
    event_ids.push(await this.publishBattleEnd(battleData));
    
    return event_ids;
  }

  // Event querying helpers
  async getRecentEvents(character_id: string, hours: number = 24): Promise<GameEvent[]> {
    return this.eventBus.getEventHistory(character_id, {
      time_range: hours <= 1 ? '1_hour' : hours <= 6 ? '6_hours' : '1_day',
      limit: 10
    });
  }

  async getRelationshipEvents(character_id: string, target_character_id: string): Promise<GameEvent[]> {
    const allEvents = this.eventBus.getEventHistory(character_id, { time_range: '2_weeks' });
    return allEvents.filter(event => 
      event.secondary_character_ids?.includes(target_character_id)
    );
  }

  // Additional alias methods for compatibility
  async publishTherapyEvent(data: TherapyEventData): Promise<string> {
    return this.publishTherapySession(data);
  }

  async publishTrainingEvent(data: TrainingEventData): Promise<string> {
    return this.publishTrainingSession(data);
  }

  async publishSocialEvent(data: SocialEventData): Promise<string> {
    return this.publishSocialInteraction(data);
  }
}

export default EventPublisher;