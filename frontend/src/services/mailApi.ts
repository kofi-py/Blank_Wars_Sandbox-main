// Internal mail API client for frontend

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export interface MailMessage {
  id: string;
  recipient_user_id: string;
  sender_user_id?: string;
  sender_username?: string;
  subject: string;
  content: string;
  message_type: 'coach_mail' | 'system_mail';
  category: 'system' | 'notification' | 'reward' | 'achievement' | 'coach_message';
  priority: 'low' | 'normal' | 'high';
  sender_signature?: string;
  reply_to_mail_id?: string;
  has_attachment: boolean;
  attachment_data?: any;
  attachment_claimed?: boolean;
  is_read: boolean;
  read_at?: string;
  is_deleted: boolean;
  created_at: string;
  expires_at?: string;
}

export interface MailResponse {
  success: boolean;
  messages: MailMessage[];
  total: number;
  unread_count: number;
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

// CSRF token cache
let csrfToken: string | null = null;

// Fetch CSRF token from server
async function fetchCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;

  try {
    const response = await fetch(`${API_BASE}/api/csrf-token`, {
      credentials: 'include',
    });
    const data = await response.json();
    csrfToken = data.csrfToken;
    return csrfToken || '';
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
    return '';
  }
}

// Helper function to get auth headers
async function getAuthHeaders(includeCSRF: boolean = false): Promise<HeadersInit> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Add CSRF token for state-changing operations
  if (includeCSRF) {
    const token = await fetchCsrfToken();
    if (token) {
      headers['x-csrf-token'] = token;
    }
  }

  return headers;
}

// Helper function to make authenticated requests
async function makeAuthenticatedRequest(url: string, options: RequestInit = {}, require_csrf: boolean = false) {
  const headers = await getAuthHeaders(require_csrf);

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
    credentials: 'include', // Include cookies for authentication
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const mailApi = {
  /**
   * Get user's mail with optional filtering
   */
  async getMail(filters?: {
    category?: string;
    unread_only?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<MailResponse> {
    const params = new URLSearchParams();

    if (filters?.category && filters.category !== 'all') {
      params.append('category', filters.category);
    }
    if (filters?.unread_only) {
      params.append('unreadOnly', 'true');
    }
    if (filters?.limit) {
      params.append('limit', filters.limit.toString());
    }
    if (filters?.offset) {
      params.append('offset', filters.offset.toString());
    }

    const queryString = params.toString();
    const url = `/api/mail${queryString ? `?${queryString}` : ''}`;

    return makeAuthenticatedRequest(url);
  },

  /**
   * Mark a message as read
   */
  async markAsRead(messageId: string): Promise<{ success: boolean; message: string }> {
    return makeAuthenticatedRequest(`/api/mail/${messageId}/read`, {
      method: 'PATCH',
    });
  },

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string): Promise<{ success: boolean; message: string }> {
    return makeAuthenticatedRequest(`/api/mail/${messageId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Claim attachment rewards from a message
   */
  async claimAttachment(messageId: string): Promise<{ success: boolean; message: string; rewards?: any }> {
    return makeAuthenticatedRequest(`/api/mail/${messageId}/claim`, {
      method: 'POST',
    });
  },

  /**
   * Send a message to another player
   */
  async sendMessage(data: {
    recipient_username: string;
    subject: string;
    content: string;
    signature?: string;
    reply_to_mail_id?: string;
  }): Promise<{ success: boolean; message: string; messageId: string }> {
    return makeAuthenticatedRequest('/api/mail/send', {
      method: 'POST',
      body: JSON.stringify(data),
    }, true); // Require CSRF token
  },

  /**
   * Validate if a username exists
   */
  async validateUsername(username: string): Promise<{ exists: boolean; username?: string }> {
    try {
      const response = await fetch(`${API_BASE}/api/user/validate-username?username=${encodeURIComponent(username)}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        return { exists: false };
      }

      return response.json();
    } catch (error) {
      console.error('Error validating username:', error);
      return { exists: false };
    }
  },

  /**
   * Search for usernames (for autocomplete)
   */
  async searchUsernames(query: string, limit: number = 10): Promise<string[]> {
    try {
      const response = await fetch(`${API_BASE}/api/user/search?q=${encodeURIComponent(query)}&limit=${limit}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.usernames || [];
    } catch (error) {
      console.error('Error searching usernames:', error);
      return [];
    }
  },

  /**
   * Initialize demo data (development only)
   */
  async initializeDemoData(): Promise<{ success: boolean; message: string }> {
    return makeAuthenticatedRequest('/api/mail/demo');
  },
};

// Helper function to convert backend MailMessage to frontend format
export function convertMailMessage(backendMessage: MailMessage) {
  return {
    id: backendMessage.id,
    subject: backendMessage.subject,
    content: backendMessage.content,
    category: backendMessage.category,
    is_read: backendMessage.is_read,
    has_attachment: backendMessage.has_attachment,
    timestamp: new Date(backendMessage.created_at),
    priority: backendMessage.priority,
    sender_username: backendMessage.sender_username || 'System',
    sender_user_id: backendMessage.sender_user_id,
    message_type: backendMessage.message_type,
    reply_to_mail_id: backendMessage.reply_to_mail_id,
    signature: backendMessage.sender_signature,
    attachment_data: backendMessage.attachment_data,
    attachment_claimed: backendMessage.attachment_claimed || false,
  };
}