interface UsageStatus {
  can_chat: boolean;
  can_generate_image: boolean;
  can_battle: boolean;
  remaining_chats: number;
  remaining_images: number;
  remaining_battles: number;
  reset_time: string;
}

interface TierLimits {
  free: {
    daily_chat_limit: number;
    daily_image_limit: number;
  };
  premium: {
    daily_chat_limit: number;
    daily_image_limit: number;
  };
  legendary: {
    daily_chat_limit: number;
    daily_image_limit: number;
  };
}

class UsageService {
  private baseUrl: string;

  constructor() {
    const url = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!url) {
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        this.baseUrl = 'http://localhost:4000';
        return;
      }
      throw new Error('NEXT_PUBLIC_API_URL environment variable is not set. Cannot initialize UsageService.');
    }
    this.baseUrl = url;
  }

  /**
   * Get current user's usage status
   */
  async getUserUsageStatus(): Promise<UsageStatus> {
    try {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Add token if available
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${this.baseUrl}/api/usage/status`, {
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch usage status');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching usage status:', error);
      // Return default values for error cases
      return {
        can_chat: true,
        can_generate_image: true,
        can_battle: true,
        remaining_chats: 5,
        remaining_images: 1,
        remaining_battles: 3,
        reset_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };
    }
  }

  /**
   * Get tier limits for all subscription tiers
   */
  async getTierLimits(): Promise<TierLimits> {
    try {
      const response = await fetch(`${this.baseUrl}/api/usage/limits`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch tier limits');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching tier limits:', error);
      // Return default limits
      return {
        free: { daily_chat_limit: 5, daily_image_limit: 1 },
        premium: { daily_chat_limit: 75, daily_image_limit: 5 },
        legendary: { daily_chat_limit: -1, daily_image_limit: 10 }
      };
    }
  }

  /**
   * Format remaining time until reset
   */
  formatTimeUntilReset(resetTime: string): string {
    const reset = new Date(resetTime);
    const now = new Date();
    const diff = reset.getTime() - now.getTime();

    if (diff <= 0) {
      return 'Resets soon';
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `Resets in ${hours}h ${minutes}m`;
    } else {
      return `Resets in ${minutes}m`;
    }
  }

  /**
   * Get usage display text for UI
   */
  getUsageDisplayText(usageStatus: UsageStatus): {
    chat_text: string;
    image_text: string;
    battle_text: string;
    chat_color: string;
    image_color: string;
    battle_color: string;
  } {
    const chatText = usageStatus.remaining_chats === -1 
      ? 'Unlimited AI interactions' 
      : `${usageStatus.remaining_chats} AI interactions remaining`;
    
    const imageText = usageStatus.remaining_images === -1 
      ? 'Unlimited images' 
      : `${usageStatus.remaining_images} images remaining`;

    const battleText = usageStatus.remaining_battles === -1 
      ? 'Unlimited battles' 
      : `${usageStatus.remaining_battles} battles remaining`;

    const chatColor = usageStatus.remaining_chats === -1 
      ? 'text-yellow-400'
      : usageStatus.remaining_chats > 3 
        ? 'text-green-400'
        : usageStatus.remaining_chats > 1
          ? 'text-yellow-400'
          : 'text-red-400';

    const imageColor = usageStatus.remaining_images === -1 
      ? 'text-yellow-400'
      : usageStatus.remaining_images > 2 
        ? 'text-green-400'
        : usageStatus.remaining_images > 0
          ? 'text-yellow-400'
          : 'text-red-400';

    const battleColor = usageStatus.remaining_battles === -1 
      ? 'text-yellow-400'
      : usageStatus.remaining_battles > 1 
        ? 'text-green-400'
        : usageStatus.remaining_battles > 0
          ? 'text-yellow-400'
          : 'text-red-400';

    return { chat_text: chatText, image_text: imageText, battle_text: battleText, chat_color: chatColor, image_color: imageColor, battle_color: battleColor };
  }
}

export const usageService = new UsageService();
export type { UsageStatus, TierLimits };