// Socket Event Type Definitions
// Centralizes all socket response types for type safety

export interface ChatResponseData {
  character: string;
  message: string;
  bond_increase?: boolean;
  chat_result?: 'success' | 'neutral' | 'failure';
  xp_awarded?: number;
  penalty_applied?: boolean;
  error?: string;
}

export interface TeamChatResponseData extends ChatResponseData {
  character_id: string;
}

export interface FacilitiesChatResponseData extends ChatResponseData {
  // Additional facilities-specific fields can be added here
}

export interface TrainingChatResponseData extends ChatResponseData {
  // Additional training-specific fields can be added here
}

// Generic socket error response
export interface SocketErrorResponse {
  message: string;
  code?: string;
  details?: string;
}

// Socket connection states
export type SocketConnectionState = 'connected' | 'disconnected' | 'connecting' | 'error';

// Type guards for runtime validation
export const isChatResponseData = (data: unknown): data is ChatResponseData => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'character' in data &&
    'message' in data &&
    typeof (data as Record<string, unknown>).character === 'string' &&
    typeof (data as Record<string, unknown>).message === 'string'
  );
};

export const isSocketErrorResponse = (data: unknown): data is SocketErrorResponse => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'message' in data &&
    typeof (data as Record<string, unknown>).message === 'string'
  );
};