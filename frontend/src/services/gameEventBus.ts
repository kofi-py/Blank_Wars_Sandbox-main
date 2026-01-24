// Centralized Event System for Blank Wars
// Handles all game events, character memory, and cross-system communication

export type EventType =
  // Battle Events
  | 'battle_start' | 'battle_end' | 'battle_victory' | 'battle_defeat'
  | 'critical_hit' | 'strategy_success' | 'strategy_failure'
  | 'team_coordination' | 'individual_heroics' | 'battle_chat_conflict'

  // Social/Living Events
  | 'kitchen_argument' | 'bathroom_conflict' | 'bedroom_dispute'
  | 'meal_sharing' | 'cleaning_conflict' | 'noise_complaint'
  | 'alliance_formed' | 'alliance_broken' | 'gossip_session'
  | 'late_night_conversation' | 'group_activity'
  // Master Bed Events - NEW
  | 'master_bed_assigned' | 'master_bed_challenged' | 'master_bed_jealousy'
  | 'master_bed_status_symbol' | 'master_bed_conflict' | 'master_bed_negotiation'

  // Therapy Events
  | 'therapy_session_start' | 'therapy_breakthrough' | 'therapy_resistance'
  | 'conflict_revealed' | 'conflict_resolved' | 'emotional_revelation'
  | 'group_therapy_insight' | 'therapist_intervention' | 'therapy_round_completed'

  // Training Events
  | 'training_session' | 'skill_improvement' | 'mental_exhaustion'
  | 'training_injury' | 'new_technique_learned' | 'training_milestone'
  | 'sparring_session' | 'meditation_session'

  // Equipment/Progression Events
  | 'equipment_equipped' | 'equipment_upgraded' | 'level_up'
  | 'stat_increase' | 'ability_learned' | 'achievement_earned'
  | 'equipment_advice_requested' | 'equipment:autonomous_decision'
  | 'power_unlocked' | 'spell_learned'

  // Chat/Communication Events
  | 'performance_coaching' | 'equipment_advice' | 'skill_consultation'
  | 'personal_training' | 'team_meeting' | 'casual_conversation'

  // Financial Events - NEW
  | 'earnings_received' | 'financial_decision_pending' | 'financial_decision_made'
  | 'coach_financial_advice' | 'financial_stress_increase' | 'financial_stress_decrease'
  | 'luxury_purchase' | 'luxury_purchase_made' | 'investment_made' | 'investment_outcome'
  | 'financial_crisis' | 'debt_incurred' | 'financial_breakthrough'
  | 'spending_spree' | 'financial_trauma' | 'trust_gained' | 'trust_lost'
  | 'financial_goal_set' | 'financial_goal_achieved' | 'financial_milestone'
  | 'financial_stress_change' | 'room_investment_made' | 'financial_windfall'
  // Financial Spiral Events - NEW
  | 'financial_spiral_started' | 'financial_spiral_deepening' | 'financial_spiral_broken'
  | 'financial_intervention_applied' | 'financial_conflict_created'
  | 'financial_room_mood_effect' | 'wealth_disparity_conflict_created'
  // Battle Financial Events - NEW
  | 'financial_wildcard_triggered' | 'battle_financial_decision' | 'adrenaline_investment'
  | 'victory_splurge' | 'defeat_desperation' | 'panic_selling'
  | 'battle_earnings_received' | 'coaching_bonus_received'
  // Judge Evaluation Events - NEW
  | 'judge_financial_evaluation' | 'judge_financial_outcome_assessment' | 'judge_intervention_recommendation'

  // Personal Problems Chat Events - NEW
  | 'personal_problem_shared' | 'advice_given' | 'problem_ignored'
  | 'support_requested' | 'emotional_support_given' | 'problem_resolved'
  | 'personal_crisis' | 'confidence_boost' | 'vulnerability_shown'
  | 'embarrassing_admission' | 'trust_betrayed' | 'secret_kept'

  // Therapy Chat Events - EXPANDED
  | 'therapy_homework_assigned' | 'therapy_relapse' | 'emotional_breakthrough'
  | 'past_trauma_revealed' | 'coping_mechanism_learned' | 'self_awareness_gained'
  | 'therapeutic_goal_set' | 'healing_milestone' | 'therapy_resistance_overcome'
  | 'family_issue_discussed' | 'relationship_pattern_identified' | 'behavioral_change'

  // Group Activities Events - NEW
  | 'team_building_activity' | 'group_exercise' | 'team_bonding'
  | 'group_conflict' | 'leadership_shown' | 'cooperation_displayed'
  | 'group_achievement' | 'team_failure' | 'social_dynamics_shift'
  | 'peer_pressure_situation' | 'group_decision_made' | 'team_chemistry_improved'

  // Training Activities Events - EXPANDED
  | 'training_session_start' | 'skill_practiced' | 'technique_mastered'
  | 'training_milestone' | 'endurance_test' | 'strength_gained'
  | 'training_injury' | 'comeback_attempt' | 'personal_record'
  | 'training_plateau' | 'motivation_lost' | 'training_breakthrough'
  | 'form_corrected' | 'partner_training' | 'solo_achievement'

  // Equipment Chat Events - EXPANDED
  | 'equipment_consultation' | 'gear_recommendation' | 'weapon_analysis'
  | 'armor_fitting' | 'equipment_maintenance' | 'gear_malfunction'
  | 'upgrade_planning' | 'equipment_comparison' | 'gear_envy'
  | 'specialized_equipment' | 'equipment_mastery' | 'gear_attachment'

  // Skills/Abilities Chat Events - EXPANDED
  | 'skill_consultation' | 'ability_planning' | 'talent_discovered'
  | 'skill_tree_navigation' | 'ability_synergy' | 'skill_disappointment'
  | 'learning_difficulty' | 'natural_aptitude' | 'skill_jealousy'
  | 'ability_unlock' | 'skill_mastery' | 'talent_wasted'
  | 'abilities_advice_requested' | 'ability:autonomous_decision'

  // Confessional Events - NEW
  | 'confession_made' | 'secret_revealed' | 'guilt_expressed'
  | 'shame_addressed' | 'forgiveness_sought' | 'burden_lifted'
  | 'dark_thought_shared' | 'redemption_attempt' | 'moral_struggle'
  | 'past_mistake_admitted' | 'hidden_desire_revealed' | 'fear_confessed'
  | 'regret_expressed' | 'inner_conflict_shared' | 'cathartic_moment'

  // Real Estate/Facilities Events - NEW
  | 'room_upgrade_requested' | 'living_complaint' | 'space_improvement'
  | 'roommate_assignment' | 'privacy_request' | 'comfort_enhancement'
  | 'facility_evaluation' | 'upgrade_approved' | 'renovation_completed'
  | 'housing_dissatisfaction' | 'luxury_desire' | 'practical_needs'
  | 'living_situation_analysis' | 'space_optimization' | 'comfort_priority'

  // Battle Strategy Events - NEW
  | 'strategy_discussed' | 'formation_planned' | 'weakness_analyzed'
  | 'counter_strategy' | 'tactical_adjustment' | 'leadership_decision'
  | 'strategy_success' | 'strategy_failure' | 'tactical_innovation'
  | 'team_coordination_planned' | 'battle_preparation' | 'strategic_disagreement'

  // Message Board Events - NEW
  | 'message_posted' | 'announcement_made' | 'community_update'
  | 'bulletin_shared' | 'team_news' | 'achievement_celebrated'
  | 'message_replied' | 'discussion_started' | 'information_shared'

  // AI Drama Board Events - NEW
  | 'drama_started' | 'gossip_shared' | 'rumor_spread'
  | 'scandal_revealed' | 'controversy_discussed' | 'drama_escalated'
  | 'alliance_politics' | 'betrayal_exposed' | 'drama_resolved'
  | 'juicy_revelation' | 'social_manipulation' | 'reputation_damaged'

  // Social Lounge Events - NEW
  | 'casual_conversation' | 'friendship_deepened' | 'romantic_tension'
  | 'social_gathering' | 'party_planned' | 'community_event'
  | 'small_talk' | 'personal_sharing' | 'social_bonding'
  | 'awkward_moment' | 'social_success' | 'interpersonal_conflict'

  // Clubhouse/Team Chat Events - NEW
  | 'team_meeting' | 'club_discussion' | 'group_planning'
  | 'team_announcement' | 'collective_decision' | 'group_celebration'
  | 'team_conflict' | 'unity_moment' | 'leadership_emergence'
  | 'team_identity_formation' | 'group_norm_established' | 'collective_achievement';

