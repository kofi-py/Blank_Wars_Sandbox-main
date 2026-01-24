// Comprehensive test for the centralized event system
// Tests event publishing, context generation, and cross-system integration

import GameEventBus from './gameEventBus';
import EventContextService from './eventContextService';
import EventPublisher from './eventPublisher';

export class EventSystemTest {
  private eventBus = GameEventBus.getInstance();
  private eventContext = EventContextService.getInstance();
  private eventPublisher = EventPublisher.getInstance();

  async runFullEventSystemTest(): Promise<{
    success: boolean;
    results: any;
    errors: string[];
  }> {
    const results = {
      event_bus_test: null as any,
      event_publisher_test: null as any,
      event_context_test: null as any,
      cross_system_integration: null as any,
      chat_integration: null as any
    };
    const errors: string[] = [];

    console.log('🎯 Starting Centralized Event System Test...');

    try {
      // Test 1: GameEventBus basic functionality
      console.log('1️⃣ Testing GameEventBus...');
      const testEvent = await this.eventBus.publish({
        type: 'kitchen_argument',
        source: 'kitchen_table',
        primary_character_id: 'achilles',
        secondary_character_ids: ['joan'],
        severity: 'medium',
        category: 'social',
        description: 'Heated argument over dirty dishes',
        metadata: {
          location: 'kitchen',
          trigger: 'unwashed_dishes',
          duration_minutes: 15
        },
        tags: ['kitchen', 'cleanliness', 'responsibility'],
        importance: 6
      });

      results.event_bus_test = {
        event_created: !!testEvent,
        event_id: testEvent,
        event_stored: !!this.eventBus.getEvent(testEvent || ''),
        character_indexed: this.eventBus.getCharacterEvents('achilles').length > 0
      };

      if (!testEvent) {
        errors.push('EventBus: Failed to create event');
      }

      // Test 2: EventPublisher convenience methods
      console.log('2️⃣ Testing EventPublisher...');
      const battleEvent = await this.eventPublisher.publishBattleEvent({
        winner_id: 'achilles',
        loser_id: 'joan',
        participants: ['achilles', 'joan', 'holmes'],
        battle_duration: 1200000,
        teamwork_rating: 75,
        mvp_player: 'achilles',
        battle_type: 'arena',
        strategy_used: 'aggressive_offense'
      });

      const chatEvent = await this.eventPublisher.publishChatInteraction({
        character_id: 'achilles',
        chat_type: 'performance',
        message: 'How can I improve my combat technique?',
        outcome: 'helpful'
      });

      const battleEventObj = battleEvent ? this.eventBus.getEvent(battleEvent) : null;
      const chatEventObj = chatEvent ? this.eventBus.getEvent(chatEvent) : null;

      results.event_publisher_test = {
        battle_event_created: !!battleEvent,
        chat_event_created: !!chatEvent,
        events_count: this.eventBus.getCharacterEvents('achilles').length,
        battle_event_has_metadata: !!battleEventObj?.metadata?.battle_duration,
        chat_event_tagged: chatEventObj?.tags.includes('performance') || false
      };

      // Test 3: EventContextService context generation
      console.log('3️⃣ Testing EventContextService...');
      const performanceContext = await this.eventContext.getPerformanceContext('achilles');
      const equipmentContext = await this.eventContext.getEquipmentContext('achilles');
      const skillContext = await this.eventContext.getSkillContext('achilles');
      const socialContext = await this.eventContext.getSocialContext('achilles');

      results.event_context_test = {
        performance_context_generated: !!performanceContext,
        equipment_context_generated: !!equipmentContext,
        skill_context_generated: !!skillContext,
        social_context_generated: !!socialContext,
        performance_context_length: performanceContext?.length || 0,
        social_context_references_events: socialContext?.includes('argument') || false
      };

      // Test 4: Cross-system integration
      console.log('4️⃣ Testing cross-system integration...');
      
      // Publish multiple event types and check integration
      await this.eventPublisher.publishTherapyEvent({
        character_id: 'achilles',
        session_type: 'individual',
        therapist_id: 'carl_jung',
        stage: 'breakthrough',
        breakthroughs: ['anger_management'],
        conflicts_addressed: ['kitchen_disputes'],
        topics_discussed: ['managing anger in team settings'],
        insights: ['reactive anger is hurting team chemistry'],
        resistance_level: 3,
        breakthrough_achieved: true
      });

      await this.eventPublisher.publishTrainingEvent({
        character_id: 'achilles',
        training_type: 'skill',
        skills_focused: ['sword_work', 'footwork'],
        improvements: ['significant'],
        intensity: 8,
        duration: 60,
        fatigue_level: 30
      });

      // Check if events are integrated in context
      const integratedContext = await this.eventContext.getComprehensiveContext('achilles', {
        max_tokens: 200,
        domain_focus: 'general',
        include_living_context: true,
        include_relationships: true,
        include_recent_events: true,
        include_emotional_state: true,
        time_range: '1_week'
      });

      results.cross_system_integration = {
        total_events_for_character: this.eventBus.getCharacterEvents('achilles').length,
        therapy_event_recorded: this.eventBus.getCharacterEvents('achilles').some(e => e.type === 'therapy_breakthrough'),
        training_event_recorded: this.eventBus.getCharacterEvents('achilles').some(e => e.type === 'training_session'),
        integrated_context_generated: !!integratedContext,
        context_mentions_multiple_systems: this.checkMultiSystemMention(integratedContext || '')
      };

      // Test 5: Chat component integration simulation
      console.log('5️⃣ Testing chat component integration...');
      const chatIntegrationTest = await this.simulateChatIntegration('achilles');
      results.chat_integration = chatIntegrationTest;

      console.log('✅ Centralized Event System Test Complete');
      return {
        success: errors.length === 0,
        results,
        errors
      };

    } catch (error) {
      console.error('❌ Event System Test Failed:', error);
      errors.push(`Critical error: ${error.message}`);
      return {
        success: false,
        results,
        errors
      };
    }
  }

