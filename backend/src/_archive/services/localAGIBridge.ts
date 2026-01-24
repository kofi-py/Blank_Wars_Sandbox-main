import axios from 'axios';
import responseStore from './responseStore';

// Bridge service to connect LocalAGI responses to our system
class LocalAGIBridge {
  private local_agiurl: string;
  private backend_url: string;
  private monitoring_interval: NodeJS.Timeout | null;
  private message_tracker: Map<string, { agent_id: string; timestamp: number }>;

  constructor() {
    this.local_agiurl = process.env.LOCALAI_URL || 'http://localhost:11435';
    this.backend_url = 'http://localhost:3006';
    this.message_tracker = new Map();
    this.monitoring_interval = null;
  }

  // Start monitoring LocalAGI for responses
  startMonitoring(interval_ms: number = 2000): void {
    if (this.monitoring_interval) {
      console.log('🔄 LocalAGI Bridge already monitoring');
      return;
    }

    console.log('🌉 Starting LocalAGI Bridge monitoring...');
    
    this.monitoring_interval = setInterval(async () => {
      await this.checkForResponses();
    }, interval_ms);
  }

  // Stop monitoring
  stopMonitoring(): void {
    if (this.monitoring_interval) {
      clearInterval(this.monitoring_interval);
      this.monitoring_interval = null;
      console.log('⏹️ LocalAGI Bridge monitoring stopped');
    }
  }

  // Track a message that was sent
  trackMessage(message_id: string, agent_id: string): void {
    this.message_tracker.set(message_id, {
      agent_id,
      timestamp: Date.now()
    });
    console.log(`📝 Tracking message ${message_id} for agent ${agent_id}`);
  }

  // Check LocalAGI for new responses
  private async checkForResponses(): Promise<void> {
    try {
      // Get list of active agents
      const agents_response = await axios.get(`${this.local_agiurl}/api/agents`);
      const agents = agents_response.data.agents || [];

      for (const agent_id of agents) {
        await this.checkAgentResponses(agent_id);
      }

      // Clean up old tracked messages (older than 1 minute)
      const cutoff = Date.now() - 60000;
      for (const [message_id, data] of this.message_tracker.entries()) {
        if (data.timestamp < cutoff) {
          this.message_tracker.delete(message_id);
        }
      }
    } catch (error) {
      // Silently handle errors during monitoring
    }
  }

  // Check for responses from a specific agent
  private async checkAgentResponses(agent_id: string): Promise<void> {
    try {
      // Try to get agent conversation or status
      // This is exploratory - we need to find where LocalAGI stores responses
      
      // Option 1: Check if there's a conversation endpoint
      try {
        const response = await axios.get(`${this.local_agiurl}/api/agent/${agent_id}/conversation`, {
          timeout: 1000
        });
        
        if (response.data && Array.isArray(response.data)) {
          await this.processConversation(agent_id, response.data);
        }
      } catch (e) {
        // Endpoint might not exist
      }

      // Option 2: Check agent state
      try {
        const response = await axios.get(`${this.local_agiurl}/api/agent/${agent_id}`, {
          timeout: 1000
        });
        
        if (response.data?.last_response) {
          await this.processResponse(agent_id, response.data.last_response);
        }
      } catch (e) {
        // Endpoint might not exist
      }

    } catch (error) {
      // Silently handle errors
    }
  }

  // Process a conversation array
  private async processConversation(agent_id: string, conversation: any[]): Promise<void> {
    // Look for assistant messages that we haven't processed
    for (let i = 0; i < conversation.length; i++) {
      const message = conversation[i];
      
      if (message.role === 'assistant' && message.content) {
        // Check if this is a response to a tracked message
        // We'll use timing heuristics since we don't have message IDs from LocalAGI
        
        for (const [message_id, data] of this.message_tracker.entries()) {
          if (data.agent_id === agent_id) {
            // Found a potential match
            console.log(`🎭 Found response from ${agent_id}`);
            
            // Store the response
            responseStore.storeResponse(agent_id, message_id, message.content);
            
            // Remove from tracker
            this.message_tracker.delete(message_id);
            
            // Also send to our webhook for redundancy
            try {
              await axios.post(`${this.backend_url}/api/webhook/response`, {
                agent_id: agent_id,
                message_id: message_id,
                content: message.content
              });
            } catch (e) {
              // Webhook might fail, but response is already stored
            }
            
            break;
          }
        }
      }
    }
  }

  // Process a single response
  private async processResponse(agent_id: string, response: any): Promise<void> {
    const content = response.content || response.text || response.message;
    
    if (!content) return;

    // Find the most recent tracked message for this agent
    let latest_message_id: string | null = null;
    let latest_timestamp = 0;

    for (const [message_id, data] of this.message_tracker.entries()) {
      if (data.agent_id === agent_id && data.timestamp > latest_timestamp) {
        latest_message_id = message_id;
        latest_timestamp = data.timestamp;
      }
    }

    if (latest_message_id) {
      console.log(`🎭 Processing response for ${agent_id}`);
      
      // Store the response
      responseStore.storeResponse(agent_id, latest_message_id, content);
      
      // Remove from tracker
      this.message_tracker.delete(latest_message_id);
      
      // Send to webhook
      try {
        await axios.post(`${this.backend_url}/api/webhook/response`, {
          agent_id: agent_id,
          message_id: latest_message_id,
          content: content
        });
      } catch (e) {
        // Webhook might fail, but response is already stored
      }
    }
  }

  // Get bridge stats
  getStats(): { tracking: number; monitoring: boolean } {
    return {
      tracking: this.message_tracker.size,
      monitoring: this.monitoring_interval !== null
    };
  }
}

export default new LocalAGIBridge();