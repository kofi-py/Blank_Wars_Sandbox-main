
// apiClient.ts - Frontend API service for Blank Wars

import axios from 'axios';
import type { Equipment } from '../data/equipment';
import type { Contestant } from '@blankwars/types';

// Legacy ability structure used by some components (conflicting with data/abilities.ts)
export interface LegacyAbility {
  id?: string;
  name: string;
  description?: string;
  type: string; // 'attack' | 'defense' | 'special' | 'support' etc.
  power?: number;
  cooldown?: number;
  current_cooldown?: number;
  mental_healthRequired?: number;
  element?: string;
  cost?: number;
  damage?: number;
  effect?: string;
  duration?: number;
}

const BACKEND_URL = (() => {
  const url = (process.env.NEXT_PUBLIC_BACKEND_URL || '').trim();
  if (!url) {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return 'http://localhost:4000';
    }
    throw new Error('NEXT_PUBLIC_BACKEND_URL environment variable is not set. Cannot initialize API client.');
  }
  return url;
})();

// CSRF token cache
let csrfToken: string | null = null;

// Fetch CSRF token from server
async function fetchCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;

  try {
    const response = await fetch(`${BACKEND_URL}/api/csrf-token`, {
      credentials: 'include',
    });
    const data = await response.json();
    csrfToken = data.csrfToken;
    if (!csrfToken) {
      throw new Error('CSRF token not returned from server');
    }
    return csrfToken;
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
    throw new Error(`CSRF token fetch failed: ${error instanceof Error ? error.message : 'Unknown error'} `);
  }
}

const apiClient = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  withCredentials: true,          // <-- critical for cookies
  timeout: 300000, // 5 minutes - increased for LocalAI on CPU which can be slow
});

// Add request interceptor to add CSRF token to state-changing requests
apiClient.interceptors.request.use(
  async (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);

    // Add CSRF token for POST, PUT, PATCH, DELETE requests
    if (config.method && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
      const token = await fetchCsrfToken();
      if (token) {
        config.headers['x-csrf-token'] = token;
      }
    }

    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling and automatic token refresh
apiClient.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  async (error) => {
    console.error('API Response Error:', error);

    // Handle specific error types
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout - please check your connection');
    }

    if (error.response?.status === 401) {
      // Prevent infinite retry loops - only retry once
      if (error.config._retry) {
        console.error('Token refresh already attempted, failing request');
        throw new Error('Session expired - please log in again');
      }

      // Try to refresh token automatically
      try {
        const { authService } = await import('./authService');
        await authService.refreshToken();

        // Mark request as retry and retry with new token
        error.config._retry = true;
        console.log('🔄 Token refreshed, retrying original request');
        return apiClient.request(error.config);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        // If refresh fails, the auth context will handle logout
        throw new Error('Session expired - please log in again');
      }
    }

    if (error.response?.status === 403) {
      throw new Error('Permission denied');
    }

    if (error.response?.status === 404) {
      throw new Error('Resource not found');
    }

    if (error.response?.status >= 500) {
      throw new Error('Server error - please try again later');
    }

    throw new Error(error.response?.data?.message || 'Network error - please check your connection');
  }
);

// Character API interfaces
export interface FinancialData {
  wallet: number;
  financial_stress: number;
  coach_trust_level: number;
  equipment_budget?: number;
  consumables_budget?: number;
}

// FinancialDecision interface moved here
export interface FinancialDecision {
  id: string;
  character_id: string;
  timestamp: Date;
  description: string;
  category: 'investment' | 'real_estate' | 'luxury_purchase' | 'party' | 'wildcard' | 'other';
  amount: number;
  options: string[];
  character_reasoning: string;
  urgency: 'low' | 'medium' | 'high';
  is_risky: boolean;
  status: 'pending' | 'decided' | 'influenced';
  coach_advice?: string;
  coach_decision?: string;
  coach_influence_attempts: number;
  followed_advice?: boolean;
  final_decision?: string;
  outcome?: 'positive' | 'negative' | 'neutral' | 'pending' | 'successful_decision' | 'ignored_advice' | 'decision_avoided' | 'independent_choice';
  financial_impact?: number;
  stress_impact?: number;
  relationship_impact?: number;
}

