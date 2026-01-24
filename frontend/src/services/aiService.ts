import apiClient from './apiClient';

interface AIResponse {
  success: boolean;
  response?: string;
  character_id?: string;
  session_id?: string;
  error?: string;
}

interface ConversationContext {
  other_characters?: string[];
  current_topic?: string;
  emotional_state?: string;
  use_custom_prompt?: boolean;
}

class AIService {
  private session_id: string;

  constructor() {
    this.session_id = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Test connection to LocalAI
  async testConnection(): Promise<boolean> {
    try {
      const response = await apiClient.get('/ai/test');
      const data = response.data;
      return data.success && data.connected;
    } catch (error) {
      console.error('AI connection test failed:', error);
      return false;
    }
  }

  // Generate a character response using AI
  async generateCharacterResponse(
    character_id: string,
    prompt: string,
    context?: ConversationContext
  ): Promise<string> {
    try {
      const response = await apiClient.post('/ai/generate-response', {
        character_id,
        prompt,
        session_id: this.session_id,
        context
      });

      const data: AIResponse = response.data;

      if (data.success && data.response) {
        return data.response;
      } else {
        throw new Error(data.error || 'Failed to generate response');
      }
    } catch (error) {
      console.error(`AI response generation failed for ${character_id}:`, error);
      return this.getFallbackResponse(character_id);
    }
  }

  // Generate responses for multiple characters in a conversation
  async generateConversationResponse(
    trigger_character_id: string,
    trigger_message: string,
    all_characters: string[],
    current_topic?: string
  ): Promise<{ character_id: string, response: string }[]> {
    const responses: { character_id: string, response: string }[] = [];

    // Other characters respond to the trigger message
    const otherCharacters = all_characters.filter(id => id !== trigger_character_id);

    for (const character_id of otherCharacters) {
      // Create a prompt that includes the trigger character's message
      const prompt = `${this.getCharacterName(trigger_character_id)} just said: "${trigger_message}"\n\nRespond as ${this.getCharacterName(character_id)} would respond to this statement.`;

      const context: ConversationContext = {
        other_characters: all_characters,
        current_topic,
        emotional_state: 'engaged' // Could be dynamic based on the situation
      };

      const response = await this.generateCharacterResponse(character_id, prompt, context);
      responses.push({ character_id, response });
    }

    return responses;
  }

  // Set memory for a character
  async setCharacterMemory(character_id: string, key: string, value: string | number | boolean): Promise<boolean> {
    try {
      const response = await apiClient.post('/ai/memory/set', {
        character_id,
        session_id: this.session_id,
        key,
        value
      });

      const data = response.data;
      return data.success;
    } catch (error) {
      console.error('Failed to set character memory:', error);
      return false;
    }
  }

  // Get memory for a character
  async getCharacterMemory(character_id: string, key: string): Promise<any> {
    try {
      const response = await apiClient.get(`/ai/memory/${character_id}/${this.session_id}/${key}`);
      const data = response.data;
      return data.success ? data.value : null;
    } catch (error) {
      console.error('Failed to get character memory:', error);
      return null;
    }
  }

  // Clear the current session
  async clearSession(): Promise<boolean> {
    try {
      const response = await apiClient.delete(`/ai/session/${this.session_id}`);
      const data = response.data;

      if (data.success) {
        this.session_id = this.generateSessionId(); // Generate new session ID
      }

      return data.success;
    } catch (error) {
      console.error('Failed to clear session:', error);
      return false;
    }
  }

  // Get current session ID
  getSessionId(): string {
    return this.session_id;
  }

  // Helper to get character display names
  private getCharacterName(character_id: string): string {
    const names = {
      'einstein': 'Albert Einstein',
      'achilles': 'Achilles',
      'julius_caesar': 'Julius Caesar',
      'joan_of_arc': 'Joan of Arc',
      'dracula': 'Count Dracula'
    };
    return names[character_id as keyof typeof names] || character_id;
  }

  // Fallback responses when AI fails
  private getFallbackResponse(character_id: string): string {
    const fallbacks = {
      'einstein': "The complexity of this situation requires further contemplation...",
      'achilles': "By Zeus, this matter demands careful consideration!",
      'julius_caesar': "The Senate must deliberate on this issue.",
      'joan_of_arc': "Let us seek divine guidance in this matter.",
      'dracula': "The shadows conceal the answer... for now."
    };

    return fallbacks[character_id as keyof typeof fallbacks] ||
      "I find myself at a loss for words...";
  }

  // Generate topic-based conversation starter
  async generateConversationStarter(topic: string, characters: string[]): Promise<{ character_id: string, message: string }> {
    const randomCharacter = characters[Math.floor(Math.random() * characters.length)];
    const prompt = `Start a conversation about "${topic}" as ${this.getCharacterName(randomCharacter)} would. Make it engaging and true to the character's personality.`;

    const context: ConversationContext = {
      other_characters: characters,
      current_topic: topic
    };

    const response = await this.generateCharacterResponse(randomCharacter, prompt, context);

    return {
      character_id: randomCharacter,
      message: response
    };
  }
}

export default new AIService();