import { io, Socket } from 'socket.io-client';
import { Contestant } from '@blankwars/types';
import ConflictDatabaseService from '../services/ConflictDatabaseService';

interface KitchenChatContext {
  character: Contestant;
  teammates: Contestant[];
  coach_name: string;
  living_conditions: {
    apartment_tier: string;
    room_theme: string | null;
    sleeps_on_couch: boolean;
    sleeps_on_floor: boolean;
    sleeps_under_table: boolean;
    room_overcrowded: boolean;
    floor_sleeper_count: number;
    roommate_count: number;
  };
  recent_events: string[];
}

interface KitchenHistoryMessage {
  message: string;
  speaker_name: string;
  speaker_id: string;
}

interface KitchenConversation {
  id: string;
  initiator: string;
  trigger: string;
  responses: {
    character_id: string;
    message: string;
    timestamp: Date;
  }[];
}

// Global conversation storage that persists across Fast Refresh rebuilds
const globalConversations = new Map<string, KitchenConversation>();

export class KitchenChatService {
  private socket: Socket | null = null;
  private activeConversations: Map<string, KitchenConversation> = globalConversations; // Use persistent storage
  private conflictService: ConflictDatabaseService;

  constructor() {
    console.warn('🔥 NEW KITCHEN CHAT SERVICE CREATED WITH CONFLICT DETECTION!');
    this.conflictService = ConflictDatabaseService.getInstance();
    this.initializeSocket();
  }