export interface FinancialPersonality {
  spending_style: 'conservative' | 'moderate' | 'impulsive' | 'strategic';
  money_motivations: string[];
  financial_wisdom: number;
  risk_tolerance: number;
  luxury_desire: number;
  generosity: number;
  financial_traumas: string[];
  money_beliefs: string[];
}

export interface TraditionalStats {
  strength: number;
  defense: number;
  speed: number;
  dexterity: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  spirit: number;
}

export interface CombatStats {
  health: number;
  max_health: number;
  mana: number;
  max_mana: number;
  attack: number;
  defense: number;
  magic_attack: number;
  magic_defense: number;
  speed: number;
  critical_chance: number;
  critical_damage: number;
  accuracy: number;
  evasion: number;
}

export interface CharacterPersonality {
  traits: string[];
  speech_style: string;
  motivations: string[];
  fears: string[];
  quirks?: string[];
  relationships: {
    character_id: string;
    relationship: 'ally' | 'rival' | 'mentor' | 'student' | 'enemy' | 'neutral';
    strength: number;
    history?: string;
  }[];
}

export interface ProgressionNode {
  id: string;
  name: string;
  description: string;
  type: 'stat' | 'ability' | 'passive' | 'special' | 'active';
  requirements: {
    level: number;
    points: number;
    prerequisite_nodes?: string[];
  };
  rewards: {
    stats?: Record<string, number>;
    abilities?: string[];
    passives?: string[];
    unlocks?: string[];
  };
  position: { x: number; y: number };
  is_unlocked: boolean;
  is_active: boolean;
}

export interface ProgressionTree {
  branches: {
    name: string;
    description: string;
    requirements: {
      level?: number;
      stats?: Record<string, number>;
      completed_nodes?: string[];
    };
    nodes: ProgressionNode[];
  }[];
}

export interface BattleAbility {
  id: string;
  name: string;
  type: 'attack' | 'defense' | 'special' | 'support';
  power: number;
  cooldown: number;
  current_cooldown: number;
  description: string;
  icon: string;
  mental_healthRequired: number;
}

export interface SpecialPower {
  id: string;
  name: string;
  type: 'passive' | 'active' | 'combo';
  description: string;
  effect: string;
  icon: string;
  cooldown: number;
  current_cooldown: number;
  team_playerRequired?: number;
}

// Power and Spell interfaces imported from @/data/magic.ts

export interface CharacterStats {
  [key: string]: number;
}

// Temporary stat modifiers from coaching/buffs
export interface TemporaryStats {
  strength: number;
  dexterity: number;
  defense: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  spirit: number;
  speed: number;
}

// Character relationship data from character_relationships table
export interface CharacterRelationship {
  id: number;
  character1_id: string;
  character2_id: string;
  species_modifier: number;
  archetype_modifier: number;
  personal_vendetta: boolean;
  vendetta_description?: string;
  base_disposition: number;
  current_trust: number;
  current_respect: number;
  current_affection: number;
  current_rivalry: number;
  relationship_status: string;
  trajectory: string;
  progress_score: number;
  shared_battles: number;
  conflicts_resolved: number;
  therapy_sessions_together: number;
  positive_interactions: number;
  negative_interactions: number;
  shared_experiences: string[];
  last_interaction?: string;
  created_at: string;
  updated_at: string;
}

// Training data structure (if exists in DB, otherwise null)
export interface TrainingData {
  level: number;
  sessions_completed: number;
  focus_areas: string[];
  improvements: Record<string, number>;
}

// Skill progression data
export interface CharacterSkill {
  id: string;
  name: string;
  level: number;
  experience: number;
  category: string;
}

// ConflictResolutionReward type is now defined in conflictRewardSystem.ts
// Import from there if needed: import { ConflictResolutionReward } from '@/services/conflictRewardSystem';


// Import ConflictResolutionReward from the reward system
import { ConflictResolutionReward } from './conflictRewardSystem';

export interface TherapySessionData {
  session_id: string;
  rewards: {
    immediate: ConflictResolutionReward[];
    long_term: ConflictResolutionReward[];
    relationship_changes: Record<string, number>;
    experience_bonus: number;
  };
  experience_bonus: number;
  immediate_rewards: ConflictResolutionReward[];
  long_term_rewards: ConflictResolutionReward[];
  relationship_changes: Record<string, number>;
}

