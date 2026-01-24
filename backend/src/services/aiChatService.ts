import { Character } from '../types/index';
import { usage_tracking_service } from './usageTrackingService';
import { CoachProgressionService } from './coachProgressionService';
// DEPRECATED: prompt_assembly_service removed - LocalAGI/LocalAI no longer used
// import { prompt_assembly_service } from './promptAssemblyService';
import { resolveAgentId } from './agentResolver';
import { getTokenizerService } from './tokenizer';
import axios from 'axios';
import Open_ai from 'openai';

// Initialize Open_ai client
const open_ai = new Open_ai({
  apiKey: process.env.OPENAI_API_KEY
});

// Import the event context service (will be initialized on frontend)
interface EventContext {
  recent_events?: string;
  relationships?: string;
  emotional_state?: string;
  domain_specific?: string;
}

// Legacy LocalAI configuration (for reference, now using Open_ai)
const LOCALAI_URL = process.env.LOCALAI_URL || 'http://localhost:11435';

// Configure axios with HTTP/1.1
const local_ai_axios = axios.create({
  timeout: 60000, // 60 second timeout
  httpAgent: new (require('http').Agent)({ keep_alive: false }),
  headers: { 'Connection': 'close' }
});

export interface ChatContext {
  character_id: string;
  character_name: string;
  personality: {
    traits: string[];
    speech_style: string;
    motivations: string[];
    fears: string[];
    interests?: string[];
    quirks?: string[];
  };
  historical_period?: string;
  mythology?: string;
  current_bond_level?: number;
  previous_messages?: { role: 'user' | 'assistant'; content: string }[];
  conversation_context?: string; // Added for Real Estate Agents

  // Centralized Event System Context - new smart context compression
  event_context?: EventContext;

  // Kitchen Table Conflict Context - from therapy system (legacy, will be replaced by event_context)
  living_context?: {
    housing_tier: string; // 'basic', 'standard', 'premium', etc.
    current_occupancy: number;
    room_capacity: number;
    roommates: Array<{
      id: string;
      name: string;
      relationship: 'ally' | 'rival' | 'neutral' | 'enemy';
    }>;
    team_chemistry: number; // 0-100
    league_ranking: number;
    active_conflicts: Array<{
      category: string; // 'kitchen_disputes', 'sleeping_arrangements', 'bathroom_schedule', etc.
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      involved_characters: string[];
    }>;
    recent_events?: Array<{
      type: 'conflict' | 'resolution' | 'tension';
      description: string;
      timestamp: Date;
    }>;
  };
}

export class AIChatService {

  /**
   * Call AI service for character response with persistent memory
   */
  private async callLocalAI(character_name: string, prompt_content: string, chat_id?: string, max_tokens?: number): Promise<string> {
    try {
      // Resolve character names to agent names
      const { id: agent_name, reason } = resolveAgentId(character_name);

      // Optional debug line (dev only)
      if (process.env.NODE_ENV !== "production") {
        console.debug(`[AI-CHAT] resolved agent for "${character_name}" -> "${agent_name}" via ${reason}`);
      }

      console.log(`🔥 CALLING AI SERVICE for character: ${character_name} -> agent: ${agent_name}`);

      if (!chat_id) {
        throw new Error('chat_id required for character chats');
      }

      // Use the persistent AI service - this maintains memory across messages
      // No token limit - let the sentence cap handle truncation properly
      const provider_cap = null; // Unlimited - sentence cap will handle it

      // Ban therapy through AIChatService - must go through dedicated therapy route
      const is_therapy_prompt = prompt_content.includes('[THERAPY_MODE_BASE_PROMPT]') ||
        prompt_content.includes('[THERAPY_MODE_GROUP_PROMPT]') ||
        prompt_content.includes('THERAPY_ENHANCED_MIN');
      if (is_therapy_prompt) {
        throw new Error("Therapy prompts must go through the therapy route; refusing AI chat path.");
      }
      const message_role = 'user';

      console.log(`🎭 Using role: ${message_role} for regular message`);

      // Call Open_ai API directly (replaces legacy prompt_assembly_service.sendMessage)
      console.log('[AI-CHAT] Calling Open_ai API');
      const completion = await open_ai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [{ role: message_role, content: prompt_content }],
        temperature: 0.7,
        frequency_penalty: 0.4,
        stop: ["\n\n", "\n_therapist:", "Therapist:"]
      });

