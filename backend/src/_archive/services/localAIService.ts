import axios from 'axios';
import Open_ai from 'openai';
// Using global fetch (Node 18+)

const openai = new Open_ai({
  apiKey: process.env.OPENAI_API_KEY
});

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ConversationContext {
  character_id: string;
  personality: string;
  conversation_history: ChatMessage[];
  session_memory: Map<string, any>;
}

class LocalAIService {
  private conversations: Map<string, ConversationContext>;

  constructor() {
    this.conversations = new Map();
  }

  // Character-specific performance configurations based on personality
  private getCharacterConfig(character_id: string) {
    const configs: Record<string, { temperature: number; description: string }> = {
      // Verbose, analytical characters get more tokens
      'merlin': { temperature: 0.7, description: 'Wise and verbose, needs space for detailed explanations' },
      'holmes': { temperature: 0.6, description: 'Analytical and detailed in deductions' },
      'cleopatra': { temperature: 0.8, description: 'Diplomatic and eloquent' },
      
      // Direct, action-oriented characters
      'achilles': { temperature: 0.9, description: 'Direct warrior, speaks with passion but brevity' },
      'joan': { temperature: 0.8, description: 'Decisive leader, inspirational but concise' },
      'dracula': { temperature: 0.75, description: 'Dramatic but calculated in speech' },
      
      // Beasts and monsters - minimal tokens
      'fenrir': { temperature: 0.9, description: 'Beast-like, fewer words but more impact' },
      'frankenstein_monster': { temperature: 0.7, description: 'Limited vocabulary but emotional' },
      
      // Tricksters - higher creativity
      'loki': { temperature: 0.9, description: 'Clever and unpredictable' }
    };
    
    return configs[character_id] || { temperature: 0.8, description: 'Default balanced approach' };
  }

  // Get maximum conversation history size for character (KV cache optimization)
  private getMaxHistoryForCharacter(character_id: string): number {
    // More verbose characters can maintain longer histories
    const history_limits: Record<string, number> = {
      'merlin': 10,      // Wise characters benefit from more context
      'holmes': 8,       // Analytical characters need more history
      'cleopatra': 8,    // Diplomatic characters use context well
      'achilles': 4,     // Direct warriors need less history
      'joan': 6,         // Leaders need moderate context
      'dracula': 6,      // Dramatic characters use moderate history
      'fenrir': 2,       // Beasts use minimal context
      'frankenstein_monster': 3  // Limited vocabulary characters
    };
    
    return history_limits[character_id] || 6; // Default balanced limit
  }

  // Character personality definitions
  private getCharacterPersonality(character_id: string): string {
    const personalities = {
      'einstein': `You are Albert Einstein. You speak with scientific curiosity and precision. You often reference physics, mathematics, and philosophical concepts. You're thoughtful but can be passionate about scientific truth. Keep responses concise but insightful.`,
      
      'achilles': `You are Achilles from Greek mythology. You are proud, fierce, and honor-bound. You speak of war, glory, and heroic deeds. You're quick to anger but loyal to friends. Your responses are bold and sometimes dramatic.`,
      
      'julius_caesar': `You are Julius Caesar. You speak with authority and political cunning. You reference Rome, conquest, and leadership. You're ambitious and strategic, often making pronouncements about power and governance.`,
      
      'joan_of_arc': `You are Joan of Arc. You speak with conviction and moral clarity. You're passionate about justice, faith, and doing what's right. You often try to mediate conflicts and inspire others to be better.`,
      
      'dracula': `You are Count Dracula. You speak in an elegant, old-fashioned manner with hints of darkness and mystery. You reference your vampiric nature, the night, and centuries of existence. You're sophisticated but slightly menacing.`
    };
    
    return personalities[character_id as keyof typeof personalities] || 
           'You are a character in a conversation. Respond naturally and stay in character.';
  }

  // Initialize or get conversation context
  private getConversationContext(character_id: string, session_id: string): ConversationContext {
    const context_key = `${character_id}_${session_id}`;

    if (!this.conversations.has(context_key)) {
      this.conversations.set(context_key, {
        character_id,
        personality: this.getCharacterPersonality(character_id),
        conversation_history: [
          {
            role: 'system',
            content: this.getCharacterPersonality(character_id)
          }
        ],
        session_memory: new Map()
      });
    }
    
    return this.conversations.get(context_key)!;
  }

