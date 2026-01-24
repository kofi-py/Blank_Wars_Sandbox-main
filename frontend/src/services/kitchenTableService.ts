import { HeadquartersState } from '../types/headquarters';
import { Contestant } from '@blankwars/types';
import apiClient from './apiClient';

export interface KitchenConversation {
  id: string;
  avatar: string;
  speaker: string;
  speaker_id: string;
  message: string;
  is_complaint: boolean;
  timestamp: Date;
  is_ai: boolean;
  round: number;
}

export interface KitchenSession {
  session_id: string;
  chat_id: string;
  scene_type: 'mundane' | 'conflict' | 'chaos';
  time_of_day: 'morning' | 'afternoon' | 'evening' | 'night';
  participants: string[]; // character IDs
  conversations: KitchenConversation[];
  start_time: Date;
  round: number;
}

// Active sessions management (following confessional pattern)
const active_sessions: Map<string, KitchenSession> = new Map();

/**
 * Build immediate situation description for Prose Builder
 * Uses 2nd person for the current speaker ("you") to maintain consistent identity
 */
const buildImmediateSituation = (
  scene_type: 'mundane' | 'conflict' | 'chaos',
  time_of_day: 'morning' | 'afternoon' | 'evening' | 'night',
  participants: Contestant[],
  current_speaker: Contestant
): string => {
  const time_descriptions = {
    morning: 'early morning',
    afternoon: 'mid-afternoon',
    evening: 'evening',
    night: 'late night'
  };

  // Replace current speaker's name with "you" for 2nd person consistency
  const other_participants = participants.filter(p => p.id !== current_speaker.id);
  const other_names = other_participants.map(p => p.name).join(' and ');
  const participant_desc = other_names ? `You and ${other_names}` : 'You';
  const time_desc = time_descriptions[time_of_day];

  if (scene_type === 'conflict') {
    return `It's ${time_desc} at the kitchen table. ${participant_desc} are sitting together, and there's tension in the air. A disagreement or conflict is starting to surface.`;
  } else if (scene_type === 'chaos') {
    return `It's ${time_desc} at the kitchen table. ${participant_desc} are here, and the atmosphere is chaotic and unpredictable. Something wild is about to happen.`;
  } else {
    // mundane
    return `It's ${time_desc} at the kitchen table. ${participant_desc} are sitting together having a casual, everyday conversation.`;
  }
};

/**
 * Send a kitchen table message and get AI response
 */
export const sendKitchenMessage = async (
  userchar_id: string,
  canonical_character_id: string,
  messages: { message: string; speaker_name: string; speaker_id: string }[],
  session_id: string,
  chat_id: string,
  immediate_situation: string
) => {
  const requestBody = {
    chat_id,
    session_id,
    agent_key: canonical_character_id, // REQUIRED: canonical ID like "space_cyborg"
    userchar_id, // UUID
    character_id: canonical_character_id, // canonical ID
    messages,
    message: immediate_situation, // REQUIRED by backend for Prose Builder
    domain: 'kitchen_table'
  };

  console.log('📤 Kitchen table request:', {
    agent_key: canonical_character_id,
    userchar_id,
    message_preview: immediate_situation.substring(0, 80) + '...'
  });

  const response = await apiClient.post('/ai/chat', requestBody);

  return response.data;
};

/**
 * Start a new kitchen table scene with opening conversations
 */
