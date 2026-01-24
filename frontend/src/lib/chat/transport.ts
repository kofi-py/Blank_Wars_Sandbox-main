// Universal HTTP transport for all chat systems
// Wraps sendViaAIChat with consistent interface

import { sendViaAIChat } from '../../services/chatAdapter';
import { ensureChatId } from '../../utils/threadStorage';

export interface ChatPayload {
  agent_key: string;
  message: string;
  chat_type: string;
  topic?: string;
  session_id?: string;
  character_data?: any;
  conversation_context?: string;
  // Required for chat_id generation
  domain?: string;
  userchar_id?: string;
  // Or provide chat_id directly
  chat_id?: string;
  [key: string]: any; // Allow additional fields for specific chat types
}

export interface ChatResponse {
  text: string;
  [key: string]: any; // Allow additional response fields
}

export async function sendChat(session_id: string, payload: ChatPayload): Promise<ChatResponse> {
  // Guard: prevent invalid agent keys from reaching backend
  if (!payload.agent_key || /^userchar_/.test(payload.agent_key)) {
    throw new Error(`[transport] invalid agent_key "${payload.agent_key}" - must be a valid agent slug, not userchar_*`);
  }
  
  // Ensure chat_id is always provided
  let chat_id = payload.chat_id;
  if (!chat_id) {
    // Extract domain from chat_type or use 'general' as fallback
    const domain = payload.domain || payload.chat_type || 'general';
    const userchar_id = payload.userchar_id || 'unknown';
    
    console.log('[transport] Generating chat_id for:', { domain, userchar_id });
    chat_id = ensureChatId(domain, userchar_id);
  }
  
  // Belt-and-suspenders: ensure both agent_key and character are set
  const transportPayload = {
    ...payload,
    character: payload.agent_key, // Backend reads this field
    character_id: payload.agent_key, // Needed for memory-aware system
    userchar_id: payload.userchar_id, // Ensure forwarded (subject player)
    meta: payload.meta, // Ensure meta with recentSystemEvent is forwarded
  };
  
  return sendViaAIChat(chat_id, transportPayload);
}