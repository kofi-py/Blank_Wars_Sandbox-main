// Response storage and retrieval system for LocalAGI messages
interface AgentMessage {
  message_id: string;
  agent_id: string;
  content: string;
  timestamp: Date;
  retrieved: boolean;
}

class ResponseStore {
  private messages: Map<string, AgentMessage[]>;
  private message_by_id: Map<string, AgentMessage>;
  private pending_requests: Map<string, (message: string) => void>;

  constructor() {
    this.messages = new Map();
    this.message_by_id = new Map();
    this.pending_requests = new Map();
  }

  // Store a message response from an agent
  storeResponse(agent_id: string, message_id: string, content: string): void {
    const message: AgentMessage = {
      message_id,
      agent_id,
      content,
      timestamp: new Date(),
      retrieved: false
    };

    // Store by agent ID
    if (!this.messages.has(agent_id)) {
      this.messages.set(agent_id, []);
    }
    this.messages.get(agent_id)!.push(message);

    // Store by message ID for quick lookup
    this.message_by_id.set(message_id, message);

    // Check if there's a pending request waiting for this message
    const pending_key = `${agent_id}:${message_id}`;
    if (this.pending_requests.has(pending_key)) {
      const resolver = this.pending_requests.get(pending_key)!;
      resolver(content);
      this.pending_requests.delete(pending_key);
      message.retrieved = true;
    }

    console.log(`📥 Stored response from ${agent_id}: ${message_id}`);
  }

  // Get all messages for an agent
  getAgentMessages(agent_id: string, mark_as_retrieved: boolean = false): AgentMessage[] {
    const messages = this.messages.get(agent_id) || [];
    
    if (mark_as_retrieved) {
      messages.forEach(msg => msg.retrieved = true);
    }

    return messages;
  }

  // Get unread messages for an agent
  getUnreadMessages(agent_id: string): AgentMessage[] {
    const messages = this.messages.get(agent_id) || [];
    return messages.filter(msg => !msg.retrieved);
  }

  // Wait for a specific message (with timeout)
  async waitForMessage(agent_id: string, message_id: string, timeout_ms: number = 30000): Promise<string> {
    // Check if message already exists
    const existing = this.message_by_id.get(message_id);
    if (existing) {
      existing.retrieved = true;
      return existing.content;
    }

    // Wait for message to arrive
    return new Promise((resolve, reject) => {
      const pending_key = `${agent_id}:${message_id}`;
      
      // Set up timeout
      const timeout = setTimeout(() => {
        this.pending_requests.delete(pending_key);
        reject(new Error(`Timeout waiting for message ${message_id} from agent ${agent_id}`));
      }, timeout_ms);

      // Store resolver for when message arrives
      this.pending_requests.set(pending_key, (content: string) => {
        clearTimeout(timeout);
        resolve(content);
      });
    });
  }

  // Get the latest message from an agent
  getLatestMessage(agent_id: string): AgentMessage | null {
    const messages = this.messages.get(agent_id) || [];
    return messages.length > 0 ? messages[messages.length - 1] : null;
  }

  // Clear old messages (cleanup)
  clearOldMessages(max_age_ms: number = 3600000): void {
    const cutoff = new Date(Date.now() - max_age_ms);
    
    for (const [agent_id, messages] of this.messages.entries()) {
      const filtered = messages.filter(msg => msg.timestamp > cutoff);
      if (filtered.length === 0) {
        this.messages.delete(agent_id);
      } else {
        this.messages.set(agent_id, filtered);
      }
    }

    // Clean up message_by_id map
    for (const [message_id, message] of this.message_by_id.entries()) {
      if (message.timestamp <= cutoff) {
        this.message_by_id.delete(message_id);
      }
    }
  }

  // Get stats
  getStats(): { total_messages: number; agents: number; pending: number } {
    let total_messages = 0;
    for (const messages of this.messages.values()) {
      total_messages += messages.length;
    }

    return {
      total_messages,
      agents: this.messages.size,
      pending: this.pending_requests.size
    };
  }
}

export default new ResponseStore();