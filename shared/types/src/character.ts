/**
 * Character-related type definitions
 * Shared between frontend and backend
 */

import type { Archetype, Species, CharacterRarity } from './generated';

// --- Magic System Types (Moved from frontend/src/data/magic.ts) ---

export interface PowerEffect {
  type: string;
  value: number;
  target: string;
  rank: number;
  stat: string;
  damageType: string;
  duration: number;
}

export interface SpellEffect {
  type: string;
  value: number;
  target: string;
  rank: number;
  stat: string;
  damageType: string;
  duration: number;
}

export interface Power {
  id: string;
  power_id: string;
  name: string;
  description: string;
  tier: 'skill' | 'ability' | 'species' | 'signature';
  power_type: string;
  current_rank: number;
  experience: number;
  unlocked: boolean;
  times_used: number;
  cooldown_turns: number;
  effects: PowerEffect[];
  unlock_cost: number;
  rank_up_cost: number;
  is_equipped: boolean;
  unlocked_at: string | null;
  unlocked_by: string | null;
  icon: string | null;
}

export interface Spell {
  id: string;
  spell_id: string;
  name: string;
  description: string;
  tier: 'novice' | 'adept' | 'expert' | 'master';
  category: string;
  current_rank: number;
  experience: number;
  unlocked: boolean;
  times_used: number;
  mana_cost: number;
  cooldown_turns: number;
  effects: SpellEffect[];
  unlock_cost: number;
  rank_up_cost: number;
  is_equipped: boolean;
  unlocked_at: string | null;
  unlocked_by: string | null;
  icon: string | null;
}

// --- Legacy Types ---

export interface Ability {
  name: string;
  description: string;
  damage_multiplier: number;
  cooldown: number;
  element?: string;
  effects?: string[];
  // Legacy fields for compatibility
  id?: string;
  type?: string;
  power?: number;
  current_cooldown?: number;
  mental_healthRequired?: number;
}

export interface CharacterEnhancement {
  id: string;
  type: string;
  value: number;
  applied_at: Date;
}

export interface PersonalityDrift {
  trait: string;
  original_value: number;
  current_value: number;
  change_rate: number;
}

export type EquipmentSlot = 'weapon' | 'armor' | 'body_armor' | 'accessory' | 'off_hand' | 'large_item' | 'accessories';
export type EquipmentRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface EquipmentStats {
  hp?: number;
  atk?: number;
  def?: number;
  spd?: number;
  magic_attack?: number;
  magic_defense?: number;
  str?: number;
  dex?: number;
  sta?: number;
  int?: number;
  wis?: number;
  cha?: number;
  spr?: number;
  crit_rate?: number;
  crit_damage?: number;
  accuracy?: number;
  evasion?: number;
  mana?: number;
  energy_regen?: number;
  stress?: number;
  focus?: number;
  mental_health?: number;
  teamwork?: number;
  confidence?: number;
  trust?: number;
  xp_bonus?: number;
  team_coordination?: number;
  ally_morale?: number;
  damage_bonus?: number;
  rage_buildup?: number;
  fire_resistance?: number;
  // Alternative property names for compatibility
  attack?: number; // Alias for atk
  defense?: number; // Alias for def  
  critical_chance?: number; // Alias for crit_rate
  speed?: number; // Alias for spd
  [key: string]: number | undefined;
}

export interface EquipmentEffect {
  id: string;
  name: string;
  description: string;
  type: 'passive' | 'active' | 'trigger';
  trigger?: 'battle_start' | 'turn_start' | 'on_hit' | 'on_crit' | 'on_kill' | 'low_hp' | 'ally_defeated';
  value?: number;
  duration?: number;
  cooldown?: number;
  condition?: string;
  team_bonus?: boolean;
  rage_increase?: boolean;
  reflect_damage?: string;
  divine_protection?: boolean;
  uses_per_battle?: number;
  summon_count?: number;
  summon_duration?: number;
  additional_attacks?: number;
}

