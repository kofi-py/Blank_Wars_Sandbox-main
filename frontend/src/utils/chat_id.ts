/**
 * Generate a stable chat_id for UI threads.
 * One UUID per thread. Persist this value for the lifetime of the thread.
 * 
 * Format: chat:<domain>:<userchar_id>:<unique-id>
 */
export function createChatId(domain: string, userchar_id: string): string {
  // Generate a unique ID using timestamp + random string
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const uniqueId = `${timestamp}-${random}`;
  
  return `chat:${domain}:${userchar_id}:${uniqueId}`;
}

/**
 * Parse a chat_id to extract its components
 */
export function parseChatId(chat_id: string): {
  domain: string;
  userchar_id: string;
  uuid: string;
} | null {
  const parts = chat_id.split(':');
  if (parts.length === 4 && parts[0] === 'chat') {
    return {
      domain: parts[1],
      userchar_id: parts[2],
      uuid: parts[3]
    };
  }
  return null;
}

/**
 * Check if a chat_id is valid
 */
export function isValidChatId(chat_id: string): boolean {
  return parseChatId(chat_id) !== null;
}