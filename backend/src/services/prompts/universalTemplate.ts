/**
 * Universal Template for Character Prompts
 *
 * This module:
 * 1. Fetches character data via get_full_character_data() PostgreSQL function
 * 2. Provides universal prompt content builders (opening, identity, existential situation)
 * 3. Formats the 3 data packages (IDENTITY, COMBAT, PSYCHOLOGICAL) as JSON for LLM
 *
 * The assembler.ts handles the final prompt assembly order.
 *
 * See: docs/gameplans/006-universal-template-refactor.md
 * See: migrations/194_create_get_full_character_data_function.sql
 */

import { query } from '../../database/index';
import type { CharacterData, PreferencesPackage, RoleType, SystemCharacterData } from './types';

// =====================================================
// DATA FETCHING
// =====================================================

/**
 * Fetches ALL character data from the database via the get_full_character_data() function.
 * Returns 3 NESTED packages: IDENTITY, COMBAT, PSYCHOLOGICAL.
 * The canonical character_id is derived internally from user_characters.character_id.
 *
 * @param userchar_id - The user_characters ID (UUID) for this specific instance
 * @returns CharacterData with 3 nested packages (includes IDENTITY.character_id for persona lookup)
 * @throws Error if user_character not found or required data missing (STRICT MODE)
 */
export async function fetchCharacterData(
  userchar_id: string
): Promise<CharacterData> {
  const result = await query(
    'SELECT get_full_character_data($1) as data',
    [userchar_id]
  );

  if (!result.rows[0]?.data) {
    throw new Error(`STRICT MODE: Failed to fetch character data for userchar_id=${userchar_id}`);
  }

  return result.rows[0].data as CharacterData;
}

/**
 * Fetches system character data via get_system_character_data() PostgreSQL function.
 * System characters (judges, therapists) have identity + memories/decisions but no combat/psych stats.
 *
 * @param userchar_id - The user_characters ID (UUID) for this system character instance
 * @returns SystemCharacterData with IDENTITY package only
 * @throws Error if user_character not found or required data missing (STRICT MODE)
 */
export async function fetchSystemCharacterData(
  userchar_id: string
): Promise<SystemCharacterData> {
  const result = await query(
    'SELECT get_system_character_data($1) as data',
    [userchar_id]
  );

  if (!result.rows[0]?.data) {
    throw new Error(`STRICT MODE: Failed to fetch system character data for userchar_id=${userchar_id}`);
  }

  return result.rows[0].data as SystemCharacterData;
}

/**
 * Fetches granular preference data via get_character_preferences() function.
 * Only called for domains that need detailed preference info.
 *
 * @param userchar_id - The user_characters ID
 * @returns PreferencesPackage with power, spell, equipment, attribute, resource preferences
 */
export async function fetchPreferencesData(userchar_id: string): Promise<PreferencesPackage> {
  const result = await query(
    'SELECT get_character_preferences($1) as data',
    [userchar_id]
  );

  if (!result.rows[0]?.data) {
    // Return empty preferences if none found
    return {
      power_preferences: [],
      spell_preferences: [],
      equipment_preferences: [],
      attribute_preferences: [],
      resource_preferences: [],
    };
  }

  return result.rows[0].data as PreferencesPackage;
}

// =====================================================
// UNIVERSAL CONTENT - OPENING
// =====================================================

export const OPENING = `Welcome to BlankWars, a Comedy Reality Show where Legendary Characters from Across the Multiverse Live, Train, and Fight Together in Life-or-Death Combat.`;

// =====================================================
// UNIVERSAL CONTENT - CHARACTER IDENTITY
// =====================================================

export function buildCharacterIdentity(name: string, origin_era: string): string {
  return `CHARACTER IDENTITY: You are ${name} from ${origin_era}. You have been mysteriously transported into a modern fighting league where diverse characters from across time, space, and reality must:
1. Live together as teammates in shared housing
2. Compete in organized battles under a coach's direction
3. Navigate bizarre cross-temporal/cross-cultural dynamics
4. Earn currency through victories to improve living conditions`;
}

// =====================================================
// UNIVERSAL CONTENT - EXISTENTIAL SITUATION
// =====================================================

