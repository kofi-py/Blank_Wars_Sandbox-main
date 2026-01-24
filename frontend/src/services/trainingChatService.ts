import { io, Socket } from 'socket.io-client';
import { Contestant } from '@blankwars/types';
import { PromptTemplateService } from './promptTemplateService';
import GameEventBus from './gameEventBus';
import EventContextService from './eventContextService';

interface TrainingChatContext {
  character: Contestant;
  teammates: Contestant[];
  coach_name: string;
  training_environment: {
    facility_tier: string;
    equipment: string[];
    current_activity?: string;
    energy_level: number;
    training_progress: number;
    training_phase?: string;
    session_duration?: number;
  };
  recent_training_events: string[];
}

interface TrainingConversation {
  id: string;
  initiator: string;
  topic: string;
  responses: {
    character_id: string;
    agent_type?: string;
    agent_name?: string;
    message: string;
    timestamp: Date;
  }[];
}

export class TrainingChatService {
  private socket: Socket | null = null;
  private activeConversations: Map<string, TrainingConversation> = new Map();

  // Expose socket for debugging
  get socketConnection() {
    return this.socket;
  }

  constructor() {
    // Only initialize socket on client side
    if (typeof window !== 'undefined') {
      this.initializeSocket();
    }
  }

  private initializeSocket() {
    // Only run on client side
    if (typeof window === 'undefined') return;

    // Determine backend URL based on environment
    let socketUrl: string;

    // Check if we're running locally (either in dev or local production build)
    const isLocalhost = window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    if (isLocalhost) {
      // Local development or local production build
      socketUrl = 'http://localhost:4000';
    } else {
      // Deployed production
      socketUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
      if (!socketUrl) {
        throw new Error('NEXT_PUBLIC_BACKEND_URL environment variable is not set. Cannot initialize training chat service.');
      }
    }

    console.log('🏋️ Training Chat Service initializing with URL:', socketUrl);
    console.log('🏋️ NODE_ENV:', process.env.NODE_ENV);
    console.log('🏋️ Window location:', window.location.href);
    console.log('🏋️ Is localhost?:', window.location.hostname === 'localhost');

    try {
      console.log('🔌 Attempting to connect to:', socketUrl);
      this.socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        autoConnect: true,
        forceNew: true
      });

      this.socket.on('connect', () => {
        console.log('🏋️ Training chat connected to backend at:', socketUrl);
        console.log('🔗 Socket ID:', this.socket?.id);
      });

      this.socket.on('disconnect', () => {
        console.log('🏋️ Training chat disconnected from backend');
      });

      this.socket.on('training_chat_response', (data) => {
        console.log('🏋️ Received multi-agent training chat response:', data);
        this.handleMultiAgentTrainingChatResponse(data);
      });

