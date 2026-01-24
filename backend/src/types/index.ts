// Type definitions for Blank Wars

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

import type { Archetype, Species, CharacterRarity, PowerTier, SpellTier } from '@blankwars/types';

export interface Character {
  id: string;
  name: string;
  title: string;
  archetype: Archetype;
  origin_era: string;
  rarity: CharacterRarity;
  species: Species;
  health: number;
  attack: number;
  defense: number;
  speed: number;
  magic_attack: number;
  personality_traits: string[];
  conversation_style: string;
  backstory: string;
  conversation_topics: string[];
  avatar_emoji: string;
  artwork_url?: string;
  abilities: Ability[];
  created_at: Date;
  training: number;
  team_player: number;
  ego: number;
  mental_health: number;
  communication: number;
  gameplan_adherence: number;
  current_mental_health: number;
  current_stress: number;
  team_trust: number;
  battle_focus: number;
}

export interface Ability {
  name: string;
  description: string;
  damage_multiplier: number;
  cooldown: number;
  element?: string;
  effects?: string[];
}

export interface UserCharacter {
  id: string;
  user_id: string;
  character_id: string;
  serial_number?: string;
  nickname?: string;
  level: number;
  experience: number;
  gameplan_adherence: number;
  current_mental_health?: number;
  current_stress: number;
  current_confidence?: number;
  team_trust?: number;
  battle_focus?: number;
  current_ego?: number;
  current_communication?: number;
  current_team_player?: number;
  current_morale?: number;
  bond_level: number;
  total_battles: number;
  total_wins: number;
  current_health: number;
  current_max_health: number;
  is_injured: boolean;
  injury_severity?: string;
  is_dead: boolean;
  death_timestamp?: Date;
  recovery_time?: Date;
  resurrection_available_at?: Date;
  death_count?: number;
  pre_death_level?: number;
  pre_death_experience?: number;
  equipment: any[];
  enhancements: any[];
  conversation_memory: ChatMemory[];
  significant_memories: any[];
  personality_drift: any;
  acquired_at: Date;
  last_battle_at?: Date;
  psychstats?: string; // JSONB column stored as string
  battle_count?: number;

  // Combat Stats
  health?: number;
  attack?: number;
  defense?: number;
  speed?: number;
  magic_attack?: number;
  magic_defense?: number;

  // Attribute Stats
  strength?: number;
  dexterity?: number;
  intelligence?: number;
  wisdom?: number;
  charisma?: number;
  spirit?: number;

  /** Wallet balance in dollars. */
  wallet: number;

  /** Total debt in dollars. */
  debt: number;

  /** Total debt principal in dollars (legacy). */
  debt_principal?: number;

  /** Monthly earnings in dollars. */
  monthly_earnings: number;

  /** Character points for unlocking and ranking up powers/spells. */
  ability_points: number;

  /** Recent autonomous decisions made by the character. */
  recent_decisions: any[];

  /** Total number of battle losses. */
  total_losses: number;

  financial_stress: number;
  coach_trust_level?: number;
  starter_gear_given?: boolean;
}

export interface ChatMemory {
  user_message: string;
  character_response: string;
  timestamp: Date;
  context?: any;
  bond_increase?: boolean;
}

export interface Battle {
  id: string;
  user_id: string;
  opponent_user_id: string;
  user_character_id: string;
  opponent_character_id: string;
  status: 'matchmaking' | 'active' | 'paused' | 'completed';
  current_round: number;
  turn_count: number;
  user_strategy?: 'aggressive' | 'defensive' | 'balanced';
  opponent_strategy?: 'aggressive' | 'defensive' | 'balanced';
  winner_id?: string;
  end_reason?: string;
  combat_log: CombatAction[];
  chat_logs: any[];
  xp_gained: number;
  bond_gained: number;
  currency_gained: number;
  started_at: Date;
  ended_at?: Date;
}

export interface CombatAction {
  round: number;
  turn: number;
  attacker_id: string;
  defender_id: string;
  ability_used: string;
  damage_dealt: number;
  effects_applied?: string[];
  timestamp: Date;
}

import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: User;
}

export interface SocketUser {
  user_id: string;
  socket_id: string;
  current_battle?: string;
}

export interface UsageLimits {
  [key: string]: any; // Allow dynamic access for subscription tiers
  free: {
    daily_chat_limit: number;
    daily_image_limit: number;
    daily_battle_limit: number;
    daily_training_limit: number;
  };
  premium: {
    daily_chat_limit: number;
    daily_image_limit: number;
    daily_battle_limit: number;
    daily_training_limit: number;
  };
  legendary: {
    daily_chat_limit: number;
    daily_image_limit: number;
    daily_battle_limit: number;
    daily_training_limit: number;
  };
}

export interface UsageStatus {
  can_chat: boolean;
  can_generate_image: boolean;
  can_battle: boolean;
  can_training: boolean;
  remaining_chats: number;
  remaining_images: number;
  remaining_battles: number;
  remaining_training: number;
  reset_time: string;
}

export * from './bond';

// Re-export shared types for convenience
export type { Archetype, Species, CharacterRarity, PowerTier, SpellTier } from '@blankwars/types';