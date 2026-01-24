import { HeadquartersState } from '../types/headquarters';
import { Contestant } from '@blankwars/types';
import EventContextService from './eventContextService';
import { mustResolveAgentKey } from '../lib/chat/agent_keys';

import apiClient from './apiClient';

export interface ConfessionalMessage {
  id: number;
  type: 'contestant' | 'hostmaster';
  content: string;
  timestamp: Date;
}

export interface ConfessionalData {
  active_character: string | null;
  is_interviewing: boolean;
  is_paused: boolean;
  turn_number: number;
  messages: ConfessionalMessage[];
  is_loading: boolean;
  session_complete: boolean;
  session_id?: string;
  chat_id?: string;
}

export interface ConfessionalSession {
  session_id: string;
  chat_id: string;
  character_id: string;
  messages: ConfessionalMessage[];
  start_time: Date;
}

// Active sessions management (similar to therapy service)
const active_sessions: Map<string, ConfessionalSession> = new Map();


/**
 * Start a confessional interview for a character
 */
export const startConfessional = async (
  character_name: string,
  available_characters: Contestant[],
  headquarters: any,
  set_confessional_data: React.Dispatch<React.SetStateAction<ConfessionalData>>
) => {
  console.log('🎬 Starting confessional for:', character_name);

  const character = available_characters.find(c => c.id === character_name);
  console.log('🎭 Found character:', character?.name, 'ID:', character?.id);
  if (!character) return;

  // Create session IDs once at the start
  const session_id = `confessional_session_${Date.now()}`;
  const chat_id = `confessional_${Date.now()}_${character_name}`;

  // Create and store session (like therapy service)
  const session: ConfessionalSession = {
    session_id,
    chat_id,
    character_id: character_name,
    messages: [],
    start_time: new Date()
  };

  active_sessions.set(session_id, session);
  console.log('📝 Stored confessional session:', session_id);

  // Create initial confessional data (like therapy)
  const initialConfessionalData: ConfessionalData = {
    active_character: character_name,
    is_interviewing: true,
    is_paused: false,
    turn_number: 0,
    messages: [],
    is_loading: false,
    session_complete: false,
    session_id,
    chat_id
  };

  // Set new interview data (complete replacement, not updating previous state)
  set_confessional_data(initialConfessionalData);

  console.log('🎬 Confessional started for:', character_name);

  // Start with an initial hostmaster question
  try {
    set_confessional_data(prev => ({ ...prev, is_loading: true }));

    const response = await sendConfessionalMessage(
      'hostmaster_v8_72',
      [], // Empty messages for initial question
      character_name,
      session_id,
      chat_id
    );

    if (response.ok && response.text) {
      const hostmasterQuestion = response.text;
      const newMessages = [{
        id: Date.now(),
        type: 'hostmaster' as const,
        content: hostmasterQuestion,
        timestamp: new Date()
      }];

      set_confessional_data(prev => ({
        ...prev,
        messages: newMessages,
        turn_number: response.turn_number || 1,
        is_loading: false,
        session_complete: response.sessionComplete || false
      }));

      // Update stored session
      updateSessionMessages(session_id, newMessages);
      console.log('✅ Initial hostmaster question generated');

      // Now generate character response (like therapy does with patient response)
      // Wait for state update, then get fresh confessionalData
      setTimeout(async () => {
        // Use closure variables to ensure session IDs persist
        set_confessional_data(prev => {
          // Call generateCharacterResponse with guaranteed session IDs
          generateCharacterResponse(
            character_name,
            hostmasterQuestion,
            available_characters,
            headquarters,
            { ...prev, session_id, chat_id }, // Explicitly include closure IDs
            set_confessional_data
          );
          return prev; // Don't modify state, just use it
        });
      }, 100);
    }
  } catch (error) {
    console.error('Error generating initial hostmaster question:', error);
    set_confessional_data(prev => ({ ...prev, is_loading: false }));
  }
};


/**
 * Pause confessional interview
 */
export const pauseConfessional = (
  set_confessional_data: (updater: (prev: any) => any) => void
) => {
  console.log('⏸️ Pausing confessional interview');
  set_confessional_data(prev => ({
    ...prev,
    is_paused: true
  }));
};

/**
 * Continue confessional interview - generates next hostmaster question and character response
 */
