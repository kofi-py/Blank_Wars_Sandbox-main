import { Socket } from 'socket.io-client';
import { ChatContextType, BubbleType, EmotionType } from '@/types/wordBubble';
import { useEffect } from 'react';

// Message routing configuration for different chat contexts
interface ChatRouterConfig {
  context_type: ChatContextType;
  socket_events: string[]; // Which socket events to intercept
  bubble_enabled: boolean;
  message_transformer: (data: any) => BubbleMessageData | null;
}

interface BubbleMessageData {
  character_id: string;
  character_name: string;
  character_avatar: string;
  message: string;
  type?: BubbleType;
  emotion?: EmotionType;
  priority?: 'low' | 'medium' | 'high';
  duration?: number;
  metadata?: any;
}

// Callback type for bubble messages
type BubbleMessageCallback = (data: BubbleMessageData) => void;

export class BubbleMessageRouter {
  private socket: Socket | null = null;
  private configs: Map<ChatContextType, ChatRouterConfig> = new Map();
  private listeners: Map<ChatContextType, BubbleMessageCallback[]> = new Map();
  private originalEventHandlers: Map<string, Function[]> = new Map();

  constructor() {
    this.setupDefaultConfigs();
  }

  // Initialize with socket connection
  initialize(socket: Socket): void {
    if (this.socket) {
      this.cleanup(); // Clean up previous socket
    }
    
    this.socket = socket;
    this.setupEventInterception();
    console.log('🔀 BubbleMessageRouter initialized');
  }

  // Setup default configurations for each chat context
  private setupDefaultConfigs(): void {
    // Battle team chat
    this.configs.set('battle', {
      context_type: 'battle',
      socket_events: ['team_chat_response'],
      bubble_enabled: true,
      message_transformer: (data) => {
        if (!data.character || !data.message) return null;
        
        return {
          character_id: data.character_id || data.character.toLowerCase().replace(/\s+/g, '_'),
          character_name: data.character,
          character_avatar: this.getCharacterAvatar(data.character),
          message: data.message,
          type: this.detectBubbleType(data.message),
          emotion: this.detectEmotion(data.message),
          priority: data.message_type === 'strategy' ? 'high' : 'medium'
        };
      }
    });

    // Kitchen chat
    this.configs.set('kitchen', {
      context_type: 'kitchen',
      socket_events: ['kitchen_conversation_response'],
      bubble_enabled: true,
      message_transformer: (data) => {
        if (!data.message) return null;
        
        return {
          character_id: data.character_id || 'unknown',
          character_name: data.character || 'Unknown',
          character_avatar: this.getCharacterAvatar(data.character),
          message: data.message,
          type: this.detectBubbleType(data.message),
          emotion: this.detectEmotion(data.message)
        };
      }
    });

    // Training grounds
    this.configs.set('training', {
      context_type: 'training',
      socket_events: ['training_response', 'coach_response'],
      bubble_enabled: true,
      message_transformer: (data) => {
        return {
          character_id: data.character_id || data.speaker?.toLowerCase() || 'coach',
          character_name: data.speaker || data.character || 'Coach',
          character_avatar: data.avatar || this.getCharacterAvatar(data.speaker),
          message: data.message || data.response,
          type: data.isCoach ? 'speech' : this.detectBubbleType(data.message),
          emotion: this.detectEmotion(data.message)
        };
      }
    });

    // Simple chat
    this.configs.set('simple_chat', {
      context_type: 'simple_chat',
      socket_events: ['chat_response'],
      bubble_enabled: true,
      message_transformer: (data) => {
        return {
          character_id: data.character_id || data.character || 'contestant',
          character_name: data.character_name || data.character || 'Character',
          character_avatar: data.avatar || '⭐',
          message: data.message,
          type: this.detectBubbleType(data.message),
          emotion: this.detectEmotion(data.message)
        };
      }
    });

    // Confessional
    this.configs.set('confessional', {
      context_type: 'confessional',
      socket_events: ['confessional_response'],
      bubble_enabled: true,
      message_transformer: (data) => {
        return {
          character_id: data.character_id || 'contestant',
          character_name: data.character_name || 'Character',
          character_avatar: data.avatar || '🎭',
          message: data.message,
          type: 'speech',
          emotion: this.detectEmotion(data.message),
          priority: 'high' // Confessional is always important
        };
      }
    });

    // Individual therapy
    this.configs.set('therapy_individual', {
      context_type: 'therapy_individual',
      socket_events: ['therapy_response'],
      bubble_enabled: true,
      message_transformer: (data) => {
        return {
          character_id: data.character_id || data.participant || 'contestant',
          character_name: data.character_name || data.participant || 'Character',
          character_avatar: data.avatar || '🧠',
          message: data.message,
          type: data.isTherapist ? 'speech' : this.detectBubbleType(data.message),
          emotion: data.isTherapist ? 'neutral' : this.detectEmotion(data.message)
        };
      }
    });

    // Add more configs for other contexts...
    this.addCoachingConfigs();
    this.addSocialConfigs();
  }

