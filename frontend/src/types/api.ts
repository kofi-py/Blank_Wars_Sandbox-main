// API Response Type Definitions
// Defines the shape of data returned from backend APIs

import type { Equipment } from '@/data/equipment';

export interface CharacterAPIResponse {
  id: string;
  name: string;
  avatar: string;
  level: number;
  current_health: number;
  max_health: number;
  is_injured: boolean;
  is_dead: boolean;
  injury_severity?: 'light' | 'moderate' | 'severe' | 'critical';
  recovery_time?: string;
  resurrection_available_at?: string;
  death_count?: number;
  // Base stats
  base_attack?: number;
  base_defense?: number;
  base_speed?: number;
  base_health?: number;
  base_special?: number;
  // Equipment
  equipped_items?: {
    weapon?: Equipment;
    armor?: Equipment;
    accessory?: Equipment;
  };
  // Progression
  stat_points?: number;
  bond_level?: number;
  // Image Mapping
  scene_image_slug?: string;
  battle_image_name?: string;
}

export interface HealingFacilityAPIResponse {
  id: string;
  facilityId?: string; // Alternate ID field
  name: string;
  facility_type: string;
  type?: string; // Alias for facility_type
  healing_rate_multiplier: number;
  currency_cost_per_hour: number;
  premium_cost_per_hour: number;
  max_injury_severity: 'light' | 'moderate' | 'severe' | 'critical';
  headquarters_tier_required: string;
  description: string;
  time_reduction?: number; // Time reduction in hours
  cost?: { // Nested cost object
    currency?: number;
    premium?: number;
  };
}

export interface HealingSessionAPIResponse {
  id: string;
  character_id: string;
  healing_type: string;
  facility_id?: string;
  completion_time: string;
  currency_paid: number;
  premium_paid: number;
  status: 'active' | 'completed' | 'cancelled';
  created_at?: string;
  updated_at?: string;
}

export interface ResurrectionOptionAPIResponse {
  type: 'premium_instant' | 'wait_penalty' | 'level_reset';
  name: string;
  cost: {
    currency?: number;
    premium?: number;
  };
  wait_time?: number; // in minutes
  xp_penalty?: number;
  level_reset?: boolean;
  description: string;
  available: boolean;
}

export interface BondActivityContext {
  message_length?: number;
  conversation_topic?: string;
  training_type?: string;
  equipment_involved?: string;
}

export interface BondActivityLog {
  id: number;
  user_character_id: string;
  activity_type: string;
  bond_change: number;
  bond_level_before: number;
  bond_level_after: number;
  context: BondActivityContext;
  source: string;
  created_at: string;
}

// Standard API response wrappers
export interface APISuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface APIErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
}

export type APIResponse<T> = APISuccessResponse<T> | APIErrorResponse;

// Specific API response types
export interface CharactersAPIResponse {
  characters: CharacterAPIResponse[];
  total: number;
}

export interface HealingOptionsAPIResponse {
  healing_options: HealingFacilityAPIResponse[];
  character: CharacterAPIResponse;
}

export interface HealingSessionsAPIResponse {
  sessions: HealingSessionAPIResponse[];
  total: number;
}

export interface ResurrectionOptionsAPIResponse {
  resurrection_options: ResurrectionOptionAPIResponse[];
  character: CharacterAPIResponse;
}

// Type guards for runtime validation
export const isCharacterAPIResponse = (data: unknown): data is CharacterAPIResponse => {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.level === 'number' &&
    typeof obj.current_health === 'number' &&
    typeof obj.max_health === 'number' &&
    typeof obj.is_injured === 'boolean' &&
    typeof obj.is_dead === 'boolean'
  );
};

export const isAPISuccessResponse = <T>(response: unknown): response is APISuccessResponse<T> => {
  if (typeof response !== 'object' || response === null) return false;
  const obj = response as Record<string, unknown>;
  return obj.success === true && obj.data !== undefined;
};

export const isAPIErrorResponse = (response: unknown): response is APIErrorResponse => {
  if (typeof response !== 'object' || response === null) return false;
  const obj = response as Record<string, unknown>;
  return obj.success === false && typeof obj.error === 'string';
};