export interface TrainingProgressUpdate {
  stat_type: string;
  improvement: number;
  training_type: string;
  timestamp: Date;
}

export interface CharacterUpdates {
  [key: string]: string | number | boolean | Date | null;
}

export const paymentAPI = {
  purchase_pack: async (packId: string, quantity: number) => {
    // Import the pack service to map pack IDs to backend types
    const { packService } = await import('./packService');
    const packType = packService.mapPackIdToType(packId);
    const response = await apiClient.post('/packs/purchase', { packType, quantity });
    return response.data;
  },
  redeem_card: async (serialNumber: string) => {
    const response = await apiClient.post('/cards/redeem', { serial_number: serialNumber });
    return response.data;
  },
  get_minted_cards: async () => {
    const response = await apiClient.get('/packs/minted-cards');
    return response.data;
  },
};

// Re-export for convenience - Character now refers to runtime Contestant data
// export type Character = Contestant; // DEPRECATED: Use Contestant directly

export const characterAPI = {
  get_user_characters: async (): Promise<Contestant[]> => {
    console.log('🔄 [characterAPI] Making request to:', '/user/characters');
    console.log('🔄 [characterAPI] Base URL:', apiClient.defaults.baseURL);
    const response = await apiClient.get('/user/characters');
    console.log('🔄 [characterAPI] Response status:', response.status);
    console.log('🔄 [characterAPI] Response data:', response.data);

    // Extract characters array from backend response
    const characters = response.data?.characters || [];
    console.log('🔄 [characterAPI] Extracted characters count:', characters.length);

    // Database returns: { id, name, character_id, level, experience, ... }
    // Just return what the database gives us
    return Array.isArray(characters) ? characters : [];
  },

  // Get system characters (therapists, judges, hosts, trainers, mascots, real estate agents) with their userchar_ids
  get_system_characters: async (role: 'therapist' | 'judge' | 'host' | 'trainer' | 'mascot' | 'real_estate_agent'): Promise<Array<{ id: string; character_id: string; name: string; role: string; species: string; archetype: string }>> => {
    console.log('🔄 [characterAPI] Fetching system characters with role:', role);
    const response = await apiClient.get(`/user/system-characters?role=${role}`);
    if (!response.data?.characters) {
      throw new Error(`STRICT MODE: get_system_characters response missing characters array for role: ${role}`);
    }
    if (!Array.isArray(response.data.characters)) {
      throw new Error(`STRICT MODE: get_system_characters response.characters is not an array for role: ${role}`);
    }
    console.log('🔄 [characterAPI] Fetched system characters:', response.data.characters.length);
    return response.data.characters;
  },

  update_character: async (character_id: string, updates: CharacterUpdates) => {
    const response = await apiClient.put(`/characters/${character_id}`, updates);
    return response.data;
  },

  get_bond_history: async (character_id: string) => {
    const response = await apiClient.get(`/characters/${character_id}/bond-history`);
    return response.data;
  },

  update_financials: async (character_id: string, financial_data: FinancialData) => {
    const response = await apiClient.put(`/characters/${character_id}/financials`, financial_data);
    return response.data;
  },

  // Budget allocation for equipment and consumables
  allocate_budget: async (character_id: string, equipment_budget: number, consumables_budget: number) => {
    const response = await apiClient.put(`/characters/${character_id}/financials`, {
      equipment_budget: equipment_budget,
      consumables_budget: consumables_budget
    });
    return response.data;
  },

  save_decision: async (character_id: string, decision: FinancialDecision) => {
    const response = await apiClient.post(`/characters/${character_id}/decisions`, decision);
    return response.data;
  },

  update_stats: async (character_id: string, stats: CharacterStats) => {
    const response = await apiClient.put(`/characters/${character_id}/stats`, stats);
    return response.data;
  },

  increment_stats: async (character_id: string, stat_changes: CharacterStats) => {
    const response = await apiClient.post(`/characters/${character_id}/stats/increment`, stat_changes);
    return response.data;
  },

  save_therapy_session: async (character_id: string, session_data: TherapySessionData) => {
    const response = await apiClient.post(`/characters/${character_id}/therapy`, session_data);
    return response.data;
  },

  save_training_progress: async (character_id: string, training_data: TrainingProgressUpdate) => {
    const response = await apiClient.post(`/characters/${character_id}/training`, training_data);
    return response.data;
  },

  apply_therapy_rewards: async (character_id: string, rewards: Array<{ type: string, value: number, description: string }>, therapist_id: string) => {
    const response = await apiClient.post(`/therapy/${character_id}/rewards`, { rewards, therapist_id });
    return response.data;
  },

  get_headquarters: async (user_id: string) => {
    const response = await apiClient.get(`/headquarters`);
    return response.data;
  },

  // Equipment management methods
  equip_item: async (character_id: string, equipment_id: string) => {
    const response = await apiClient.post(`/characters/${character_id}/equip`, { equipment_id });
    return response.data;
  },

  unequip_item: async (character_id: string, equipment_id: string) => {
    const response = await apiClient.post(`/characters/${character_id}/unequip`, { equipment_id });
    return response.data;
  },

  get_equipped_items: async (character_id: string) => {
    const response = await apiClient.get(`/characters/${character_id}/equipped`);
    return response.data;
  },

  update_equipment: async (character_id: string, equipment: Equipment[]) => {
    const response = await apiClient.put(`/characters/${character_id}/equipment`, { equipment });
    return response.data;
  },

  // Autonomous equipment decision (when adherence is low)
  make_autonomous_equipment_decision: async (
    character_id: string,
    slot: string,
    coach_choice_id: string,
    adherence_score: number,
    bond_level: number
  ) => {
    const response = await apiClient.post(`/characters/${character_id}/equip/autonomous`, {
      slot,
      coach_choice_id: coach_choice_id,
      adherence_score: adherence_score,
      bond_level
    });
    return response.data;
  },

  // Character shopping methods
  purchase_item: async (character_id: string, item_id: string, quantity: number = 1) => {
    const response = await apiClient.post(`/items/characters/${character_id}/purchase`, {
      item_id,
      quantity
    });
    return response.data;
  },

  get_inventory: async (character_id: string) => {
    const response = await apiClient.get(`/items/characters/${character_id}/inventory`);
    return response.data;
  },

  // Award XP to a character after battle
  award_battle_xp: async (character_id: string, xp_data: {
    xp_amount: number;
    is_victory: boolean;
    opponent_level: number;
    battle_duration: number;
    bonuses?: Array<{ type: string; multiplier: number; description: string }>;
  }) => {
    // Build description with bonus info
    const bonusDesc = xp_data.bonuses?.map(b => b.description).join(', ');
    const description = `Battle ${xp_data.is_victory ? 'victory' : 'defeat'} vs level ${xp_data.opponent_level} opponent${bonusDesc ? ` (${bonusDesc})` : ''}`;

    // NOTE: xp_amount already has multipliers applied from calculateBattleXP
    // So we send multiplier=1.0 to avoid double multiplication
    const response = await apiClient.post(`/character-progression/${character_id}/award-xp`, {
      amount: xp_data.xp_amount,
      source: 'battle',
      description,
      multiplier: 1.0
    });
    return response.data;
  }
};