export const continueConfessional = async (
  character_name: string,
  available_characters: any[],
  headquarters: any,
  confessional_data: ConfessionalData,
  set_confessional_data: React.Dispatch<React.SetStateAction<ConfessionalData>>
) => {
  console.log('▶️ Continuing confessional interview');

  // Unpause
  set_confessional_data(prev => ({
    ...prev,
    is_paused: false,
    is_loading: true
  }));

  try {
    // Generate next hostmaster question
    const nextHostmasterResponse = await sendConfessionalMessage(
      'hostmaster_v8_72',
      confessional_data.messages,
      character_name,
      confessional_data.session_id,
      confessional_data.chat_id
    );

    if (nextHostmasterResponse.ok && nextHostmasterResponse.text) {
      const nextQuestion = nextHostmasterResponse.text;
      const newHostmasterMessage = {
        id: Date.now(),
        type: 'hostmaster' as const,
        content: nextQuestion,
        timestamp: new Date()
      };

      set_confessional_data(prev => {
        const updatedMessages = [...prev.messages, newHostmasterMessage];
        // Update stored session
        if (prev.session_id) {
          updateSessionMessages(prev.session_id, updatedMessages);
        }

        return {
          ...prev,
          messages: updatedMessages,
          turn_number: nextHostmasterResponse.turn_number || (prev.turn_number + 1),
          is_loading: false
        };
      });

      // Then generate character response
      await generateCharacterResponse(
        character_name,
        nextQuestion,
        available_characters,
        headquarters,
        confessional_data,
        set_confessional_data
      );
    }
  } catch (error) {
    console.error('Continue confessional error:', error);
    set_confessional_data(prev => ({
      ...prev,
      is_loading: false,
      is_paused: true // Re-pause on error
    }));
  }
};