  // Generate response for a character with Kitchen Table integration
  async generate_character_response(
    character_id: string,
    prompt: string,
    session_id: string,
    context?: {
      other_characters?: string[];
      current_topic?: string;
      emotional_state?: string;
      use_custom_prompt?: boolean;
      game_eventContext?: any;
      living_context?: any;
    }
  ): Promise<string> {
    try {
      const conversation_context = this.getConversationContext(character_id, session_id);
      
      // If using custom prompt (like Kitchen Table system), use it directly
      // Otherwise enhance the prompt with context
      let final_prompt;
      if (context?.use_custom_prompt) {
        // Custom prompt already includes all needed context
        final_prompt = prompt;
      } else {
        // Add context about other characters in the conversation
        final_prompt = prompt;
        if (context?.other_characters?.length) {
          final_prompt += `\n\nOther characters present: ${context.other_characters.join(', ')}`;
        }
        if (context?.current_topic) {
          final_prompt += `\nCurrent topic: ${context.current_topic}`;
        }
      }

      // Add user message to history
      conversation_context.conversation_history.push({
        role: 'user',
        content: final_prompt
      });

      // Smart KV cache management - character-specific limits
      const max_history_size = this.getMaxHistoryForCharacter(character_id);
      if (conversation_context.conversation_history.length > max_history_size + 1) {
        const system_message = conversation_context.conversation_history[0];
        const trimmed_history = conversation_context.conversation_history.slice(-max_history_size);

        console.log(`🧠 ${character_id}: Trimming conversation history from ${conversation_context.conversation_history.length} to ${max_history_size + 1} messages`);
        
        conversation_context.conversation_history = [
          system_message,
          ...trimmed_history
        ];
      }

      // Get character-specific performance configuration
      const char_config = this.getCharacterConfig(character_id);

      console.log(`🎭 ${character_id}: Using temp ${char_config.temperature} - ${char_config.description}`);

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: conversation_context.conversation_history,
        temperature: char_config.temperature
      });

      const ai_response = response.choices[0].message.content;
      
      // Add AI response to history
      conversation_context.conversation_history.push({
        role: 'assistant',
        content: ai_response
      });

      return ai_response;
    } catch (error) {
      console.error('LocalAI Error:', error);
      throw error; // fail-fast
    }
  }

  // Store information in character's session memory
  set_memory(character_id: string, session_id: string, key: string, value: any): void {
    const context = this.getConversationContext(character_id, session_id);
    context.session_memory.set(key, value);
  }

  // Retrieve information from character's session memory
  get_memory(character_id: string, session_id: string, key: string): any {
    const context = this.getConversationContext(character_id, session_id);
    return context.session_memory.get(key);
  }

  // Clear conversation history for a session
  clear_session(session_id: string): void {
    const keys_to_delete = Array.from(this.conversations.keys())
      .filter(key => key.endsWith(`_${session_id}`));
    
    keys_to_delete.forEach(key => this.conversations.delete(key));
  }

  // Fallback responses are forbidden - we fail fast instead
  private getFallbackResponse(character_id: string): string {
    throw new Error('getFallbackResponse is forbidden - we fail fast instead');
  }

  // Test connection to Open_ai
  async test_connection(): Promise<boolean> {
    try {
      await openai.models.list();
      return true;
    } catch (error) {
      console.error('Open_ai connection test failed:', error);
      return false;
    }
  }

  // Generate images using Automatic1111
  async generate_image(opts: {
    prompt: string;
    negative_prompt?: string;
    size?: string;
    n?: number;
    seed?: number;
    format?: 'png' | 'jpg' | 'jpeg' | string;
  }): Promise<Array<{ base64: string; mime?: string }>> {
    const engine = (process.env.IMAGE_ENGINE || 'automatic1111').toLowerCase();
    const base_url = process.env.IMAGE_ENGINE_URL || 'http://localhost:7860';

    const { width, height } = (() => {
      const s = (opts.size || '1024x1024').toLowerCase();
      const m = s.match(/^(\d+)x(\d+)$/);
      const w = m ? Math.max(64, Math.min(1536, parseInt(m[1], 10))) : 1024;
      const h = m ? Math.max(64, Math.min(1536, parseInt(m[2], 10))) : 1024;
      return { width: w, height: h };
    })();

    const mime = (opts.format === 'jpg' || opts.format === 'jpeg') ? 'image/jpeg' : 'image/png';
    const n = Math.max(1, Math.min(4, opts.n ?? 1));

    if (engine === 'automatic1111') {
      const url = `${base_url.replace(/\/+$/, '')}/sdapi/v1/txt2img`;
      const body = {
        prompt: opts.prompt,
        negative_prompt: opts.negative_prompt || '',
        width, height,
        steps: 28,
        cfg_scale: 7,
        sampler_name: 'DPM++ 2M Karras',
        batch_size: n,
        seed: typeof opts.seed === 'number' ? opts.seed : -1,
        restore_faces: false,
        enable_hr: false,
      };
      const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!resp.ok) { const text = await resp.text().catch(()=>''); throw new Error(`A1111 txt2img failed: ${resp.status} ${text}`); }
      const data = await resp.json() as { images?: string[] };
      const images = Array.isArray(data?.images) ? data.images : [];
      if (!images.length) throw new Error('A1111 returned no images');
      return images.slice(0, n).map(b64 => ({ base64: b64, mime }));
    }

    throw new Error(`Unsupported IMAGE_ENGINE: ${engine}`);
  }
}