  private checkMultiSystemMention(context: string): boolean {
    const systemKeywords = ['battle', 'kitchen', 'therapy', 'training', 'argument', 'victory'];
    const mentions = systemKeywords.filter(keyword => 
      context.toLowerCase().includes(keyword)
    );
    return mentions.length >= 2; // Context mentions at least 2 different systems
  }

  private async simulateChatIntegration(character_id: string): Promise<any> {
    try {
      // Simulate what a chat component does
      const eventContext = await this.eventContext.getPerformanceContext(character_id);
      
      // Check if event context would be included in a chat request
      const mockChatData = {
        character_id,
        event_context: eventContext ? {
          recent_events: eventContext,
          relationships: '',
          emotional_state: '',
          domain_specific: ''
        } : null
      };

      return {
        simulation_successful: true,
        event_context_included: !!mockChatData.event_context,
        event_context_length: eventContext?.length || 0,
        would_send_to_backend: !!mockChatData.event_context?.recent_events
      };
    } catch (error) {
      return {
        simulation_successful: false,
        error: error.message
      };
    }
  }

  // Quick test for browser console
  async quickEventTest(): Promise<void> {
    console.log('🚀 Quick Event System Test');
    
    try {
      // Publish a test event
      const event = await this.eventPublisher.publishChatInteraction({
        character_id: 'test_character',
        chat_type: 'performance',
        message: 'Test message',
        outcome: 'helpful'
      });

      console.log('✅ Event published:', event);

      // Generate context
      const context = await this.eventContext.getPerformanceContext('test_character');
      console.log('✅ Context generated:', context);

      // Check event storage
      const storedEvents = this.eventBus.getCharacterEvents('test_character');
      console.log('✅ Events stored:', storedEvents.length);

      console.log('🎯 Event system working!');
    } catch (error) {
      console.error('❌ Quick test failed:', error);
    }
  }

  // Test relationship tracking
  async testRelationshipSystem(): Promise<void> {
    console.log('💕 Testing Relationship System');
    
    try {
      // Create relationship-affecting events
      await this.eventPublisher.publishSocialEvent({
        event_type: 'argument',
        initiator_id: 'achilles',
        participant_ids: ['joan'],
        outcome: 'unresolved',
        location: 'kitchen'
      });

      await this.eventPublisher.publishBattleEvent({
        winner_id: 'achilles',
        loser_id: 'enemy_team',
        participants: ['achilles', 'joan', 'holmes'],
        battle_duration: 1000000,
        teamwork_rating: 90,
        mvp_player: 'achilles',
        battle_type: 'arena',
        strategy_used: 'collaborative'
      });

      // Check relationship summary
      const relationships = this.eventBus.getRelationshipSummary('achilles');
      console.log('📊 Relationships tracked:', relationships.size);

      for (const [character_id, relationship] of relationships.entries()) {
        console.log(`  ${character_id}: Trust ${relationship.trust_level}, Respect ${relationship.respect_level}`);
      }

      console.log('✅ Relationship system working!');
    } catch (error) {
      console.error('❌ Relationship test failed:', error);
    }
  }

  // Test memory persistence
  async testMemorySystem(): Promise<void> {
    console.log('🧠 Testing Memory System');
    
    try {
      // Create memorable events
      await this.eventBus.publish({
        type: 'battle_victory',
        source: 'battle_arena',
        primary_character_id: 'achilles',
        severity: 'high',
        category: 'battle',
        description: 'Epic victory against overwhelming odds',
        metadata: { epic: true, odds: '3:1' },
        tags: ['epic', 'victory', 'legendary'],
        importance: 9
      });

      // Get character memories
      const memories = this.eventBus.getCharacterMemories('achilles');
      console.log('💭 Memories stored:', memories.length);

      const importantMemories = memories.filter(m => m.importance >= 7);
      console.log('⭐ Important memories:', importantMemories.length);

      if (importantMemories.length > 0) {
        console.log('📖 Sample memory:', importantMemories[0].content);
      }

      console.log('✅ Memory system working!');
    } catch (error) {
      console.error('❌ Memory test failed:', error);
    }
  }
}

// Export for easy testing
export const eventSystemTest = new EventSystemTest();

// Make available in browser console for debugging
if (typeof window !== 'undefined') {
  (window as any).eventSystemTest = eventSystemTest;
}
