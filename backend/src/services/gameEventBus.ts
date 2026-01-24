// Centralized Event System for Blank Wars
// Handles all game events, character memory, and cross-system communication

import { query } from '../database/index';

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

  // Therapy Events
  | 'therapy_session_start' | 'therapy_breakthrough' | 'therapy_resistance'
  | 'conflict_revealed' | 'conflict_resolved' | 'emotional_revelation'
  | 'group_therapy_insight' | 'therapist_intervention' | 'therapy_turn_analyzed'

  // Training Events
  | 'training_session' | 'skill_improvement' | 'mental_exhaustion'
  | 'training_injury' | 'new_technique_learned' | 'training_milestone'
  | 'sparring_session' | 'meditation_session'

  // Equipment/Progression Events
  | 'equipment_equipped' | 'equipment_upgraded' | 'level_up'
  | 'stat_increase' | 'ability_learned' | 'achievement_earned'
  | 'equipment_advice_requested'
  | 'equipment:autonomous_rebellion' | 'equipment:reluctant_compliance'
  | 'loadout:reluctant_compliance' | 'loadout:power_rebellion' | 'loadout:spell_rebellion'
  | 'unlock:power_rebellion' | 'unlock:power_compliance'
  | 'unlock:spell_rebellion' | 'unlock:spell_compliance'

  // Chat/Communication Events
  | 'performance_coaching' | 'equipment_advice' | 'skill_consultation'
  | 'personal_training' | 'team_meeting' | 'casual_conversation'

  // Financial Events - NEW
  | 'earnings_received' | 'financial_decision_pending' | 'financial_decision_made'
  | 'coach_financial_advice' | 'financial_stress_increase' | 'financial_stress_decrease'
  | 'luxury_purchase' | 'investment_made' | 'investment_outcome'
  | 'financial_crisis' | 'debt_incurred' | 'financial_breakthrough'
  | 'spending_spree' | 'financial_trauma' | 'trust_gained' | 'trust_lost'
  | 'financial_goal_set' | 'financial_goal_achieved' | 'financial_milestone'
  // Financial Spiral Events - NEW
  | 'financial_spiral_started' | 'financial_spiral_deepening' | 'financial_spiral_broken'
  | 'financial_intervention_applied' | 'financial_conflict_created'
  // Battle Financial Events - NEW
  | 'financial_wildcard_triggered' | 'battle_financial_decision' | 'adrenaline_investment'
  | 'victory_splurge' | 'defeat_desperation' | 'panic_selling'
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
  | 'skills_advisor' | 'equipment_advisor' | 'power_loadout' | 'spell_loadout'
  | 'power_unlock' | 'spell_unlock';

export interface GameEvent {
  id: string;
  type: EventType;
  timestamp: Date;
  source: EventSource;
  userchar_ids: string[];  // All involved characters - first element is the "subject" by convention
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

