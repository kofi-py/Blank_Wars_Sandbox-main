/**
 * Spell System API Service
 * Handles all API calls related to character spells
 */

import apiClient from './apiClient';

export interface Spell {
  id: string;
  name: string;
  description: string;
  tier: 'universal' | 'archetype' | 'species' | 'signature';
  power_level?: number; // 1 (common), 2 (uncommon), or 3 (rare)
  archetype?: string;
  species?: string;
  character_id?: string;
  unlock_cost: number;
  rank_up_cost: number;
  rank_up_cost_r2: number;
  rank_up_cost_r3: number;
  max_rank: number;
  current_rank?: number;
  mastery_level?: number;
  mastery_points?: number;
  is_unlocked: boolean;
  is_equipped: boolean;
  unlocked_at?: string;
  times_cast: number;
  last_cast?: string;
  can_unlock: {
    can: boolean;
    reason?: string;
  };
  can_rank_up: {
    can: boolean;
    reason?: string;
  };
  mana_cost: number;
  cooldown_turns: number;
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
  icon?: string;
  flavor_text?: string;
  animation?: string;
}

export interface SpellLoadoutSlot {
  spell_id: string;
  slot_number: number;
}

export interface CharacterSpellsResponse {
  character: {
    id: string;
    name: string;
    level: number;
    character_points: number;
    gameplan_adherence: number;
    coach_lockout_until?: string;
  };
  spells: Spell[];
  loadout: SpellLoadoutSlot[];
}

/**
 * Get all spells available to a character
 */
export async function getCharacterSpells(character_id: string): Promise<CharacterSpellsResponse> {
  const response = await apiClient.get(`/spells/character/${character_id}`);
  return response.data;
}

/**
 * Unlock a new spell
 */
export async function unlockSpell(character_id: string, spell_id: string): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post('/spells/unlock', { character_id, spell_id });
  return response.data;
}

/**
 * Rank up an existing spell
 */
export async function rankUpSpell(character_id: string, spell_id: string): Promise<{ success: boolean; new_rank: number; remaining_points: number }> {
  const response = await apiClient.post(`/character-progression/${character_id}/upgrade-spell`, { spell_id });
  return response.data;
}

/**
 * Equip a spell to a loadout slot (with adherence check)
 */
export async function equipSpell(user_id: string, character_id: string, spell_id: string, slot_number: number): Promise<{
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
  const response = await apiClient.post('/spells/equip', { user_id, character_id, spell_id, slot_number });
  return response.data;
}

/**
 * Unequip a spell from a loadout slot
 */
export async function unequipSpell(character_id: string, slot_number: number): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post('/spells/unequip', { character_id, slot_number });
  return response.data;
}

/**
 * Get character's spell loadout
 */
export async function getSpellLoadout(character_id: string): Promise<{ character_id: string; loadout: any[] }> {
  const response = await apiClient.get(`/spells/loadout/${character_id}`);
  return response.data;
}


