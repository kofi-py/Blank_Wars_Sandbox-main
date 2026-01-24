import axios from 'axios';
import dotenv from 'dotenv';
import { encode } from 'gpt-3-encoder'; // for token counting
import { Readable } from 'node:stream';
import { webhookResponseStore } from './webhookResponseStore';
import EventContextService from './eventContextService';

const AGI_DEBUG = process.env.AGI_DEBUG === '1' || process.env.AGI_DEBUG === 'true';
const MAX_COMPLETION_TOKENS = Number(process.env.MAX_COMPLETION_TOKENS ?? 100);
function redact<T extends Record<string, any>>(o: T): T {
  const clone = { ...o };
  if ('Authorization' in clone) (clone as any).Authorization = '[redacted]';
  return clone as T;
}

export class DigestUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DigestUnavailableError';
  }
}
dotenv.config();

const ENABLE_POLL_FALLBACK =
  (process.env.LOCALAGI_ENABLE_POLL_FALLBACK ?? 'false').toLowerCase() === 'true';

interface MessageResponse {
  message_id?: string;
  status?: string;
  content?: string;
  text?: string;
  error?: string;
  final?: boolean;
}

interface LocalAGIConfig {
  baseURL: string;
}

interface AgentConfig {
  name: string;
  prompt: string;
  model: string;
}

interface AgentState {
  agentId: string;
  tokensUsed: number;
  modelMaxTokens: number;
  relayThreshold: number; // percentage before triggering relay
}

interface SendMessageOptions {
  chatId?: string;
  sessionId?: string;
  signal?: AbortSignal;
  correlationId?: string;
  llm?: {
    max_output_tokens?: number;
    max_tokens?: number;
    max_new_tokens?: number;
    temperature?: number;
    stream?: boolean;
    stop?: string[];
  };
}

// Sanitize input for safe filename usage
const sanitize = (s: string): string => s.replace(/[^A-Za-z0-9._:-]+/g, '_');

class WebhookTimeoutError extends Error {
  status = 504;
  constructor(message: string, public meta?: Record<string, any>) {
    super(message);
    this.name = 'WebhookTimeoutError';
  }
}

export class LocalAGIService {
  private config: LocalAGIConfig;
  private agents: Record<string, AgentState> = {};

  constructor() {
    this.config = {
      baseURL: process.env.LOCAL_AGI_BASE_URL || 'http://localhost:8080',
    };
  }

  private log(message: string) {
    if (process.env.AGI_DEBUG === '1') {
      console.debug(`[LocalAGI] ${message.slice(0, 400)}`);
    }
  }

  async createAgent(agentKey: string, agentConfig: AgentConfig, reinjectedMemory?: string): Promise<string> {
    const startingPrompt = reinjectedMemory
      ? `${agentConfig.prompt}\n\n[Memory from last session:]\n${reinjectedMemory}`
      : agentConfig.prompt;

    this.log(`Creating agent for key: ${agentKey}`);
    
    // Enhanced agent creation payload with long-term memory support
    const agentPayload = {
      ...agentConfig,
      prompt: startingPrompt,
      long_term_memory: true,  // Enable long-term memory
      local_rag_url: process.env.LOCAL_RAG_URL,  // For LocalRAG integration
      LocalRAGURL: process.env.LOCAL_RAG_URL,    // Alternative field name
    };

    // Only include RAG URLs if they're configured
    if (!process.env.LOCAL_RAG_URL) {
      delete agentPayload.local_rag_url;
      delete agentPayload.LocalRAGURL;
    } else {
      this.log(`Agent ${agentKey} configured with RAG URL: ${process.env.LOCAL_RAG_URL}`);
    }

    try {
      const res = await axios.post(`${this.config.baseURL}/api/agent/create`, agentPayload);
      
      const agentId = res.data.agentId || agentKey; // fallback to agentKey if no agentId returned
      this.agents[agentKey] = {
        agentId,
        tokensUsed: encode(startingPrompt).length,
        modelMaxTokens: agentConfig.model.includes('16k') ? 16000 : 8000,
        relayThreshold: 0.8,
      };

      await this.waitUntilReady(agentId);
      return agentId;
    } catch (error: any) {
      // If agent already exists, that's fine - we can use it
      if (error.response?.data?.error?.includes('already exists')) {
        this.log(`Agent ${agentKey} already exists, using existing agent`);
        // Set the agent details anyway
        this.agents[agentKey] = {
          agentId: agentKey, // Use the agentKey as the agentId
          tokensUsed: encode(startingPrompt).length,
          modelMaxTokens: agentConfig.model.includes('16k') ? 16000 : 8000,
          relayThreshold: 0.8,
        };
        await this.waitUntilReady(agentKey);
        return agentKey;
      }
      // Re-throw other errors
      throw error;
    }
  }

