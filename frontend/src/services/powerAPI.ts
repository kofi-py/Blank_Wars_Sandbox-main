/**
 * Power System API Service
 * Handles all API calls related to character powers
 */

import apiClient from './apiClient';

export interface Power {
  id: string;
  name: string;
  description: string;
  tier: 'skill' | 'ability' | 'species' | 'signature';
  power_level?: number; // 1 (common), 2 (uncommon), or 3 (rare)
  unlock_cost: number;
  rank_up_cost: number;
  rank_up_cost_r2: number;
  rank_up_cost_r3: number;
  max_rank: number;
  current_rank: number;
  mastery_level?: number;
  mastery_points?: number;
  is_unlocked: boolean;
  is_equipped: boolean;
  unlocked_by: 'coach_suggestion' | 'character_rebellion' | null;
  unlocked_at: string | null;
  base_effect: number;
  rank_bonus: number;
  can_unlock: {
    can: boolean;
    reason?: string;
  };
  can_rank_up: {
    can: boolean;
    reason?: string;
  };
  effects?: Array<{
    type: string;
    value?: number;
    stat?: string;
    damage_type?: string;
    status_effect?: string;
    target?: string;
    duration?: number;
    rank?: number;
    chance?: number;
    count?: number;
    special_type?: string;
    immunity_type?: string;
    [key: string]: any;
  }>;
  power_type?: 'active' | 'passive' | 'toggle';
  cooldown?: number;
  energy_cost?: number;
  icon?: string;
  flavor_text?: string;
}

export interface PowerLoadoutSlot {
  power_id: string;
  slot_number: number;
}

export interface CharacterPowersResponse {
  character: {
    id: string;
    name: string;
    level: number;
    character_points: number;
    gameplan_adherence: number;
    coach_lockout_until?: string;
  };
  powers: Power[];
  loadout: PowerLoadoutSlot[];
}

/**
 * Get all powers for a character
 */
export async function getCharacterPowers(character_id: string): Promise<CharacterPowersResponse> {
  const response = await apiClient.get(`/powers/character/${character_id.trim()}`);
  return response.data;
}

/**
 * Unlock a new power (with adherence check)
 */
export async function unlockPower(character_id: string, power_id: string): Promise<any> {
  const response = await apiClient.post('/powers/unlock', { character_id, power_id });
  return response.data;
}

/**
 * Rank up an existing power
 */
export async function rankUpPower(character_id: string, power_id: string): Promise<{ success: boolean; new_rank: number; remaining_points: number }> {
  const response = await apiClient.post(`/character-progression/${character_id}/upgrade-power`, { power_id });
  return response.data;
}

/**
 * Equip a power to a loadout slot (with adherence check)
 */
export async function equipPower(user_id: string, character_id: string, power_id: string, slot_number: number): Promise<{
  success: boolean;
  adhered: boolean;
  coach_choice: string;
  final_choice: string;
  reasoning?: string;
  adherence_score?: number;
  lockout_until?: string;
  rebellion_result?: {
    type: 'power' | 'spell';
    name: string;
    id: string;
  };
  message: string;
}> {
  const response = await apiClient.post('/powers/equip', { user_id, character_id, power_id, slot_number });
  return response.data;
}

/**
 * Unequip a power from a loadout slot
 */
export async function unequipPower(character_id: string, slot_number: number): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post('/powers/unequip', { character_id, slot_number });
  return response.data;
}

/**
 * Get character's power loadout
 */
export async function getPowerLoadout(character_id: string): Promise<{ character_id: string; loadout: any[] }> {
  const response = await apiClient.get(`/powers/loadout/${character_id}`);
  return response.data;
}