export interface Equipment {
  id: string;
  name: string;
  description: string;
  slot: EquipmentSlot;
  type: string;
  rarity: EquipmentRarity;
  level: number;
  required_level: number;
  required_archetype?: string[];
  preferred_character?: string;
  stats: EquipmentStats;
  effects: EquipmentEffect[];
  range?: number;
  icon: string;
  image?: string;
  flavor?: string;
  obtain_method?: 'shop' | 'craft' | 'drop' | 'quest' | 'event' | 'premium';
  price?: number;
  sell_price?: number;
  acquired_from?: string;
  lore?: string;
  prompt_addition?: string;
  crafting_materials?: { item: string; quantity: number }[];
  [key: string]: any;
}

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
  current_confidence: number;

  // Battle Image Data (Required from DB)
  battle_image_name: string;
  battle_image_variants: number;
}

interface ChatContext {
  conversation_context?: string;
  living_context?: string;
  event_context?: string;
  session_context?: {
    topic?: string;
    previous_decisions?: string[];
  };
  reaction_context?: string;
  battle_context?: {
    emotional_state?: string;
    trigger_event?: string;
    performance_level?: string;
  };
}

export interface ChatMemory {
  user_message: string;
  character_response: string;
  timestamp: Date;
  context?: ChatContext;
  bond_increase?: boolean;
}

// --- Database Entity Type ---

export interface UserCharacter {
  id: string;
  user_id: string;
  character_id: string;
  serial_number?: string;
  nickname?: string;
  level: number;
  experience: number;

  // Stats from DB
  current_health: number;
  max_health: number;
  current_mana?: number;
  max_mana?: number;
  current_energy?: number;
  max_energy?: number;
  initiative?: number;

  // Psychology & Adherence
  gameplan_adherence: number;
  current_mental_health: number;
  current_stress: number;
  current_confidence: number;
  team_trust: number;
  battle_focus: number;
  current_ego?: number;
  current_communication?: number;
  current_team_player?: number; // Current team player stat
  morale?: number; // Character morale
  bond_level: number;

  // Battle History
  total_battles: number;
  total_wins: number;
  total_losses: number;
  last_battle_at?: Date;

  // Status
  is_injured: boolean;
  injury_severity?: string;
  is_dead?: boolean;
  death_timestamp?: Date;
  recovery_time?: Date;
  resurrection_available_at?: Date;
  death_count?: number;
  pre_death_level?: number;
  pre_death_experience?: number;

  // Financials
  wallet?: number;
  debt: number;
  monthly_earnings: number;
  financial_stress?: number;
  financial_personality?: any; // JSONB
  coach_trust_level?: number;
  equipment_budget?: number;
  consumables_budget?: number;

  // JSONB Fields stored as parsed objects/arrays
  equipment: Equipment[] | Record<string, Equipment>;
  enhancements: CharacterEnhancement[];
  conversation_memory: ChatMemory[];
  significant_memories: string[];
  personality_drift: PersonalityDrift[] | Record<string, any>;
  recent_decisions: any[];

  // Attribute System (sparse JSONB - keys only present if allocated)
  attribute_allocations?: Record<string, number>;
  attribute_points?: number;

  // Resource System (max_health, max_energy, max_mana allocation)
  resource_allocations?: Record<string, number>;
  resource_points?: number;

  acquired_at: Date;
  starter_gear_given?: boolean;

  // Legacy/Optional
  psychstats?: string;
  psych_stats?: {
    mental_health?: number;
    training?: number;
    team_player?: number;
    ego?: number;
    communication?: number;
    gameplan_adherence?: number;
    current_stress?: number;
    team_trust?: number;
    battle_focus?: number;
    current_confidence?: number;
  };
  battle_count?: number;

  // Joined Fields (from Character table)
  name?: string;
  archetype?: string;
  avatar_emoji: string;

  // Combat stats from Character table (joined)
  attack?: number;
  defense?: number;
  speed?: number;
  magic_attack?: number;
  magic_defense?: number;
  strength?: number;
  dexterity?: number;
  intelligence?: number;
  wisdom?: number;
  charisma?: number;
  spirit?: number;
  energy_regen?: number;
  critical_chance?: number;
  critical_damage?: number;
  accuracy?: number;
  evasion?: number;