export const realEstateAPI = {
  send_message: async (context: TherapySessionData) => {
    const response = await apiClient.post('/headquarters/real-estate-chat', context);
    return response.data;
  },
};

// Equipment API functions
export const equipmentAPI = {
  // Get all equipment
  get_all_equipment: async () => {
    const response = await apiClient.get('/equipment');
    return response.data;
  },

  // Get equipment for specific character
  get_character_equipment: async (character_id: string) => {
    const response = await apiClient.get(`/equipment/character/${character_id}`);
    return response.data;
  },

  // Get generic equipment (available to all)
  get_generic_equipment: async () => {
    const response = await apiClient.get('/equipment/generic');
    return response.data;
  },

  // Get consumable items
  get_items: async () => {
    const response = await apiClient.get('/equipment/items');
    return response.data;
  },

  // Get user's equipment inventory (authenticated)
  get_user_inventory: async () => {
    const response = await apiClient.get('/equipment/inventory');
    return response.data;
  }
};

// Item API functions
export const itemAPI = {
  // Get all items
  get_items: async () => {
    const response = await apiClient.get('/items');
    return response.data;
  },

  // Get user's (coach's) inventory
  get_user_inventory: async () => {
    const response = await apiClient.get('/items/user/inventory');
    return response.data;
  },

  // Get character's inventory
  get_character_inventory: async (character_id: string) => {
    const response = await apiClient.get(`/items/characters/${character_id}/inventory`);
    return response.data;
  },

  // Use item on character
  use_item: async (character_id: string, item_id: string, quantity: number = 1) => {
    const response = await apiClient.post(`/items/characters/${character_id}/use`, {
      item_id,
      quantity
    });
    return response.data;
  },

  // Character purchases item with their wallet
  character_purchase: async (character_id: string, item_id: string, quantity: number = 1) => {
    const response = await apiClient.post(`/items/characters/${character_id}/purchase`, {
      item_id,
      quantity
    });
    return response.data;
  }
};