export type EventSeverity = 'low' | 'medium' | 'high' | 'critical';
export type EventCategory = 'battle' | 'social' | 'therapy' | 'training' | 'progression' | 'communication' | 'financial'
  | 'personal_problems' | 'group_activities' | 'equipment' | 'skills' | 'confessional'
  | 'real_estate' | 'strategy' | 'drama' | 'casual_social';

export type EventSource = 'battle_arena' | 'kitchen_table' | 'therapy_room' | 'training_grounds' | 'equipment_room'
  | 'chat_system' | 'financial_advisory' | 'bank' | 'marketplace' | 'confessional_booth'
  | 'real_estate_office' | 'strategy_room' | 'message_board' | 'drama_board' | 'ai_drama_board' | 'social_lounge'
  | 'clubhouse' | 'clubhouse_lounge' | 'personal_problems_chat' | 'group_activities_room' | 'skills_development_center'
  | 'clubhouse' | 'clubhouse_lounge' | 'personal_problems_chat' | 'group_activities_room' | 'skills_development_center'
  | 'skills_advisor' | 'equipment_advisor' | 'living_quarters' | 'abilities_advisor';

export interface GameEvent {
  id: string;
  type: EventType;
  timestamp: Date;
  source: EventSource;
  primary_character_id: string;
  secondary_character_ids?: string[];
  severity: EventSeverity;
  category: EventCategory;
  description: string;
  metadata: Record<string, any>;
  tags: string[];
  resolved?: boolean;
  resolution_timestamp?: Date;
  resolution_method?: string;
  emotional_impact?: {
    character_id: string;
    impact: 'positive' | 'negative' | 'neutral';
    intensity: number; // 1-10
  }[];
  importance?: number; // 1-10, for event cleanup purposes
}

export interface EventFilter {
  time_range?: '1_hour' | '6_hours' | '1_day' | '3_days' | '1_week' | '2_weeks';
  categories?: EventCategory[];
  event_types?: EventType[];
  severity?: EventSeverity[];
  character_ids?: string[];
  tags?: string[];
  resolved?: boolean;
  limit?: number;
}