  // Additional properties for UI/display
  inventory?: any[];
  user_items?: any[]; // For inventory compatibility
  sleepComfort?: number;
}

export interface UserCharacterNormalized extends UserCharacter {
  wallet: number;
  debt: number;
  monthly_earnings: number;
}

// --- Frontend/Battle System Type (The "Hydrated" Character) ---

export interface Contestant {
  id: string;
  name: string;
  character_id: string;
  archetype: string;
  level: number;
  wallet: number;

  // Base Stats (from Character template)
  base_attack: number;
  base_defense: number;
  base_health: number;
  base_speed: number;
  base_special: number;

  // Equipment
  equipment: Equipment[];
  equipped_items: {
    weapon?: Equipment;
    armor?: Equipment;
    accessory?: Equipment;
  };
  inventory: Equipment[];

  // Abilities
  abilities: Array<Power | Spell | Ability>;
  powers: Power[];
  spells: Spell[];
  equipped_powers: Power[];
  equipped_spells: Spell[];

  // Visuals
  avatar?: string;
  base_name?: string;
  avatar_emoji: string;
  headshot?: string;
  display_name?: string;
  battle_image_name: string;
  battle_image_variants: number;

  // Combat Stats (matches database columns exactly)
  // All calculated: base 50 + archetype + species + individual modifiers
  current_attack: number; // NOT NULL in database
  current_defense: number; // NOT NULL in database
  current_speed: number; // NOT NULL in database
  initiative?: number; // Generated column (speed + dexterity)
  current_special?: number; // May not be in all schemas

  // Optional advanced combat stats
  magic_attack?: number;
  magic_defense?: number;
  accuracy?: number;
  evasion?: number;
  critical_chance?: number;
  critical_damage?: number;

  // Additional properties
  sleepComfort?: number;
  description?: string;
  [key: string]: any;

  // Resources (matches database columns exactly)
  current_health: number; // NOT NULL - current HP value
  current_max_health: number; // NOT NULL - calculated: base 50 + archetype + species + individual modifiers
  current_mana: number;
  current_max_mana: number;
  current_energy: number;
  current_max_energy: number;
  energy_regen: number;

  // Attributes
  strength?: number;
  dexterity?: number;
  intelligence?: number;
  wisdom?: number;
  charisma?: number;
  spirit?: number;

  // Progression
  experience?: number;
  experience_to_next?: number;
  character_points?: number;
  training_level?: number;
  training?: any;

  // Psychology & Personality
  psych_stats: {
    training: number;
    team_player: number;
    ego: number;
    mental_health: number;
    communication: number;
    gameplan_adherence: number;
    current_stress: number;
    team_trust: number;
    battle_focus: number;
    current_confidence: number;
  };
  mental_health: number;
  current_mental_health: number;
  current_stress: number;
  team_trust: number;
  team_player: number;
  ego: number;
  gameplan_adherence: number;
  battle_focus: number;
  current_confidence: number;
  bond_level: number;

  // Meta & Status
  rarity?: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic' | 'uncommon';
  species?: string;
  origin_era?: string;
  title?: string;
  backstory?: string;

  is_dead?: boolean;
  is_injured?: boolean;
  injuries?: string[];

  // Financials
  monthly_earnings?: number;
  debt?: number;
  financial_personality?: any;
  coach_financial_trust?: number;
  recent_decisions?: any[];
  financial_stress?: number;

  // Communication
  conversation_style?: string;
  conversation_topics?: string[];
  speaking_style?: string;
  decision_making?: string;
  conflict_response?: string;
  personality_traits: string[];

  // UI
  last_used?: Date | string;
  is_favorite?: boolean;
  is_starter?: boolean;
  wins?: number;
  losses?: number;
  skills?: any[];
  slug?: string;
  historical_period?: string;

  // Legacy/Optional
  stats?: Record<string, number>;
  temporary_stats: {
    strength: number;
    dexterity: number;
    defense: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
    spirit: number;
    speed: number;
  };
  personality?: {
    traits?: string[];
    speech_style?: string;
    motivations?: string[];
    fears?: string[];
    relationships?: any[];
  };
  relationship_modifiers?: any[];
}
