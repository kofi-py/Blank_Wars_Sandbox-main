import axios from 'axios';
import responseStore from './responseStore';

class LocalAGIPoller {
  private polling_intervals: Map<string, NodeJS.Timeout>;
  private base_url: string;

  constructor() {
    this.polling_intervals = new Map();
    this.base_url = process.env.LOCALAI_URL || 'http://localhost:11435';
  }

  // Start polling for a specific agent and message
  startPolling(agent_id: string, message_id: string, interval_ms: number = 1000): void {
    const poll_key = `${agent_id}:${message_id}`;
    
    // Don't create duplicate polling
    if (this.polling_intervals.has(poll_key)) {
      return;
    }

    console.log(`🔄 Starting polling for ${agent_id} message ${message_id}`);

    const interval = setInterval(async () => {
      try {
        // Try different potential endpoints
        await this.checkForResponse(agent_id, message_id);
      } catch (error) {
        console.error(`Polling error for ${agent_id}:`, error);
      }
    }, interval_ms);

    this.polling_intervals.set(poll_key, interval);

    // Stop polling after 30 seconds
    setTimeout(() => {
      this.stopPolling(agent_id, message_id);
    }, 30000);
  }

  // Check various endpoints for response
  private async checkForResponse(agent_id: string, message_id: string): Promise<void> {
    try {
      // Try to get agent's recent activity
      // This is exploratory - we'll try different patterns
      
      // Pattern 1: Check if there's a messages endpoint
      try {
        const response = await axios.get(`${this.base_url}/api/agent/${agent_id}/messages`, {
          timeout: 2000
        });
        
        if (response.data && Array.isArray(response.data)) {
          const message = response.data.find((m: any) => m.id === message_id || m.message_id === message_id);
          if (message) {
            responseStore.storeResponse(agent_id, message_id, message.content || message.response || message.text);
            this.stopPolling(agent_id, message_id);
            return;
          }
        }
      } catch (e) {
        // This endpoint might not exist
      }

      // Pattern 2: Check agent status with details
      try {
        const response = await axios.get(`${this.base_url}/api/agent/${agent_id}`, {
          timeout: 2000
        });
        
        if (response.data?.last_message?.id === message_id) {
          responseStore.storeResponse(agent_id, message_id, response.data.last_message.response);
          this.stopPolling(agent_id, message_id);
          return;
        }
      } catch (e) {
        // This endpoint might not exist
      }

      // Pattern 3: Check conversation endpoint
      try {
        const response = await axios.get(`${this.base_url}/api/conversation/${agent_id}`, {
          timeout: 2000
        });
        
        if (response.data && Array.isArray(response.data)) {
          const last_message = response.data[response.data.length - 1];
          if (last_message?.role === 'assistant') {
            responseStore.storeResponse(agent_id, message_id, last_message.content);
            this.stopPolling(agent_id, message_id);
            return;
          }
        }
      } catch (e) {
        // This endpoint might not exist
      }

    } catch (error) {
      // Silently handle errors during exploration
    }
  }

  // Stop polling for a specific agent and message
  stopPolling(agent_id: string, message_id: string): void {
    const poll_key = `${agent_id}:${message_id}`;
    const interval = this.polling_intervals.get(poll_key);
    
    if (interval) {
      clearInterval(interval);
      this.polling_intervals.delete(poll_key);
      console.log(`⏹️ Stopped polling for ${agent_id} message ${message_id}`);
    }
  }

  // Stop all polling
  stopAllPolling(): void {
    for (const interval of this.polling_intervals.values()) {
      clearInterval(interval);
    }
    this.polling_intervals.clear();
    console.log('⏹️ Stopped all polling');
  }

  // Get polling stats
  getStats(): { active_polls: number; agents: string[] } {
    const agents = new Set<string>();
    for (const key of this.polling_intervals.keys()) {
      const [agent_id] = key.split(':');
      agents.add(agent_id);
    }

    return {
      active_polls: this.polling_intervals.size,
      agents: Array.from(agents)
    };
  }
}

export default new LocalAGIPoller();