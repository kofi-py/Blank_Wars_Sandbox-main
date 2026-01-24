import { sendViaAIChat } from '../services/chatAdapter';
import apiClient from '../services/apiClient';


interface PerformanceMessage {
  id: string;
  session_id: string;
  speaker_id: string;
  speaker_name: string;
  speaker_type: 'player' | 'contestant';
  message: string;
  timestamp: Date;
}

interface PerformanceSession {
  id: string;
  character_id: string;
  session_history: PerformanceMessage[];
  start_time: Date;
}

export class PerformanceChatService {
  private active_sessions: Map<string, PerformanceSession> = new Map();

  /**
   * Start a new performance coaching session
   */
  async startSession(character_id: string): Promise<string> {
    const session_id = `performance_${Date.now()}_${character_id}`;

    const session: PerformanceSession = {
      id: session_id,
      character_id,
      session_history: [],
      start_time: new Date()
    };

    this.active_sessions.set(session_id, session);
    console.log('🏋️ [PERFORMANCE] Session started:', session_id);

    return session_id;
  }

  /**
   * Generate character response in performance coaching
   */
  async generateCharacterResponse(
    session_id: string,
    character_id: string,
    userchar_id: string,
    coach_message: string,
    character_name: string,
    coach_name: string
  ): Promise<string> {
    console.log('🏋️ [PERFORMANCE] Generating response for session_id:', session_id);

    const session = this.active_sessions.get(session_id);
    if (!session) {
      throw new Error(`Performance session not found: ${session_id}`);
    }

    // Build conversation history with speaker attribution
    const messages = session.session_history
      .filter(m => m.message.trim())
      .slice(-8);

    try {
      const result = await sendViaAIChat(session_id, {
        agent_key: character_id,
        character: character_id,
        message: coach_message,
        messages: messages,
        chat_type: 'performance',
        domain: 'performance',
        userchar_id: userchar_id,
      });

      const responseMessageId = `msg_${Date.now()}`;

      // Save coach message to history
      const coachMsg: PerformanceMessage = {
        id: `msg_${Date.now()}_coach`,
        session_id,
        speaker_id: 'coach',
        speaker_name: coach_name,
        speaker_type: 'player',
        message: coach_message,
        timestamp: new Date()
      };
      session.session_history.push(coachMsg);

      // Save character response to history
      const characterMsg: PerformanceMessage = {
        id: responseMessageId,
        session_id,
        speaker_id: userchar_id,
        speaker_name: character_name,
        speaker_type: 'contestant',
        message: result.text,
        timestamp: new Date()
      };
      session.session_history.push(characterMsg);

      console.log('🏋️ [PERFORMANCE] Response generated, history length:', session.session_history.length);

      return result.text;
    } catch (err) {
      console.error('🏋️ [PERFORMANCE] Error:', err);
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  /**
   * Get session by ID
   */
  getSession(session_id: string): PerformanceSession | undefined {
    return this.active_sessions.get(session_id);
  }

  /**
   * End a session
   */
  endSession(session_id: string): void {
    this.active_sessions.delete(session_id);
    console.log('🏋️ [PERFORMANCE] Session ended:', session_id);
  }
}

// Singleton instance
let performanceChatServiceInstance: PerformanceChatService | null = null;

export function getPerformanceChatService(): PerformanceChatService {
  if (!performanceChatServiceInstance) {
    performanceChatServiceInstance = new PerformanceChatService();
  }
  return performanceChatServiceInstance;
}

export const performanceChatService = getPerformanceChatService();