export interface CharacterRelationship {
  character_id: string;
  target_character_id: string;
  trust_level: number; // -100 to +100
  respect_level: number; // -100 to +100
  affection_level: number; // -100 to +100
  rivalry_intensity: number; // 0 to 100
  shared_experiences: string[]; // event IDs
  conflicts: string[]; // event IDs
  resolutions: string[]; // event IDs
  relationship_trajectory: 'improving' | 'declining' | 'stable';
  last_interaction: Date;
  interaction_frequency: number;
}

export interface CharacterMemory {
  id: string;
  character_id: string;
  event_id: string;
  memory_type: 'battle' | 'social' | 'training' | 'achievement' | 'conflict' | 'bonding' | 'financial'
  | 'therapy' | 'confession' | 'real_estate' | 'personal_problems' | 'group_activity'
  | 'equipment' | 'skills' | 'strategy' | 'drama' | 'casual_social';
  content: string;
  emotional_intensity: number; // 1-10
  emotional_valence: 'positive' | 'negative' | 'neutral';
  importance: number; // 1-10 (affects retention and recall)
  created_at: Date;
  last_recalled: Date;
  recall_count: number;
  associated_characters: string[];
  tags: string[];
  decay_rate: number; // How quickly this memory fades

  // Chat context for cross-references
  chat_context?: {
    original_chat_type: string;
    conversation_topic: string;
    participant_count: number;
    comedy_potential: number; // 1-10 for cross-reference humor
    awkwardness_level: number; // 1-10 for embarrassing moments
  };

  // Cross-reference data for comedy system
  cross_reference_data?: {
    can_referenced_in: string[]; // Which chats can reference this memory
    comedy_tags: string[]; // For funny cross-references ('embarrassing', 'hypocritical', 'ironic')
    embarrassment_level: number; // 1-10
    secret_level: number; // 1-10 (how private this memory is)
    contradiction_potential: number; // 1-10 (for catching hypocrisy)
    quotability: number; // 1-10 (how memorable/quotable this moment was)
    comedy_potential: number; // 1-10 (overall comedy value for cross-references)
  };

  // Financial memory specific data
  financial_metadata?: {
    decision_type: 'investment' | 'purchase' | 'advice' | 'crisis' | 'spiral' | 'breakthrough';
    amount_involved: number;
    outcome: 'success' | 'failure' | 'pending';
    stress_impact: number;
    trust_impact: number;
  };

  // Therapy-specific metadata
  therapy_metadata?: {
    session_type: 'individual' | 'group';
    breakthrough_level: number; // 1-10
    resistance_shown: boolean;
    trauma_addressed: boolean;
    coping_mechanism_learned: string[];
    homework_assigned: string[];
  };

  // Confessional-specific metadata
  confessional_metadata?: {
    guilt_level: number; // 1-10
    shame_level: number; // 1-10
    redemption_sought: boolean;
    secret_revealed: boolean;
    forgiveness_requested: boolean;
    burden_lifted: boolean;
  };
}

export class GameEventBus {
  private static instance: GameEventBus;
  private events: Map<string, GameEvent> = new Map();
  private eventsByCharacter: Map<string, string[]> = new Map();
  private eventsByType: Map<EventType, string[]> = new Map();
  private eventsByTimeRange: Map<string, string[]> = new Map();
  private eventHandlers: Map<EventType, ((event: GameEvent) => void)[]> = new Map();
  private relationships: Map<string, CharacterRelationship> = new Map();
  private memories: Map<string, CharacterMemory> = new Map();
  private memoriesByCharacter: Map<string, string[]> = new Map();

  private constructor() {
    // Initialize with some time-based event cleanup
    setInterval(() => this.cleanupOldEvents(), 60000); // Clean up every minute
  }

  static getInstance(): GameEventBus {
    if (!GameEventBus.instance) {
      GameEventBus.instance = new GameEventBus();
    }
    return GameEventBus.instance;
  }

