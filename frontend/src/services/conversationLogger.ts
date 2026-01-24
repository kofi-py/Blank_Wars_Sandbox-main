import { ConversationLog, LoggedMessage, WordBubble, ChatContextType } from '@/types/wordBubble';

export class ConversationLogger {
  private conversations: Map<string, ConversationLog> = new Map();
  private current_sessions: Map<ChatContextType, string> = new Map(); // Track active sessions per context
  private maxHistoryDays: number = 30;
  private maxConversationsPerContext: number = 100;
  private storageKey = 'blank_wars_conversation_history';

  constructor() {
    this.loadFromStorage();
    this.setupCleanupInterval();
  }

  // Start a new conversation session
  startConversation(
    context_type: ChatContextType,
    participants: Array<{ character_id: string; character_name: string; character_avatar: string }>,
    location?: string
  ): string {
    const conversationId = `${context_type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // End any existing session for this context
    this.endConversation(context_type);

    const conversation: ConversationLog = {
      id: conversationId,
      context_type,
      location: location || this.getDefaultLocationName(context_type),
      participants,
      messages: [],
      start_time: new Date(),
      is_bookmarked: false,
      tags: [context_type]
    };

    this.conversations.set(conversationId, conversation);
    this.current_sessions.set(context_type, conversationId);

    console.log(`📝 Started conversation: ${conversationId} in ${context_type}`);
    this.saveToStorage();

    return conversationId;
  }

  // End a conversation session
  endConversation(context_type: ChatContextType): void {
    const session_id = this.current_sessions.get(context_type);
    if (session_id) {
      const conversation = this.conversations.get(session_id);
      if (conversation && !conversation.end_time) {
        conversation.end_time = new Date();
        conversation.summary = this.generateConversationSummary(conversation);
        console.log(`🏁 Ended conversation: ${session_id}`);
        this.saveToStorage();
      }
      this.current_sessions.delete(context_type);
    }
  }

  // Log a bubble message to the current conversation
  logMessage(bubble: WordBubble): void {
    const session_id = this.current_sessions.get(bubble.chat_context);
    if (!session_id) {
      console.warn(`No active session for context ${bubble.chat_context}`);
      return;
    }

    const conversation = this.conversations.get(session_id);
    if (!conversation) {
      console.warn(`Conversation ${session_id} not found`);
      return;
    }

    const loggedMessage: LoggedMessage = {
      id: bubble.id,
      speaker_id: bubble.character_id,
      speaker_name: bubble.character_name,
      message: bubble.message,
      timestamp: bubble.timestamp,
      bubble_type: bubble.type,
      emotion: bubble.emotion,
      was_important: bubble.priority === 'high' || bubble.metadata?.is_important || false,
      reactions: []
    };

    conversation.messages.push(loggedMessage);

    // Auto-tag based on content
    this.autoTagMessage(conversation, loggedMessage);

    this.saveToStorage();
  }

  // Add a reaction to a message
  addReaction(
    message_id: string,
    character_id: string,
    reaction: 'laugh' | 'anger' | 'surprise' | 'agreement' | 'disagreement'
  ): void {
    for (const conversation of this.conversations.values()) {
      const message = conversation.messages.find(m => m.id === message_id);
      if (message) {
        if (!message.reactions) message.reactions = [];

        // Remove existing reaction from this character
        message.reactions = message.reactions.filter(r => r.character_id !== character_id);

        // Add new reaction
        message.reactions.push({ character_id, reaction });
        this.saveToStorage();
        break;
      }
    }
  }

  // Get conversation history
  getConversationHistory(
    context_type?: ChatContextType,
    limit?: number,
    offset?: number
  ): ConversationLog[] {
    let conversations = Array.from(this.conversations.values());

    // Filter by context if specified
    if (context_type) {
      conversations = conversations.filter(c => c.context_type === context_type);
    }

    // Sort by start time (newest first)
    conversations.sort((a, b) => b.start_time.getTime() - a.start_time.getTime());

    // Apply pagination
    if (offset) conversations = conversations.slice(offset);
    if (limit) conversations = conversations.slice(0, limit);

    return conversations;
  }

  // Search conversations
  searchConversations(
    query: string,
    context_type?: ChatContextType,
    tags?: string[]
  ): ConversationLog[] {
    const searchTerm = query.toLowerCase();

    return Array.from(this.conversations.values())
      .filter(conversation => {
        // Context filter
        if (context_type && conversation.context_type !== context_type) return false;

        // Tag filter
        if (tags && tags.length > 0) {
          const hasMatchingTag = tags.some(tag => conversation.tags?.includes(tag));
          if (!hasMatchingTag) return false;
        }

        // Text search in messages
        const hasMatchingMessage = conversation.messages.some(message =>
          message.message.toLowerCase().includes(searchTerm) ||
          message.speaker_name.toLowerCase().includes(searchTerm)
        );

        // Text search in metadata
        const hasMatchingMeta =
          conversation.location?.toLowerCase().includes(searchTerm) ||
          conversation.summary?.toLowerCase().includes(searchTerm);

        return hasMatchingMessage || hasMatchingMeta;
      })
      .sort((a, b) => b.start_time.getTime() - a.start_time.getTime());
  }

  // Get recent messages for context
  getRecentMessages(context_type: ChatContextType, limit: number = 10): LoggedMessage[] {
    const conversations = this.getConversationHistory(context_type);
    const allMessages: LoggedMessage[] = [];

    for (const conversation of conversations) {
      allMessages.push(...conversation.messages);
      if (allMessages.length >= limit) break;
    }

    return allMessages
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // Bookmark/unbookmark conversation
  toggleBookmark(conversationId: string): void {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.is_bookmarked = !conversation.is_bookmarked;
      this.saveToStorage();
    }
  }

  // Get bookmarked conversations
  getBookmarkedConversations(): ConversationLog[] {
    return Array.from(this.conversations.values())
      .filter(c => c.is_bookmarked)
      .sort((a, b) => b.start_time.getTime() - a.start_time.getTime());
  }

  // Get conversation statistics
  getStats(): {
    total_conversations: number;
    messages_by_context: Record<ChatContextType, number>;
    average_messages_per_conversation: number;
    mostActiveCharacters: Array<{ name: string; message_count: number }>;
  } {
    const conversations = Array.from(this.conversations.values());
    const messages_by_context: Record<string, number> = {};
    const character_messageCounts: Record<string, number> = {};

    let totalMessages = 0;

    for (const conversation of conversations) {
      // Count by context
      messages_by_context[conversation.context_type] =
        (messages_by_context[conversation.context_type] || 0) + conversation.messages.length;

      // Count by character
      for (const message of conversation.messages) {
        character_messageCounts[message.speaker_name] =
          (character_messageCounts[message.speaker_name] || 0) + 1;
      }

      totalMessages += conversation.messages.length;
    }

    // Sort characters by message count
    const mostActiveCharacters = Object.entries(character_messageCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, message_count: count }));

    return {
      total_conversations: conversations.length,
      messages_by_context: messages_by_context as Record<ChatContextType, number>,
      average_messages_per_conversation: conversations.length > 0 ? totalMessages / conversations.length : 0,
      mostActiveCharacters
    };
  }

  // Generate conversation summary (simple keyword extraction)
  private generateConversationSummary(conversation: ConversationLog): string {
    if (conversation.messages.length === 0) return 'Empty conversation';

    const messages = conversation.messages.map(m => m.message.toLowerCase());
    const allText = messages.join(' ');

    // Simple keyword extraction
    const keywords = allText
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'from', 'they', 'were', 'been', 'have', 'will'].includes(word))
      .slice(0, 5);

    const participantNames = conversation.participants.map(p => p.character_name).join(', ');

    return `${participantNames} discussed ${keywords.join(', ')} (${conversation.messages.length} messages)`;
  }

  // Auto-tag messages based on content
  private autoTagMessage(conversation: ConversationLog, message: LoggedMessage): void {
    const text = message.message.toLowerCase();
    const newTags: string[] = [];

    // Emotion-based tags
    if (text.includes('angry') || text.includes('mad')) newTags.push('conflict');
    if (text.includes('happy') || text.includes('excited')) newTags.push('positive');
    if (text.includes('sad') || text.includes('worried')) newTags.push('emotional');

    // Content-based tags
    if (text.includes('battle') || text.includes('fight')) newTags.push('combat');
    if (text.includes('train') || text.includes('practice')) newTags.push('training');
    if (text.includes('money') || text.includes('cost')) newTags.push('financial');
    if (text.includes('sleep') || text.includes('bed')) newTags.push('living');

    // Important keywords
    if (message.was_important) newTags.push('important');

    // Add unique tags to conversation
    if (!conversation.tags) conversation.tags = [];
    for (const tag of newTags) {
      if (!conversation.tags.includes(tag)) {
        conversation.tags.push(tag);
      }
    }
  }

  // Get default location name for context
  private getDefaultLocationName(context_type: ChatContextType): string {
    const locationNames: Record<ChatContextType, string> = {
      battle: 'Battle Arena',
      kitchen: 'Kitchen Table',
      confessional: 'Confessional Room',
      training: 'Training Grounds',
      therapy_individual: 'Therapy Office',
      therapy_group: 'Group Therapy Room',
      coaching_performance: 'Performance Review Room',
      coaching_equipment: 'Equipment Room',
      coaching_skill: 'Skill Development Center',
      coaching_personal: 'Personal Coaching Office',
      coaching_financial: 'Financial Planning Office',
      social_1: 'Social Area 1',
      social_2: 'Social Area 2',
      social_3: 'Social Area 3',
      real_estate: 'Real Estate Office',
      personal_trainer: 'Personal Training Area',
      simple_chat: 'Private Chat'
    };

    return locationNames[context_type] || 'Unknown Location';
  }

  // Save to localStorage
  private saveToStorage(): void {
    try {
      if (typeof window === 'undefined') return;

      const data = {
        conversations: Array.from(this.conversations.entries()),
        current_sessions: Array.from(this.current_sessions.entries())
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save conversation history:', error);
    }
  }

  // Load from localStorage
  private loadFromStorage(): void {
    try {
      if (typeof window === 'undefined') return;

      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.conversations = new Map(data.conversations || []);
        this.current_sessions = new Map(data.current_sessions || []);

        // Convert date strings back to Date objects
        for (const conversation of this.conversations.values()) {
          conversation.start_time = new Date(conversation.start_time);
          if (conversation.end_time) {
            conversation.end_time = new Date(conversation.end_time);
          }
          for (const message of conversation.messages) {
            message.timestamp = new Date(message.timestamp);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load conversation history:', error);
    }
  }

  // Cleanup old conversations
  private cleanup(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.maxHistoryDays);

    let cleanedCount = 0;

    for (const [id, conversation] of this.conversations.entries()) {
      // Don't delete bookmarked conversations
      if (conversation.is_bookmarked) continue;

      if (conversation.start_time < cutoffDate) {
        this.conversations.delete(id);
        cleanedCount++;
      }
    }

    // Also limit conversations per context
    const contextCounts: Record<string, string[]> = {};

    for (const [id, conversation] of this.conversations.entries()) {
      if (!contextCounts[conversation.context_type]) {
        contextCounts[conversation.context_type] = [];
      }
      contextCounts[conversation.context_type].push(id);
    }

    // Remove oldest conversations if over limit
    for (const [context, ids] of Object.entries(contextCounts)) {
      if (ids.length > this.maxConversationsPerContext) {
        const conversations = ids
          .map(id => ({ id, conversation: this.conversations.get(id)! }))
          .filter(({ conversation }) => !conversation.is_bookmarked)
          .sort((a, b) => a.conversation.start_time.getTime() - b.conversation.start_time.getTime());

        const toDelete = conversations.slice(0, -this.maxConversationsPerContext);
        for (const { id } of toDelete) {
          this.conversations.delete(id);
          cleanedCount++;
        }
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} old conversations`);
      this.saveToStorage();
    }
  }

  // Set up periodic cleanup
  private setupCleanupInterval(): void {
    // Clean up every hour
    setInterval(() => this.cleanup(), 60 * 60 * 1000);

    // Initial cleanup
    this.cleanup();
  }

  // Clear all history (with confirmation)
  clearAllHistory(): void {
    this.conversations.clear();
    this.current_sessions.clear();
    localStorage.removeItem(this.storageKey);
    console.log('🗑️  Cleared all conversation history');
  }
}

// Singleton instance
let instance: ConversationLogger | null = null;

export function getConversationLogger(): ConversationLogger {
  if (!instance) {
    instance = new ConversationLogger();
  }
  return instance;
}