// Team Equipment API functions
export const teamEquipmentAPI = {
  // Get team equipment pool
  get_team_equipment_pool: async () => {
    const response = await apiClient.get('/team-equipment/pool');
    return response.data;
  },

  // Get available team equipment
  get_available_equipment: async () => {
    const response = await apiClient.get('/team-equipment/available');
    return response.data;
  },

  // Get loaned team equipment
  get_loaned_equipment: async () => {
    const response = await apiClient.get('/team-equipment/loaned');
    return response.data;
  },

  // Move equipment from coach inventory to team pool
  move_from_coach_inventory: async (equipment_id: string) => {
    const response = await apiClient.post('/team-equipment/move-from-coach', {
      equipment_id
    });
    return response.data;
  },

  // Lend equipment to character
  lend_to_character: async (equipment_id: string, character_id: string) => {
    const response = await apiClient.post('/team-equipment/lend', {
      equipment_id,
      character_id
    });
    return response.data;
  },

  // Return equipment from character
  return_from_character: async (equipment_id: string, character_id: string) => {
    const response = await apiClient.post('/team-equipment/return', {
      equipment_id,
      character_id
    });
    return response.data;
  }
};

// Echo management API
export const echoAPI = {
  // Get all user's echoes with character info
  get_user_echoes: async () => {
    const response = await apiClient.get('/echoes');
    return response.data;
  },

  // Get echo count for specific character
  get_echo_count: async (character_id: string) => {
    const response = await apiClient.get(`/echoes/${character_id}`);
    return response.data;
  },

  // Spend echoes on ability upgrade
  upgrade_ability: async (userCharacterId: string, ability_id: string, echoes_to_spend: number) => {
    const response = await apiClient.post('/echoes/rankup', {
      userCharacterId,
      ability_id,
      echoes_to_spend
    });
    return response.data;
  },

  // Generic spend echoes endpoint
  spend_echoes: async (character_id: string, amount: number, action: string) => {
    const response = await apiClient.post('/echoes/spend', {
      character_id,
      amount,
      action
    });
    return response.data;
  }
};

// Team roster API
export interface SystemCharacterSlots {
  mascot: { active: string; backup: string | null };
  judge: { active: string; backup: string | null };
  therapist: { active: string; backup: string | null };
  trainer: { active: string; backup: string | null };
  host: { active: string; backup: string | null };
  real_estate_agent: { active: string; backup: string | null };
}

export interface TeamRosterData {
  team_id: string | null;
  team_name: string | null;
  active_contestants: string[];
  backup_contestants: string[];
  system_characters: SystemCharacterSlots;
  count: number;
  wins?: number;
  losses?: number;
  battles_played?: number;
  last_battle_date?: string;
}

export interface SaveRosterPayload {
  team_name?: string;
  active_contestants: string[];
  backup_contestants?: string[];
  system_characters: SystemCharacterSlots;
}

export const teamAPI = {
  // Get current team roster
  get_roster: async (): Promise<TeamRosterData> => {
    const response = await apiClient.get('/team/roster');
    return response.data;
  },

  // Save team roster
  save_roster: async (payload: SaveRosterPayload) => {
    const response = await apiClient.post('/team/roster', payload);
    return response.data;
  }
};

// Make a lightweight aggregate for callers that expect `api.*`
export const api = {
  characters: {
    update_financials: characterAPI.update_financials,
    save_decision: characterAPI.save_decision,
  },
  user: {
    get_characters: characterAPI.get_user_characters,
  },
};

export { apiClient };
export default apiClient;
