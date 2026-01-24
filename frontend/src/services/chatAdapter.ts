import { sendSimpleMessage } from './chat';
import apiClient from './apiClient';

export interface ConversationMessage {
  message: string;
  speaker_name: string;
  speaker_id: string;
}

export type AIChatPayload = {
  role?: 'therapist' | 'patient' | 'judge'; // explicit role declaration
  character?: string;         // user character id (optional now)
  agent_key?: string;          // e.g., 'alien_therapist'
  message: string;            // required – user text
  messages?: ConversationMessage[]; // conversation history with speaker attribution
  conversation_context?: string; // optional – existing "context as text"
  chat_type?: string;          // optional – financial_advisor, etc.
  topic?: string;             // optional – budget, crypto, etc.
  stream?: boolean;           // optional – for streaming responses
  meta?: any;                 // optional – for memory system (userchar_id, etc.)
  userchar_id?: string;        // optional – for therapy system
  therapist_id?: string;       // optional – for therapy system
  [key: string]: unknown;     // carry-through for other fields; unused here
};

export type AIChatResult = {
  text: string;
  raw: any;
};

/**
 * Transport adapter: keep payload object intact at call sites.
 * No fallbacks. If a caller omits `character` or `message`, let TS fail there.
 * We only compose text from conversation_context + message and send via HTTP.
 */
export async function sendViaAIChat(
  chat_id: string,
  payload: AIChatPayload
): Promise<AIChatResult> {
  const { role, character, agent_key, message, messages, conversation_context, chat_type, topic, stream, meta, userchar_id, therapist_id, therapist_userchar_id, intensity_strategy, domain, participant_ids, intensity_level, training_phase, session_duration, time_of_day, facility_tier, available_equipment, trainer_id } = payload as any;

  const text = conversation_context
    ? `${conversation_context}\n\nUser: ${message}`
    : message;

  const session_id = `bw:${agent_key || character}:${chat_id}`;

  // Normalize to what the backend expects
  const templateSlug = agent_key || character;

  // build body: use canonical field names for strict backend validation
  const body: any = {
    message: text,
    chat_id,
    session_id: session_id,
    character_id: templateSlug,
    ...(role && { role }),
    ...(chat_type && { chat_type }),
    ...(topic && { topic }),
    ...(agent_key && { agent_key }),
    ...(meta && { meta }),
    ...(messages && { messages }),
    ...(userchar_id && { userchar_id }),
    ...(therapist_id && { therapist_id }),
    ...(therapist_userchar_id && { therapist_userchar_id }),
    ...(intensity_strategy && { intensity_strategy }),
    ...(domain && { domain }),
    ...(participant_ids && { participant_ids }),
    // Training-specific fields
    ...(intensity_level && { intensity_level }),
    ...(training_phase && { training_phase }),
    ...(session_duration !== undefined && { session_duration }),
    ...(time_of_day && { time_of_day }),
    ...(facility_tier && { facility_tier }),
    ...(available_equipment && { available_equipment }),
    ...(trainer_id && { trainer_id }),
  };

  const msgLen = typeof payload.message === 'string' ? payload.message.length : 0;

  console.log('[CHAT-ADAPTER] POST /ai/chat', templateSlug, 'len:', msgLen);
  console.log('[CHAT-ADAPTER] PAYLOAD DEBUG:', { role, meta, agent_key, character, chat_type, userchar_id, therapist_id });
  console.log('[CHAT-ADAPTER] ACTUAL BODY BEING SENT:', body);

  // Guard against bad judge payloads
  if (chat_type === 'therapy_evaluation' && msgLen === 0) {
    console.warn('[CHAT-ADAPTER] Judge payload missing message string', {
      has_messages_array: Array.isArray((payload as any).messages),
      messages_count: (payload as any).messages?.length ?? 0,
    });
  }

  // Use direct API call to handle streaming and 202 responses
  const response = await apiClient.post(`/ai/chat${stream ? '?stream=1' : ''}`, body);

  if (!response.data.text) {
    throw new Error(`STRICT MODE: Backend response missing text: ${JSON.stringify(response.data)}`);
  }

  return { text: response.data.text, raw: response.data };
}