// Headquarters progression tiers
export interface HeadquartersTier {
  id: string;
  name: string;
  description: string;
  max_rooms: number;
  characters_per_room: number;
  cost: { coins: number; gems: number };
  unlock_level: number;
  room_upgrades: string[];
}

// Room themes with battle bonuses
export interface RoomTheme {
  id: string;
  name: string;
  description: string;
  bonus: string;
  bonus_value: number;
  suitable_characters: string[];
  cost: { coins: number; gems: number };
  background_color: string;
  text_color: string;
  icon: string;
}

// Room element categories for multi-element theming
export interface RoomElement {
  id: string;
  name: string;
  category: 'wallDecor' | 'furniture' | 'lighting' | 'accessories' | 'flooring';
  description: string;
  bonus: string;
  bonus_value: number;
  suitable_characters: string[];
  cost: { coins: number; gems: number };
  background_color: string;
  text_color: string;
  icon: string;
  compatible_with: string[]; // Other element IDs that synergize well
  incompatible_with: string[]; // Other element IDs that clash
}

// Bed types and sleep quality
export interface Bed {
  id: string;
  type: 'bed' | 'bunk_bed' | 'couch' | 'air_mattress' | 'floor';
  position: { x: number; y: number }; // For future positioning
  capacity: number; // 1 for bed/couch, 2 for bunk bed
  comfort_bonus: number; // Sleep quality bonus
  cost?: { coins: number; gems: number }; // For purchasable beds
  character_id?: string;
  stat_modifier_type?: string;
  stat_modifier_value?: number;
}

// Purchasable bed options
export interface PurchasableBed {
  id: string;
  name: string;
  type: 'bunk_bed' | 'air_mattress';
  description: string;
  capacity: number;
  comfort_bonus: number;
  cost: { coins: number; gems: number };
  icon: string;
}

// Room instance with bed system
export interface Room {
  id: string;
  name: string;
  theme: string | null; // Legacy single theme support
  elements: string[]; // New multi-element system
  assigned_characters: string[];
  max_characters: number;
  beds: Bed[]; // New bed system
  custom_image_url?: string; // DALL-E generated image
}

// User headquarters state
export interface HeadquartersState {
  current_tier: string;
  rooms: Room[];
  currency: { coins: number; gems: number };
  unlocked_themes: string[];
}