  // Add coaching session configs
  private addCoachingConfigs(): void {
    const coachingContexts: ChatContextType[] = [
      'coaching_performance', 'coaching_equipment', 'coaching_skill', 
      'coaching_personal', 'coaching_financial'
    ];

    coachingContexts.forEach(context => {
      this.configs.set(context, {
        context_type: context,
        socket_events: ['coaching_response', 'ai_response'],
        bubble_enabled: true,
        message_transformer: (data) => {
          return {
            character_id: data.character_id || 'contestant',
            character_name: data.character_name || 'Character',
            character_avatar: data.avatar || '👤',
            message: data.message || data.response,
            type: data.isCoach ? 'speech' : this.detectBubbleType(data.message),
            emotion: this.detectEmotion(data.message)
          };
        }
      });
    });
  }

  // Add social context configs
  private addSocialConfigs(): void {
    ['social_1', 'social_2', 'social_3'].forEach((context, index) => {
      this.configs.set(context as ChatContextType, {
        context_type: context as ChatContextType,
        socket_events: ['social_response'],
        bubble_enabled: true,
        message_transformer: (data) => {
          return {
            character_id: data.character_id || `character_${index}`,
            character_name: data.character_name || 'Character',
            character_avatar: data.avatar || '👥',
            message: data.message,
            type: this.detectBubbleType(data.message),
            emotion: this.detectEmotion(data.message)
          };
        }
      });
    });
  }

