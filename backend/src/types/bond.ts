// Bond System Type Definitions

export type BondActivityType =
    // Tier 1: Deep Bonding (+4 to +5)
    | 'therapy_breakthrough'              // +5
    | 'personal_problems_coaching'        // +4
    | 'group_activity_success'            // +4
    | 'financial_crisis_resolved'         // +4

    // Tier 2: Trust Building (+2 to +3)
    | 'therapy_productive'                // +3
    | 'performance_coaching'              // +2
    | 'battle_victory_together'           // +2
    | 'financial_win_followed_advice'     // +3

    // Tier 3: Routine Interaction (+1)
    | 'meaningful_conversation'           // +1
    | 'casual_chat'                       // +1
    | 'group_activity_mediocre'           // +1

    // Tier 4: Trust Damage (-1 to -3)
    | 'therapy_wasted'                    // -1
    | 'went_rogue_failed'                 // -2
    | 'group_activity_conflict'           // -2
    | 'ignored_coaching_badly'            // -3

    // Loadout/Equipment Decisions (coach↔character relationship)
    | 'loadout_reluctant_compliance'      // +1 (wanted to rebel but no alternatives)
    | 'loadout_power_rebellion'           // -2 (rejected coach power choice)
    | 'loadout_spell_rebellion'           // -2 (rejected coach spell choice)
    | 'equipment_reluctant_compliance'    // +1 (wanted to rebel but no alternatives)
    | 'equipment_autonomous_rebellion'    // -2 (rejected coach equipment choice)
    ;

export interface BondActivityParams {
    user_character_id: string;
    activity_type: BondActivityType;
    context?: Record<string, any>;  // Additional metadata
    source: string;                 // Which system triggered this (e.g., 'therapy', 'battle')
    therapist_id?: string;          // If therapy session, which therapist (for bonus multiplier)
}

export interface BondActivityLog {
    id: string;
    user_character_id: string;
    activity_type: BondActivityType;
    bond_change: number;
    bond_level_before: number;
    bond_level_after: number;
    context: Record<string, any>;
    source: string;
    created_at: Date;
}