// generateCharacterResponse function - extracted from TeamHeadquarters.tsx (lines 664-837)
export const generateCharacterResponse = async (
  character_name: string,
  hostmaster_question: string,
  available_characters: any[],
  headquarters: any,
  confessional_data: ConfessionalData,
  set_confessional_data: React.Dispatch<React.SetStateAction<ConfessionalData>>
) => {
  console.log('🎪 [ENTRY] generateCharacterResponse for:', character_name, 'turn_number:', confessional_data.turn_number);
  console.log('🎪 [ENTRY] is_paused:', confessional_data.is_paused, 'is_interviewing:', confessional_data.is_interviewing);
  const character = available_characters.find(c => c.id === character_name);
  console.log('🎨 Character found:', character?.name, 'ID:', character?.id);
  if (!character) return;

  // Resolve character name to canonical agent key like therapy does
  const canonicalCharacterId = mustResolveAgentKey(
    character.name,
    character.character_id,   // Use snake_case like therapy does
    'confessional'
  );

  console.log('🎭 Character mapping:', {
    userchar_id: character.id,              // userchar_123...
    display_name: character.name,           // "Billy the Kid"
    canonical_id: canonicalCharacterId      // "billy_the_kid"
  });


  // Prevent duplicate calls by checking if already loading
  if (confessional_data.is_loading) {
    console.log('🚫 Skipping - already generating response');
    return;
  }

  try {
    // Import past memories for confessional context (import-only, no export)
    const contextService = EventContextService.getInstance();
    const confessionalContext = await contextService.getConfessionalContext(character_name);

    // First, generate the character's response to the HOSTMASTER question
    const characterContext = {
      character_id: character.id,
      character_name: character.name,
      personality_traits: character.personality_traits,
      conversation_style: character.conversation_style,
      conversation_topics: character.conversation_topics,
      origin_era: character.origin_era,
      backstory: character.backstory,
      current_bond_level: character.bond_level,
      previous_messages: [],
      past_memories: confessionalContext // Add imported context for richer storytelling
    };

    // Get other characters for context
    const otherCharacters = available_characters
      .filter(c => c.id !== character_name)
      .map(c => c.name)
      .slice(0, 4); // Limit to 4 for prompt length

    const characterPrompt = `You are ${character.name} in the BLANK WARS reality show confessional booth. An invisible director behind the camera just asked you an inaudible question about: "${hostmaster_question}"

🎬 CONFESSIONAL BOOTH SETUP:
- You're alone in the confessional booth, speaking directly to the camera
- The director's voice is inaudible to viewers - only your responses are heard
- You react to their unheard question/prompt and address it naturally
- This creates authentic reality TV confessional footage

🎬 BLANK WARS REALITY SHOW CONTEXT:
- You're competing in a gladiator-style fighting tournament reality show
- Famous warriors/legends from different eras are forced to live together
- You all sleep in cramped ${headquarters.current_tier} quarters with limited privacy
- Current housemates: ${otherCharacters.join(', ')} (and others)
- There's constant drama about who gets the good bed, bathroom time, food, etc.
- Everyone's competing for prize money and trying to avoid elimination
- Alliances form and break constantly - trust no one
- The cameras are always rolling, capturing every argument and breakdown

YOUR CHARACTER ESSENCE:
- Name: ${character.name}
- Personality: ${(character.personality_traits || []).join(', ')}
- Background: ${character.origin_era || 'Unknown Era'} - ${character.backstory || 'A legendary warrior'}
- Speech Style: ${character.conversation_style || 'Direct'}
- Core Motivations: ${(character.conversation_topics || []).join(', ')}

RECENT EXPERIENCES TO REFLECT ON:
${confessionalContext || 'No significant recent memories to reference.'}

Use these experiences to add depth and authenticity to your confessional response. Reference past events naturally!

INVISIBLE DIRECTOR RESPONSE STYLE:
- Begin your response as if reacting to their inaudible question
- Use phrases like "You want to know about..." or "That's an interesting question..." 
- Reference the topic naturally as if they just asked you about it
- Stay in character with authentic reactions to the invisible prompt
- Keep responses 1-2 sentences but make them memorable and revealing
- Show your historical personality clashing with reality TV dynamics

EXAMPLE RESPONSE PATTERNS:
- "You're asking about the living arrangements? Well, let me tell you..."
- "That's a good question about [topic]. From my perspective..."
- "You want the truth about [situation]? Here's what really happened..."
- "Interesting that you'd ask about that. The reality is..."

Remember: Only YOUR voice is heard. React to the invisible director's question naturally while staying true to your legendary character!`;

    // Generate character response via Universal Template system
    console.log('🎤 Generating character response for:', character.name);
    console.log('📦 Using Universal Template system with confessional domain');

    // Note: Group therapy check removed - characterContext doesn't have session_type or context properties

    // Set loading state
    set_confessional_data(prev => ({ ...prev, is_loading: true }));

    const response = await apiClient.post('/ai/chat', {
      chat_id: confessional_data.chat_id || `confessional_${Date.now()}_${character.id}`,
      agent_key: canonicalCharacterId,
      session_id: confessional_data.session_id || `confessional_session_${Date.now()}`,
      userchar_id: character.id,
      character_id: canonicalCharacterId,
      message: hostmaster_question,
      domain: 'confessional',
      meta: {
        hostmaster_style: 'probing' // Default style, could be made configurable
      }
    });

    const character_response = response.data;


    console.log('✅ Character response received:', character_response.text?.substring(0, 100) + '...');

    // Note: Confessionals are private - no memories exported to other systems
    // Characters can reflect on past events but confessional content stays private
    console.log('🤐 Confessional content remains private - no memory export');

    // Add character response to messages
    const newCharacterMessage = {
      id: Date.now(),
      type: 'contestant' as const,
      content: character_response.text,
      timestamp: new Date()
    };

    set_confessional_data(prev => {
      const updatedMessages = [...prev.messages, newCharacterMessage];
      // Update stored session
      if (prev.session_id) {
        updateSessionMessages(prev.session_id, updatedMessages);
      }

      return {
        ...prev,
        messages: updatedMessages,
        turn_number: character_response.turn_number || prev.turn_number,
        is_loading: false,
        session_complete: character_response.sessionComplete || false
      };
    });

    console.log('✅ Character response added to conversation');

    // Auto-continue through turn 4, then pause
    const currentTurn = character_response.turn_number || confessional_data.turn_number;
    if (currentTurn < 4) {
      console.log('🔄 Auto-continuing to turn', currentTurn + 1);

      // Generate next hostmaster question
      // Build updated messages array with the character response we just added
      const updatedMessages: ConfessionalMessage[] = [...confessional_data.messages, {
        id: Date.now(),
        type: 'contestant' as const,
        content: character_response.text as string,
        timestamp: new Date()
      }];

      // Get current session_id/chat_id from the updated state
      const currentSessionId = confessional_data.session_id;
      const currentChatId = confessional_data.chat_id;

      setTimeout(async () => {
        try {
          const nextHostmasterResponse = await sendConfessionalMessage(
            'hostmaster_v8_72',
            updatedMessages,
            character_name,
            currentSessionId,
            currentChatId
          );

          if (nextHostmasterResponse.ok && nextHostmasterResponse.text) {
            const nextQuestion = nextHostmasterResponse.text;
            const newHostmasterMessage = {
              id: Date.now(),
              type: 'hostmaster' as const,
              content: nextQuestion,
              timestamp: new Date()
            };

            set_confessional_data(prev => {
              const updatedMessages = [...prev.messages, newHostmasterMessage];
              // Update stored session
              if (prev.session_id) {
                updateSessionMessages(prev.session_id, updatedMessages);
              }

              return {
                ...prev,
                messages: updatedMessages,
                turn_number: nextHostmasterResponse.turn_number || (currentTurn + 1),
                is_loading: false
              };
            });

            // Then generate character response
            await generateCharacterResponse(
              character_name,
              nextQuestion,
              available_characters,
              headquarters,
              confessional_data,
              set_confessional_data
            );
          }
        } catch (error) {
          console.error('Auto-continuation error:', error);
          set_confessional_data(prev => ({
            ...prev,
            is_loading: false,
            is_paused: true
          }));
        }
      }, 100);
    } else {
      console.log('⏸️ Paused after turn 4 - waiting for continue button');
      // Set is_paused to show the continue button
      set_confessional_data(prev => ({
        ...prev,
        is_paused: true
      }));
    }

  } catch (error) {
    console.error('Character response error:', error);
    set_confessional_data(prev => ({
      ...prev,
      is_loading: false,
      is_paused: true
    }));
  }
};