export const startNewScene = async (
  headquarters: HeadquartersState,
  available_characters: Contestant[],
  coach_name: string,
  onResponse?: (conversation: KitchenConversation) => void
): Promise<KitchenConversation[]> => {
  // STRICT MODE: coach_name is required
  if (!coach_name || !coach_name.trim()) {
    throw new Error('STRICT MODE: coach_name is required');
  }
  console.log('🎬 Starting new kitchen table scene');

  // Create session IDs
  const session_id = `kitchen_session_${Date.now()}`;
  const chat_id = `kitchen_${Date.now()}`;

  // Select scene parameters
  const scene_type: 'mundane' | 'conflict' | 'chaos' =
    Math.random() < 0.6 ? 'mundane' : Math.random() < 0.8 ? 'conflict' : 'chaos';

  const time_of_day: 'morning' | 'afternoon' | 'evening' | 'night' =
    ['morning', 'afternoon', 'evening', 'night'][Math.floor(Math.random() * 4)] as any;

  // Select 2-3 participants
  const num_participants = Math.random() < 0.5 ? 2 : 3;
  const shuffled = [...available_characters].sort(() => Math.random() - 0.5);
  const participants = shuffled.slice(0, num_participants);

  console.log('🎲 Scene:', { scene_type, time_of_day, participants: participants.map(p => p.name) });

  // Create and store session
  const session: KitchenSession = {
    session_id,
    chat_id,
    scene_type,
    time_of_day,
    participants: participants.map(p => p.id),
    conversations: [],
    start_time: new Date(),
    round: 1
  };

  active_sessions.set(session_id, session);

  const new_conversations: KitchenConversation[] = [];

  // Generate opening response for each participant
  for (const character of participants) {
    try {
      // Build immediate situation for THIS character (uses 2nd person "you")
      const immediate_situation = buildImmediateSituation(scene_type, time_of_day, participants, character);
      console.log(`📝 Immediate situation for ${character.name}:`, immediate_situation);

      const response = await sendKitchenMessage(
        character.id, // userchar_id (UUID)
        character.character_id, // canonical ID like "space_cyborg"
        [], // Empty messages for opening scene
        session_id,
        chat_id,
        immediate_situation // Pass scene description to backend
      );

      if (response.ok && response.text) {
        console.log(`📨 FULL RESPONSE for ${character.name}:`, response.text);
        console.log(`📏 Response length: ${response.text.length} characters`);

        // STRICT MODE: Use character avatar_emoji exactly as provided
        if (!character.avatar_emoji) {
          throw new Error(`STRICT MODE: Character ${character.id} has no avatar_emoji`);
        }

        const conversation: KitchenConversation = {
          id: `kitchen_${Date.now()}_${character.id}`,
          avatar: character.avatar_emoji,
          speaker: character.name.split(' ')[0], // First name only
          speaker_id: character.id,
          message: response.text,
          is_complaint: scene_type === 'conflict' && Math.random() > 0.5,
          timestamp: new Date(),
          is_ai: true,
          round: 1
        };

        new_conversations.push(conversation);

        // Push to handler immediately so bubbles appear as responses arrive
        if (onResponse) {
          onResponse(conversation);
        }

        console.log(`✅ Generated opening for ${character.name}`);

        // Add delay between responses for natural flow
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`Failed to generate opening for ${character.name}:`, error);
    }
  }

  // Update session with conversations
  session.conversations = new_conversations;

  return new_conversations;
};

/**
 * Handle coach message input and generate character responses
 */
