/**
 * Game Constants - Centralized Configuration
 *
 * All magic numbers and game balance values should be defined here
 * to ensure consistency across services and enable easy tuning.
 */

// ============================================================================
// ADHERENCE SYSTEM CONSTANTS
// ============================================================================

export const ADHERENCE_CONFIG = {
  /**
   * Adherence threshold - Characters with adherence >= this value follow coach's decisions
   * Characters below this threshold may rebel and make their own choices
   */
  THRESHOLD: 70,

  /**
   * Penalty applied when character rebels against coach's decision
   * Applied to: equipment choices, power loadout, spell loadout
   */
  REBELLION_PENALTY: -2,

  /**
   * Penalty when character wants to rebel but has no alternatives
   * (Reluctant compliance)
   */
  RELUCTANT_COMPLIANCE_PENALTY: -2,

  /**
   * Dynamic modifiers applied based on character state
   */
  MODIFIERS: {
    // HP-based modifiers
    HP_CRITICAL: -50,   // HP <= 10%
    HP_LOW: -30,        // HP <= 25%
    HP_WOUNDED: -15,    // HP <= 50%

    // Mental state modifiers
    STRESS_HIGH: -20,   // Stress > 70
    CONFIDENCE_LOW: -15,// Confidence < 30

    // Archetype penalty
    BEAST_PENALTY: -10  // Beast/monster archetypes are less compliant
  },

  /**
   * Base adherence by archetype
   */
  ARCHETYPE_BASE: {
    'warrior': 15,
    'tank': 15,
    'leader': 20,
    'scholar': 10,
    'mage': 5,
    'mystic': 0,
    'trickster': -10,
    'beast': -15,
    'assassin': 5,
    'system': 25
  } as const,

  /**
   * Rarity modifiers (experience/discipline)
   */
  RARITY_MODIFIERS: {
    'common': -5,
    'uncommon': 0,
    'rare': 5,
    'epic': 10,
    'legendary': 15,
    'mythic': 20
  } as const,

  /**
   * Species modifiers
   */
  SPECIES_MODIFIERS: {
    'human': 0,
    'deity': 10,
    'undead': -5,
    'monster': -10,
    'demon': -10,
    'angel': 15,
    'automaton': 20,
    'construct': 20,
    'beast': -15,
    'spirit': 5
  } as const
} as const;

// Export individual constants for convenience
export const ADHERENCE_THRESHOLD = ADHERENCE_CONFIG.THRESHOLD;
export const REBELLION_PENALTY = ADHERENCE_CONFIG.REBELLION_PENALTY;
export const RELUCTANT_COMPLIANCE_PENALTY = ADHERENCE_CONFIG.RELUCTANT_COMPLIANCE_PENALTY;

// ============================================================================
// LOADOUT SYSTEM CONSTANTS
// ============================================================================

export const LOADOUT_CONFIG = {
  /**
   * Maximum number of power slots per character
   */
  MAX_POWER_SLOTS: 8,

  /**
   * Duration to lock out the coach after a rebellion (in milliseconds)
   * 10 minutes
   */
  COACH_LOCKOUT_DURATION_MS: 10 * 60 * 1000,

  /**
   * Maximum number of spell slots per character
   */
  MAX_SPELL_SLOTS: 10
} as const;

// ============================================================================
// PROGRESSION SYSTEM CONSTANTS
// ============================================================================

export const PROGRESSION_CONFIG = {
  /**
   * Character point costs by tier and rank
   */
  POWER_COSTS: {
    skill: { unlock: 1, rank_1_to_2: 3, rank_2_to_3: 5 },
    ability: { unlock: 3, rank_1_to_2: 5, rank_2_to_3: 7 },
    species: { unlock: 5, rank_1_to_2: 7, rank_2_to_3: 9 },
    signature: { unlock: 7, rank_1_to_2: 9, rank_2_to_3: 11 }
  } as const,

  SPELL_COSTS: {
    universal: { unlock: 1, rank_1_to_2: 3, rank_2_to_3: 5 },
    archetype: { unlock: 3, rank_1_to_2: 5, rank_2_to_3: 7 },
    species: { unlock: 5, rank_1_to_2: 7, rank_2_to_3: 9 },
    signature: { unlock: 7, rank_1_to_2: 9, rank_2_to_3: 11 }
  } as const
} as const;

// ============================================================================
// AI SYSTEM CONSTANTS
// ============================================================================

export const AI_CONFIG = {
  /**
   * Open_ai model to use for character decisions
   */
  MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini',

  /**
   * Temperature for AI responses (0-2)
   * 0.8 = creative but consistent
   */
  TEMPERATURE: 0.8,

  /**
   * Maximum retries for AI API calls before fallback
   */
  MAX_RETRIES: 2,

  /**
   * Timeout for AI API calls (milliseconds)
   */
  TIMEOUT_MS: 30000
} as const;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Archetype = keyof typeof ADHERENCE_CONFIG.ARCHETYPE_BASE;
export type Rarity = keyof typeof ADHERENCE_CONFIG.RARITY_MODIFIERS;
export type Species = keyof typeof ADHERENCE_CONFIG.SPECIES_MODIFIERS;
export type PowerTier = keyof typeof PROGRESSION_CONFIG.POWER_COSTS;
export type SpellCategory = keyof typeof PROGRESSION_CONFIG.SPELL_COSTS;