  private initializeSocket() {
    // Determine backend URL based on environment
    let socketUrl: string;

    if (process.env.NODE_ENV === 'production') {
      // Production: use environment variable or blankwars.com backend
      // For production, backend should be deployed separately
      socketUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://blank-wars-backend.railway.app';
    } else {
      // Development: use localhost
      socketUrl = 'http://localhost:4000';
    }

    console.log('🔧 Kitchen Chat Service initializing with URL:', socketUrl);
    console.log('🔧 NODE_ENV:', process.env.NODE_ENV);
    console.log('🔧 NEXT_PUBLIC_BACKEND_URL:', process.env.NEXT_PUBLIC_BACKEND_URL);
    console.log('🔧 Current hostname:', typeof window !== 'undefined' ? window.location.hostname : 'SSR');

    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
    });

    this.socket.on('connect', () => {
      console.log('✅ Kitchen Chat Service connected to:', socketUrl, 'with ID:', this.socket?.id);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Kitchen Chat Service connection error:', error);
      console.error('❌ Attempted URL:', socketUrl);
      console.error('❌ Error details:', {
        message: error.message,
        error: error
      });
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('🔌 Kitchen Chat Service disconnected:', reason);
    });

    this.socket.on('kitchen_conversation_response', (data) => {
      console.log('📥 Kitchen conversation response received:', {
        conversation_id: data.conversationId,
        has_message: !!data.message,
        has_error: !!data.error,
        message_length: data.message?.length || 0
      });
      this.handleConversationResponse(data);
    });
  }

  /**
   * Generate AI-powered kitchen conversation
   */
  async generateKitchenConversation(
    context: KitchenChatContext,
    trigger: string,
    messages: KitchenHistoryMessage[] = []
  ): Promise<string> {
    console.log('🎭 Kitchen Chat Request:', {
      character: context.character.name,
      socket_connected: this.socket?.connected,
      socket_id: this.socket?.id
    });

    if (!this.socket?.connected) {
      throw new Error('Socket not connected to backend. Please refresh the page and try again.');
    }

    return new Promise((resolve, reject) => {
      const conversationId = `kitchen_${Date.now()}_${context.character.character_id}`;

      // Store conversation for conflict tracking
      const conversation: KitchenConversation = {
        id: conversationId,
        initiator: context.character.character_id,
        trigger: trigger,
        responses: []
      };
      this.activeConversations.set(conversationId, conversation);
      console.warn('🔥 CONVERSATION CREATED:', conversationId, 'Total conversations:', this.activeConversations.size);

      // Send request to backend
      const requestData = {
        conversationId,
        character_id: context.character.character_id,
        userchar_id: context.character.id, // User-specific character instance ID
        trigger,
        messages,
      };

      console.log('📤 Sending kitchen chat request:', {
        conversationId,
        character_id: context.character.character_id,
        character_name: context.character.name,
        trigger: trigger.substring(0, 50) + '...',
        socket_id: this.socket!.id
      });

      this.socket!.emit('kitchen_chat_request', requestData);

      // Set timeout for response
      const timeout = setTimeout(() => {
        console.warn('⏰ Kitchen chat timeout for:', conversationId);
        reject(new Error('Kitchen chat timeout'));
      }, 30000);

      // Listen for response
      const responseHandler = (data: any) => {
        console.log('📥 Received kitchen response:', data);
        if (data.conversationId === conversationId) {
          clearTimeout(timeout);
          this.socket!.off('kitchen_conversation_response', responseHandler);
          if (data.error) {
            if (data.usageLimitReached) {
              reject(new Error('USAGE_LIMIT_REACHED'));
            } else {
              reject(new Error(data.error));
            }
          } else {
            resolve(data.message || 'AI response unavailable');
          }
        }
      };

      this.socket!.on('kitchen_conversation_response', responseHandler);
    });
  }


  /**
   * Generate conversation triggers based on daily activities
   */
  generateDailyTriggers(apartment_tier: string): string[] {
    const baseTriggers = [
      'Morning coffee brewing (loud noises)',
      'Someone cooking breakfast',
      'Bathroom queue forming',
      'TV remote argument',
      'Thermostat disagreement',
      'Loud phone conversation',
      'Exercise routine in common area',
      'Late night snacking',
      'Alarm clocks going off',
      'Shower time disputes'
    ];

    if (apartment_tier === 'spartan_apartment') {
      return [
        ...baseTriggers,
        'Tripping over coffin under table',
        'Fighting for counter space',
        'Bunk bed disputes',
        'Only one bathroom crisis',
        'Thin walls complaints',
        'Space heater battles'
      ];
    }

    return baseTriggers;
  }

  /**
   * Generate character interactions based on personality conflicts
   * NOTE: This function is currently unused - conflicts are detected from AI responses via extractConflictsFromMessage()
   * If re-enabled, it should use the new relationship system instead of hardcoded logic
   */
  generatePersonalityConflicts(characters: Contestant[]): Array<{ trigger: string, involved: string[] }> {
    const conflicts = [];

    for (let i = 0; i < characters.length; i++) {
      for (let j = i + 1; j < characters.length; j++) {
        const char1 = characters[i];
        const char2 = characters[j];

        // Fixed: Use personality_traits (flat array) instead of personality.traits
        if (char1.personality_traits?.includes('Analytical') && char2.personality_traits?.includes('Aggressive')) {
          conflicts.push({
            trigger: `${char1.name} is analyzing ${char2.name}'s behavior patterns out loud`,
            involved: [char1.id, char2.id]
          });
        }

        // Fixed: Use species/archetype from relationship system instead of hardcoding character names
        // If vampire species and during daytime, generate sleep conflict
        if (char1.species === 'vampire' && char2.personality_traits?.includes('Charismatic')) {
          conflicts.push({
            trigger: `${char2.name} is being very social during ${char1.name}'s sleep time`,
            involved: [char1.id, char2.id]
          });
        }

        if (char1.personality_traits?.includes('Honorable') && char2.personality_traits?.includes('Eccentric')) {
          conflicts.push({
            trigger: `${char2.name}'s unusual habits are disrupting ${char1.name}'s sense of order`,
            involved: [char1.id, char2.id]
          });
        }
      }
    }

    return conflicts;
  }

  // Removed getFallbackResponse method - we now properly handle connection errors instead of hiding them

  /**
   * Handle conversation responses from backend
   */
  private handleConversationResponse(data: any) {
    console.warn('🔥 RESPONSE HANDLER: Looking for conversation:', data.conversationId);
    console.warn('🔥 RESPONSE HANDLER: Active conversations count:', this.activeConversations.size);
    console.warn('🔥 RESPONSE HANDLER: Active conversation IDs:', Array.from(this.activeConversations.keys()));

    const conversation = this.activeConversations.get(data.conversationId);
    if (conversation) {
      conversation.responses.push({
        character_id: data.character_id,
        message: data.message,
        timestamp: new Date()
      });

      console.warn('🔥 CONFLICT CHECK: About to analyze message for conflicts:', data.message.substring(0, 100));
      // Detect and track conflicts from the AI response
      this.detectAndTrackConflicts(data.message, data.character_id, conversation);
    } else {
      console.warn('🔥 ERROR: No conversation found for:', data.conversationId);
      console.warn('🔥 ERROR: Available conversations:', Array.from(this.activeConversations.keys()));
    }
  }

  /**
   * Detect conflicts in kitchen chat responses and add them to ConflictDatabaseService
   */
  private detectAndTrackConflicts(message: string, character_id: string, conversation: KitchenConversation) {
    try {
      console.warn('🔥 CONFLICT ANALYSIS: Analyzing message for conflicts:', { message: message.substring(0, 100), character_id });
      const conflicts = this.extractConflictsFromMessage(message, character_id, conversation);
      console.warn('🔥 CONFLICT RESULT: Found conflicts:', conflicts.length);

      for (const conflict of conflicts) {
        console.log('🔥 Detected kitchen conflict:', conflict);

        // Create ConflictData object matching the expected interface
        const conflictData = {
          id: `kitchen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          category: conflict.category,
          severity: conflict.severity as 'low' | 'medium' | 'high' | 'critical',
          source: 'kitchen' as const,
          characters_involved: [conflict.character_id, ...conflict.involved_characters],
          description: conflict.description,
          therapy_priority: this.calculateTherapyPriority(conflict.severity, conflict.category),
          resolution_difficulty: this.calculateResolutionDifficulty(conflict.category, conflict.severity),
          timestamp: new Date(),
          resolved: false
        };

        console.log('🔥 KITCHEN CHAT: About to call conflictService.addConflict with:', conflictData);
        this.conflictService.addConflict(conflictData);
        console.log('🔥 KITCHEN CHAT: addConflict call completed');
      }
    } catch (error) {
      console.error('❌ Error tracking conflicts:', error);
    }
  }

  /**
   * Extract conflicts from AI response message using pattern matching and sentiment analysis
   */
  private extractConflictsFromMessage(message: string, character_id: string, conversation: KitchenConversation): Array<{
    character_id: string;
    category: string;
    description: string;
    source: string;
    severity: 'low' | 'medium' | 'high';
    involved_characters: string[];
  }> {
    const conflicts = [];
    const lowerMessage = message.toLowerCase();
    console.log('🔍 EXTRACT: Starting conflict extraction for message:', message.substring(0, 100));
    console.log('🔍 EXTRACT: Character ID:', character_id);

    // Define conflict patterns with their categories and severity
    const conflictPatterns = [
      // Direct confrontation patterns
      {
        patterns: ['argue', 'arguing', 'fight', 'fighting', 'yell', 'yelling', 'shout', 'shouting'],
        category: 'interpersonal_conflict',
        severity: 'high' as const
      },
      // Disagreement patterns
      {
        patterns: ['disagree', 'disagree', 'wrong', 'stupid', 'annoying', 'irritating'],
        category: 'personality_clash',
        severity: 'medium' as const
      },
      // Living situation conflicts
      {
        patterns: ['space', 'room', 'bathroom', 'kitchen', 'noise', 'loud', 'messy', 'clean'],
        category: 'living_conditions',
        severity: 'medium' as const
      },
      // Food/resource conflicts
      {
        patterns: ['food', 'eat', 'hungry', 'share', 'mine', 'yours', 'steal', 'took'],
        category: 'resource_competition',
        severity: 'low' as const
      },
      // Sleep/schedule conflicts
      {
        patterns: ['sleep', 'tired', 'wake', 'early', 'late', 'quiet', 'disturb'],
        category: 'schedule_conflict',
        severity: 'low' as const
      },
      // Relationship tensions
      {
        patterns: ['hate', 'dislike', 'avoid', 'ignore', 'annoyed', 'frustrated'],
        category: 'relationship_tension',
        severity: 'medium' as const
      }
    ];

    // Check for conflict patterns
    console.log('🔍 EXTRACT: Checking conflict patterns...');
    for (const patternGroup of conflictPatterns) {
      for (const pattern of patternGroup.patterns) {
        if (lowerMessage.includes(pattern)) {
          console.log('🔍 EXTRACT: Found pattern:', pattern, 'in category:', patternGroup.category);
          // Extract characters mentioned in the message
          const involved_characters = this.extractMentionedCharacters(message, conversation);

          const conflictObj = {
            character_id,
            category: patternGroup.category,
            description: `Kitchen conflict detected: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`,
            source: 'kitchen',
            severity: this.adjustSeverityByContext(patternGroup.severity, message, conversation),
            involved_characters
          };
          console.log('🔍 EXTRACT: Pushing conflict to array:', conflictObj);
          conflicts.push(conflictObj);
          break; // Don't double-count the same conflict category
        }
      }
    }

    // Check for emotional language that indicates conflict
    const emotionalIntensifiers = ['really', 'very', 'extremely', 'so', 'too', 'always', 'never'];
    const hasIntensifiers = emotionalIntensifiers.some(word => lowerMessage.includes(word));

    // Check for negative emotions
    const negativeEmotions = ['angry', 'mad', 'furious', 'upset', 'annoyed', 'irritated', 'frustrated'];
    const hasNegativeEmotions = negativeEmotions.some(emotion => lowerMessage.includes(emotion));

    if (hasNegativeEmotions && conflicts.length === 0) {
      // Detected emotional language but no specific conflict - general tension
      conflicts.push({
        character_id,
        category: 'emotional_tension',
        description: `Emotional tension detected: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`,
        source: 'kitchen',
        severity: hasIntensifiers ? 'medium' : 'low',
        involved_characters: this.extractMentionedCharacters(message, conversation)
      });
    }

    console.log('🔍 EXTRACT: Final conflicts array length:', conflicts.length);
    console.log('🔍 EXTRACT: Final conflicts array:', conflicts);
    return conflicts;
  }

  /**
   * Extract character names mentioned in the message
   */
  private extractMentionedCharacters(message: string, conversation: KitchenConversation): string[] {
    // This is a simplified version - in a full implementation, you'd want to:
    // 1. Have access to all character names in the system
    // 2. Use more sophisticated name extraction
    // 3. Handle nicknames and variations

    const mentioned = [];
    const commonNames = ['dracula', 'tesla', 'joan', 'merlin', 'achilles', 'genghis', 'cleopatra', 'alien', 'fenrir'];

    for (const name of commonNames) {
      if (message.toLowerCase().includes(name)) {
        mentioned.push(name);
      }
    }

    return mentioned;
  }

  /**
   * Adjust conflict severity based on context
   */
  private adjustSeverityByContext(baseSeverity: 'low' | 'medium' | 'high', message: string, conversation: KitchenConversation): 'low' | 'medium' | 'high' {
    const lowerMessage = message.toLowerCase();

    // Escalation indicators
    const escalationWords = ['extremely', 'really', 'very', 'so', 'absolutely', 'definitely'];
    const hasEscalation = escalationWords.some(word => lowerMessage.includes(word));

    // Violence indicators
    const violenceWords = ['kill', 'murder', 'destroy', 'break', 'smash', 'hit'];
    const hasViolence = violenceWords.some(word => lowerMessage.includes(word));

    if (hasViolence) return 'high';
    if (hasEscalation && baseSeverity === 'medium') return 'high';
    if (hasEscalation && baseSeverity === 'low') return 'medium';

    return baseSeverity;
  }

  /**
   * Calculate therapy priority based on severity and category
   */
  private calculateTherapyPriority(severity: string, category: string): number {
    let basePriority = 0;

    // Severity-based priority
    switch (severity) {
      case 'high': basePriority = 80; break;
      case 'medium': basePriority = 50; break;
      case 'low': basePriority = 20; break;
      default: basePriority = 30;
    }

    // Category-based adjustments
    switch (category) {
      case 'interpersonal_conflict': basePriority += 20; break;
      case 'relationship_tension': basePriority += 15; break;
      case 'personality_clash': basePriority += 10; break;
      case 'living_conditions': basePriority += 5; break;
      case 'emotional_tension': basePriority += 5; break;
      default: basePriority += 0;
    }

    return Math.min(100, basePriority);
  }

  /**
   * Calculate resolution difficulty based on category and severity
   */
  private calculateResolutionDifficulty(category: string, severity: string): 'easy' | 'moderate' | 'hard' | 'complex' {
    const isHighSeverity = severity === 'high';
    const isMediumSeverity = severity === 'medium';

    switch (category) {
      case 'interpersonal_conflict':
        return isHighSeverity ? 'complex' : isMediumSeverity ? 'hard' : 'moderate';
      case 'relationship_tension':
        return isHighSeverity ? 'hard' : isMediumSeverity ? 'moderate' : 'easy';
      case 'personality_clash':
        return isHighSeverity ? 'hard' : 'moderate';
      case 'living_conditions':
        return isMediumSeverity ? 'moderate' : 'easy';
      case 'resource_competition':
        return 'easy';
      case 'schedule_conflict':
        return 'easy';
      case 'emotional_tension':
        return isHighSeverity ? 'moderate' : 'easy';
      default:
        return 'moderate';
    }
  }

  /**
   * Get conversation history for context
   */
  getConversationHistory(limit: number = 10): KitchenConversation[] {
    return Array.from(this.activeConversations.values())
      .sort((a, b) => b.responses[0]?.timestamp.getTime() - a.responses[0]?.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Cleanup old conversations
   */
  cleanupOldConversations() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [id, conversation] of this.activeConversations.entries()) {
      const lastResponse = conversation.responses[conversation.responses.length - 1];
      if (lastResponse && now - lastResponse.timestamp.getTime() > maxAge) {
        this.activeConversations.delete(id);
      }
    }
  }

  /**
   * Wait for socket connection
   */
  async waitForConnection(timeout: number = 5000): Promise<boolean> {
    console.log('🔍 Checking socket connection status...');
    console.log('🔍 Socket exists:', !!this.socket);
    console.log('🔍 Socket connected:', this.socket?.connected);
    console.log('🔍 Socket disconnected:', this.socket?.disconnected);

    if (this.socket?.connected) {
      console.log('✅ Already connected');
      return true;
    }

    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = timeout / 100;

      const checkInterval = setInterval(() => {
        attempts++;
        console.log(`🔍 Connection attempt ${attempts}/${maxAttempts} - Connected: ${this.socket?.connected}`);

        if (this.socket?.connected) {
          clearInterval(checkInterval);
          console.log('✅ Connection established');
          resolve(true);
        }

        if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          console.log('❌ Connection timeout');
          resolve(false);
        }
      }, 100);
    });
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  disconnect() {
    this.socket?.disconnect();
  }
}

// Export singleton instance with conflict detection v2
export const kitchenChatService = new KitchenChatService();