  // Subscribe to messages for a specific context
  subscribe(context_type: ChatContextType, callback: BubbleMessageCallback): () => void {
    if (!this.listeners.has(context_type)) {
      this.listeners.set(context_type, []);
    }
    
    this.listeners.get(context_type)!.push(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(context_type) || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  // Enable/disable bubble routing for a context
  setBubbleEnabled(context_type: ChatContextType, enabled: boolean): void {
    const config = this.configs.get(context_type);
    if (config) {
      config.bubble_enabled = enabled;
      console.log(`🔀 Bubble routing ${enabled ? 'enabled' : 'disabled'} for ${context_type}`);
    }
  }

  // Check if bubbles are enabled for a context
  isBubbleEnabled(context_type: ChatContextType): boolean {
    return this.configs.get(context_type)?.bubble_enabled || false;
  }

  // Setup event interception for all configured contexts
  private setupEventInterception(): void {
    if (!this.socket) return;

    this.configs.forEach((config) => {
      config.socket_events.forEach(eventName => {
        // Store original handlers (Socket.io doesn't expose listeners directly)
        // We'll just track that we've intercepted this event
        this.originalEventHandlers.set(eventName, []);

        // Remove original handlers
        this.socket!.removeAllListeners(eventName);

        // Add our intercepting handler
        this.socket!.on(eventName, (data: any) => {
          this.handleInterceptedMessage(config, data);

          // Also call original handlers if bubbles are disabled
          if (!config.bubble_enabled) {
            const handlers = this.originalEventHandlers.get(eventName) || [];
            handlers.forEach(handler => handler(data));
          }
        });
      });
    });
  }

  // Handle intercepted socket messages
  private handleInterceptedMessage(config: ChatRouterConfig, data: any): void {
    if (!config.bubble_enabled) return;

    try {
      const bubbleData = config.message_transformer(data);
      if (!bubbleData) return;

      // Notify all listeners for this context
      const listeners = this.listeners.get(config.context_type) || [];
      listeners.forEach(callback => {
        try {
          callback(bubbleData);
        } catch (error) {
          console.error(`Error in bubble message callback for ${config.context_type}:`, error);
        }
      });

      console.log(`🔀 Routed message to bubbles: ${config.context_type}`, bubbleData);
    } catch (error) {
      console.error(`Error transforming message for ${config.context_type}:`, error);
    }
  }

  // Detect bubble type from message content
  private detectBubbleType(message: string): BubbleType {
    if (!message) return 'speech';
    
    const lowerMessage = message?.toLowerCase() || '';
    
    if (lowerMessage.includes('!') && (lowerMessage.includes('attack') || lowerMessage.includes('charge'))) {
      return 'shout';
    }
    if (lowerMessage.includes('whisper') || lowerMessage.includes('quietly')) {
      return 'whisper';
    }
    if (lowerMessage.includes('think') || lowerMessage.includes('wonder')) {
      return 'thought';
    }
    if (lowerMessage.includes('*') && lowerMessage.includes('*')) {
      return 'action';
    }
    
    return 'speech';
  }

  // Detect emotion from message content
  private detectEmotion(message: string): EmotionType {
    if (!message) return 'neutral';
    
    const lowerMessage = message?.toLowerCase() || '';
    
    if (lowerMessage.includes('angry') || lowerMessage.includes('mad') || lowerMessage.includes('furious')) {
      return 'angry';
    }
    if (lowerMessage.includes('happy') || lowerMessage.includes('joy') || lowerMessage.includes('excited')) {
      return 'happy';
    }
    if (lowerMessage.includes('sad') || lowerMessage.includes('depressed') || lowerMessage.includes('down')) {
      return 'sad';
    }
    if (lowerMessage.includes('worried') || lowerMessage.includes('concern') || lowerMessage.includes('anxious')) {
      return 'worried';
    }
    if (lowerMessage.includes('confused') || lowerMessage.includes('puzzled') || lowerMessage.includes('?')) {
      return 'confused';
    }
    if (lowerMessage.includes('confident') || lowerMessage.includes('sure') || lowerMessage.includes('certain')) {
      return 'confident';
    }
    if (lowerMessage.includes('!')) {
      return 'excited';
    }
    
    return 'neutral';
  }

  // Get character avatar based on name
  private getCharacterAvatar(character_name?: string): string {
    if (!character_name) return '👤';
    
    const name = character_name.toLowerCase();
    const avatarMap: Record<string, string> = {
      'achilles': '⚔️',
      'tesla': '⚡',
      'dracula': '🧛',
      'joan': '⚜️',
      'merlin': '🧙',
      'cleopatra': '👑',
      'genghis': '🏹',
      'fenrir': '🐺',
      'coach': '🧑‍🏫',
      'therapist': '🧠',
      'advisor': '📊',
      'trainer': '💪'
    };
    
    for (const [key, avatar] of Object.entries(avatarMap)) {
      if (name.includes(key)) return avatar;
    }
    
    return '👤';
  }

  // Manually send a message to bubble system (for testing)
  sendTestMessage(
    context_type: ChatContextType, 
    character_id: string, 
    message: string
  ): void {
    const config = this.configs.get(context_type);
    if (!config) return;

    const testData = {
      character_id,
      character: character_id,
      message,
      message_type: 'test'
    };

    this.handleInterceptedMessage(config, testData);
  }

  // Cleanup
  cleanup(): void {
    if (this.socket) {
      // Restore original event handlers
      this.originalEventHandlers.forEach((handlers, eventName) => {
        this.socket!.removeAllListeners(eventName);
        handlers.forEach(handler => this.socket!.on(eventName, handler as (...args: any[]) => void));
      });
    }
    
    this.listeners.clear();
    this.originalEventHandlers.clear();
    this.socket = null;
    console.log('🔀 BubbleMessageRouter cleaned up');
  }
}

// Singleton instance
let instance: BubbleMessageRouter | null = null;

export function getBubbleMessageRouter(): BubbleMessageRouter {
  if (!instance) {
    instance = new BubbleMessageRouter();
  }
  return instance;
}

// Hook for easy integration
export function useBubbleMessageRouter(
  context_type: ChatContextType,
  onMessage: BubbleMessageCallback
) {
  const router = getBubbleMessageRouter();
  
  useEffect(() => {
    const unsubscribe = router.subscribe(context_type, onMessage);
    return unsubscribe;
  }, [context_type, onMessage]);
  
  return {
    set_bubble_enabled: (enabled: boolean) => router.setBubbleEnabled(context_type, enabled),
    is_bubble_enabled: () => router.isBubbleEnabled(context_type),
    send_test_message: (character_id: string, message: string) => 
      router.sendTestMessage(context_type, character_id, message)
  };
}