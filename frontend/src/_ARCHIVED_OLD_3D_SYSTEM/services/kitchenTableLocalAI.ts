import { Contestant } from '@blankwars/types';
import { HeadquartersState } from '../types/headquarters';
import { PromptTemplateService } from './promptTemplateService';
import GameEventBus from './gameEventBus';
import EventContextService from './eventContextService';
import aiService from './aiService';

export interface KitchenConversation {
  id: string;
  avatar: string;
  speaker: string;
  speaker_id: string;
  message: string;
  is_complaint: boolean;
  timestamp: Date;
  is_ai: boolean;
  round: number;
}

interface KitchenSceneContext {
  scene_type: 'mundane' | 'conflict' | 'chaos';
  participants: string[];
  trigger: string;
  time_of_day: 'morning' | 'afternoon' | 'evening' | 'night';
}

export class KitchenTableLocalAI {
  private eventBus: GameEventBus;
  private contextService: EventContextService;
  private currentSessionId: string;

  constructor() {
    this.eventBus = GameEventBus.getInstance();
    this.contextService = EventContextService.getInstance();
    this.currentSessionId = aiService.getSessionId();
  }

  /**
   * Start a new kitchen scene with LocalAI-generated conversations
   */
  async startNewScene(
    headquarters: HeadquartersState,
    available_characters: Contestant[],
    coach_name: string = 'Coach'
  ): Promise<{
    conversations: KitchenConversation[];
    scene_context: KitchenSceneContext;
  }> {
    try {
      // Generate scene parameters using existing system
      const sceneType = PromptTemplateService.selectSceneType();
      const allRoommates = available_characters.map(c => c.id);
      const participants = PromptTemplateService.selectSceneParticipants(allRoommates, 4); // Increased for more dynamic scenes
      const trigger = PromptTemplateService.generateSceneTrigger(sceneType, headquarters.current_tier, headquarters);
      const timeOfDay = PromptTemplateService.selectTimeOfDay();

      console.log('🎭 LocalAI Kitchen Scene:', { sceneType, participants, trigger, timeOfDay });

      // Publish scene start event
      await this.eventBus.publish({
        type: 'kitchen_argument', // Will vary based on scene type
        source: 'kitchen_table',
        primary_character_id: participants[0],
        secondary_character_ids: participants.slice(1),
        severity: sceneType === 'chaos' ? 'high' : sceneType === 'conflict' ? 'medium' : 'low',
        category: 'social',
        description: `Kitchen scene started: ${trigger}`,
        metadata: { sceneType, trigger, timeOfDay },
        tags: ['kitchen', 'scene_start', sceneType]
      });

      // Generate opening conversations for each participant
      const conversations: KitchenConversation[] = [];

      for (let i = 0; i < participants.length; i++) {
        const character_id = participants[i];
        const character = available_characters.find(c => c.id === character_id);
        if (!character) continue;

        const conversation = await this.generateCharacterResponse(
          character,
          trigger,
          headquarters,
          available_characters,
          coach_name,
          sceneType,
          timeOfDay,
          i + 1 // round number
        );

        if (conversation) {
          conversations.push(conversation);

          // Small delay between responses for more natural flow
          if (i < participants.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      const scene_context: KitchenSceneContext = {
        scene_type: sceneType,
        participants,
        trigger,
        time_of_day: timeOfDay
      };

      return { conversations, scene_context };
    } catch (error) {
      console.error('Error starting LocalAI kitchen scene:', error);
      throw error;
    }
  }

  /**
   * Continue an ongoing conversation with a character response
   */
  async continueConversation(
    character: Contestant,
    previous_conversations: KitchenConversation[],
    headquarters: HeadquartersState,
    available_characters: Contestant[],
    scene_context: KitchenSceneContext,
    coach_name: string = 'Coach'
  ): Promise<KitchenConversation | null> {
    try {
      // Build context from recent conversation
      const recentMessages = previous_conversations
        .slice(-6) // Last 6 messages for context
        .map(conv => `${conv.speaker}: ${conv.message}`)
        .join('\n');

      const conversationPrompt = `Recent conversation:\n${recentMessages}\n\nContinue the conversation as ${character.name} would respond to what was just said.`;

      return await this.generateCharacterResponse(
        character,
        conversationPrompt,
        headquarters,
        available_characters,
        coach_name,
        scene_context.scene_type,
        scene_context.time_of_day,
        Math.max(...previous_conversations.map(c => c.round)) + 1
      );
    } catch (error) {
      console.error('Error continuing LocalAI conversation:', error);
      return null;
    }
  }

  /**
   * Generate a single character response using LocalAI with full Kitchen Table context
   */
  private async generateCharacterResponse(
    character: Contestant,
    prompt: string,
    headquarters: HeadquartersState,
    available_characters: Contestant[],
    coach_name: string,
    scene_type: 'mundane' | 'conflict' | 'chaos',
    time_of_day: 'morning' | 'afternoon' | 'evening' | 'night',
    round: number
  ): Promise<KitchenConversation | null> {
    try {
      // Get enhanced context from existing systems
      const kitchenContext = await this.contextService.getKitchenContext(character.id);
      const comedyContext = this.contextService.getComedyContext(character.id, 'kitchen_table', prompt);

      // Living situation context comes from backend DB queries

      // Get teammates for context
      const teammates = available_characters.filter(c => c.id !== character.id);

      // Build the comprehensive prompt using your existing template system
      const promptContext = {
        character: {
          name: character.name,
          title: character.title || character.name,
          personality: {
            traits: character.personality_traits || [],
            speech_style: character.conversation_style || 'conversational',
            motivations: character.conversation_topics || [],
            fears: []
          },
          historical_period: character.origin_era,
          backstory: character.backstory
        },
        hq_tier: headquarters.current_tier,
        roommates: teammates.map(c => c.name),
        coach_name,
        scene_type: scene_type,
        trigger: prompt,
        time_of_day: time_of_day,
        sleeping_context: {
          sleeps_on_floor: sleepingArrangement.sleeps_on_floor,
          sleeps_on_couch: sleepingArrangement.sleeps_on_couch,
          sleeps_under_table: character.id === 'dracula' && headquarters.current_tier === 'spartan_apartment',
          room_overcrowded: isOvercrowded,
          floor_sleeper_count: Math.max(0, room.assigned_characters.length - roomCapacity),
          roommate_count: room.assigned_characters.length
        }
      };

      // Generate the full prompt using your existing system
      const fullPrompt = PromptTemplateService.generatePrompt(promptContext);

      // Add recent memory context if available
      const recentMemories = this.eventBus.getCharacterMemories(character.id, {
        limit: 3,
        importance: 6
      });

      let memoryContext = '';
      if (recentMemories.length > 0) {
        memoryContext = `\n\nRECENT MEMORIES (reference if relevant):\n${recentMemories.map(m => `- ${m.content}`).join('\n')}`;
      }

      // Add kitchen and comedy context
      let enhancedPrompt = fullPrompt;
      if (kitchenContext) {
        enhancedPrompt += `\n\nKITCHEN CONTEXT: ${kitchenContext}`;
      }
      if (comedyContext) {
        enhancedPrompt += `\n\nCOMEDY OPPORTUNITIES: ${comedyContext}`;
      }
      if (memoryContext) {
        enhancedPrompt += memoryContext;
      }

      // Generate response using LocalAI
      const response = await aiService.generateCharacterResponse(
        character.id,
        enhancedPrompt,
        {
          other_characters: teammates.map(c => c.id),
          current_topic: prompt,
          use_custom_prompt: true
        }
      );

      // Create conversation object
      const conversation: KitchenConversation = {
        id: `kitchen_${Date.now()}_${character.id}`,
        avatar: character.headshot || character.avatar || '',
        speaker: character.name.split(' ')[0],
        speaker_id: character.id,
        message: response,
        is_complaint: scene_type === 'conflict' && Math.random() > 0.5,
        timestamp: new Date(),
        is_ai: true,
        round
      };

      // Store this interaction as memory
      await this.storeConversationMemory(character.id, conversation, scene_type);

      // Update character relationships based on the interaction
      await this.updateCharacterRelationships(character.id, teammates.map(c => c.id), scene_type);

      console.log(`🗣️ LocalAI Response (${character.name}):`, response.substring(0, 100) + '...');

      return conversation;
    } catch (error) {
      console.error(`Error generating response for ${character.name}:`, error);
      return null;
    }
  }

  /**
   * Store conversation as character memory
   */
  private async storeConversationMemory(
    character_id: string,
    conversation: KitchenConversation,
    scene_type: 'mundane' | 'conflict' | 'chaos'
  ): Promise<void> {
    const event_type = scene_type === 'chaos' ? 'kitchen_argument' :
      scene_type === 'conflict' ? 'noise_complaint' :
        'meal_sharing';

    await this.eventBus.publish({
      type: event_type,
      source: 'kitchen_table',
      primary_character_id: character_id,
      severity: scene_type === 'chaos' ? 'high' : scene_type === 'conflict' ? 'medium' : 'low',
      category: 'social',
      description: `${conversation.speaker} said: "${conversation.message}"`,
      metadata: {
        conversation_id: conversation.id,
        scene_type: scene_type,
        round: conversation.round,
        is_ai: true
      },
      tags: ['kitchen', 'conversation', scene_type]
    });
  }

  /**
   * Update character relationships based on kitchen interaction
   */
  private async updateCharacterRelationships(
    character_id: string,
    other_character_ids: string[],
    scene_type: 'mundane' | 'conflict' | 'chaos'
  ): Promise<void> {
    // Relationships are automatically handled by GameEventBus when events are published
    // This could be extended for more sophisticated relationship modeling
  }

  /**
   * Get character memories relevant to kitchen scenes
   */
  getKitchenMemories(character_id: string, limit: number = 5): any[] {
    return this.eventBus.getCharacterMemories(character_id, {
      memory_type: 'social',
      limit
    }).filter(memory =>
      memory.tags.includes('kitchen') ||
      memory.tags.includes('conversation')
    );
  }

  /**
   * Reset the session for a new conversation sequence
   */
  async resetSession(): Promise<void> {
    await aiService.clearSession();
    this.currentSessionId = aiService.getSessionId();
  }

  /**
   * Handle coach message input and generate character responses
   */
  async handleCoachMessage(
    coach_message: string,
    headquarters: HeadquartersState,
    available_characters: Contestant[],
    current_scene_round: number,
    kitchen_conversations: KitchenConversation[],
    coach_name: string = 'Coach'
  ): Promise<KitchenConversation[]> {
    if (!coach_message.trim()) return [];

    // Add coach message to conversation
    const coachConversation: KitchenConversation = {
      id: `coach_${Date.now()}`,
      avatar: '👨‍💼',
      speaker: 'Coach',
      speaker_id: 'coach',
      message: coach_message.trim(),
      is_complaint: false,
      timestamp: new Date(),
      is_ai: false,
      round: current_scene_round
    };

    // Get characters to respond to the coach's message
    const allRoommates = available_characters.map(c => c.id);
    const participants = PromptTemplateService.selectSceneParticipants(allRoommates, 2); // Just 2 characters respond

    const responses: KitchenConversation[] = [coachConversation];

    for (const charId of participants) {
      const character = available_characters.find(c => c.id === charId);
      if (!character) continue;

      const trigger = `Your coach just said to everyone: "${coach_message}". React and respond directly to them.`;

      const conversation = await this.generateCharacterResponse(
        character,
        trigger,
        headquarters,
        available_characters,
        coach_name,
        'mundane',
        'afternoon',
        current_scene_round + 1
      );

      if (conversation) {
        responses.push(conversation);
        // Add delay between responses for natural flow
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }

    return responses;
  }

  /**
   * Continue an ongoing kitchen scene with auto-generated responses
   */
  async continueScene(
    headquarters: HeadquartersState,
    available_characters: Contestant[],
    kitchen_conversations: KitchenConversation[],
    current_scene_round: number,
    coach_name: string = 'Coach'
  ): Promise<KitchenConversation[]> {
    try {
      const newRound = current_scene_round + 1;
      let trigger = '';
      let participants: string[] = [];
      const allRoommates = available_characters.map(c => c.id);

      if (newRound <= 3) {
        // Non-sequential response selection
        const lastParticipants = [...new Set(kitchen_conversations.slice(0, 3).map(c => c.speaker))];
        const availableResponders = allRoommates.filter(id => {
          const char = available_characters.find(c => c.id === id);
          return char && lastParticipants.includes(char.name.split(' ')[0]);
        });

        // Randomly select 1-2 characters (non-sequential)
        const numResponders = Math.min(Math.random() > 0.5 ? 2 : 1, availableResponders.length);
        participants = availableResponders.sort(() => Math.random() - 0.5).slice(0, numResponders);

        const lastMessage = kitchen_conversations[0];
        trigger = `Someone responds to ${lastMessage.speaker}'s comment: "${lastMessage.message}". Keep the conversation natural and build on what was said.`;
      } else if (newRound <= 6) {
        const currentParticipants = [...new Set(kitchen_conversations.map(c => c.speaker))];
        const availableNewChars = allRoommates.filter(id => {
          const char = available_characters.find(c => c.id === id);
          return char && !currentParticipants.includes(char.name.split(' ')[0]);
        });

        if (availableNewChars.length > 0) {
          // Random selection of new character
          participants = [availableNewChars[Math.floor(Math.random() * availableNewChars.length)]];
          trigger = `${available_characters.find(c => c.id === participants[0])?.name.split(' ')[0]} walks into the kitchen and reacts to what's happening`;
        } else {
          // Random selection from all characters
          participants = allRoommates.sort(() => Math.random() - 0.5).slice(0, 2);
          trigger = 'The conversation takes a new turn';
        }
      } else {
        participants = PromptTemplateService.selectSceneParticipants(allRoommates, 2);
        const chaos_events = [
          'Coach suddenly walks in and interrupts',
          'The fire alarm starts going off',
          'There is a loud crash from another room',
          'Someone spills something all over the floor'
        ];
        trigger = chaos_events[Math.floor(Math.random() * chaos_events.length)];
      }

      const newConversations: KitchenConversation[] = [];

      for (const charId of participants) {
        const character = available_characters.find(c => c.id === charId);
        if (!character) continue;

        // Enhanced context with conversation history
        const conversationHistory = kitchen_conversations.slice(0, 5).map(c => `${c.speaker}: ${c.message}`).join('\n');
        const enhancedTrigger = `${trigger}\n\nRECENT CONVERSATION:\n${conversationHistory}`;

        const conversation = await this.generateCharacterResponse(
          character,
          enhancedTrigger,
          headquarters,
          available_characters,
          coach_name,
          newRound > 6 ? 'chaos' : 'mundane',
          'afternoon',
          newRound
        );

        if (conversation) {
          // Duplicate detection to prevent repetitive responses
          const recentMessages = kitchen_conversations.slice(0, 3).map(c => c.message.toLowerCase());
          const isUnique = conversation.message && conversation.message.length > 10 &&
            !recentMessages.some(msg => {
              const similarity = msg.includes(conversation.message.toLowerCase().substring(0, 15)) ||
                conversation.message.toLowerCase().includes(msg.substring(0, 15));
              return similarity;
            });

          if (isUnique) {
            newConversations.push(conversation);
          }
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      return newConversations;
    } catch (error) {
      console.error('Failed to continue scene:', error);
      throw error;
    }
  }
}

export default new KitchenTableLocalAI();