  // Cross-reference data for comedy system (required - all memories have these properties)
  cross_reference_data: {
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
  private events_by_character: Map<string, string[]> = new Map();
  private events_by_type: Map<EventType, string[]> = new Map();
  private events_by_time_range: Map<string, string[]> = new Map();
  private event_handlers: Map<EventType, ((event: GameEvent) => void)[]> = new Map();
  private relationships: Map<string, CharacterRelationship> = new Map();
  private memories: Map<string, CharacterMemory> = new Map();
  private memories_by_character: Map<string, string[]> = new Map();

  private constructor() {
    // Initialize with some time-based event cleanup
    setInterval(() => this.cleanupOldEvents(), 60000); // Clean up every minute

    // Load existing memories from database on startup
    this.loadMemoriesFromDatabase().catch(error => {
      console.error('[GameEventBus] Failed to load memories from database on startup:', error);
    });
  }

  static get_instance(): GameEventBus {
    if (!GameEventBus.instance) {
      GameEventBus.instance = new GameEventBus();
    }
    return GameEventBus.instance;
  }

  // Load memories from database on startup
  private async loadMemoriesFromDatabase(): Promise<void> {
    try {
      console.log('[GameEventBus] Loading memories from database...');

      const memory_result = await query(
        `SELECT * FROM character_memories ORDER BY created_at DESC`
      );

      for (const row of memory_result.rows) {
        const memory: CharacterMemory = {
          id: row.id,
          character_id: row.character_id,
          event_id: row.event_id,
          memory_type: this.extractMemoryTypeFromContent(row.content),
          content: row.content,
          emotional_intensity: row.intensity,
          emotional_valence: (row.valence > 6 ? 'positive' : row.valence < 4 ? 'negative' : 'neutral') as 'positive' | 'negative' | 'neutral',
          importance: row.importance,
          created_at: new Date(row.created_at),
          last_recalled: new Date(row.last_recalled),
          recall_count: row.recall_count,
          associated_characters: row.associated_characters || [],
          tags: row.tags || [],
          decay_rate: parseFloat(row.decay_rate) || 1.0,
          chat_context: row.chat_context ? JSON.parse(row.chat_context) : undefined,
          cross_reference_data: row.cross_reference_data ? JSON.parse(row.cross_reference_data) : undefined,
          financial_metadata: row.financial_metadata ? JSON.parse(row.financial_metadata) : undefined,
          therapy_metadata: row.therapy_metadata ? JSON.parse(row.therapy_metadata) : undefined,
          confessional_metadata: row.confessional_metadata ? JSON.parse(row.confessional_metadata) : undefined
        };

        // Store in memory maps
        this.memories.set(memory.id, memory);

        if (!this.memories_by_character.has(memory.character_id)) {
          this.memories_by_character.set(memory.character_id, []);
        }
        this.memories_by_character.get(memory.character_id)!.push(memory.id);
      }

      console.log(`[GameEventBus] Loaded ${memory_result.rows.length} memories from database`);

    } catch (error) {
      console.error('[GameEventBus] Error loading memories from database:', error);
    }
  }

  // Helper method to extract memory type from content
  private extractMemoryTypeFromContent(content: string): 'battle' | 'social' | 'training' | 'achievement' | 'conflict' | 'bonding' | 'financial' | 'therapy' | 'confession' | 'real_estate' | 'personal_problems' | 'group_activity' | 'equipment' | 'skills' | 'strategy' | 'drama' | 'casual_social' {
    if (content.includes('financial') || content.includes('money') || content.includes('$')) {
      return 'financial';
    } else if (content.includes('therapy') || content.includes('emotion')) {
      return 'therapy';
    } else if (content.includes('battle') || content.includes('fight')) {
      return 'battle';
    } else if (content.includes('social') || content.includes('conflict')) {
      return 'social';
    } else if (content.includes('confession') || content.includes('secret')) {
      return 'confession';
    } else if (content.includes('training') || content.includes('skill')) {
      return 'training';
    }
    return 'casual_social';
  }

  // Event Publishing
  async publish(event: Omit<GameEvent, 'id' | 'timestamp'>): Promise<string> {
    // VALIDATION: Ensure userchar_ids are UUIDs, not canonical IDs
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (event.userchar_ids && Array.isArray(event.userchar_ids)) {
      for (const id of event.userchar_ids) {
        if (typeof id !== 'string' || !UUID_REGEX.test(id)) {
          console.error('[GameEventBus] ❌ INVALID userchar_id DETECTED in publish()');
          console.error('[GameEventBus] ❌ Bad ID:', id);
          console.error('[GameEventBus] ❌ All userchar_ids:', event.userchar_ids);
          console.error('[GameEventBus] ❌ Event type:', event.type);
          console.error('[GameEventBus] ❌ Event source:', event.source);
          console.error('[GameEventBus] ❌ Full event:', JSON.stringify(event, null, 2));
          throw new Error(`Invalid userchar_id format: "${id}" is not a UUID. Use user_characters.id (UUID), not character_id (canonical like "sun_wukong").`);
        }
      }
    }

    const game_event: GameEvent = {
      ...event,
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    // Store the event in memory
    this.events.set(game_event.id, game_event);

    // Store the event in database for persistence
    try {
      await query(
        `INSERT INTO game_events (
          id, type, source, userchar_ids,
          severity, category, description, metadata, tags, importance, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          game_event.id,
          game_event.type,
          game_event.source,
          game_event.userchar_ids,
          game_event.severity,
          game_event.category,
          game_event.description,
          JSON.stringify(game_event.metadata),
          game_event.tags || [],
          game_event.importance,
          game_event.timestamp
        ]
      );
      console.log(`[GameEventBus] Event ${game_event.id} saved to database`);
    } catch (error) {
      console.error(`[GameEventBus] Failed to save event ${game_event.id} to database:`, error);
      // Continue anyway - in-memory storage still works
    }

    // Index by all involved characters
    for (const char_id of game_event.userchar_ids) {
      if (!this.events_by_character.has(char_id)) {
        this.events_by_character.set(char_id, []);
      }
      this.events_by_character.get(char_id)!.push(game_event.id);
    }

    // Index by type
    if (!this.events_by_type.has(game_event.type)) {
      this.events_by_type.set(game_event.type, []);
    }
    this.events_by_type.get(game_event.type)!.push(game_event.id);

    // Index by time range
    const time_key = this.getTimeRangeKey(game_event.timestamp);
    if (!this.events_by_time_range.has(time_key)) {
      this.events_by_time_range.set(time_key, []);
    }
    this.events_by_time_range.get(time_key)!.push(game_event.id);

    // Create memories for involved characters
    await this.createMemoriesFromEvent(game_event);

    // Update relationships
    await this.updateRelationshipsFromEvent(game_event);

    // Notify event handlers
    const handlers = this.event_handlers.get(game_event.type) || [];
    handlers.forEach(handler => {
      try {
        handler(game_event);
      } catch (error) {
        console.error('Error in event handler:', error);
      }
    });

    console.log('📅 Event published:', game_event.type, game_event.description);
    return game_event.id;
  }

  // Event Subscription
  subscribe(event_type: EventType, handler: (event: GameEvent) => void): () => void {
    if (!this.event_handlers.has(event_type)) {
      this.event_handlers.set(event_type, []);
    }
    this.event_handlers.get(event_type)!.push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.event_handlers.get(event_type);
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
    const character_event_ids = this.events_by_character.get(character_id) || [];
    let events = character_event_ids.map(id => this.events.get(id)!).filter(Boolean);

    // Apply filters
    if (filter) {
      if (filter.time_range) {
        const cutoff = this.getTimeRangeCutoff(filter.time_range);
        events = events.filter(event => event.timestamp >= cutoff);
      }

      if (filter.categories) {
        events = events.filter(event => filter.categories!.includes(event.category));
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
    console.log('[GameEventBus] Creating memories for event:', {
      event_type: event.type,
      subject_char: event.userchar_ids[0],
      all_chars: event.userchar_ids
    });

    for (const character_id of event.userchar_ids) {
      const memory: CharacterMemory = {
        id: `memory_${event.id}_${character_id}`,
        character_id,
        event_id: event.id,
        memory_type: this.get_memoryType(event.type),
        content: this.generateMemoryContent(event, character_id),
        emotional_intensity: this.calculateEmotionalIntensity(event, character_id),
        emotional_valence: this.calculateEmotionalValence(event, character_id),
        importance: this.calculateImportance(event, character_id),
        created_at: new Date(),
        last_recalled: new Date(),
        recall_count: 0,
        associated_characters: event.userchar_ids.filter(id => id !== character_id),
        tags: event.tags,
        decay_rate: this.calculateDecayRate(event.type),
        cross_reference_data: {
          can_referenced_in: [],
          comedy_tags: [],
          embarrassment_level: 1,
          secret_level: 1,
          contradiction_potential: 1,
          quotability: 1,
          comedy_potential: 1
        }
      };

      // Store memory in memory
      this.memories.set(memory.id, memory);

      if (!this.memories_by_character.has(character_id)) {
        this.memories_by_character.set(character_id, []);
      }
      this.memories_by_character.get(character_id)!.push(memory.id);

      // Store memory in database for persistence
      try {
        await query(
          `INSERT INTO character_memories (
            id, character_id, event_id, content, emotion_type, intensity, valence, 
            importance, created_at, last_recalled, recall_count, associated_characters, 
            tags, decay_rate, chat_context, cross_reference_data, financial_metadata, 
            therapy_metadata, confessional_metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
          [
            memory.id,
            memory.character_id,
            memory.event_id,
            memory.content,
            'financial',  // emotion_type
            memory.emotional_intensity,  // intensity
            memory.emotional_valence === 'positive' ? 8 : memory.emotional_valence === 'negative' ? 2 : 5,  // valence
            memory.importance,
            memory.created_at,
            memory.last_recalled,
            memory.recall_count,
            memory.associated_characters,
            memory.tags,
            memory.decay_rate,
            memory.chat_context ? JSON.stringify(memory.chat_context) : null,
            memory.cross_reference_data ? JSON.stringify(memory.cross_reference_data) : null,
            memory.financial_metadata ? JSON.stringify(memory.financial_metadata) : null,
            memory.therapy_metadata ? JSON.stringify(memory.therapy_metadata) : null,
            memory.confessional_metadata ? JSON.stringify(memory.confessional_metadata) : null
          ]
        );
        console.log(`[GameEventBus] Memory ${memory.id} saved to database`);
      } catch (error) {
        console.error(`[GameEventBus] Failed to save memory ${memory.id} to database:`, error);
        // Continue anyway - in-memory storage still works
      }
    }
  }

  // Relationship Management
  private async updateRelationshipsFromEvent(event: GameEvent): Promise<void> {
    // Need at least 2 characters for a relationship
    if (event.userchar_ids.length < 2) {
      return;
    }

    // Get relationship effects from database (no hardcoded values)
    const effects = await this.getRelationshipEffects(event.type);

    // Update relationships between ALL pairs of characters (no hierarchy)
    // For characters [A, B, C], update: A↔B, A↔C, B↔C
    for (let i = 0; i < event.userchar_ids.length; i++) {
      for (let j = i + 1; j < event.userchar_ids.length; j++) {
        const char_a = event.userchar_ids[i];
        const char_b = event.userchar_ids[j];

        try {
          // Load or create relationship from database
          let relationship = await this.loadOrCreateRelationshipFromDB(char_a, char_b);

          // Apply changes from database-driven effects
          relationship.trust_level = this.applyRelationshipChange(relationship.trust_level, effects.trust);
          relationship.respect_level = this.applyRelationshipChange(relationship.respect_level, effects.respect);
          relationship.affection_level = this.applyRelationshipChange(relationship.affection_level, effects.affection);
          relationship.rivalry_intensity = Math.max(0, Math.min(100, relationship.rivalry_intensity + effects.rivalry));

          relationship.shared_experiences.push(event.id);
          relationship.last_interaction = event.timestamp;
          relationship.interaction_frequency++;

          // Track event type (database-driven, no string matching)
          if (effects.is_conflict) {
            relationship.conflicts.push(event.id);
          }

          if (effects.is_resolution) {
            relationship.resolutions.push(event.id);
          }

          // Update trajectory based on changes
          const overall_change = effects.trust + effects.respect;
          if (overall_change > 0) {
            relationship.relationship_trajectory = 'improving';
          } else if (overall_change < 0) {
            relationship.relationship_trajectory = 'declining';
          } else {
            relationship.relationship_trajectory = 'stable';
          }

          // Calculate progress score (how much they've grown from baseline)
          const base_disposition = await this.getBaseDisposition(char_a, char_b);
          const progress_score = relationship.trust_level - base_disposition;

          // Calculate relationship status
          const total_score = relationship.trust_level + relationship.affection_level;
          let relationship_status = 'neutral';
          if (total_score <= -80) relationship_status = 'mortal_enemies';
          else if (total_score <= -60) relationship_status = 'enemies';
          else if (total_score <= -40) relationship_status = 'rivals';
          else if (total_score <= -20) relationship_status = 'antagonistic';
          else if (total_score <= -1) relationship_status = 'tense';
          else if (total_score === 0) relationship_status = 'strangers';
          else if (total_score <= 20) relationship_status = 'acquaintances';
          else if (total_score <= 40) relationship_status = 'friendly';
          else if (total_score <= 60) relationship_status = 'friends';
          else if (total_score <= 80) relationship_status = 'close_friends';
          else relationship_status = 'best_friends';

          // Persist to database
          await this.persistRelationshipToDB(char_a, char_b, relationship, relationship_status, progress_score);

          // Also update in-memory cache
          const relationship_key = `${char_a}_${char_b}`;
          this.relationships.set(relationship_key, relationship);

          console.log(`[GameEventBus] Updated relationship ${char_a} ↔ ${char_b}: status=${relationship_status}, trust=${relationship.trust_level}`);

        } catch (error) {
          console.error(`[GameEventBus] Failed to update relationship ${char_a} ↔ ${char_b}:`, error);
          // Continue processing other relationships
        }
      }
    }
  }

  // Helper Methods
  private get_memoryType(event_type: EventType): CharacterMemory['memory_type'] {
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
    // All participants get the same memory - use "we" for multi-character events
    const pronoun = event.userchar_ids.length > 1 ? 'We' : 'I';
    return `${pronoun} ${(event.description || 'had an experience').toLowerCase()}`;
  }

  private calculateEmotionalIntensity(event: GameEvent, character_id: string): number {
    const severity_map = { low: 3, medium: 5, high: 7, critical: 10 };
    // All participants experience the same intensity
    return severity_map[event.severity];
  }

  private calculateEmotionalValence(event: GameEvent, character_id: string): 'positive' | 'negative' | 'neutral' {
    const positive_events = ['victory', 'success', 'breakthrough', 'resolved', 'alliance', 'achievement'];
    const negative_events = ['defeat', 'failure', 'conflict', 'argument', 'injury', 'exhaustion'];

    const event_string = event.type.toLowerCase();

    if (positive_events.some(word => event_string.includes(word))) return 'positive';
    if (negative_events.some(word => event_string.includes(word))) return 'negative';
    return 'neutral';
  }

  private calculateImportance(event: GameEvent, character_id: string): number {
    let importance = 5; // Base importance - same for all participants

    // Severity affects importance
    const severity_bonus = { low: 0, medium: 1, high: 2, critical: 3 };
    importance += severity_bonus[event.severity];

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

  private async getRelationshipEffects(event_type: string): Promise<{
    trust: number;
    respect: number;
    affection: number;
    rivalry: number;
    is_conflict: boolean;
    is_resolution: boolean;
  }> {
    const result = await query(
      'SELECT trust, respect, affection, rivalry, is_conflict, is_resolution FROM event_relationship_effects WHERE event_type = $1',
      [event_type]
    );

    if (result.rows.length === 0) {
      throw new Error(`[GameEventBus] No relationship effects defined in database for event type: ${event_type}`);
    }

    return result.rows[0];
  }

  // Load relationship from DB or create new one with species/archetype modifiers
  private async loadOrCreateRelationshipFromDB(
    character_id: string,
    target_character_id: string
  ): Promise<CharacterRelationship> {
    // VALIDATION: Ensure IDs are UUIDs, not canonical IDs
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(character_id)) {
      console.error('[GameEventBus] ❌ loadOrCreateRelationshipFromDB received non-UUID character_id:', character_id);
      throw new Error(`Invalid character_id in loadOrCreateRelationshipFromDB: "${character_id}" is not a UUID. This is a bug - the caller should pass user_characters.id (UUID), not character_id (canonical).`);
    }
    if (!UUID_REGEX.test(target_character_id)) {
      console.error('[GameEventBus] ❌ loadOrCreateRelationshipFromDB received non-UUID target_character_id:', target_character_id);
      throw new Error(`Invalid target_character_id in loadOrCreateRelationshipFromDB: "${target_character_id}" is not a UUID. This is a bug - the caller should pass user_characters.id (UUID), not character_id (canonical).`);
    }

    // Try to load existing relationship from database (using user_character UUIDs)
    const result = await query(
      `SELECT * FROM character_relationships WHERE user_character1_id = $1 AND user_character2_id = $2`,
      [character_id, target_character_id]
    );

    if (result.rows.length > 0) {
      const row = result.rows[0];

      // GOVERNANCE: No fallbacks - validate shared_experiences exists
      if (!row.hasOwnProperty('shared_experiences')) {
        throw new Error(`shared_experiences field missing in character_relationships for ${character_id} → ${target_character_id}`);
      }

      return {
        character_id,
        target_character_id,
        // GOVERNANCE: Validate all relationship fields exist
        trust_level: (() => {
          if (!row.hasOwnProperty('current_trust')) throw new Error(`current_trust missing for ${character_id} → ${target_character_id}`);
          return row.current_trust === null ? 0 : row.current_trust;
        })(),
        respect_level: (() => {
          if (!row.hasOwnProperty('current_respect')) throw new Error(`current_respect missing for ${character_id} → ${target_character_id}`);
          return row.current_respect === null ? 0 : row.current_respect;
        })(),
        affection_level: (() => {
          if (!row.hasOwnProperty('current_affection')) throw new Error(`current_affection missing for ${character_id} → ${target_character_id}`);
          return row.current_affection === null ? 0 : row.current_affection;
        })(),
        rivalry_intensity: (() => {
          if (!row.hasOwnProperty('current_rivalry')) throw new Error(`current_rivalry missing for ${character_id} → ${target_character_id}`);
          return row.current_rivalry === null ? 0 : row.current_rivalry;
        })(),
        shared_experiences: row.shared_experiences === null ? [] : row.shared_experiences,
        conflicts: [],
        resolutions: [],
        relationship_trajectory: (row.trajectory || 'stable') as 'improving' | 'declining' | 'stable',
        last_interaction: row.last_interaction || new Date(),
        interaction_frequency: row.shared_battles || 0
      };
    }

    // Relationship doesn't exist, create new one with species/archetype modifiers
    return await this.createNewRelationshipWithModifiers(character_id, target_character_id);
  }

  // Create new relationship with species/archetype modifiers from lookup tables
  private async createNewRelationshipWithModifiers(
    character_id: string,
    target_character_id: string
  ): Promise<CharacterRelationship> {
    // Get species and archetype for both characters (lookup via user_characters -> characters)
    const char1Result = await query(
      `SELECT c.species, c.archetype, uc.character_id as base_character_id
       FROM user_characters uc
       JOIN characters c ON uc.character_id = c.id
       WHERE uc.id = $1`,
      [character_id]
    );
    const char2Result = await query(
      `SELECT c.species, c.archetype, uc.character_id as base_character_id
       FROM user_characters uc
       JOIN characters c ON uc.character_id = c.id
       WHERE uc.id = $1`,
      [target_character_id]
    );

    if (char1Result.rows.length === 0) {
      throw new Error(`User character ${character_id} not found in database - cannot initialize relationship`);
    }
    if (char2Result.rows.length === 0) {
      throw new Error(`User character ${target_character_id} not found in database - cannot initialize relationship`);
    }

    const char1 = char1Result.rows[0];
    const char2 = char2Result.rows[0];

    if (!char1.species || !char2.species) {
      throw new Error(`Missing species data for characters ${character_id}/${target_character_id}`);
    }
    if (!char1.archetype || !char2.archetype) {
      throw new Error(`Missing archetype data for characters ${character_id}/${target_character_id}`);
    }

    // Query species relationship modifier
    const species_result = await query(
      `SELECT base_modifier, description FROM species_relationships
       WHERE species1 = $1 AND species2 = $2`,
      [char1.species, char2.species]
    );

    // GOVERNANCE: No fallbacks - fail loudly on missing data
    if (species_result.rows.length > 0 && species_result.rows[0].base_modifier === undefined) {
      throw new Error(`base_modifier missing for species relationship ${char1.species}/${char2.species}`);
    }
    const species_modifier = species_result.rows.length > 0 ? species_result.rows[0].base_modifier : 0;
    const species_description = species_result.rows.length > 0 ? species_result.rows[0].description : 'No species relationship defined';

    console.log(`[GameEventBus] Species modifier (${char1.species} → ${char2.species}): ${species_modifier} - ${species_description}`);

    // Query archetype relationship modifier
    const archetype_result = await query(
      `SELECT base_modifier, description FROM archetype_relationships
       WHERE archetype1 = $1 AND archetype2 = $2`,
      [char1.archetype, char2.archetype]
    );

    // GOVERNANCE: No fallbacks - fail loudly on missing data
    if (archetype_result.rows.length > 0 && archetype_result.rows[0].base_modifier === undefined) {
      throw new Error(`base_modifier missing for archetype relationship ${char1.archetype}/${char2.archetype}`);
    }
    const archetype_modifier = archetype_result.rows.length > 0 ? archetype_result.rows[0].base_modifier : 0;
    const archetype_description = archetype_result.rows.length > 0 ? archetype_result.rows[0].description : 'No archetype relationship defined';

    console.log(`[GameEventBus] Archetype modifier (${char1.archetype} → ${char2.archetype}): ${archetype_modifier} - ${archetype_description}`);

    // Calculate base disposition with slight random variance
    const random_variance = Math.floor(Math.random() * 11) - 5; // -5 to +5
    const base_disposition = species_modifier + archetype_modifier + random_variance;

    // Start current values at base disposition
    const relationship: CharacterRelationship = {
      character_id,
      target_character_id,
      trust_level: base_disposition,
      respect_level: Math.floor(base_disposition * 0.7),
      affection_level: Math.floor(base_disposition * 0.5),
      rivalry_intensity: base_disposition < -20 ? 20 : 0,
      shared_experiences: [],
      conflicts: [],
      resolutions: [],
      relationship_trajectory: 'stable',
      last_interaction: new Date(),
      interaction_frequency: 0
    };

    // Insert into database (with user_character UUIDs in new columns)
    await query(
      `INSERT INTO character_relationships (
        character1_id, character2_id, user_character1_id, user_character2_id,
        species_modifier, archetype_modifier,
        base_disposition, current_trust, current_respect, current_affection,
        current_rivalry, relationship_status, trajectory, progress_score,
        last_interaction, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())`,
      [
        char1.base_character_id,
        char2.base_character_id,
        character_id,
        target_character_id,
        species_modifier,
        archetype_modifier,
        base_disposition,
        relationship.trust_level,
        relationship.respect_level,
        relationship.affection_level,
        relationship.rivalry_intensity,
        'strangers',
        'stable',
        0,
        relationship.last_interaction
      ]
    );

    console.log(`[GameEventBus] Created new relationship ${character_id} → ${target_character_id} with base disposition: ${base_disposition} (species: ${species_modifier}, archetype: ${archetype_modifier}, random: ${random_variance})`);

    return relationship;
  }

  // Get base disposition for progress calculation
  private async getBaseDisposition(character_id: string, target_character_id: string): Promise<number> {
    const result = await query(
      `SELECT base_disposition FROM character_relationships
       WHERE character1_id = $1 AND character2_id = $2`,
      [character_id, target_character_id]
    );

    if (result.rows.length === 0) {
      throw new Error(`Relationship ${character_id} → ${target_character_id} not found when calculating progress`);
    }

    // GOVERNANCE: No fallbacks - fail loudly on missing data
    if (result.rows[0].base_disposition === undefined) {
      throw new Error(`base_disposition missing for relationship ${character_id} → ${target_character_id}`);
    }
    return result.rows[0].base_disposition;
  }

  // Persist relationship updates to database
  private async persistRelationshipToDB(
    character_id: string,
    target_character_id: string,
    relationship: CharacterRelationship,
    relationship_status: string,
    progress_score: number
  ): Promise<void> {
    const result = await query(
      `UPDATE character_relationships SET
        current_trust = $3,
        current_respect = $4,
        current_affection = $5,
        current_rivalry = $6,
        relationship_status = $7,
        trajectory = $8,
        progress_score = $9,
        shared_experiences = $10,
        last_interaction = $11,
        positive_interactions = positive_interactions + CASE WHEN $12 > 0 THEN 1 ELSE 0 END,
        negative_interactions = negative_interactions + CASE WHEN $12 < 0 THEN 1 ELSE 0 END,
        updated_at = NOW()
       WHERE character1_id = $1 AND character2_id = $2`,
      [
        character_id,
        target_character_id,
        relationship.trust_level,
        relationship.respect_level,
        relationship.affection_level,
        relationship.rivalry_intensity,
        relationship_status,
        relationship.relationship_trajectory,
        progress_score,
        relationship.shared_experiences,
        relationship.last_interaction,
        relationship.trust_level
      ]
    );

    if (result.row_count === 0) {
      throw new Error(`Failed to update relationship ${character_id} → ${target_character_id} - row not found`);
    }
  }

  private applyRelationshipChange(current_value: number, change: number): number {
    return Math.max(-100, Math.min(100, current_value + change));
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
    const two_weeks_ago = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    for (const event_id of Array.from(this.events.keys())) {
      const event = this.events.get(event_id);
      if (!event) continue;
      if (event.timestamp < two_weeks_ago && (event.importance || 5) < 7) {
        this.events.delete(event_id);

        // Clean up indexes for all involved characters
        for (const char_id of event.userchar_ids) {
          const character_event_ids = this.events_by_character.get(char_id);
          if (character_event_ids) {
            const index = character_event_ids.indexOf(event_id);
            if (index > -1) character_event_ids.splice(index, 1);
          }
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
    console.log('[GameEventBus] Getting memories for character_id:', character_id);
    const memory_ids = this.memories_by_character.get(character_id) || [];
    console.log('[GameEventBus] Found memory IDs:', memory_ids.length);
    let memories = memory_ids.map(id => this.memories.get(id)!).filter(Boolean);

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

  recallMemory(memory_id: string): CharacterMemory {
    const memory = this.memories.get(memory_id);
    if (!memory) {
      throw new Error(`Memory ${memory_id} not found`);
    }

    memory.recall_count += 1;
    memory.last_recalled = new Date();

    // Persist to database
    query(
      `UPDATE character_memories
       SET recall_count = $1, last_recalled = $2
       WHERE id = $3`,
      [memory.recall_count, memory.last_recalled, memory_id]
    );

    return memory;
  }

  getMemoryById(memory_id: string): CharacterMemory {
    const memory = this.memories.get(memory_id);
    if (!memory) {
      throw new Error(`Memory ${memory_id} not found`);
    }
    return memory;
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
    const event_ids = this.events_by_character.get(character_id) || [];
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
      userchar_ids: [character_id],
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
    const emotional_intensity = this.calculateFinancialEmotionalIntensity(event_type, metadata);
    const emotional_valence = this.calculateFinancialEmotionalValence(event_type, metadata);
    const decision_type = this.mapEventToDecisionType(event_type);

    const memory: CharacterMemory = {
      id: `financial_memory_${Date.now()}_${character_id}`,
      character_id,
      event_id,
      memory_type: 'financial',
      content: description,
      emotional_intensity,
      emotional_valence,
      importance,
      created_at: new Date(),
      last_recalled: new Date(),
      recall_count: 0,
      associated_characters: [],
      tags: ['financial', 'money', event_type],
      decay_rate: this.calculateFinancialMemoryDecayRate(importance, emotional_intensity),
      cross_reference_data: {
        can_referenced_in: [],
        comedy_tags: [],
        embarrassment_level: 1,
        secret_level: 1,
        contradiction_potential: 1,
        quotability: 1,
        comedy_potential: 1
      },
      financial_metadata: {
        decision_type,
        amount_involved: metadata.amount || 0,
        outcome: this.determineFinancialOutcome(event_type, metadata),
        stress_impact: metadata.stress_change || 0,
        trust_impact: metadata.trust_change || 0
      }
    };

    this.memories.set(memory.id, memory);

    // Add to character's memory list using existing system
    if (!this.memories_by_character.has(character_id)) {
      this.memories_by_character.set(character_id, []);
    }
    this.memories_by_character.get(character_id)!.push(memory.id);
  }

  /**
   * Determine if a financial event should create a memory
   */
  private shouldCreateFinancialMemory(event_type: EventType, severity: EventSeverity): boolean {
    const significant_events = [
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

    return significant_events.includes(event_type) || severity === 'high' || severity === 'critical';
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
    const high_importance_events = ['financial_crisis', 'financial_breakthrough', 'financial_spiral_started'];
    const medium_importance_events = ['luxury_purchase', 'investment_outcome', 'trust_gained', 'trust_lost'];

    if (high_importance_events.includes(event_type)) {
      importance += 3;
    } else if (medium_importance_events.includes(event_type)) {
      importance += 2;
    }

    // Adjust based on severity
    const severity_bonus = { low: 0, medium: 1, high: 2, critical: 3 };
    importance += severity_bonus[severity];

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
    const trust_change = Math.abs(metadata.trust_change || 0);

    if (stress_change > 20 || trust_change > 20) intensity += 2;
    else if (stress_change > 10 || trust_change > 10) intensity += 1;

    return Math.min(10, Math.max(1, intensity));
  }

  /**
   * Calculate emotional valence of financial memory
   */
  private calculateFinancialEmotionalValence(
    event_type: EventType,
    metadata: Record<string, any>
  ): 'positive' | 'negative' | 'neutral' {
    const positive_events = ['financial_breakthrough', 'trust_gained', 'financial_goal_achieved', 'investment_outcome'];
    const negative_events = ['financial_crisis', 'financial_spiral_started', 'trust_lost', 'defeat_desperation'];

    if (positive_events.includes(event_type)) return 'positive';
    if (negative_events.includes(event_type)) return 'negative';

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

    const success_events = ['financial_breakthrough', 'trust_gained', 'financial_goal_achieved'];
    const failure_events = ['financial_crisis', 'financial_spiral_started', 'trust_lost'];

    if (success_events.includes(event_type)) return 'success';
    if (failure_events.includes(event_type)) return 'failure';

    return 'pending';
  }

  /**
   * Calculate memory decay rate based on importance and emotional intensity
   */
  private calculateFinancialMemoryDecayRate(importance: number, emotional_intensity: number): number {
    // Higher importance and intensity = slower decay
    const base_decay = 0.1;
    const importance_reduction = (importance - 5) * 0.01;
    const intensity_reduction = (emotional_intensity - 5) * 0.01;

    return Math.max(0.01, base_decay - importance_reduction - intensity_reduction);
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
      { decision_type, amount, coach_advice, type: 'decision' },
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
      { old_stress, new_stress, change, reason, type: 'stress' },
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
      { old_trust, new_trust, change, reason, type: 'trust' },
      'medium'
    );
  }

  async publishFinancialCrisis(character_id: string, crisis_type: string, impact: number): Promise<string> {
    return this.publishFinancialEvent(
      'financial_crisis',
      character_id,
      `${character_id} experienced a ${crisis_type} causing $${impact.toLocaleString()} in losses`,
      { crisis_type, impact, type: 'crisis' },
      'high'
    );
  }
}

export default GameEventBus;
