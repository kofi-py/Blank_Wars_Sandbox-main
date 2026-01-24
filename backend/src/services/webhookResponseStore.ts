interface WebhookResponse {
  message_id: string;
  agent_id?: string;
  status: string;
  content?: string;
  text?: string;
  error?: string;
  timestamp: Date;
  received_at: Date;
}

interface PendingRequest {
  resolve: (response: WebhookResponse) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

export class WebhookResponseStore {
  private responses = new Map<string, WebhookResponse>();
  private pending_requests = new Map<string, PendingRequest>();
  private cleanup_interval: NodeJS.Timeout;

  constructor() {
    // Clean up old responses every 5 minutes
    this.cleanup_interval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  // Store a webhook response
  storeResponse(payload: any): void {
    const response: WebhookResponse = {
      message_id: payload.message_id,
      agent_id: payload.agent_id,
      status: payload.status || 'completed',
      content: payload.content,
      text: payload.text,
      error: payload.error,
      timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
      received_at: new Date()
    };

    console.log(`[WebhookStore] Storing response for message ${response.message_id}`);
    this.responses.set(response.message_id, response);

    // Check if anyone is waiting for this response
    const pending = this.pending_requests.get(response.message_id);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pending_requests.delete(response.message_id);
      pending.resolve(response);
      console.log(`[WebhookStore] Delivered response to waiting request for ${response.message_id}`);
    }
  }

  // Get a stored response
  getResponse(message_id: string): WebhookResponse | null {
    return this.responses.get(message_id) || null;
  }

  // Wait for a webhook response (with timeout)
  waitForResponse(message_id: string, timeout_ms: number = 30000): Promise<WebhookResponse> {
    if (!message_id) throw new Error('message_id required');
    
    return new Promise((resolve, reject) => {
      // guard: if already waiting, replace to avoid leak
      this.clear(message_id);
      
      // Check if response already exists
      const existing = this.responses.get(message_id);
      if (existing) {
        console.log(`[WebhookStore] Response already available for ${message_id}`);
        resolve(existing);
        return;
      }

      console.log('[WebhookStore] WAIT', message_id);

      // Set up timeout
      const timeout = setTimeout(() => {
        this.pending_requests.delete(message_id);
        reject(new Error(`webhook timeout for ${message_id}`));
      }, timeout_ms);

      // Store pending request
      this.pending_requests.set(message_id, {
        resolve: (v) => { this.clear(message_id); resolve(v); },
        reject: (e) => { this.clear(message_id); reject(e); },
        timeout
      });
    });
  }

  // Direct delivery method for webhook route
  deliver(message_id: string, payload: any): void {
    console.log('[WebhookStore] DELIVER', message_id);
    const pending = this.pending_requests.get(message_id);
    if (pending) {
      pending.resolve(payload);
    }
  }

  // Clear pending request helper
  clear(message_id: string): void {
    const entry = this.pending_requests.get(message_id);
    if (entry) {
      console.log('[WebhookStore] CLEAR', message_id);
      clearTimeout(entry.timeout);
      this.pending_requests.delete(message_id);
    }
  }

  // Get size for debugging
  size(): number {
    return this.pending_requests.size;
  }

  // Get all stored responses (for debugging)
  getAllResponses(): WebhookResponse[] {
    return Array.from(this.responses.values());
  }

  // Get pending request count (for health checks)
  getPendingCount(): number {
    return this.pending_requests.size;
  }

  // Clean up old responses and pending requests
  private cleanup(): void {
    const now = new Date();
    const max_age = 10 * 60 * 1000; // 10 minutes

    let cleaned = 0;
    for (const [message_id, response] of this.responses.entries()) {
      if (now.getTime() - response.received_at.getTime() > max_age) {
        this.responses.delete(message_id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[WebhookStore] Cleaned up ${cleaned} old responses`);
    }

    // Clean up any orphaned pending requests
    let pending_cleaned = 0;
    for (const [message_id, pending] of this.pending_requests.entries()) {
      // These should normally be cleared by timeout, but just in case
      clearTimeout(pending.timeout);
      this.pending_requests.delete(message_id);
      pending.reject(new Error('Cleanup timeout'));
      pending_cleaned++;
    }

    if (pending_cleaned > 0) {
      console.log(`[WebhookStore] Cleaned up ${pending_cleaned} orphaned pending requests`);
    }
  }

  // Shutdown cleanup
  destroy(): void {
    clearInterval(this.cleanup_interval);
    
    // Reject all pending requests
    for (const [message_id, pending] of this.pending_requests.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Service shutting down'));
    }
    
    this.pending_requests.clear();
    this.responses.clear();
  }
}

// Global singleton instance
export const webhook_response_store = new WebhookResponseStore();

// Graceful shutdown
process.on('SIGTERM', () => webhook_response_store.destroy());
process.on('SIGINT', () => webhook_response_store.destroy());