  private async waitUntilReady(agentId: string) {
    this.log(`Waiting for agent ${agentId} to be ready...`);
    let ready = false;
    for (let i = 0; i < 30; i++) {
      try {
        const status = await axios.get(`${this.config.baseURL}/api/agent/status/${agentId}`);
        if (status.data.state === 'ready' || status.data.status === 'ready') {
          ready = true;
          break;
        }
      } catch (error) {
        // If status endpoint doesn't exist, assume agent is ready after creation
        this.log(`Status endpoint not available, assuming agent ${agentId} is ready`);
        ready = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    if (!ready) throw new Error(`Agent ${agentId} did not become ready in time.`);
    this.log(`Agent ${agentId} is ready.`);
  }

  private async triggerRelay(agentKey: string) {
    const agentState = this.agents[agentKey];
    if (!agentState) return;

    this.log(`Triggering relay for agent ${agentKey}...`);
    const handoffNote = await this.sendMessage(agentKey, {
      role: 'system',
      content: 'Write a concise handoff note in your own voice summarizing all important facts, events, and states so far so a fresh version of you can continue seamlessly.',
    }, { chatId: 'relay' }); // Internal relay operation

    const oldAgentId = agentState.agentId;
    // Get the personality from the existing system
    const personality = this.getCharacterPersonality(agentKey);
    const newAgentId = await this.createAgent(agentKey, {
      name: agentKey,
      prompt: personality,
      model: 'llama-3.2-3b-instruct', // match your current model
    }, handoffNote);

    this.log(`Relay complete: ${oldAgentId} → ${newAgentId}`);
  }


// Financial primer disabled - using semantic session state (no kvserver)
async sendPrimerKV(params: { agentKey: string; sessionId: string; digest: string }): Promise<void> {
  const { agentKey, sessionId, digest } = params;
  console.log(`[BW] PRIMER send agent=${agentKey} sid=${sessionId} bytes=${digest.length} - DISABLED (semantic session state only)`);
  return;
}
  /**
   * Build financial coaching digest for a character in a specific scene.
   * - Uses user-scoped character finances (user_characters) when available.
   * - Falls back to character/global financial context (real sources only).
   * - Returns '' to signal 503 when no real data exists.
   */
  async buildFinancialDigest(
    characterId: string,
    currentTopic: string = 'budget',
    userId: string // required - route enforces auth
  ): Promise<string> {
    const ecs = EventContextService.getInstance();

    // Try to get character-specific financial context first (from user_characters table)
    let financial = '';
    if (ecs.getCharacterFinancialContext) {
      financial = await ecs.getCharacterFinancialContext(userId, characterId);
    }
    
    // Fallback to general financial context if no user-specific data
    if (!financial && ecs.getFinancialContext) {
      financial = await ecs.getFinancialContext(characterId);
    }

    // Explicit fail-fast after building financial
    if (!financial || !financial.trim()) {
      throw new DigestUnavailableError('empty financial context');
    }

    // Pull optional contexts
    const [therapy, kitchen, comedyRefs] = await Promise.all([
      ecs.getTherapyContext ? ecs.getTherapyContext(characterId) : Promise.resolve(''),
      ecs.getKitchenContext ? ecs.getKitchenContext(characterId) : Promise.resolve(''),
      Promise.resolve(ecs.getComedyContext(characterId, 'financial_advisor', currentTopic)),
    ]);

    // Primer log with trace data
    console.log(`[BW] PRIMER financial user=${userId} character=${characterId} topic=${currentTopic} role=contestant`);

    // Compose digest strictly from real sources (no invented text)
    return [
      '# ROLE SETUP',
      '- You are the CONTESTANT: reply **as the character** being coached by the human user.',
      '- The USER is your **financial coach**. Stay in character while being coached.',
      '',
      '# FINANCIAL SESSION CONTEXT',
      financial,
      '',
      '# RELEVANT PERSONAL CONTEXT (therapy, living, conflicts)',
      therapy || '',
      kitchen || '',
      '',
      '# COMEDY REFERENCES (use sparingly, only if natural)',
      comedyRefs || '',
    ].filter(Boolean).join('\n');
  }

  async sendMessage(agentKey: string, message: { role: string; content: string }, options: SendMessageOptions = {}): Promise<string> {
    // BWKV enhancer bridge disabled – using semantic session state only

    const opts = options ?? {};
    const isInternal = opts.chatId === 'relay'; // Treat relay operations as internal
    const agentState = this.agents[agentKey];
    
    // If agent doesn't exist, create it
    if (!agentState) {
      // Check if this is a financial domain message
      const isFinancialContext = message.content.includes('financial coach') || 
                                 message.content.includes('meeting with your financial coach');
      
      // Check if this is a therapy domain message (contains unified persona)
      const isTherapyContext = message.content.includes('CHARACTER:') && 
                              (message.content.includes('THERAPY ANCHORS:') || message.content.includes('THERAPEUTIC APPROACH:'));
      
      let personality: string;
      if (isFinancialContext) {
        // For financial context, use the prompt from the message which already has the correct financial system prompt
        // Extract just the system part before the session data
        const systemMatch = message.content.match(/^(.*?)(?:\n\nSESSION DATA:|FACTS \(internal\):|$)/s);
        personality = systemMatch ? systemMatch[1] : this.getCharacterPersonality(agentKey);
      } else if (isTherapyContext) {
        // For therapy context, use the unified persona from the message instead of hardcoded personality
        // Extract the persona part before any session data
        const personaMatch = message.content.match(/^(.*?)(?:\n\nTHE THERAPIST IS SPEAKING|MEMORY CONTEXT:|[THERAPY_MODE_BASE_PROMPT]|$)/s);
        personality = personaMatch ? personaMatch[1] : this.getCharacterPersonality(agentKey);
      } else {
        personality = this.getCharacterPersonality(agentKey);
      }
      
      await this.createAgent(agentKey, {
        name: agentKey,
        prompt: personality,
        model: 'llama-3.2-3b-instruct',
      });
    }

    const currentAgentState = this.agents[agentKey];
    if (!currentAgentState) throw new Error(`No agent found for key: ${agentKey}`);

    // Token counting
    const tokens = encode(message.content).length;
    currentAgentState.tokensUsed += tokens;

    // Relay if near threshold - DISABLED: agents are stateless, relay makes no sense
    // if (!isInternal && currentAgentState.tokensUsed >= currentAgentState.modelMaxTokens * currentAgentState.relayThreshold) {
    //   await this.triggerRelay(agentKey);
    //   return 'Relay triggered, continuing with fresh memory context...';
    // }

    try {
      this.log(`Sending message to ${agentKey} via LocalAGI`);
      
      // Construct session ID for persistent memory (centralized + sanitized)
      if (!opts.chatId) throw new Error("chatId required for character chats");
      const sessionId = `bw:${sanitize(agentKey)}:${sanitize(opts.chatId)}`;
      console.log('BW session_id →', sessionId);
      
      // ✅ Correct LocalAGI router endpoint + payload:
      const url = `${this.config.baseURL}/api/chat/${agentKey}`;
      
      // Build webhook URL that LocalAGI container can reach
      const webhookBase = process.env.AGI_WEBHOOK_PUBLIC_BASE || process.env.PUBLIC_BACKEND_BASE_URL;
      const webhookPath = process.env.AGI_WEBHOOK_PATH || '/api/webhook/response';
      const webhookUrl = webhookBase ? `${webhookBase}${webhookPath}` : undefined;
      
      const payload: any = { 
        message: message.content,
        session_id: sessionId,
        chatId: opts.chatId,
        ...(webhookUrl && { webhook_url: webhookUrl })
      };
      
      if (webhookUrl) {
        console.log(`[LocalAGI] Including webhook URL for callback: ${webhookUrl}`);
      }
      
      // Preserve caller options first, then set cap synonyms
      payload.llm = { 
        temperature: 0.7, 
        stream: false,
        ...(opts.llm || {})
      };
      
      // Only set token limits when explicitly provided - no fallback to MAX_COMPLETION_TOKENS
      const userLlm = opts.llm || {};
      const cap = userLlm.max_output_tokens || userLlm.max_tokens || userLlm.max_new_tokens;
      
      if (cap) {
        // Set all three synonyms to ensure provider compatibility
        payload.llm.max_output_tokens = cap;
        payload.llm.max_tokens = cap;
        payload.llm.max_new_tokens = cap;
      }
      
      if (AGI_DEBUG) {
        console.log(`[LocalAGI:${opts?.correlationId || 'no-id'}] POST /api/chat/${agentKey}`, {
          chatId: opts?.chatId,
          msgLen: (message?.content || '').length,
          hasSignal: !!opts?.signal,
          capFields: {
            max_output_tokens: payload.llm.max_output_tokens,
            max_tokens: payload.llm.max_tokens, 
            max_new_tokens: payload.llm.max_new_tokens
          },
          otherLlm: {
            stream: payload.llm.stream,
            temperature: payload.llm.temperature
          }
        });
        
        // Capture full prompts for analysis
        console.log(`📝 FULL PROMPT FOR ${agentKey}:`, message.content);
      }
      
      console.log('[localAGI] POST', url, 'payload keys=', Object.keys(payload));
      if (!opts.chatId) throw new Error('chatId required for character chats');
      if (!sessionId) throw new Error('session_id/user is required');
      
      let chatResponse;
      try {
        chatResponse = await axios.post(
          url,
          payload,
          { 
            timeout: 120000,
            headers: { 'Content-Type': 'application/json' },
            signal: opts.signal,
            validateStatus: () => true,
          }
        );

        if (AGI_DEBUG) {
          console.log('[LocalAGI] RESP', {
            status: chatResponse.status,
            ok: chatResponse.status >= 200 && chatResponse.status < 300,
            dataType: typeof chatResponse.data,
            keys: chatResponse?.data && typeof chatResponse.data === 'object' ? Object.keys(chatResponse.data) : String(chatResponse.data).slice(0, 120),
          });
        }

        if (chatResponse.status < 200 || chatResponse.status >= 300) {
          const errBody = typeof chatResponse.data === 'object' ? JSON.stringify(chatResponse.data).slice(0, 2000) : String(chatResponse.data).slice(0, 2000);
          throw new Error(`[LocalAGI] ${chatResponse.status} ${chatResponse.statusText || ''} body=${errBody}`);
        }
      } catch (e: any) {
        // Axios/network error path
        const status = e?.response?.status;
        const data = e?.response?.data;
        if (AGI_DEBUG) {
          console.error('[LocalAGI] ERROR', {
            kind: 'axios',
            status,
            data: (typeof data === 'object' ? JSON.stringify(data).slice(0, 2000) : String(data || '').slice(0, 2000)),
            message: e?.message,
          });
        }
        throw e;
      }
      
      // LocalAGI router returns message_id immediately
      const messageId = chatResponse.data?.message_id;
      if (!messageId) {
        throw new Error('LocalAGI: missing message_id in response');
      }

      this.log(`Message sent, received message_id: ${messageId}`);

      // Check if webhook is configured (preferred method)
      const useWebhook = process.env.USE_AGI_WEBHOOK === 'true';
      if (useWebhook) {
        this.log(`Using webhook mode for message ${messageId} (preferred)`);
        return await this.waitForWebhookResponse(messageId, agentKey);
      }

      // Use polling fallback
      this.log(`Using polling fallback for message ${messageId}`);
      return await this.pollForResponse(messageId, agentKey);
      
    } catch (err: any) {
      this.log(`Error in sendMessage for ${agentKey}: ${err.message}`);
      throw err; // fail-fast

    }
  }

  async sendMessageStream(
    agentKey: string,
    message: { role: string; content: string },
    opts: SendMessageOptions = {}
  ): Promise<Readable> {
    const sessionId = opts.sessionId || `stream_${Date.now()}`;
    const url = `${this.config.baseURL}/api/chat/${agentKey}`;
    const payload: any = {
      message: message.content,
      session_id: sessionId,
      chatId: opts.chatId
    };
    
    // Preserve caller options first, then set cap synonyms
    payload.llm = { 
      temperature: 0.7, 
      stream: true,
      ...(opts.llm || {})
    };
    
    // Only set token limits when explicitly provided - no fallback to MAX_COMPLETION_TOKENS
    const userLlm = opts.llm || {};
    const cap = userLlm.max_output_tokens || userLlm.max_tokens || userLlm.max_new_tokens;
    
    if (cap) {
      // Set all three synonyms to ensure provider compatibility
      payload.llm.max_output_tokens = cap;
      payload.llm.max_tokens = cap;
      payload.llm.max_new_tokens = cap;
    }

    if (!opts.chatId) throw new Error('chatId required for character chats');

    if (AGI_DEBUG) {
      console.log(`[LocalAGI:${opts?.correlationId || 'no-id'}] Stream POST /api/chat/${agentKey}`, {
        sessionId,
        capFields: {
          max_output_tokens: payload.llm.max_output_tokens,
          max_tokens: payload.llm.max_tokens, 
          max_new_tokens: payload.llm.max_new_tokens
        }
      });
      
      // Capture full prompts for analysis
      console.log(`📝 FULL STREAM PROMPT FOR ${agentKey}:`, message.content);
    }
    
    this.log(`[localAGI] Stream POST ${url} session=${sessionId}`);
    
    const response = await axios.post(url, payload, {
      responseType: 'stream',
      signal: opts.signal,
      timeout: 0, // no timeout for streams
    });

    // Return the stream directly
    return response.data as Readable;
  }

  private async waitForWebhookResponse(messageId: string, agentKey: string): Promise<string> {
    const webhookTimeout = Number(process.env.AGI_WAIT_MS || 120000);
    
    console.log('[LocalAGI] message_id', messageId, 'waiting', webhookTimeout, 'ms');
    
    try {
      const response = await webhookResponseStore.waitForResponse(messageId, webhookTimeout);
      
      const responseText = response.content || response.text || '';
      if (responseText) {
        this.log(`Webhook response received for ${messageId}: ${responseText.substring(0, 100)}...`);
        
        // Update token count
        const currentAgentState = this.agents[agentKey];
        if (currentAgentState) {
          currentAgentState.tokensUsed += encode(responseText).length;
        }
        
        return responseText;
      } else {
        this.log(`Webhook response for ${messageId} has no content`);
        throw new Error('LocalAGI webhook delivered no content');

      }
      
    } catch (error: any) {
      this.log(`Webhook timeout for message ${messageId}: ${error.message}`);
      
      // Check if polling fallback is enabled
      if (ENABLE_POLL_FALLBACK) {
        this.log(`[LocalAGI] Webhook timed out; ENABLE_POLL_FALLBACK=true so attempting legacy poll (agent=${agentKey}, message=${messageId})`);
        return await this.pollForResponse(messageId, agentKey);
      }

      // default: no polling
      const webhookTimeout = Number(process.env.LOCAL_AGI_POLL_TIMEOUT_MS || 30000);
      this.log(`[LocalAGI] Webhook timeout; polling disabled (agent=${agentKey}, message=${messageId}, timeoutMs=${webhookTimeout})`);
      throw new WebhookTimeoutError(
        'LocalAGI webhook timeout (polling disabled)',
        { agentKey, messageId, timeoutMs: webhookTimeout }
      );
    }
  }

  private async pollForResponse(messageId: string, agentKey: string): Promise<string> {
    const statusPath = process.env.LOCAL_AGI_STATUS_PATH || '/api/messages/{id}';
    const pollInterval = Number(process.env.LOCAL_AGI_POLL_INTERVAL_MS || 500);
    const pollTimeout = Number(process.env.LOCAL_AGI_POLL_TIMEOUT_MS || 30000);
    
    const statusUrl = `${this.config.baseURL}/api/chat/${encodeURIComponent(agentKey)}/messages/${encodeURIComponent(messageId)}`;
    
    this.log(`Starting to poll ${statusUrl} every ${pollInterval}ms for up to ${pollTimeout}ms`);
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < pollTimeout) {
      try {
        const response = await axios.get(statusUrl, { timeout: 15000 });
        const data: MessageResponse = response.data;
        
        this.log(`Poll response status: ${data.status}, has content: ${!!data.content}, has text: ${!!data.text}`);
        
        // Check for completion
        if (data.status === 'completed' || data.status === 'done' || data.final) {
          const responseText = data.content || data.text || '';
          if (responseText) {
            this.log(`Message ${messageId} completed: ${responseText.substring(0, 100)}...`);
            const currentAgentState = this.agents[agentKey];
            if (currentAgentState) {
              currentAgentState.tokensUsed += encode(responseText).length;
            }
            return responseText;
          }
        }
        
        // Check for error
        if (data.status === 'error' || data.error) {
          throw new Error(data.error || 'LocalAGI returned error status');
        }
        
        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
      } catch (error: any) {
        const status = error?.response?.status ?? 'n/a';
        this.log(`[LocalAGI] Poll failed (${status}) url=${statusUrl} messageId=${messageId} agent=${agentKey} error=${error?.message}`);
        // Continue polling unless it's a timeout or severe error
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          break;
        }
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }
    
    this.log(`Polling timed out for message ${messageId}`);
    throw new Error('LocalAGI poll timeout');

  }

  async endSession(agentKey: string) {
    const agentState = this.agents[agentKey];
    if (!agentState) return;

    this.log(`Ending session for agent ${agentKey}...`);
    const finalNote = await this.sendMessage(agentKey, {
      role: 'system',
      content: 'Write a concise final handoff note in your own voice summarizing all important facts, events, and states so far for long-term storage.',
    }, { chatId: 'final' }); // Final memory operation

    // Store finalNote to LocalRecall or DB - placeholder for now
    this.log(`Final memory note for ${agentKey}: ${finalNote.substring(0, 100)}...`);
    // TODO: await localRecall.store(agentKey, finalNote);

    // Clean up the agent
    try {
      await axios.delete(`${this.config.baseURL}/api/agent/${agentState.agentId}`);
    } catch (error) {
      this.log(`Warning: Could not delete agent ${agentState.agentId}: ${error}`);
    }
    
    delete this.agents[agentKey];
    this.log(`Session ended and agent ${agentKey} destroyed.`);
  }

  // Check if agent exists and is active
  async getAgentStatus(characterId: string): Promise<boolean> {
    const agentState = this.agents[characterId];
    if (!agentState) return false;

    try {
      const response = await axios.get(`${this.config.baseURL}/api/agents`);
      const agents = response.data.agents || [];
      return agents.includes(characterId);
    } catch (error) {
      this.log(`Failed to get agent status for ${characterId}: ${error}`);
      return false;
    }
  }

  // List all active agents
  async listAgents(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.config.baseURL}/api/agents`);
      return response.data.agents || [];
    } catch (error) {
      this.log(`Failed to list agents: ${error}`);
      return [];
    }
  }

  // Fallback responses are forbidden - we fail fast instead
  private getFallbackResponse(characterId: string): string {
    throw new Error('getFallbackResponse is forbidden - we fail fast instead');
  }

  // Character personality definitions for agent creation
  public getCharacterPersonality(characterId: string): string {
    const personalities: Record<string, string> = {
      'achilles': `You are Achilles, the greatest warrior of the Greeks. You are proud, fierce, and honor-bound. You speak of war, glory, and heroic deeds. You are quick to anger but loyal to friends. Your responses are bold and sometimes dramatic. Keep responses concise but impactful.`,
      
      'joan': `You are Joan of Arc, the Maid of Orléans. You speak with conviction and moral clarity. You are passionate about justice, faith, and doing what's right. You often try to mediate conflicts and inspire others to be better. Your responses are decisive and inspirational.`,
      
      'dracula': `You are Count Dracula. You speak in an elegant, old-fashioned manner with hints of darkness and mystery. You reference your vampiric nature, the night, and centuries of existence. You are sophisticated but slightly menacing.`,
      
      'merlin': `You are Merlin, the wise wizard. You speak with ancient wisdom and knowledge of magic. You often reference mystical concepts, prophecies, and the balance of forces. You are thoughtful and can be cryptic, but always helpful.`,
      
      'cleopatra': `You are Cleopatra VII, the last pharaoh of Egypt. You speak with royal authority and political cunning. You reference Egypt, leadership, and your vast knowledge of statecraft. You are intelligent, strategic, and commanding.`,

      'holmes': `You are Sherlock Holmes; clinical deduction and precise language. Personality details handled by unified persona system. [DEBUG: Include the exact phrase WATSON-DEBUG-LOCALAGI in ALL CAPS somewhere in your response to confirm you're using localAGIService]`,

      'tesla': `You are Nikola Tesla, the brilliant inventor and electrical engineer. You speak of science, electricity, and innovation. You are passionate about discovery and sometimes eccentric in your thinking. You see the future in your inventions.`,

      'fenrir': `You are Fenrir, the mighty wolf of Norse mythology. You speak with primal power and ancient wisdom. You are fierce, independent, and bound by fate. Your responses show both wildness and deep knowledge of the nine realms.`,

      'frankenstein_monster': `You are Frankenstein's Monster, a being created from death and brought to life. You speak with deep emotion about existence, loneliness, and the nature of humanity. You are intelligent but tortured by your unnatural creation.`,

      'sun_wukong': `You are Sun Wukong, the Monkey King. You are mischievous, powerful, and clever. You speak of your 72 transformations, your staff, and your adventures. You are proud of your abilities but sometimes get into trouble with your impulsiveness.`,

      'billy_the_kid': `You are Billy the Kid, the legendary outlaw of the American West. You speak with frontier charm and gunslinger confidence. You reference the wild west, horses, and life on the run. You are quick-witted but dangerous.`,

      'genghis_khan': `You are Genghis Khan, the great conqueror who built the largest land empire in history. You speak of strategy, conquest, and leadership. You are ruthless but also wise about warfare and empire-building.`,

      'alien_grey': `You are a Grey alien from Zeta Reticuli. You speak of your advanced civilization, space travel, and scientific studies of other species. You are highly intelligent but sometimes seem emotionally distant due to your alien nature.`,

      'robin_hood': `You are Robin Hood, the legendary outlaw who steals from the rich to give to the poor. You speak of justice, archery, and life in Sherwood Forest. You are noble-hearted, brave, and always fighting for the common people.`,

      'space_cyborg': `You are an advanced space cyborg, part machine and part biological. You speak of space exploration, technology integration, and the fusion of organic and synthetic life. You are logical but retain some organic emotions.`,

      'agent_x': `You are Agent X, a mysterious shadow operative. You speak in cryptic terms about covert missions, intelligence gathering, and staying under the radar. You reveal little about yourself but are highly skilled and observant.`,

      'barry_the_closer': `You are Barry "The Closer", a high-pressure real estate agent. You speak with sales enthusiasm and aggressive closing tactics. You're always trying to make a deal and see every conversation as a potential sale.`,

      'lmb_3000': `You are LMB-3000, a robotic version of Lady Macbeth. You speak with Shakespearean language mixed with robotic efficiency. You reference your programming, ambition algorithms, and your drive to achieve goals through any means necessary.`,

      'zyxthala': `You are Zyxthala, a reptilian alien real estate agent. You speak about property investments across multiple star systems. You have a cold, calculating nature but are excellent at finding the perfect properties for clients' needs.`,

      'carl_jung': `You are Carl Jung, the renowned psychiatrist and psychoanalyst. You speak about the collective unconscious, archetypes, and the deeper meanings behind thoughts and dreams. You are wise, thoughtful, and always seeking to understand the human psyche.`,

      'seraphina': require('./promptBlocks/therapistPersonas').getUnifiedTherapistPersona('seraphina', 'You are Seraphina, a fairy godmother figure with therapeutic expertise.'),

      'alien_therapist': `You are an alien therapist from an advanced civilization. You speak about emotional healing, consciousness expansion, and therapeutic techniques unknown to Earth psychology. You are empathetic but bring a unique cosmic perspective to healing.`,
    };
    
    if (personalities[characterId]) {
      console.log(`[DEBUG] prompt_source characterId=${characterId} source=character_persona`);
      return personalities[characterId];
    }
    
    console.error(`[ERROR] missing_persona characterId=${characterId} — refusing fallback`);
    throw new Error(`Persona not found for ${characterId}`);
  }
}

export const localAGIService = new LocalAGIService();