/**
 * Send confessional message - simple API call like therapy uses
 */
export const sendConfessionalMessage = async (
  agent_key: string,
  messages: ConfessionalMessage[],
  character_id: string,
  session_id?: string,
  chat_id?: string,
  hostmaster_id?: string
) => {
  // Use provided session IDs or create fallbacks (for backwards compatibility)
  const finalSessionId = session_id || `confessional_session_${Date.now()}`;
  const finalChatId = chat_id || `confessional_${Date.now()}_${character_id}`;

  const response = await apiClient.post('/ai/chat', {
    chat_id: finalChatId,
    agent_key,
    character: agent_key, // Match therapy pattern - speaker's agent_key
    session_id: finalSessionId,
    userchar_id: character_id,
    character_id,
    messages: messages.map(m => ({
      message: m.content,
      speaker_name: m.type === 'hostmaster' ? 'Hostmaster' : 'Character',
      speaker_id: m.type === 'hostmaster' ? 'hostmaster' : character_id
    })),
    domain: 'confessional',
    hostmaster_id: hostmaster_id || 'hostmaster_v8_72'
  });

  return response.data;


};

/**
 * Session management functions (mirroring therapy service)
 */
export const getConfessionalSession = (session_id: string): ConfessionalSession | undefined => {
  return active_sessions.get(session_id);
};

export const updateSessionMessages = (session_id: string, messages: ConfessionalMessage[]): void => {
  const session = active_sessions.get(session_id);
  if (session) {
    session.messages = messages;
    active_sessions.set(session_id, session);
    console.log('📝 Updated session messages for:', session_id, 'Count:', messages.length);
  }
};

export const endConfessionalSession = (session_id: string): void => {
  active_sessions.delete(session_id);
  console.log('🧹 Confessional session ended:', session_id);
};

export const getAllActiveConfessionalSessions = (): string[] => {
  return Array.from(active_sessions.keys());
};

export const restoreConfessionalSession = async (
  session_id: string,
  set_confessional_data: React.Dispatch<React.SetStateAction<ConfessionalData>>
): Promise<void> => {
  const session = active_sessions.get(session_id);
  if (!session) {
    throw new Error(`Confessional session ${session_id} not found`);
  }

  console.log('🔄 Restoring confessional session:', session_id);

  // Restore confessional data from stored session
  set_confessional_data(prev => ({
    ...prev,
    active_character: session.character_id,
    session_id: session.session_id,
    chat_id: session.chat_id,
    messages: session.messages,
    is_interviewing: true,
    is_paused: false
  }));
};