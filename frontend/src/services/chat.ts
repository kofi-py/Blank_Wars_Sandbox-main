import apiClient from './apiClient';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}


export interface ChatResponse {
  choices: Array<{
    index: number;
    finish_reason: string;
    message: {
      role: 'assistant';
      content: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function sendChat(
  character_id: string,
  messages: ChatMessage[],
  chat_id: string = 'default',
  session_id?: string,
  max_tokens: number = 96,
  chat_type?: string,
  topic?: string
): Promise<ChatResponse> {
  // If no session_id provided, create one from character_id and chat_id
  session_id = session_id || `bw:${character_id}:${chat_id}`;
  
  const response = await apiClient.post('/ai/chat', {
    character_id,
    messages,
    chat_id,
    session_id,
    max_tokens: max_tokens,
    ...(chat_type && { chat_type }),
    ...(topic && { topic })
  });
  
  return response.data;
}

// Helper function to send a simple text message
export async function sendSimpleMessage(
  character_id: string,
  message: string,
  chat_id: string = 'default',
  session_id?: string,
  max_tokens: number = 96,
  opts?: { chat_type?: string; topic?: string }
): Promise<string> {
  const response = await apiClient.post('/ai/chat', {
    character_id,
    message,
    chat_id,
    session_id: session_id || `bw:${character_id}:${chat_id}`,
    max_tokens: max_tokens,
    ...(opts?.chat_type && { chat_type: opts.chat_type }),
    ...(opts?.topic && { topic: opts.topic })
  });
  
  if (!response.data.text) {
    throw new Error(`STRICT MODE: Backend response missing text: ${JSON.stringify(response.data)}`);
  }
  return response.data.text;
}