export const handleCoachMessage = async (
  coach_message: string,
  current_conversations: KitchenConversation[],
  available_characters: Contestant[],
  session_id: string,
  chat_id: string,
  coach_name: string
): Promise<KitchenConversation[]> => {
  // STRICT MODE: Require valid inputs
  if (!coach_name || !coach_name.trim()) {
    throw new Error('STRICT MODE: coach_name is required');
  }
  if (!coach_message.trim()) return [];
  if (!current_conversations || current_conversations.length === 0) {
    throw new Error('STRICT MODE: Cannot handle coach message without conversation history');
  }
  if (current_conversations[0]?.round === undefined || current_conversations[0]?.round === null) {
    throw new Error('STRICT MODE: Current conversation has no round number');
  }

  console.log('💬 Coach message:', coach_message);

  // Add coach message to conversation
  const coach_conversation: KitchenConversation = {
    id: `coach_${Date.now()}`,
    avatar: '👨‍💼',
    speaker: coach_name,
    speaker_id: 'coach',
    message: coach_message.trim(),
    is_complaint: false,
    timestamp: new Date(),
    is_ai: false,
    round: current_conversations[0].round + 1
  };

  // Check if coach addressed a specific character by name
  const message_lower = coach_message.toLowerCase();
  const addressed_character = available_characters.find(c =>
    message_lower.includes(c.name.toLowerCase()) ||
    message_lower.includes(c.name.split(' ')[0].toLowerCase())
  );

  let responders: Contestant[];
  if (addressed_character) {
    // If coach addressed someone by name, they MUST respond (possibly with others)
    const others = available_characters.filter(c => c.id !== addressed_character.id);
    const include_others = Math.random() < 0.3; // 30% chance for additional responder
    if (include_others && others.length > 0) {
      const random_other = others[Math.floor(Math.random() * others.length)];
      responders = [addressed_character, random_other];
    } else {
      responders = [addressed_character];
    }
    console.log(`🎯 Coach addressed ${addressed_character.name} - they will respond`);
  } else {
    // No specific character addressed - truly random selection using Fisher-Yates shuffle
    const shuffled = [...available_characters];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const num_responders = Math.random() < 0.5 ? 1 : 2;
    responders = shuffled.slice(0, num_responders);
  }

  const responses: KitchenConversation[] = [coach_conversation];

  // Convert conversation history to message format
  const history_messages = current_conversations.map(c => ({
    message: c.message,
    speaker_name: c.speaker,
    speaker_id: c.speaker_id
  }));

  for (const character of responders) {
    try {
      // Build immediate situation for coach message
      const immediate_situation = `The coach, ${coach_name}, just said: "${coach_message.substring(0, 100)}${coach_message.length > 100 ? '...' : ''}"`;

      const response = await sendKitchenMessage(
        character.id, // userchar_id (UUID)
        character.character_id, // canonical ID
        [...history_messages, {
          message: coach_message,
          speaker_name: coach_name,
          speaker_id: 'coach'
        }],
        session_id,
        chat_id,
        immediate_situation
      );

      if (response.ok && response.text) {
        // STRICT MODE: Use character avatar_emoji exactly as provided
        if (!character.avatar_emoji) {
          throw new Error(`STRICT MODE: Character ${character.id} has no avatar_emoji`);
        }

        const conversation: KitchenConversation = {
          id: `kitchen_${Date.now()}_${character.id}`,
          avatar: character.avatar_emoji,
          speaker: character.name.split(' ')[0],
          speaker_id: character.id,
          message: response.text,
          is_complaint: false,
          timestamp: new Date(),
          is_ai: true,
          round: coach_conversation.round
        };

        responses.push(conversation);
        console.log(`✅ ${character.name} responded to coach`);

        // Add delay between responses
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    } catch (error) {
      console.error(`Failed to get response from ${character.name}:`, error);
    }
  }

  return responses;
};

/**
 * Continue an ongoing kitchen scene with auto-generated responses
 */
export const continueScene = async (
  current_conversations: KitchenConversation[],
  available_characters: Contestant[],
  session_id: string,
  chat_id: string,
  onResponse?: (conversation: KitchenConversation) => void
): Promise<KitchenConversation[]> => {
  // STRICT MODE: Require valid conversation history
  if (!current_conversations || current_conversations.length === 0) {
    throw new Error('STRICT MODE: Cannot continue scene without conversation history');
  }
  if (current_conversations[0]?.round === undefined || current_conversations[0]?.round === null) {
    throw new Error('STRICT MODE: Current conversation has no round number');
  }

  const current_round = current_conversations[0].round + 1;

  // Select 1-2 characters to continue conversation
  const num_responders = Math.random() < 0.5 ? 1 : 2;

  // Get recent speakers to avoid repetition
  const recent_speakers = current_conversations.slice(0, 3).map(c => c.speaker_id);
  const available_for_response = available_characters.filter(
    c => !recent_speakers.includes(c.id)
  );

  const candidates = available_for_response.length > 0
    ? available_for_response
    : available_characters;

  // Fisher-Yates shuffle for truly random selection
  const shuffled = [...candidates];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const responders = shuffled.slice(0, num_responders);

  const new_conversations: KitchenConversation[] = [];

  // Convert conversation history to message format
  const history_messages = current_conversations.slice(0, 5).map(c => ({
    message: c.message,
    speaker_name: c.speaker,
    speaker_id: c.speaker_id
  }));

  for (const character of responders) {
    try {
      // STRICT MODE: Require valid conversation history
      if (!current_conversations || current_conversations.length === 0) {
        throw new Error('STRICT MODE: Cannot continue scene without conversation history');
      }
      if (!current_conversations[0]?.speaker) {
        throw new Error('STRICT MODE: Last conversation has no speaker');
      }

      // Build immediate situation for continuing conversation
      const last_speaker = current_conversations[0].speaker;
      const immediate_situation = `The conversation at the kitchen table is continuing. ${last_speaker} just spoke, and the discussion is ongoing.`;

      const response = await sendKitchenMessage(
        character.id, // userchar_id (UUID)
        character.character_id, // canonical ID
        history_messages,
        session_id,
        chat_id,
        immediate_situation
      );

      if (response.ok && response.text) {
        // Check for duplicate/repetitive responses
        const is_duplicate = current_conversations.slice(0, 3).some(c =>
          c.message.toLowerCase().substring(0, 20) === response.text.toLowerCase().substring(0, 20)
        );

        if (!is_duplicate && response.text.length > 10) {
          // STRICT MODE: Use character avatar_emoji exactly as provided
          if (!character.avatar_emoji) {
            throw new Error(`STRICT MODE: Character ${character.id} has no avatar_emoji`);
          }

          const conversation: KitchenConversation = {
            id: `kitchen_${Date.now()}_${character.id}`,
            avatar: character.avatar_emoji,
            speaker: character.name.split(' ')[0],
            speaker_id: character.id,
            message: response.text,
            is_complaint: false,
            timestamp: new Date(),
            is_ai: true,
            round: current_round
          };

          new_conversations.push(conversation);
          console.log(`✅ ${character.name} continued conversation`);

          // Notify callback immediately for real-time bubble display
          if (onResponse) {
            onResponse(conversation);
          }

          // Add delay between responses
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    } catch (error) {
      console.error(`Failed to continue scene for ${character.name}:`, error);
    }
  }

  return new_conversations;
};

/**
 * Session management functions
 */
export const getKitchenSession = (session_id: string): KitchenSession | undefined => {
  return active_sessions.get(session_id);
};

export const updateSessionConversations = (
  session_id: string,
  conversations: KitchenConversation[]
): void => {
  const session = active_sessions.get(session_id);
  if (session) {
    // STRICT MODE: Require valid conversations
    if (!conversations || conversations.length === 0) {
      throw new Error('STRICT MODE: Cannot update session with empty conversations');
    }
    if (conversations[0]?.round === undefined || conversations[0]?.round === null) {
      throw new Error('STRICT MODE: First conversation has no round number');
    }

    session.conversations = conversations;
    session.round = conversations[0].round;
  }
};

export const clearSession = (session_id: string): void => {
  active_sessions.delete(session_id);
};
