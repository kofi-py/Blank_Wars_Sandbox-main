// Transport abstraction for chat backends.
// Preserve Open_ai-era contract and swap engines here.
// NOTE: We intentionally throw on errors/timeouts to let the route map to HTTP 5xx/504.

// Internal game terminology
export type GameChatMessage = { role: 'system' | 'coach' | 'contestant'; content: string };
// OpenAI API format (for compatibility)
export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

// Map game roles to OpenAI roles
function mapToOpenAIRole(role: 'system' | 'coach' | 'contestant'): 'system' | 'user' | 'assistant' {
  if (role === 'coach') return 'user';
  if (role === 'contestant') return 'assistant';
  return 'system'; // system stays as system for OpenAI context
}
export type ChatRequest = {
  agent_key: string;           // your persona/agent identifier
  messages: ChatMessage[];    // same structure as before
  max_tokens?: number;
  temperature?: number;
  timeout_ms?: number;         // SLA; AbortController honored by adapter
  chat_id?: string;            // chat identifier for LocalAGI
  stream?: boolean;
  correlation_id?: string;     // for tracing
};
export type ChatResult = { text: string };

export interface ChatTransport {
  sendMessage(req: ChatRequest): Promise<ChatResult>;
  // on_chunk: raw text chunks; adapter is responsible for parsing
  sendMessageStream?(req: ChatRequest, on_chunk: (chunk: string) => void): Promise<void>;
}

// ---- Open_ai adapter (kept for parity/back-compat). Not default. ----
export class Open_aiAdapter implements ChatTransport {
  constructor(private opts: { api_key: string; model: string }) {}
  async sendMessage(_req: ChatRequest): Promise<ChatResult> {
    // Implement if/when you want to flip back to Open_ai temporarily.
    throw new Error('Open_aiAdapter not wired in this patch.');
  }
  async sendMessageStream(_req: ChatRequest, _on_chunk: (t: string) => void) {
    throw new Error('Open_aiAdapter (stream) not wired in this patch.');
  }
}

// ---- LocalAGI adapter (delegates to your existing LocalAGI HTTP entrypoint or service) ----
// We keep behavior strict: if LocalAGI returns empty/timeout -> throw.
export class LocalAGIAdapter implements ChatTransport {
  constructor(private opts: { base_url?: string } = {}) {}
  async sendMessage(req: ChatRequest): Promise<ChatResult> {
    // Import the LocalAGIService and call with its actual API signature
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('./prompt_assembly_service');
    const prompt_assembly_service = mod.prompt_assembly_service ?? mod.default ?? mod;
    if (!prompt_assembly_service?.sendMessage) {
      throw new Error('prompt_assembly_service.sendMessage not available');
    }
    
    // Use the first user message (LocalAGI API expects single message)
    const user_message = req.messages.find(m => m.role === 'user') as { role: 'user'; content: string } | undefined;
    if (!user_message) throw new Error('No user message found');
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeout_id = req.timeout_ms ? setTimeout(() => controller.abort(), req.timeout_ms) : null;
    
    if (process.env.AGI_DEBUG === '1' || process.env.AGI_DEBUG === 'true') {
      console.log(`[Transport:${req.correlation_id || 'no-id'}] sendMessage (non-stream)`, {
        agent_key: req.agent_key,
        chat_id: req.chat_id,
        user_len: (req.messages.find(m => m.role === 'user')?.content || '').length,
        max_tokens: req.max_tokens,
        temperature: req.temperature,
      });
    }

    try {
      const text: string = await prompt_assembly_service.sendMessage(
        req.agent_key,
        { role: 'user', content: user_message.content },
        {
          signal: controller.signal,
          llm: {
            max_output_tokens: req.max_tokens,
            temperature: req.temperature,
          },
          chat_id: req.chat_id,
          correlation_id: req.correlation_id,
        }
      );
      
      if (!text || !text.trim()) throw new Error('LocalAGI returned no text');
      return { text };
    } finally {
      if (timeout_id) clearTimeout(timeout_id);
    }
  }
  async sendMessageStream(_req: ChatRequest, _on_chunk: (chunk: string) => void): Promise<void> {
    throw new Error('LocalAGI streaming not implemented');
  }
}

// Single factory; flips by env
export function getTransport(): ChatTransport {
  const t = (process.env.CHAT_TRANSPORT || 'localagi').toLowerCase();
  if (t === 'openai') {
    return new Open_aiAdapter({
      api_key: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    });
  }
  return new LocalAGIAdapter({ base_url: process.env.LOCALAGI_URL || 'http://localhost:4000' });
}
