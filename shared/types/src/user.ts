/**
 * User-related type definitions
 * Shared between frontend and backend
 */

export interface User {
  id: string;
  username: string;
  email: string;
  password_hash?: string;
  oauth_provider?: string;
  oauth_id?: string;
  subscription_tier: string;
  subscription_expires_at?: Date;
  stripe_customer_id?: string;
  daily_play_seconds: number;
  last_play_reset: Date;
  level: number;
  experience: number;
  total_battles: number;
  total_wins: number;
  rating: number;
  created_at: Date;
  updated_at: Date;
  last_login?: Date;
  is_banned: boolean;
  ban_reason?: string;
  character_slot_capacity: number;
  daily_chat_reset_date?: string;
  daily_chat_count?: number;
  daily_image_reset_date?: string;
  daily_image_count?: number;
  daily_battle_reset_date?: string;
  daily_battle_count?: number;
  daily_training_reset_date?: string;
  daily_training_count?: number;
}