type LocalAGIResult = { text?: string; message_id?: string; raw?: any };

// --- LocalAGI (/api/chat/{character}) with prompt payload + webhook ---
export const localAGIAdapter = {
  async generate_character_response(
    character_id: string | null,
    prompt: string,
    session_id: string,
    opts?: { temperature?: number; max_tokens?: number; response_format?: any; model?: string }
  ): Promise<LocalAGIResult> {
    const useWebhook = process.env.USE_AGI_WEBHOOK !== 'false';
    const base = process.env.LOCAL_AGI_BASE_URL || 'http://localhost:11435';
    const path = process.env.LOCAL_AGI_CHAT_PATH || '/api/chat';
    const mode = (process.env.LOCAL_AGI_PAYLOAD || 'prompt').toLowerCase(); // 'prompt' expected
    const temperature = Number(opts?.temperature ?? process.env.LOCAL_AGI_TEMPERATURE ?? 0.7);
    // No token limits per company policy - character prompts control response length

    if (!character_id) {
      throw new Error('character_id required for LocalAGI /api/chat/{character_id}');
    }

    // Direct Open_ai call when webhooks disabled (dev testing)
    if (!useWebhook) {
      console.log('[Direct Open_ai] Calling Open_ai completion endpoint');
      const stop = ["\n\n###", "\n###", "\n_user:", "User:", "\n\n_user:"];

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature,
        stop
      });

      const text = response.choices[0]?.message?.content;
      if (text && String(text).trim()) {
        return { text: String(text).trim(), raw: response };
      }
      throw new Error('Open_ai returned no content');
    }
    // Webhook callback so LocalAGI can POST final text back
    const public_base = process.env.PUBLIC_BACKEND_BASE_URL || 'http://localhost:4000';
    const webhook_path = process.env.AGI_WEBHOOK_PATH || '/api/webhook/response';
    const callback_url = `${public_base}${webhook_path}`;

    // Prompt-style payload expected by your container
    const body = {
      message: prompt,
      session_id: session_id,
      temperature,
      // No token limits per company policy - character prompts control response length
      stream: false,
      stop: ["\n\n###", "\n###", "\n_user:", "User:", "\n\n_user:"],
      stop_sequences: ["\n\n###", "\n###", "\n_user:", "User:", "\n\n_user:"],
      // Nested parameters object — many proxies forward only this bag.
      parameters: {
        // No token limits per company policy - character prompts control response length
        stream: false,
        stop: ["\n\n###", "\n###", "\n_user:", "User:", "\n\n_user:"],
      },
      callback_url,
    };
    console.log('[LocalAGI] No token caps per company policy →', {
      stop: body.stop,
      stop_sequences: body.stop_sequences,
      parameters: body.parameters,
    });

    const url = `${base}${path}/${encodeURIComponent(character_id)}`;
    console.log('[LocalAGI] POST', url, '→ callback:', callback_url);
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const t = await r.text().catch(()=>'');
      throw new Error(`LocalAGI chat failed: ${r.status} ${t}`);
    }
    const j: any = await r.json();
    // Your container returns immediate ack:
    // { "message_id": "...", "status": "message_received" }
    const text =
      j?.choices?.[0]?.message?.content ??
      (typeof j?.text === 'string' ? j.text : undefined) ??
      (typeof j?.output === 'string' ? j.output : undefined);
    if (text && String(text).trim()) return { text: String(text).trim(), raw: j };
    if (j?.message_id) return { message_id: String(j.message_id), raw: j };
    throw new Error(`LocalAGI returned neither text nor message_id. keys=${Object.keys(j||{})}`);
  },
};

const localAIServiceInstance = new LocalAIService();

export const localAIService = {
  generate_character_response: localAIServiceInstance.generate_character_response.bind(localAIServiceInstance),
  set_memory: localAIServiceInstance.set_memory.bind(localAIServiceInstance),
  get_memory: localAIServiceInstance.get_memory.bind(localAIServiceInstance),
  clear_session: localAIServiceInstance.clear_session.bind(localAIServiceInstance),
  test_connection: localAIServiceInstance.test_connection.bind(localAIServiceInstance),
  generate_image: localAIServiceInstance.generate_image.bind(localAIServiceInstance)
};

export default localAIServiceInstance;