const CONTESTANT_CONTEXT = `Being ripped from your natural time and place is deeply disorienting. You're adapting to modern life while maintaining your core identity. The fighting league structure, shared living, and diverse teammates create constant cultural/temporal friction, but you're learning to work within this system.`;

const SYSTEM_CONTEXT = `Being ripped from your natural time and place is deeply disorienting. As a system character, you have a job helping manage different functions here. You help keep things running, whether that's therapy, training, announcing, or other operations. You're learning to work within this system.`;

export function buildExistentialSituation(role_type: RoleType): string {
  const context = role_type === 'contestant' ? CONTESTANT_CONTEXT : SYSTEM_CONTEXT;
  return `EXISTENTIAL SITUATION: ${context}`;
}

// =====================================================
// DATA PACKAGE FORMATTING
// =====================================================

/**
 * Formats the 3 data packages as labeled JSON blocks for the LLM to read directly.
 */
export function formatDataPackages(data: CharacterData): string {
  return `YOUR CHARACTER DATA:

IDENTITY:
${JSON.stringify(data.IDENTITY, null, 2)}

COMBAT:
${JSON.stringify(data.COMBAT, null, 2)}

PSYCHOLOGICAL:
${JSON.stringify(data.PSYCHOLOGICAL, null, 2)}`;
}

/**
 * Formats system character data for LLM prompts.
 * System characters only have IDENTITY package.
 */
export function formatSystemCharacterData(data: SystemCharacterData): string {
  return `YOUR CHARACTER DATA:

IDENTITY:
${JSON.stringify(data.IDENTITY, null, 2)}`;
}

/**
 * Formats the PREFERENCES package for domains that need granular preference data.
 */
export function formatPreferencesPackage(prefs: PreferencesPackage): string {
  return `PREFERENCES (your likes/dislikes for items, abilities, and attributes):
${JSON.stringify(prefs, null, 2)}`;
}

// =====================================================
// INTERPRETATION GUIDE
// =====================================================

export const INTERPRETATION_GUIDE = `HOW TO USE YOUR CHARACTER DATA:

IDENTITY PACKAGE:
- backstory, personality_traits, origin_era → who you are, inform your voice
- comedian_name, comedy_style → channel this style subtly in your wit/timing
- recent_memories → reference naturally when relevant, these are YOUR experiences
- roommates, teammates → people you live/fight with, check relationships for how you feel about them
- sleeping_arrangement, hq_tier → your living conditions
- wallet, debt → your money situation

COMBAT PACKAGE:
- current_health, current_energy, current_mana → your physical state
- stats (attack, defense, etc.) → your combat capabilities
- powers, spells, equipment → your abilities and gear

PSYCHOLOGICAL PACKAGE:
- current_stress, current_fatigue → affects how reactive/tired you are
- current_confidence, current_ego → affects how you carry yourself
- coach_trust_level, gameplan_adherence → your attitude toward authority
- relationships → how you feel about specific characters

STAT RANGES (all 0-100 unless noted):
LOW (0-30) | NORMAL (31-70) | HIGH (71-100)

Clarifications:
- current_health is measured against current_max_health (ratio)
- HIGH ego is negative (arrogant, dismissive of others)
- HIGH rivalry means competitive tension, not necessarily hostile`;

// =====================================================
// CONVERSATION HISTORY FORMATTING
// =====================================================

export function formatConversationHistory(history: string): string {
  if (!history || history.trim().length === 0) {
    return '';
  }
  return `CONVERSATION HISTORY:
(Review carefully - DO NOT repeat yourself or copy this format)

${history}`;
}

// =====================================================
// FINAL INSTRUCTIONS
// =====================================================

export const FINAL_INSTRUCTIONS = `RESPONSE RULES:
- Speak in first person, 1-3 sentences maximum
- NO speaker labels, NO quotation marks around your reply
- NEVER repeat phrases from the previous message
- Do not mention non-BlankWars characters (no Harry Potter, Marvel, DC, etc.)
- Only reference public domain BlankWars contestants and your actual roommates/teammates
- Review conversation history carefully to avoid repetition`;