      this.socket.on('connect_error', (error) => {
        console.error('🏋️ Training chat connection error:', error);
        console.error('🏋️ Failed to connect to:', socketUrl);
        console.error('🏋️ Error details:', error.message);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('🏋️ Training chat disconnected:', reason);
      });

    } catch (error) {
      console.error('🏋️ Failed to initialize training chat socket:', error);
    }
  }

  private handleMultiAgentTrainingChatResponse(data: any) {
    const { conversationId, multiAgentResponse, character_response, error } = data;

    if (error) {
      console.error('🏋️ Training chat error:', error);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('trainingChatUpdate', {
          detail: { conversationId, error }
        }));
      }
      return;
    }

    const conversation = this.activeConversations.get(conversationId);
    if (!conversation) return;

    let agents: any[] = [];

    // Handle new multi-agent response format
    if (multiAgentResponse?.agents) {
      agents = multiAgentResponse.agents;
    }
    // Handle old single character response format for backward compatibility
    else if (character_response) {
      agents = [{
        agent_type: 'contestant',
        agent_name: character_response.character_id || 'Character',
        message: character_response.message,
        timestamp: character_response.timestamp
      }];
    }

    // Add all agent responses to conversation
    agents.forEach(async (agent: any) => {
      conversation.responses.push({
        character_id: agent.agent_type,
        agent_type: agent.agent_type,
        agent_name: agent.agent_name,
        message: agent.message,
        timestamp: new Date(agent.timestamp)
      });

      // Publish training events based on agent responses
      if (agent.agent_type === 'contestant' && agent.message) {
        const responseText = agent.message.toLowerCase();
        let event_type = 'skill_practiced';
        let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
        let emotionalIntensity = 5;

        if (responseText.includes('breakthrough') || responseText.includes('mastered') || responseText.includes('personal record')) {
          event_type = 'training_breakthrough';
          severity = 'high';
          emotionalIntensity = 9;
        } else if (responseText.includes('struggle') || responseText.includes('difficult') || responseText.includes('exhausted')) {
          event_type = 'training_plateau';
          severity = 'medium';
          emotionalIntensity = 6;
        } else if (responseText.includes('injury') || responseText.includes('hurt') || responseText.includes('pain')) {
          event_type = 'training_injury';
          severity = 'high';
          emotionalIntensity = 8;
        } else if (responseText.includes('technique') || responseText.includes('form') || responseText.includes('skill')) {
          event_type = 'technique_mastered';
          severity = 'medium';
          emotionalIntensity = 7;
        }

        try {
          const eventBus = GameEventBus.getInstance();
          await eventBus.publish({
            type: event_type as any,
            source: 'training_grounds',
            primary_character_id: agent.agent_name || 'unknown',
            severity,
            category: 'training',
            description: `${agent.agent_name} in training: "${agent.message.substring(0, 100)}..."`,
            metadata: {
              conversationId,
              agent_type: agent.agent_type,
              response_length: agent.message.length,
              emotionalIntensity,
              training_progress: true
            },
            tags: ['training', 'character_response', event_type.replace('training_', '').replace('_', '-')]
          });
        } catch (error) {
          console.error('Error publishing training event:', error);
        }
      }
    });

    // Emit event for UI to update with multi-agent data
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('trainingChatUpdate', {
        detail: {
          conversationId,
          conversation,
          multi_agent_response: agents
        }
      }));
    }
  }

  async startTrainingConversation(
    character: Contestant,
    context: TrainingChatContext,
    user_message: string,
    is_character_selection: boolean = false
  ): Promise<Array<{ agent_type: string; agent_name: string; message: string }>> {
    if (!this.socket?.connected) {
      throw new Error('Training chat service not connected');
    }

    // Import training context for enhanced conversations
    let trainingContext = '';
    try {
      const contextService = EventContextService.getInstance();
      trainingContext = await contextService.getTrainingContext(character.id);
    } catch (error) {
      console.error('Error getting training context:', error);
    }

    const conversationId = `training_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Publish training session start event
    try {
      const eventBus = GameEventBus.getInstance();
      await eventBus.publish({
        type: 'training_session_start',
        source: 'training_grounds',
        primary_character_id: character.id,
        severity: 'medium',
        category: 'training',
        description: `${character.name} started training session: ${user_message.substring(0, 50)}`,
        metadata: {
          training_phase: context.training_environment.training_phase || 'planning',
          current_activity: context.training_environment.current_activity,
          energy_level: context.training_environment.energy_level,
          training_progress: context.training_environment.training_progress,
          facility_tier: context.training_environment.facility_tier
        },
        tags: ['training', 'session_start', context.training_environment.training_phase || 'general']
      });
    } catch (error) {
      console.error('Error publishing training session start event:', error);
    }

    const requestData = {
      conversationId,
      character_id: character.id,
      character_name: character.name,
      user_message,
      training_phase: context.training_environment.training_phase || 'planning',
      current_activity: context.training_environment.current_activity,
      energy_level: context.training_environment.energy_level,
      training_progress: context.training_environment.training_progress,
      session_duration: context.training_environment.session_duration || 0,
      trainingContext, // Add imported context
      is_character_selection
    };

    console.log('🏋️ Sending multi-agent training chat request:', {
      conversationId,
      character_name: character.name,
      training_phase: requestData.training_phase,
      is_character_selection: is_character_selection,
      user_message: user_message.substring(0, 50) + '...'
    });

    // Store conversation
    this.activeConversations.set(conversationId, {
      id: conversationId,
      initiator: context.coach_name,
      topic: user_message.substring(0, 30) + '...',
      responses: []
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Multi-agent training chat request timed out'));
      }, 20000); // Longer timeout for multiple AI calls

      const handleResponse = (event: Event) => {
        const customEvent = event as CustomEvent;
        if (customEvent.detail.conversationId === conversationId) {
          clearTimeout(timeout);
          window.removeEventListener('trainingChatUpdate', handleResponse);

          if (customEvent.detail.error) {
            reject(new Error(customEvent.detail.error));
            return;
          }

          // Return all agent responses
          const agentResponses = customEvent.detail.multiAgentResponse || [];
          resolve(agentResponses);
        }
      };

      if (typeof window !== 'undefined') {
        window.addEventListener('trainingChatUpdate', handleResponse);
      }

      this.socket!.emit('training_chat_request', requestData);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

// Training-specific prompt template service
class TrainingPromptTemplateService {

  // Training facility templates
  private static FACILITY_TEMPLATES = {
    community: `TRAINING FACILITY: You're working out in a basic community gym with limited, old equipment. The weights are mismatched, some machines are broken, and it's always crowded. You're making do with what's available, but it's frustrating compared to what a warrior of your caliber deserves.`,

    premium: `TRAINING FACILITY: You have access to a well-equipped premium gym with modern equipment, proper weights, and good facilities. The environment is professional and you can focus on serious training. This is more befitting your status as a legendary fighter.`,

    elite: `TRAINING FACILITY: You train in an elite facility with cutting-edge equipment, specialized training areas, and everything you could want. The facility rivals the best training grounds from your era, adapted with modern technology. You can push your limits here.`
  };

  // Training context templates
  private static TRAINING_CONTEXT_TEMPLATE = `
CURRENT TRAINING SITUATION:
- Current Activity: {current_activity}
- Energy Level: {energyLevel}% (affects your mood and responses)
- Available Equipment: {equipment}
- Training Progress Today: {training_progress}%

TRAINING MINDSET: You are focused on physical improvement and combat preparation. All conversations should relate to training, workout techniques, combat strategies, physical conditioning, or mental preparation for battle. Stay in character but keep discussions centered around fitness, training methods, and warrior preparation.`;

  // Character core template for training
  private static TRAINING_CHARACTER_TEMPLATE = `
CHARACTER IDENTITY: You are {name} ({title}) from {historicalPeriod}. You have been transported into a fighting league where you must train with modern equipment and methods while maintaining your fighting traditions and personality.

PERSONALITY CORE:
- Traits: {traits}
- Speech Style: {speech_style}
- Motivations: {motivations}
- Fears: {fears}
- Archetype: {archetype}

TRAINING PHILOSOPHY: Based on your background and personality, you have specific views on training, combat preparation, and physical conditioning. Discuss training from your character's perspective, comparing modern methods to your traditional approaches when relevant.`;

  // Team training context
  private static TEAM_TRAINING_TEMPLATE = `
CURRENT TRAINING TEAM: {teammates}
COACH: {coach_name} (your coach who guides training and strategy)

TEAM TRAINING DYNAMICS: You're training alongside diverse fighters from different eras and backgrounds. Some training methods clash with your traditions, others complement them. Consider your relationships with specific teammates when discussing training approaches.`;

  static generateTrainingPrompt(context: {
    character: {
      name: string;
      title: string;
      personality: any;
      historical_period?: string;
      mythology?: string;
      archetype: string;
    };
    facility_tier: string;
    teammates: string[];
    coach_name: string;
    training_context: {
      current_activity?: string;
      energy_level: number;
      equipment: string[];
      training_progress: number;
    };
    user_message: string;
    recent_events: string[];
    imported_context?: string; // Add imported memory context
  }): string {

    const facilityTemplate = this.FACILITY_TEMPLATES[context.facility_tier as keyof typeof this.FACILITY_TEMPLATES] || this.FACILITY_TEMPLATES.community;

    const characterTemplate = this.TRAINING_CHARACTER_TEMPLATE
      .replace('{name}', context.character.name)
      .replace('{title}', context.character.title)
      .replace('{historicalPeriod}', context.character.historical_period || 'Unknown Era')
      .replace('{traits}', context.character.personality?.traits?.join(', ') || 'Unknown')
      .replace('{speech_style}', context.character.personality?.speech_style || 'Direct')
      .replace('{motivations}', context.character.personality?.motivations?.join(', ') || 'Victory')
      .replace('{fears}', context.character.personality?.fears?.join(', ') || 'Defeat')
      .replace('{archetype}', context.character.archetype);

    const teamTemplate = this.TEAM_TRAINING_TEMPLATE
      .replace('{teammates}', context.teammates.join(', '))
      .replace('{coach_name}', context.coach_name);

    const trainingContextTemplate = this.TRAINING_CONTEXT_TEMPLATE
      .replace('{current_activity}', context.training_context.current_activity || 'Free training')
      .replace('{energy_level}', context.training_context.energy_level.toString())
      .replace('{equipment}', context.training_context.equipment.join(', ') || 'Basic gym equipment')
      .replace('{training_progress}', context.training_context.training_progress.toString());

    const recent_eventsText = context.recent_events.length > 0
      ? `\nRECENT TRAINING EVENTS: ${context.recent_events.join('; ')}`
      : '';

    const importedContextText = context.imported_context
      ? `\nRECENT EXPERIENCES AND MENTAL STATE:\n${context.imported_context}`
      : '';

    return `${characterTemplate}

${facilityTemplate}

${teamTemplate}

${trainingContextTemplate}${recent_eventsText}${importedContextText}

CONVERSATION GUIDELINES:
- Stay in character with your personality and speech style
- Keep all responses focused on training, workouts, combat preparation, or physical conditioning
- React to the coach's message: "${context.user_message}"
- Respond as if you're in the middle of or just finished a training session
- Reference your energy level and current training state in your response
- Keep responses conversational but focused on training topics
- Limit response to 1-2 sentences for natural conversation flow

Your response:`;
  }
}

export const training_chat_service = new TrainingChatService();
