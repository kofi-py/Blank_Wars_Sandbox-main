/**
 * Simple localStorage-based thread storage utility
 * Works in both React and non-React contexts
 */

import { createChatId } from './chat_id';

const STORAGE_KEY = 'blankwars-chat-threads';

interface ThreadData {
  chat_id: string;
  domain: string;
  userchar_id: string;
  last_used: number;
}

interface ThreadStorage {
  [key: string]: ThreadData; // key is domain:userchar_id
}

function getStorage(): ThreadStorage {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function setStorage(data: ThreadStorage): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore localStorage errors
  }
}

function getThreadKey(domain: string, userchar_id: string): string {
  return `${domain}:${userchar_id}`;
}

/**
 * Get or create a chat_id for a specific domain/userchar_id combination
 */
export function ensureChatId(domain: string, userchar_id: string): string {
  const threadKey = getThreadKey(domain, userchar_id);
  const storage = getStorage();
  
  // Check if we have an existing thread for this domain/userchar_id
  const existing = storage[threadKey];
  if (existing && existing.chat_id) {
    // Update last used timestamp
    existing.last_used = Date.now();
    setStorage(storage);
    return existing.chat_id;
  }
  
  // Create new chat_id
  const newChatId = createChatId(domain, userchar_id);
  storage[threadKey] = {
    chat_id: newChatId,
    domain,
    userchar_id,
    last_used: Date.now()
  };
  
  setStorage(storage);
  return newChatId;
}

/**
 * Clear all thread data (useful for logout)
 */
export function clearAllThreads(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Get the current chat_id for a domain/userchar_id without creating one
 */
export function getCurrentChatId(domain: string, userchar_id: string): string | null {
  const threadKey = getThreadKey(domain, userchar_id);
  const storage = getStorage();
  return storage[threadKey]?.chat_id || null;
}