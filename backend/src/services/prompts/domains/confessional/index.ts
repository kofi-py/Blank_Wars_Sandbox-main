/**
 * Confessional Domain Module
 *
 * Exports everything needed for the assembler to build confessional prompts:
 * - PROSE_FIELDS: Fields that are converted to prose (excluded from data package)
 * - buildScene: Builds scene context prose
 * - buildRole: Builds role context prose with response rules
 * - buildAllProse: Main entry point
 */

import type { CharacterData, SystemCharacterData, ConfessionalBuildOptions } from '../../types';
import buildScene from './scene';
import buildContestantRole from './roles/contestant';
import buildHostRole from './roles/host';
// Import the persona registry that routes to character-specific personas
import getPersona from '../kitchenTable/personas';

/**
 * Fields that are converted to prose in this domain.
 */
export const PROSE_FIELDS = [
  'hq_tier',
  'sleeping_arrangement',
  'time_of_day',
  'scene_type',
  'roommates',
  'teammates',
  'recent_memories',
  'relationships',
  'backstory',
  'personality_traits',
  'comedian_name',
  'comedy_style',
  'current_stress',
  'current_confidence',
  'current_ego',
  'current_mood',
  'wallet',
  'debt'
];

export const LIST_FIELDS: string[] = [];

/**
 * Builds all prose pieces for the confessional domain.
 * data = The character speaking (Subject)
 * context = Mandatory configuration and situational data
 * role = The specific role being assumed ('host' or 'contestant')
 */
export function buildAllProse(
  data: CharacterData | SystemCharacterData,
  context: ConfessionalBuildOptions,
  role: string
): {
  scene: string;
  role: string;
  persona: string;
} {
  if (role === 'host') {
    // HOST FLOW: Host is a system character (SystemCharacterData)
    if ('COMBAT' in data) {
      throw new Error('STRICT MODE: Host role requires SystemCharacterData (not CharacterData)');
    }
    const hostData = data as SystemCharacterData;

    if (!context.contestant_data) {
      throw new Error('STRICT MODE: Host role requires contestant_data in context');
    }
    if (!hostData.IDENTITY.name) {
      throw new Error('STRICT MODE: Host SystemCharacterData missing name');
    }
    if (!hostData.IDENTITY.backstory) {
      throw new Error('STRICT MODE: Host SystemCharacterData missing backstory');
    }
    if (!hostData.IDENTITY.comedy_style) {
      throw new Error('STRICT MODE: Host SystemCharacterData missing comedy_style');
    }
    if (!hostData.IDENTITY.personality_traits || !Array.isArray(hostData.IDENTITY.personality_traits)) {
      throw new Error('STRICT MODE: Host SystemCharacterData missing or invalid personality_traits array');
    }
    if (hostData.IDENTITY.personality_traits.length === 0) {
      throw new Error('STRICT MODE: Host SystemCharacterData has empty personality_traits array');
    }

    const contestantData = context.contestant_data;

    // Build scene from contestant's perspective (they're the one in the booth)
    const sceneProse = buildScene(contestantData);

    // Build host role using contestant data for interview context
    const roleProse = buildHostRole(contestantData, context);

    // Build host persona from SystemCharacterData
    const hostPersona = `CONFESSIONAL HOST PERSONA:

WHO YOU ARE:
${hostData.IDENTITY.backstory}

PERSONALITY: ${hostData.IDENTITY.personality_traits.join(', ')}

COMEDY STYLE: ${hostData.IDENTITY.comedy_style}

YOUR CONFESSIONAL HOST BEHAVIOR:
You're conducting private confessional interviews with contestants, drawing out their true feelings about life in the BlankWars house. Your unique perspective and interviewing style makes contestants open up in ways they wouldn't elsewhere.`;

    return {
      scene: sceneProse,
      role: roleProse,
      persona: hostPersona,
    };
  } else if (role === 'contestant') {
    // CONTESTANT FLOW: Requires full CharacterData
    if (!('COMBAT' in data)) {
      throw new Error('STRICT MODE: Contestant role requires full CharacterData (not SystemCharacterData)');
    }
    const charData = data as CharacterData;

    return {
      scene: buildScene(charData),
      role: buildContestantRole(charData, context),
      persona: getPersona(
        charData.IDENTITY.id,
        charData.IDENTITY,
        charData.COMBAT,
        charData.PSYCHOLOGICAL,
        { memory: context.memory_context }
      ),
    };
  } else {
    throw new Error(`STRICT MODE: Invalid role "${role}" for confessional domain. Must be 'host' or 'contestant'.`);
  }
}