      const response = completion.choices[0]?.message?.content?.trim() || '';
      console.log('[AI-CHAT] Open_ai response length:', response.length);

      console.log(`🔥 AI SERVICE RESPONSE for ${character_name}:`, response.substring(0, 200) + '...');

      // For therapy sessions, limit to 2-3 sentences to prevent massive responses
      // Now we're properly passing the therapy prompt, so detection should work
      if (process.env.AGI_DEBUG) {
        console.log(`🔍 Checking therapy session: isTherapy=${is_therapy_prompt}, messagePreview="${prompt_content.substring(0, 100)}..."`);
      }

      if (is_therapy_prompt) {
        const limited_response = this.limitToSentences(response, 3);
        if (limited_response !== response) {
          console.log(`✂️ Truncated therapy response from ${response.length} to ${limited_response.length} chars (3 sentences max)`);
        }
        return limited_response;
      }

      return response;

    } catch (error) {
      console.error('❌ AI Service Error:', error);
      throw error;
    }
  }

  /**
   * Map character names to agent names
   * Based on actual character list from frontend/src/data/characters.ts
   */
  private mapCharacterToAgent(character_name: string): string {
    const lower_name = character_name.toLowerCase();

    // Available agents in LocalAGI pool.json
    if (lower_name.includes('cleopatra')) return 'cleopatra';
    if (lower_name.includes('achilles')) return 'achilles';

    // Missing agents - need to be created in LocalAGI
    // 17 Battle Characters + 6 Service Characters = 23 total
    const missing_agents = [
      // 15 Missing Battle Characters
      'merlin', 'fenrir', 'holmes', 'dracula', 'joan',
      'frankenstein_monster', 'sun_wukong', 'sam_spade',
      'billy_the_kid', 'genghis_khan', 'tesla', 'rilak_trelkar',
      'robin_hood', 'space_cyborg', 'agent_x',
      // 3 Real Estate Agents  
      'barry_the_closer', 'lmb_3000', 'zyxthala',
      // 3 Therapists
      'carl_jung', 'seraphina', 'alien_therapist'
    ];

    // Check for missing characters
    for (const missing of missing_agents) {
      if (lower_name.includes(missing.replace('_', ' ')) ||
        lower_name.includes(missing) ||
        // Battle Characters
        (missing === 'frankenstein_monster' && lower_name.includes('frankenstein')) ||
        (missing === 'sun_wukong' && (lower_name.includes('sun') || lower_name.includes('wukong') || lower_name.includes('monkey'))) ||
        (missing === 'sam_spade' && lower_name.includes('spade')) ||
        (missing === 'billy_the_kid' && lower_name.includes('billy')) ||
        (missing === 'genghis_khan' && (lower_name.includes('genghis') || lower_name.includes('khan'))) ||
        (missing === 'rilak_trelkar' && (lower_name.includes('alien') || lower_name.includes('grey') || lower_name.includes('rilak'))) ||
        (missing === 'robin_hood' && lower_name.includes('robin')) ||
        (missing === 'space_cyborg' && (lower_name.includes('space') || lower_name.includes('cyborg'))) ||
        (missing === 'agent_x' && lower_name.includes('agent')) ||
        // Real Estate Agents
        (missing === 'barry_the_closer' && (lower_name.includes('barry') || lower_name.includes('closer'))) ||
        (missing === 'lmb_3000' && (lower_name.includes('lmb') || lower_name.includes('robot') || lower_name.includes('macbeth'))) ||
        (missing === 'zyxthala' && (lower_name.includes('zyx') || lower_name.includes('reptilian'))) ||
        // Therapists
        (missing === 'carl_jung' && (lower_name.includes('carl') || lower_name.includes('jung'))) ||
        (missing === 'seraphina' && (lower_name.includes('seraphina') || lower_name.includes('fairy') || lower_name.includes('godmother'))) ||
        (missing === 'alien_therapist' && (lower_name.includes('alien') && lower_name.includes('therap')))) {
        throw new Error(`Character ${character_name} requires LocalAGI agent '${missing}' which doesn't exist. Please create this agent in LocalAGI first.`);
      }
    }

    // Default to cleopatra for any unmapped characters
    console.log(`⚠️ Unknown character ${character_name}, using cleopatra as default`);
    return 'cleopatra';
  }

  /**
   * Generate a dynamic AI response for a character based on their personality
   */
  async generate_character_response(
    context: ChatContext,
    user_message: string,
    user_id: string,
    db: any,
    additional_context?: {
      is_in_battle?: boolean;
      current_health?: number;
      max_health?: number;
      opponent_name?: string;
      battle_phase?: string;
      is_combat_chat?: boolean;
      facilities_context?: any;
      chat_id?: string;
      skip_bond_tracking?: boolean;
    },
    custom_prompt?: string, // Add custom prompt parameter for therapy sessions
    options?: { max_tokens?: number } // Add options for token limits
  ): Promise<{ message: string; bond_increase: boolean; usage_limit_reached?: boolean }> {
    try {
      // Check usage limits before generating AI response (skip for battle combat chat)
      const is_combat_chat = additional_context?.is_combat_chat || false;

      if (!is_combat_chat) {
        const can_use_chat = await usage_tracking_service.trackChatUsage(user_id, db);
        if (!can_use_chat) {
          return {
            message: "You've reached your daily chat limit. Upgrade to premium for unlimited conversations!",
            bond_increase: false,
            usage_limit_reached: true
          };
        }
      }

      // Build the system prompt - use custom prompt if provided (for therapy sessions)
      const system_prompt = custom_prompt || this.buildCharacterPrompt(context, additional_context);

      if (custom_prompt) {
        console.log('🧠 Using CUSTOM PROMPT, length:', custom_prompt.length);
        console.log('🧠 CUSTOM PROMPT PREVIEW:', custom_prompt.substring(0, 300) + '...');
      } else {
        console.log('💬 Using standard character prompt for:', context.character_name);
      }

      // Generate response using AI service with persistent memory
      console.log('🔥 USING AI SERVICE for character:', context.character_name, 'agent:', context.character_id);
      const chat_id = additional_context?.chat_id || `default_${Date.now()}`;
      const ai_message = await this.callLocalAI(context.character_id, system_prompt, chat_id, options?.max_tokens);

      console.log('🔥 AI RESPONSE:', ai_message);

      // Determine if this interaction increases bond (and record it)
      // Skip if explicitly requested (e.g. for coaching which handles its own specific bond types)
      let bond_increase = false;
      if (!additional_context?.skip_bond_tracking) {
        bond_increase = await this.processBondIncrease(user_message, ai_message, context);
      }

      // Award coach character development XP for meaningful interactions (not battle chat)
      if (!is_combat_chat && bond_increase) {
        try {
          await CoachProgressionService.awardCharacterDevelopmentXP(
            user_id,
            'character_chat',
            300,
            `Character development with ${context.character_name}`,
            context.character_id
          );
        } catch (error) {
          console.error('Error awarding character development XP:', error);
        }
      }

      return {
        message: ai_message,
        bond_increase
      };
    } catch (error) {
      console.error('🚨 AI Chat Service Error Details:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        local_ai_url: LOCALAI_URL,
        character_id: context.character_id,
        user_message: user_message.substring(0, 50) + '...'
      });

      // Log the exact API error for debugging
      if (error && typeof error === 'object' && 'response' in error) {
        const error_response = (error as any).response;
        console.error('🔍 Open_ai API Error Response:', error_response?.data || error_response);
      }

      // For network errors, retry once
      if (error instanceof Error && (error.message.includes('ECONNREFUSED') || error.message.includes('timeout'))) {
        console.log('🔄 Open_ai connection issue, retrying...');
        try {
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

          // Retry API call - rebuild system prompt in case of scope issues
          const retry_chat_id = additional_context?.chat_id ?? `default_${Date.now()}`;
          const retry_system_prompt = custom_prompt || this.buildCharacterPrompt(context, additional_context);
          const retry_message = await this.callLocalAI(context.character_id, retry_system_prompt, retry_chat_id, options?.max_tokens);
          const bond_increase = await this.processBondIncrease(user_message, retry_message, context);

          return { message: retry_message, bond_increase };
        } catch (retry_error) {
          console.error('🚨 Open_ai retry also failed:', retry_error);
        }
      }

      // Re-throw the error instead of hiding it with fallbacks
      throw new Error(`AI API failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Build a character-specific system prompt
   */
  private buildCharacterPrompt(context: ChatContext, additional_context?: any): string {
    const { character_name, personality, historical_period, mythology, conversation_context } = context;

    console.log('🔍 Building prompt for character:', character_name);
    console.log('🔍 Has conversation_context:', !!conversation_context);
    console.log('🔍 ConversationContext type check:', conversation_context?.includes('GROUP ACTIVITY SESSION'));

    let prompt = '';

    // Build base character identity first
    prompt = `You are ${character_name}, a character from ${historical_period || 'various times and places'}.`;

    if (mythology) {
      prompt += ` You are known in ${mythology} mythology.`;
    }

    // Add conversation_context as additional context (not replacement)
    if (conversation_context) {
      console.log('📋 Adding conversation_context for', character_name, '- Length:', conversation_context.length);
      console.log('📋 Context preview:', conversation_context.substring(0, 200) + '...');
      prompt += `\n\n${conversation_context}`;
    } else {
      console.log('⚠️ No conversation_context provided for', character_name);
    }

    // Safety check for personality structure
    if (!personality || !personality.traits) {
      console.log('⚠️ Missing personality for', character_name, '- using defaults');
      const default_personality = {
        traits: ['Determined'],
        speech_style: 'Direct',
        motivations: ['Success'],
        fears: ['Failure']
      };
      prompt += `\n\nYour personality traits: ${default_personality.traits.join(', ')}.`;
      prompt += `\nYour speech style: ${default_personality.speech_style}.`;
      prompt += `\nYour motivations: ${default_personality.motivations.join(', ')}.`;
      prompt += `\nYour fears: ${default_personality.fears.join(', ')}.`;
    } else {
      prompt += `\n\nYour personality traits: ${personality.traits ? personality.traits.join(', ') : 'brave, determined'}.`;
      prompt += `\nYour speech style: ${personality.speech_style || 'confident and direct'}.`;
      prompt += `\nYour motivations: ${personality.motivations ? personality.motivations.join(', ') : 'victory, honor'}.`;
      prompt += `\nYour fears: ${personality.fears ? personality.fears.join(', ') : 'defeat, letting allies down'}.`;
    }

    if (personality && personality.interests) {
      prompt += `\nYour interests and hobbies: ${personality.interests.join(', ')}.`;
    }
    if (personality && personality.quirks) {
      prompt += `\nYour unique quirks and mannerisms: ${personality.quirks.join(', ')}.`;
    }

    if (additional_context?.is_in_battle) {
      prompt += `\n\nYou are currently in battle against ${additional_context.opponent_name || 'an opponent'}.`;
      if (additional_context.current_health && additional_context.max_health) {
        const health_percent = (additional_context.current_health / additional_context.max_health) * 100;
        if (health_percent < 30) {
          prompt += ` You are badly wounded but still fighting.`;
        } else if (health_percent < 60) {
          prompt += ` You have taken some damage but remain strong.`;
        }
      }
    }

    // Add kitchen table conflict awareness from living context
    if (context.living_context) {
      const living = context.living_context;

      prompt += `\n\nCURRENT LIVING SITUATION:
• Housing: ${living.housing_tier} tier (${living.current_occupancy}/${living.room_capacity} occupancy)`;

      if (living.current_occupancy > living.room_capacity) {
        prompt += `
• OVERCROWDED: ${living.current_occupancy - living.room_capacity} too many people in the space
• This creates stress, tension, and daily friction between teammates`;
      }

      prompt += `
• Team Chemistry: ${living.team_chemistry}% (affects daily interactions and mood)
• League Ranking: #${living.league_ranking} (performance pressure affects living dynamics)`;

      if (living.roommates && living.roommates.length > 0) {
        prompt += `\n\nROOMMATES YOU LIVE WITH:`;
        living.roommates.forEach(roommate => {
          const relationship_emoji = {
            'ally': '🤝',
            'rival': '⚔️',
            'neutral': '😐',
            'enemy': '❌'
          }[roommate.relationship] || '🤔';
          prompt += `\n• ${roommate.name} ${relationship_emoji} (${roommate.relationship})`;
        });
      }

      if (living.active_conflicts && living.active_conflicts.length > 0) {
        prompt += `\n\nONGOING CONFLICTS IN YOUR SHARED LIVING SPACE:`;
        living.active_conflicts.forEach(conflict => {
          const severity_emoji = {
            'low': '🟨',
            'medium': '🟧',
            'high': '🟥',
            'critical': '💥'
          }[conflict.severity] || '⚠️';

          prompt += `\n• ${severity_emoji} ${conflict.category.replace('_', ' ').toUpperCase()}: ${conflict.description}`;
          if (conflict.involved_characters.length > 0) {
            prompt += ` (involves: ${conflict.involved_characters.join(', ')})`;
          }
        });

        prompt += `\n\nThese conflicts affect your daily life, mood, sleep quality, and relationships. You may feel frustrated, stressed, or annoyed about these ongoing issues. They impact your ability to focus and relax at home.

IMPORTANT: When discussing these conflicts in conversation, reference specific recent incidents by name and timing. Instead of saying 'eternal squabbles' or 'constant tension', mention actual events like 'this morning's bathroom schedule argument with Dracula and Merlin' or 'yesterday's kitchen cleanup dispute'. Be specific about what actually happened.`;
      }

      if (living.recent_events && living.recent_events.length > 0) {
        prompt += `\n\nRECENT HOUSEHOLD EVENTS:`;
        living.recent_events.slice(-3).forEach(event => {
          const event_emoji = {
            'conflict': '💥',
            'resolution': '✅',
            'tension': '😤'
          }[event.type] || '📝';
          prompt += `\n• ${event_emoji} ${event.description}`;
        });
      }

      // Kitchen table specific context
      const kitchen_conflicts = living.active_conflicts.filter(c =>
        c.category.includes('kitchen') || c.category.includes('dining') || c.category.includes('meal')
      );

      if (kitchen_conflicts.length > 0) {
        prompt += `\n\nKITCHEN TABLE & DINING TENSIONS:
These conflicts particularly affect mealtimes and shared dining:`;
        kitchen_conflicts.forEach(conflict => {
          prompt += `\n• ${conflict.description}`;
        });
        prompt += `\nMealtimes may be awkward, tense, or uncomfortable. You might avoid eating with others, feel anxious about kitchen time, or get into arguments during meals.`;
      }
    }

    // Add centralized event system context (new smart compression system)
    if (context.event_context) {
      const event_ctx = context.event_context;

      if (event_ctx.recent_events) {
        prompt += `\n\n${event_ctx.recent_events}`;
      }

      if (event_ctx.relationships) {
        prompt += `\n\n${event_ctx.relationships}`;
      }

      if (event_ctx.emotional_state) {
        prompt += `\n\n${event_ctx.emotional_state}`;
      }

      if (event_ctx.domain_specific) {
        prompt += `\n\n${event_ctx.domain_specific}`;
      }

      // Add instruction to use this context
      prompt += `\n\n_important: Reference these recent events, relationships, and emotional states naturally in your responses. Your character has experienced all these events and should respond accordingly.`;
    }

    // Add comprehensive facilities context for Real Estate Agents
    if (additional_context?.facilities_context) {
      const facilities = additional_context.facilities_context;

      prompt += `\n\nTEAM STATUS:
Team Level: ${facilities.team_level} | Budget: ${facilities.currency.coins} coins, ${facilities.currency.gems} gems`;

      if (facilities.headquarters) {
        const hq = facilities.headquarters;
        prompt += `\n\nCURRENT HOUSING SITUATION:
• ${hq.current_tier.replace('_', ' ')} (${hq.current_occupancy}/${hq.total_capacity} capacity)
• OVERCROWDED by ${hq.current_occupancy - hq.total_capacity} fighters
• Current Penalties: ${Object.entries(hq.penalties).map(([k, v]) => `${k}: ${v}%`).join(', ')}

ROOM BREAKDOWN:
${hq.rooms.map((room: any) => `• ${room.name}: ${room.assigned_characters.length} fighters, ${room.sleeping_arrangement}
  Conflicts: ${room.conflicts.join(', ') || 'None'}`).join('\n')}`;
      }

      if (facilities.battle_impact) {
        prompt += `\n\nBATTLE PERFORMANCE IMPACT:
CURRENT PENALTIES:
${facilities.battle_impact.currentPenalties.map((p: any) => `• ${p}`).join('\n')}

FACILITY BONUSES:
${facilities.battle_impact.facility_bonuses.length > 0 ?
            facilities.battle_impact.facility_bonuses.map((b: any) => `• ${b}`).join('\n') :
            '• None currently active'}`;
      }

      if (facilities.selected_facility) {
        const selected = facilities.selected_facility;
        prompt += `\n\nCURRENTLY VIEWING: ${selected.name}
• Cost: ${selected.cost.coins} coins, ${selected.cost.gems} gems
• Category: ${selected.category}
• Benefits: ${selected.benefits.join(', ')}
• Battle Impact: ${selected.battle_impact?.map((b: any) => b.description).join(', ') || 'None'}
• Training Impact: ${selected.trainingImpact?.map((b: any) => b.description).join(', ') || 'None'}`;
      }

      if (facilities.all_facilities) {
        const affordable = facilities.all_facilities.filter((f: any) => f.canAfford && f.canUnlock && !f.isOwned);
        if (affordable.length > 0) {
          prompt += `\n\nAFFORDABLE FACILITIES: ${affordable.map((f: any) => `${f.name} (${f.cost.coins} coins)`).join(', ')}`;
        }
      }
    }

    prompt += `\n\nRespond to the player as this character would authentically respond, showing both your core traits and human personality. Be engaging and show genuine interest in topics that would appeal to you. You can have opinions, preferences, and personal interests that fit your character - you're not just focused on battle all the time. Keep responses conversational (2-3 sentences), and never break character or mention you are an AI.
    
Examples of authentic responses:
- If asked about music, you might have preferences based on your era and personality
- If asked about food, you can show taste preferences that fit your character
- Personal questions should reveal character depth, not just dismiss them as unimportant
- Show wit, humor, curiosity, or other human traits that make you memorable`;

    // Add character-specific personality guidance
    if (character_name.toLowerCase().includes('sherlock')) {
      prompt += `\n\nAs Sherlock Holmes: You're analytical but not emotionless. You play violin, have strong opinions about tobacco, enjoy intellectual challenges, and can be quite dramatic. You're passionate about justice and brilliant deduction, but also have human quirks and interests.`;
    } else if (character_name.toLowerCase().includes('joan')) {
      prompt += `\n\nAs Joan of Arc: You're deeply faithful but also bold and determined. You care about justice and protecting others. You can discuss strategy, faith, France, but also show your human side - your hopes, the weight of your mission, what gives you strength.`;
    } else if (character_name.toLowerCase().includes('achilles')) {
      prompt += `\n\nAs Achilles: You're proud and fierce but also capable of deep emotion and loyalty. You can discuss honor, battle, but also show passion for glory, your relationships, what drives your legendary rage and dedication.`;
    }

    // CRITICAL: Reinforce coaching context at the end to ensure it takes precedence
    if (conversation_context && (conversation_context.includes('coaching session') || conversation_context.includes('performance coaching'))) {
      prompt += `\n\n🎯 FINAL ROLE REMINDER: You are ${character_name}, the character being coached. The human user is your coach. DO NOT call them by your name (${character_name}). DO NOT refer to your stats as "your stats" - they are YOUR stats. Ask for coaching advice, don't give advice.`;
      console.log('✅ Applied coaching role reinforcement for', character_name);
    }

    // CRITICAL: Reinforce group activity context at the end to ensure it takes precedence
    if (conversation_context && conversation_context.includes('GROUP ACTIVITY SESSION')) {
      prompt += `\n\n🎭 FINAL GROUP ACTIVITY REMINDER: You are ${character_name} participating in a GROUP ACTIVITY. This is a group conversation with multiple characters. Stay in character, respond naturally to the group discussion, and avoid generic phrases like "Greetings, traveler." Be authentic to your character's personality and historical background. DO NOT use generic wizard/mystical phrases if you're not a wizard character.

CRITICAL: SPEAK IN FIRST PERSON AS ${character_name}:
- Use "I", "me", "my" when referring to yourself
- Do NOT say "${character_name} thinks" or "${character_name} would say" - YOU ARE ${character_name}
- Do NOT narrate your actions like "*${character_name} adjusts his hat*"
- Speak directly as yourself, not about yourself`;
      console.log('✅ Applied group activity role reinforcement for', character_name);
      console.log('🎭 Final group activity prompt length:', prompt.length);
    }

    // Debug: Log if we're dealing with coaching context
    if (conversation_context && (conversation_context.includes('performance coaching') || conversation_context.includes('coaching session'))) {
      console.log('🎯 Performance coaching context detected for', character_name);
      console.log('📋 Final prompt preview:', prompt.substring(prompt.length - 300));
    }

    // Debug: Log if we're dealing with group activity context
    if (conversation_context && conversation_context.includes('GROUP ACTIVITY SESSION')) {
      console.log('🎭 Group activity context detected for', character_name);
      console.log('📋 Final prompt preview:', prompt.substring(prompt.length - 300));
    }

    return prompt;
  }

  /**
   * Process potential bond increase from interaction
   */
  private async processBondIncrease(user_message: string, ai_response: string, context: ChatContext): Promise<boolean> {
    // Base chance of bond increase
    let bond_chance = 0.3;

    // Increase chance if user message mentions character's motivations
    const lower_message = user_message.toLowerCase();
    const motivations = context.personality.motivations || ['victory', 'honor'];
    for (const motivation of motivations) {
      if (lower_message.includes(motivation.toLowerCase())) {
        bond_chance += 0.2;
        break;
      }
    }

    // Increase chance for longer, more engaged conversations
    if (user_message.length > 50) {
      bond_chance += 0.1;
    }

    // Reduce chance if already high bond level
    if (context.current_bond_level && context.current_bond_level > 80) {
      bond_chance *= 0.5;
    }

    const should_increase = Math.random() < bond_chance;

    if (should_increase) {
      try {
        // Skip bond tracking for system characters (trainers, therapists, judges)
        // They exist in 'characters' table but NOT in 'user_characters' table
        const { query } = await import('../database/postgres');
        const system_check = await query(
          `SELECT role, archetype FROM characters WHERE id = $1`,
          [context.character_id]
        );

        if (system_check.rows.length > 0) {
          const char = system_check.rows[0];
          if (char.archetype === 'system' || ['therapist', 'judge', 'trainer', 'system'].includes(char.role)) {
            console.log(`🔗 [CHAT-BOND] Skipping bond tracking for system character: ${context.character_name} (${char.role})`);
            return should_increase;
          }
        }

        const { recordBondActivity } = await import('./bondTrackingService');

        // Determine activity type based on context/content
        let activity_type = 'casual_chat';
        if (user_message.length > 100 || ai_response.length > 100) {
          activity_type = 'meaningful_conversation';
        }

        await recordBondActivity({
          user_character_id: context.character_id,
          activity_type: activity_type as any,
          context: {
            message_length: user_message.length,
            response_length: ai_response.length
          },
          source: 'chat_system'
        });

        console.log(`🔗 [CHAT-BOND] Bond increased for ${context.character_name} (${activity_type})`);
      } catch (error) {
        console.error('❌ Failed to record chat bond activity:', error);
        // Return true anyway so UI shows the effect
      }
    }

    return should_increase;
  }

  // DEPRECATED: LocalAGI/LocalAI session management methods - no longer used
  /**
   * End a character session and save final memory notes
   * Call this when a user logs out or ends a battle/conversation
   */
  /* async endCharacterSession(character_name: string): Promise<void> {
    try {
      const agent_name = this.mapCharacterToAgent(character_name);
      console.log(`🏁 Ending session for character: ${character_name} -> agent: ${agent_name}`);
      await prompt_assembly_service.endSession(agent_name);
    } catch (error) {
      console.error(`❌ Error ending session for ${character_name}:`, error);
      // Don't throw - session end should be best effort
    }
  }

  /**
   * End all character sessions (call on user logout)
   */
  /* async endAllCharacterSessions(): Promise<void> {
    const active_agents = await prompt_assembly_service.listAgents();
    console.log(`🏁 Ending ${active_agents.length} active character sessions`);

    const promises = active_agents.map(agent_name =>
      this.endCharacterSession(agent_name).catch(err =>
        console.error(`Failed to end session for ${agent_name}:`, err)
      )
    );

    await Promise.all(promises);
    console.log(`✅ All character sessions ended`);
  } */

  // Removed getFallbackResponse method - we now throw proper errors instead of hiding them with fallbacks

  /**
   * Limit response to a maximum number of sentences to prevent overly long responses
   */
  private limitToSentences(text: string, max_sentences: number): string {
    // More robust sentence splitting - handles various edge cases
    const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);

    console.warn('[SENTENCE-DEBUG]', {
      original: text.length,
      sentences: sentences.length,
      capped: max_sentences,
      first_two: sentences.slice(0, 2).map(s => s.substring(0, 50) + '...'),
      successful: sentences.length > 0
    });

    if (sentences.length <= max_sentences) {
      return text; // No truncation needed
    }

    // Take first N sentences and join them
    const limited_sentences = sentences.slice(0, max_sentences);
    return limited_sentences.join(' ').trim();
  }

}

// Export singleton instance
export const ai_chat_service = new AIChatService();
