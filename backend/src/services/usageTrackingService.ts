import { User, UsageLimits, UsageStatus } from '../types/index';

export class UsageTrackingService {
  private static readonly USAGE_LIMITS: UsageLimits = {
    free: {
      daily_chat_limit: 5, // Unified limit for ALL AI interactions (character, kitchen, team chat)
      daily_image_limit: 1, // Only 1 DALL-E image per day for free users
      daily_battle_limit: 3, // 3 battles per day (each battle = 3 matches)
      daily_training_limit: 3 // 3 training activities per day (base limit)
    },
    premium: {
      daily_chat_limit: 75, // Generous but reasonable for all AI interactions
      daily_image_limit: 5, // 5 images per day for premium
      daily_battle_limit: 15, // 15 battles per day for premium users
      daily_training_limit: 5 // 5 training activities per day (base limit)
    },
    legendary: {
      daily_chat_limit: -1, // Unlimited
      daily_image_limit: 10, // Plenty for any reasonable use case
      daily_battle_limit: -1, // Unlimited battles for legendary tier
      daily_training_limit: 10 // 10 training activities per day (base limit)
    }
  };

  /**
   * Check if user can perform a chat action
   */
  static can_userChat(user: User): boolean {
    // USAGE LIMITS DISABLED - Always allow unlimited usage
    return true;
  }

  /**
   * Check if user can generate an image
   */
  static can_userGenerateImage(user: User): boolean {
    // USAGE LIMITS DISABLED - Always allow unlimited usage
    return true;
  }

  /**
   * Get comprehensive usage status for a user
   */
  static getUserUsageStatus(user: User): UsageStatus {
    // USAGE LIMITS DISABLED - Return unlimited status for all features
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    return {
      can_chat: true,
      can_generate_image: true,
      can_battle: true,
      can_training: true,
      remaining_chats: -1,
      remaining_images: -1,
      remaining_battles: -1,
      remaining_training: -1,
      reset_time: tomorrow.toISOString()
    };
  }

  /**
   * Track a chat usage and update user record
   */
  static async trackChatUsage(user_id: string, db: any): Promise<boolean> {
    // USAGE LIMITS DISABLED - Always allow unlimited usage
    return true;
  }

  /**
   * Track an image generation usage and update user record
   */
  static async trackImageUsage(user_id: string, db: any): Promise<boolean> {
    // USAGE LIMITS DISABLED - Always allow unlimited usage
    return true;
  }

  /**
   * Check if user can start a battle
   */
  static can_userBattle(user: User): boolean {
    // USAGE LIMITS DISABLED - Always allow unlimited usage
    return true;
  }

  /**
   * Track a battle usage and update user record
   */
  static async trackBattleUsage(user_id: string, db: any): Promise<boolean> {
    // USAGE LIMITS DISABLED - Always allow unlimited usage
    return true;
  }

  /**
   * Check if user can start training (with gym bonuses)
   */
  static can_userTraining(user: User, gym_tier: string = 'community'): boolean {
    // USAGE LIMITS DISABLED - Always allow unlimited usage
    return true;
  }

  /**
   * Track a training usage and update user record
   */
  static async trackTrainingUsage(user_id: string, db: any, gym_tier: string = 'community'): Promise<boolean> {
    // USAGE LIMITS DISABLED - Always allow unlimited usage
    return true;
  }



  /**
   * Get tier limits for display purposes
   */
  static getTierLimits(): UsageLimits {
    return this.USAGE_LIMITS;
  }
}

export const usage_tracking_service = UsageTrackingService;