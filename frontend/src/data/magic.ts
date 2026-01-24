// Magic System Types
// CRITICAL: These types MUST match the shared types package and database adapter
// The API returns Power/Spell from shared/types, not simplified definitions

export interface PowerSpellEffect {
    type: string;
    value?: number;
    target?: string;
    stat?: string;
    duration?: number;
}

export interface PowerDefinition {
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
    cooldown_turns: number;  // Backend uses cooldown_turns, not cooldown
    effects: PowerSpellEffect[];
    unlock_cost: number;
    rank_up_cost: number;
    max_rank?: number;  //Optional - may not be in all API responses
    is_equipped: boolean;  // Computed from loadout tables
    unlocked_at: string | null;
    unlocked_by: string | null;
    icon: string | null;
}

export interface SpellDefinition {
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
    effects: PowerSpellEffect[];
    unlock_cost: number;
    rank_up_cost: number;
    max_rank?: number;  // Optional - may not be in all API responses
    is_equipped: boolean;  // Computed from loadout tables
    unlocked_at: string | null;
    unlocked_by: string | null;
    icon: string | null;
}

// Aliases for compatibility
export type Power = PowerDefinition;
export type Spell = SpellDefinition;