  // Event Publishing
  async publish(event: Omit<GameEvent, 'id' | 'timestamp'>): Promise<string> {
    const gameEvent: GameEvent = {
      ...event,
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    // Store the event
    this.events.set(gameEvent.id, gameEvent);

    // Index by character
    if (!this.eventsByCharacter.has(gameEvent.primary_character_id)) {
      this.eventsByCharacter.set(gameEvent.primary_character_id, []);
    }
    this.eventsByCharacter.get(gameEvent.primary_character_id)!.push(gameEvent.id);

    // Index secondary characters
    if (gameEvent.secondary_character_ids) {
      for (const charId of gameEvent.secondary_character_ids) {
        if (!this.eventsByCharacter.has(charId)) {
          this.eventsByCharacter.set(charId, []);
        }
        this.eventsByCharacter.get(charId)!.push(gameEvent.id);
      }
    }

    // Index by type
    if (!this.eventsByType.has(gameEvent.type)) {
      this.eventsByType.set(gameEvent.type, []);
    }
    this.eventsByType.get(gameEvent.type)!.push(gameEvent.id);

    // Index by time range
    const timeKey = this.getTimeRangeKey(gameEvent.timestamp);
    if (!this.eventsByTimeRange.has(timeKey)) {
      this.eventsByTimeRange.set(timeKey, []);
    }
    this.eventsByTimeRange.get(timeKey)!.push(gameEvent.id);

    // Create memories for involved characters
    await this.createMemoriesFromEvent(gameEvent);

    // Update relationships
    await this.updateRelationshipsFromEvent(gameEvent);

    // Notify event handlers
    const handlers = this.eventHandlers.get(gameEvent.type) || [];
    handlers.forEach(handler => {
      try {
        handler(gameEvent);
      } catch (error) {
        console.error('Error in event handler:', error);
      }
    });

    console.log('📅 Event published:', gameEvent.type, gameEvent.description);
    return gameEvent.id;
  }

  // Event Subscription
  subscribe(event_type: EventType, handler: (event: GameEvent) => void): () => void {
    if (!this.eventHandlers.has(event_type)) {
      this.eventHandlers.set(event_type, []);
    }
    this.eventHandlers.get(event_type)!.push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.eventHandlers.get(event_type);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  // Event Retrieval
  getEventHistory(character_id: string, filter?: EventFilter): GameEvent[] {
    const characterEventIds = this.eventsByCharacter.get(character_id) || [];
    let events = characterEventIds.map(id => this.events.get(id)!).filter(Boolean);

    // Apply filters
    if (filter) {
      if (filter.time_range) {
        const cutoff = this.getTimeRangeCutoff(filter.time_range);
        events = events.filter(event => event.timestamp >= cutoff);
      }

      if (filter.categories) {
        events = events.filter(event => filter.categories!.includes(event.category));
      }

      if (filter.event_types) {
        events = events.filter(event => filter.event_types!.includes(event.type));
      }

      if (filter.severity) {
        events = events.filter(event => filter.severity!.includes(event.severity));
      }

      if (filter.tags) {
        events = events.filter(event =>
          filter.tags!.some(tag => event.tags.includes(tag))
        );
      }

      if (filter.resolved !== undefined) {
        events = events.filter(event => event.resolved === filter.resolved);
      }

      if (filter.limit) {
        events = events.slice(-filter.limit);
      }
    }

    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Memory Management
  private async createMemoriesFromEvent(event: GameEvent): Promise<void> {
    const allCharacters = [event.primary_character_id, ...(event.secondary_character_ids || [])];

    for (const character_id of allCharacters) {
      const memory: CharacterMemory = {
        id: `memory_${event.id}_${character_id}`,
        character_id,
        event_id: event.id,
        memory_type: this.getMemoryType(event.type),
        content: this.generateMemoryContent(event, character_id),
        emotional_intensity: this.calculateEmotionalIntensity(event, character_id),
        emotional_valence: this.calculateEmotionalValence(event, character_id),
        importance: this.calculateImportance(event, character_id),
        created_at: new Date(),
        last_recalled: new Date(),
        recall_count: 0,
        associated_characters: allCharacters.filter(id => id !== character_id),
        tags: event.tags,
        decay_rate: this.calculateDecayRate(event.type)
      };

      this.memories.set(memory.id, memory);

      if (!this.memoriesByCharacter.has(character_id)) {
        this.memoriesByCharacter.set(character_id, []);
      }
      this.memoriesByCharacter.get(character_id)!.push(memory.id);
    }
  }

  // Relationship Management
  private async updateRelationshipsFromEvent(event: GameEvent): Promise<void> {
    if (!event.secondary_character_ids || event.secondary_character_ids.length === 0) {
      return;
    }

    const relationship_changes = this.calculateRelationshipChanges(event);

    for (const secondaryCharId of event.secondary_character_ids) {
      const relationshipKey = `${event.primary_character_id}_${secondaryCharId}`;
      let relationship = this.relationships.get(relationshipKey);

      if (!relationship) {
        relationship = this.createNewRelationship(event.primary_character_id, secondaryCharId);
      }

      // Apply changes
      relationship.trust_level = this.applyRelationshipChange(relationship.trust_level, relationship_changes.trust);
      relationship.respect_level = this.applyRelationshipChange(relationship.respect_level, relationship_changes.respect);
      relationship.affection_level = this.applyRelationshipChange(relationship.affection_level, relationship_changes.affection);
      relationship.rivalry_intensity = Math.max(0, Math.min(100, relationship.rivalry_intensity + (relationship_changes.rivalry || 0)));

      relationship.shared_experiences.push(event.id);
      relationship.last_interaction = event.timestamp;
      relationship.interaction_frequency++;

      if (event.type.includes('conflict') || event.type.includes('argument')) {
        relationship.conflicts.push(event.id);
      }

      if (event.type.includes('resolved') || event.type.includes('resolution')) {
        relationship.resolutions.push(event.id);
      }

      // Update trajectory
      const recentTrustChange = relationship_changes.trust || 0;
      const recentRespectChange = relationship_changes.respect || 0;
      const overallChange = recentTrustChange + recentRespectChange;

      if (overallChange > 0) {
        relationship.relationship_trajectory = 'improving';
      } else if (overallChange < 0) {
        relationship.relationship_trajectory = 'declining';
      } else {
        relationship.relationship_trajectory = 'stable';
      }

      this.relationships.set(relationshipKey, relationship);

      // Also create reverse relationship
      const reverseKey = `${secondaryCharId}_${event.primary_character_id}`;
      const reverseRelationship = { ...relationship };
      reverseRelationship.character_id = secondaryCharId;
      reverseRelationship.target_character_id = event.primary_character_id;
      this.relationships.set(reverseKey, reverseRelationship);
    }
  }

  // Helper Methods
  private getMemoryType(event_type: EventType): CharacterMemory['memory_type'] {
    // Financial events
    if (event_type.includes('financial') || event_type.includes('investment') || event_type.includes('purchase')) return 'financial';

    // Therapy events
    if (event_type.includes('therapy') || event_type.includes('therapeutic') || event_type.includes('healing')) return 'therapy';

    // Confessional events
    if (event_type.includes('confession') || event_type.includes('guilt') || event_type.includes('shame') ||
      event_type.includes('secret') || event_type.includes('redemption')) return 'confession';

    // Real estate events
    if (event_type.includes('room') || event_type.includes('living') || event_type.includes('space') ||
      event_type.includes('facility') || event_type.includes('upgrade') || event_type.includes('privacy')) return 'real_estate';

    // Personal problems events
    if (event_type.includes('personal_problem') || event_type.includes('support') || event_type.includes('crisis') ||
      event_type.includes('vulnerability') || event_type.includes('embarrassing')) return 'personal_problems';

    // Group activities events
    if (event_type.includes('group') || event_type.includes('team_building') || event_type.includes('cooperation') ||
      event_type.includes('leadership') || event_type.includes('collective')) return 'group_activity';

    // Equipment events
    if (event_type.includes('equipment') || event_type.includes('gear') || event_type.includes('weapon') ||
      event_type.includes('armor') || event_type.includes('maintenance')) return 'equipment';

    // Skills events
    if (event_type.includes('skill') || event_type.includes('ability') || event_type.includes('talent') ||
      event_type.includes('mastery') || event_type.includes('learning')) return 'skills';

    // Strategy events
    if (event_type.includes('strategy') || event_type.includes('formation') || event_type.includes('tactical') ||
      event_type.includes('planning') || event_type.includes('coordination')) return 'strategy';

    // Drama events
    if (event_type.includes('drama') || event_type.includes('gossip') || event_type.includes('rumor') ||
      event_type.includes('scandal') || event_type.includes('betrayal') || event_type.includes('manipulation')) return 'drama';

    // Casual social events
    if (event_type.includes('casual') || event_type.includes('small_talk') || event_type.includes('social_gathering') ||
      event_type.includes('party') || event_type.includes('community')) return 'casual_social';

    // Training events
    if (event_type.includes('training') || event_type.includes('exercise') || event_type.includes('endurance') ||
      event_type.includes('strength') || event_type.includes('technique')) return 'training';

    // Battle events
    if (event_type.includes('battle') || event_type.includes('combat') || event_type.includes('victory') || event_type.includes('defeat')) return 'battle';

    // Conflict events
    if (event_type.includes('conflict') || event_type.includes('argument') || event_type.includes('disagreement')) return 'conflict';

    // Achievement events
    if (event_type.includes('achievement') || event_type.includes('milestone') || event_type.includes('success') ||
      event_type.includes('breakthrough') || event_type.includes('level') || event_type.includes('unlock')) return 'achievement';

    // Bonding/social events
    if (event_type.includes('alliance') || event_type.includes('conversation') || event_type.includes('friendship') ||
      event_type.includes('bonding') || event_type.includes('romantic') || event_type.includes('message')) return 'bonding';

    // Default to social
    return 'social';
  }

  private generateMemoryContent(event: GameEvent, character_id: string): string {
    const isPrimary = event.primary_character_id === character_id;
    const pronoun = isPrimary ? 'I' : 'We';

    const description = event.description || event.type || 'participated in an event';
    return `${pronoun} ${description.toLowerCase()}`;
  }

  private calculateEmotionalIntensity(event: GameEvent, character_id: string): number {
    const severityMap = { low: 3, medium: 5, high: 7, critical: 10 };
    const baseIntensity = severityMap[event.severity];

    // Primary character experiences higher intensity
    return event.primary_character_id === character_id ? baseIntensity : Math.max(1, baseIntensity - 2);
  }

  private calculateEmotionalValence(event: GameEvent, character_id: string): 'positive' | 'negative' | 'neutral' {
    const positiveEvents = ['victory', 'success', 'breakthrough', 'resolved', 'alliance', 'achievement'];
    const negativeEvents = ['defeat', 'failure', 'conflict', 'argument', 'injury', 'exhaustion'];

    const eventString = event.type.toLowerCase();

    if (positiveEvents.some(word => eventString.includes(word))) return 'positive';
    if (negativeEvents.some(word => eventString.includes(word))) return 'negative';
    return 'neutral';
  }

  private calculateImportance(event: GameEvent, character_id: string): number {
    let importance = 5; // Base importance

    // Primary character finds it more important
    if (event.primary_character_id === character_id) importance += 2;

    // Severity affects importance
    const severityBonus = { low: 0, medium: 1, high: 2, critical: 3 };
    importance += severityBonus[event.severity];

    // Certain event types are more important
    if (event.type.includes('victory') || event.type.includes('defeat')) importance += 2;
    if (event.type.includes('breakthrough') || event.type.includes('resolved')) importance += 1;

    return Math.min(10, importance);
  }

  private calculateDecayRate(event_type: EventType): number {
    // Different event types decay at different rates
    if (event_type.includes('victory') || event_type.includes('defeat')) return 0.1; // Long-lasting
    if (event_type.includes('breakthrough') || event_type.includes('resolved')) return 0.2;
    if (event_type.includes('conflict') || event_type.includes('argument')) return 0.3;
    return 0.5; // Default decay rate
  }

  private calculateRelationshipChanges(event: GameEvent): {
    trust?: number;
    respect?: number;
    affection?: number;
    rivalry?: number;
  } {
    const changeMap: Record<string, any> = {
      'battle_victory': { trust: 3, respect: 2 },
      'battle_defeat': { trust: -1, respect: -1 },
      'kitchen_argument': { trust: -5, respect: -3, affection: -2, rivalry: 2 },
      'therapy_breakthrough': { trust: 2, respect: 1 },
      'sparring_session': { respect: 4, trust: 1 },
      'meal_sharing': { affection: 1, trust: 1 },
      'late_night_conversation': { trust: 3, affection: 2 },
      'alliance_formed': { trust: 5, respect: 3, affection: 2 },
      'conflict_resolved': { trust: 4, respect: 2, rivalry: -3 },
      'group_activity': { affection: 2, trust: 1 },
      // Financial Events - Impact on relationships
      'coach_financial_advice': { trust: 2, respect: 1 },
      'trust_gained': { trust: 5, respect: 2 },
      'trust_lost': { trust: -8, respect: -3 },
      'financial_breakthrough': { trust: 4, respect: 3, affection: 2 },
      'financial_crisis': { trust: -3, respect: -2, rivalry: 1 },
      'financial_stress_increase': { trust: -2, affection: -1 },
      'financial_stress_decrease': { trust: 1, affection: 1 },
      // Financial Spiral Events - Impact on relationships
      'financial_spiral_started': { trust: -5, respect: -3, affection: -3 },
      'financial_spiral_deepening': { trust: -3, respect: -2, affection: -2, rivalry: 2 },
      'financial_spiral_broken': { trust: 6, respect: 4, affection: 3 },
      'financial_intervention_applied': { trust: 3, respect: 2, affection: 1 },
      // Battle Financial Events - Impact on relationships
      'financial_wildcard_triggered': { trust: -2, respect: -1, affection: -1 },
      'battle_financial_decision': { trust: 1, respect: 1 },
      'adrenaline_investment': { trust: -3, respect: 2, rivalry: 1 },
      'victory_splurge': { trust: -1, respect: -2, affection: 3 },
      'defeat_desperation': { trust: -4, respect: -3, affection: -2 },
      'panic_selling': { trust: -2, respect: -2, affection: -1 }
    };

    return changeMap[event.type] || { trust: 0, respect: 0 };
  }

  private createNewRelationship(character_id: string, target_character_id: string): CharacterRelationship {
    return {
      character_id,
      target_character_id,
      trust_level: 0,
      respect_level: 0,
      affection_level: 0,
      rivalry_intensity: 0,
      shared_experiences: [],
      conflicts: [],
      resolutions: [],
      relationship_trajectory: 'stable',
      last_interaction: new Date(),
      interaction_frequency: 0
    };
  }

  private applyRelationshipChange(currentValue: number, change: number): number {
    return Math.max(-100, Math.min(100, currentValue + change));
  }

  private getTimeRangeKey(timestamp: Date): string {
    return timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  private getTimeRangeCutoff(time_range: string): Date {
    const now = new Date();
    const cutoffs = {
      '1_hour': 60 * 60 * 1000,
      '6_hours': 6 * 60 * 60 * 1000,
      '1_day': 24 * 60 * 60 * 1000,
      '3_days': 3 * 24 * 60 * 60 * 1000,
      '1_week': 7 * 24 * 60 * 60 * 1000,
      '2_weeks': 14 * 24 * 60 * 60 * 1000
    };

    return new Date(now.getTime() - cutoffs[time_range as keyof typeof cutoffs]);
  }

  private cleanupOldEvents(): void {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    for (const event_id of Array.from(this.events.keys())) {
      const event = this.events.get(event_id);
      if (!event) continue;
      if (event.timestamp < twoWeeksAgo && (event.importance || 5) < 7) {
        this.events.delete(event_id);

        // Clean up indexes
        const characterEventIds = this.eventsByCharacter.get(event.primary_character_id);
        if (characterEventIds) {
          const index = characterEventIds.indexOf(event_id);
          if (index > -1) characterEventIds.splice(index, 1);
        }
      }
    }
  }

  // Public API Methods
  getRelationship(character_id: string, target_character_id: string): CharacterRelationship | null {
    return this.relationships.get(`${character_id}_${target_character_id}`) || null;
  }

  getCharacterMemories(character_id: string, filter?: {
    memory_type?: CharacterMemory['memory_type'];
    importance?: number;
    limit?: number;
  }): CharacterMemory[] {
    const memoryIds = this.memoriesByCharacter.get(character_id) || [];
    let memories = memoryIds.map(id => this.memories.get(id)!).filter(Boolean);

    if (filter) {
      if (filter.memory_type) {
        memories = memories.filter(memory => memory.memory_type === filter.memory_type);
      }
      if (filter.importance) {
        memories = memories.filter(memory => memory.importance >= filter.importance!);
      }
      if (filter.limit) {
        memories = memories.slice(-filter.limit);
      }
    }

    return memories.sort((a, b) => b.importance - a.importance);
  }

  getRelationshipSummary(character_id: string): Map<string, CharacterRelationship> {
    const relationships = new Map<string, CharacterRelationship>();

    for (const relationship of Array.from(this.relationships.values())) {
      if (relationship.character_id === character_id) {
        relationships.set(relationship.target_character_id, relationship);
      }
    }

    return relationships;
  }

  getEvent(event_id: string): GameEvent | undefined {
    return this.events.get(event_id);
  }

  getCharacterEvents(character_id: string, filters?: EventFilter): GameEvent[] {
    const event_ids = this.eventsByCharacter.get(character_id) || [];
    const events = event_ids
      .map(id => this.events.get(id))
      .filter((event): event is GameEvent => event !== undefined);

    if (!filters) return events;

    return this.filterEvents(events, filters);
  }

  private filterEvents(events: GameEvent[], filters: EventFilter): GameEvent[] {
    let filtered = events;

    if (filters.time_range) {
      const cutoff = this.getTimeRangeCutoff(filters.time_range);
      filtered = filtered.filter(event => event.timestamp > cutoff);
    }

    if (filters.categories) {
      filtered = filtered.filter(event => filters.categories!.includes(event.category));
    }

    if (filters.severity) {
      filtered = filtered.filter(event => filters.severity!.includes(event.severity));
    }

    if (filters.tags) {
      filtered = filtered.filter(event =>
        filters.tags!.some(tag => event.tags.includes(tag))
      );
    }

    if (filters.limit) {
      filtered = filtered.slice(-filters.limit);
    }

    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Financial Event Helper Methods - NEW
  async publishFinancialEvent(
    type: EventType,
    character_id: string,
    description: string,
    metadata: Record<string, any> = {},
    severity: EventSeverity = 'medium'
  ): Promise<string> {
    const event_id = await this.publish({
      type,
      source: 'financial_advisory',
      primary_character_id: character_id,
      severity,
      category: 'financial',
      description,
      metadata,
      tags: ['financial', 'money'],
      resolved: false
    });

    // Create financial memory for significant events
    if (this.shouldCreateFinancialMemory(type, severity)) {
      this.addFinancialMemory(event_id, character_id, type, description, metadata, severity);
    }

    return event_id;
  }

  /**
   * Add a financial memory to the existing memory system
   */
  public addFinancialMemory(
    event_id: string,
    character_id: string,
    event_type: EventType,
    description: string,
    metadata: Record<string, any>,
    severity: EventSeverity
  ): void {
    const importance = this.calculateFinancialMemoryImportance(event_type, severity, metadata);
    const emotionalIntensity = this.calculateFinancialEmotionalIntensity(event_type, metadata);
    const emotionalValence = this.calculateFinancialEmotionalValence(event_type, metadata);
    const decision_type = this.mapEventToDecisionType(event_type);

    const memory: CharacterMemory = {
      id: `financial_memory_${Date.now()}_${character_id}`,
      character_id,
      event_id,
      memory_type: 'financial',
      content: description,
      emotional_intensity: emotionalIntensity,
      emotional_valence: emotionalValence,
      importance,
      created_at: new Date(),
      last_recalled: new Date(),
      recall_count: 0,
      associated_characters: [],
      tags: ['financial', 'money', event_type],
      decay_rate: this.calculateFinancialMemoryDecayRate(importance, emotionalIntensity),
      financial_metadata: {
        decision_type,
        amount_involved: metadata.amount || 0,
        outcome: this.determineFinancialOutcome(event_type, metadata),
        stress_impact: metadata.stress_change || 0,
        trust_impact: metadata.trustChange || 0
      }
    };

    this.memories.set(memory.id, memory);

    // Add to character's memory list using existing system
    if (!this.memoriesByCharacter.has(character_id)) {
      this.memoriesByCharacter.set(character_id, []);
    }
    this.memoriesByCharacter.get(character_id)!.push(memory.id);
  }

  /**
   * Determine if a financial event should create a memory
   */
  private shouldCreateFinancialMemory(event_type: EventType, severity: EventSeverity): boolean {
    const significantEvents = [
      'financial_decision_made',
      'financial_crisis',
      'financial_breakthrough',
      'financial_spiral_started',
      'financial_spiral_broken',
      'luxury_purchase',
      'investment_outcome',
      'trust_gained',
      'trust_lost',
      'victory_splurge',
      'defeat_desperation'
    ];

    return significantEvents.includes(event_type) || severity === 'high' || severity === 'critical';
  }

  /**
   * Calculate importance of financial memory (1-10)
   */
  private calculateFinancialMemoryImportance(
    event_type: EventType,
    severity: EventSeverity,
    metadata: Record<string, any>
  ): number {
    let importance = 5; // Base importance

    // Adjust based on event type
    const highImportanceEvents = ['financial_crisis', 'financial_breakthrough', 'financial_spiral_started'];
    const mediumImportanceEvents = ['luxury_purchase', 'investment_outcome', 'trust_gained', 'trust_lost'];

    if (highImportanceEvents.includes(event_type)) {
      importance += 3;
    } else if (mediumImportanceEvents.includes(event_type)) {
      importance += 2;
    }

    // Adjust based on severity
    const severityBonus = { low: 0, medium: 1, high: 2, critical: 3 };
    importance += severityBonus[severity];

    // Adjust based on amount involved
    const amount = metadata.amount || 0;
    if (amount > 10000) importance += 2;
    else if (amount > 5000) importance += 1;

    return Math.min(10, Math.max(1, importance));
  }

  /**
   * Calculate emotional intensity of financial memory (1-10)
   */
  private calculateFinancialEmotionalIntensity(event_type: EventType, metadata: Record<string, any>): number {
    let intensity = 5;

    // High intensity events
    if (['financial_crisis', 'financial_breakthrough', 'financial_spiral_started'].includes(event_type)) {
      intensity = 8;
    }
    // Medium intensity events
    else if (['luxury_purchase', 'victory_splurge', 'defeat_desperation'].includes(event_type)) {
      intensity = 6;
    }

    // Adjust based on stress/trust changes
    const stress_change = Math.abs(metadata.stress_change || 0);
    const trustChange = Math.abs(metadata.trustChange || 0);

    if (stress_change > 20 || trustChange > 20) intensity += 2;
    else if (stress_change > 10 || trustChange > 10) intensity += 1;

    return Math.min(10, Math.max(1, intensity));
  }

  /**
   * Calculate emotional valence of financial memory
   */
  private calculateFinancialEmotionalValence(
    event_type: EventType,
    metadata: Record<string, any>
  ): 'positive' | 'negative' | 'neutral' {
    const positiveEvents = ['financial_breakthrough', 'trust_gained', 'financial_goal_achieved', 'investment_outcome'];
    const negativeEvents = ['financial_crisis', 'financial_spiral_started', 'trust_lost', 'defeat_desperation'];

    if (positiveEvents.includes(event_type)) return 'positive';
    if (negativeEvents.includes(event_type)) return 'negative';

    // Check outcome in metadata
    if (metadata.outcome === 'success') return 'positive';
    if (metadata.outcome === 'failure') return 'negative';

    // Check stress change
    const stress_change = metadata.stress_change || 0;
    if (stress_change > 0) return 'negative';
    if (stress_change < 0) return 'positive';

    return 'neutral';
  }

  /**
   * Map event type to decision type
   */
  private mapEventToDecisionType(event_type: EventType): 'investment' | 'purchase' | 'advice' | 'crisis' | 'spiral' | 'breakthrough' {
    if (event_type.includes('investment')) return 'investment';
    if (event_type.includes('purchase') || event_type.includes('splurge')) return 'purchase';
    if (event_type.includes('advice') || event_type.includes('trust')) return 'advice';
    if (event_type.includes('crisis')) return 'crisis';
    if (event_type.includes('spiral')) return 'spiral';
    if (event_type.includes('breakthrough')) return 'breakthrough';
    return 'advice'; // Default
  }

  /**
   * Determine financial outcome
   */
  private determineFinancialOutcome(event_type: EventType, metadata: Record<string, any>): 'success' | 'failure' | 'pending' {
    if (metadata.outcome) return metadata.outcome;

    const successEvents = ['financial_breakthrough', 'trust_gained', 'financial_goal_achieved'];
    const failureEvents = ['financial_crisis', 'financial_spiral_started', 'trust_lost'];

    if (successEvents.includes(event_type)) return 'success';
    if (failureEvents.includes(event_type)) return 'failure';

    return 'pending';
  }

  /**
   * Calculate memory decay rate based on importance and emotional intensity
   */
  private calculateFinancialMemoryDecayRate(importance: number, emotional_intensity: number): number {
    // Higher importance and intensity = slower decay
    const baseDecay = 0.1;
    const importanceReduction = (importance - 5) * 0.01;
    const intensityReduction = (emotional_intensity - 5) * 0.01;

    return Math.max(0.01, baseDecay - importanceReduction - intensityReduction);
  }

  async publishEarningsEvent(character_id: string, amount: number, source: string): Promise<string> {
    return this.publishFinancialEvent(
      'earnings_received',
      character_id,
      `${character_id} earned $${amount.toLocaleString()} from ${source}`,
      { amount, source, type: 'earnings' },
      'low'
    );
  }

  async publishFinancialDecision(
    character_id: string,
    decision_type: string,
    amount: number,
    coach_advice?: string
  ): Promise<string> {
    return this.publishFinancialEvent(
      'financial_decision_pending',
      character_id,
      `${character_id} is considering a ${decision_type} decision involving $${amount.toLocaleString()}`,
      { decision_type, amount, coach_advice: coach_advice, type: 'decision' },
      'medium'
    );
  }

  async publishFinancialStressChange(
    character_id: string,
    old_stress: number,
    new_stress: number,
    reason: string
  ): Promise<string> {
    const event_type = new_stress > old_stress ? 'financial_stress_increase' : 'financial_stress_decrease';
    const change = Math.abs(new_stress - old_stress);
    const severity: EventSeverity = change > 20 ? 'high' : change > 10 ? 'medium' : 'low';

    return this.publishFinancialEvent(
      event_type,
      character_id,
      `${character_id}'s financial stress ${new_stress > old_stress ? 'increased' : 'decreased'} by ${change}% due to ${reason}`,
      { old_stress: old_stress, new_stress: new_stress, change, reason, type: 'stress' },
      severity
    );
  }

  async publishTrustChange(
    character_id: string,
    old_trust: number,
    new_trust: number,
    reason: string
  ): Promise<string> {
    const event_type = new_trust > old_trust ? 'trust_gained' : 'trust_lost';
    const change = Math.abs(new_trust - old_trust);

    return this.publishFinancialEvent(
      event_type,
      character_id,
      `${character_id}'s trust in coach financial advice ${new_trust > old_trust ? 'increased' : 'decreased'} by ${change}% due to ${reason}`,
      { old_trust: old_trust, new_trust: new_trust, change, reason, type: 'trust' },
      'medium'
    );
  }

  async publishFinancialCrisis(character_id: string, crisis_type: string, impact: number): Promise<string> {
    return this.publishFinancialEvent(
      'financial_crisis',
      character_id,
      `${character_id} experienced a ${crisis_type} causing $${impact.toLocaleString()} in losses`,
      { crisis_type: crisis_type, impact, type: 'crisis' },
      'high'
    );
  }
}

export default GameEventBus;
