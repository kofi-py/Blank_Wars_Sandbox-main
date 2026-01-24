/**
 * Control Room Domain Module
 *
 * Ongoing help/support system for coaches.
 * The host character provides assistance and answers questions about game mechanics anytime.
 *
 * One-on-one coach-host chat. Only the host speaks.
 */

import type { CharacterData, SystemCharacterData, ControlRoomBuildOptions } from '../../types';
import buildScene from './scene';
import buildHostRole from './roles/host';

export const PROSE_FIELDS = [
  'backstory',
  'personality_traits',
  'comedian_name',
  'comedy_style',
  'comedian_category'
];

export const LIST_FIELDS: string[] = [];

/**
 * Build host persona for control room context
 */
function buildControlRoomPersona(
  data: SystemCharacterData,
  options: ControlRoomBuildOptions
): string {
  const identity = data.IDENTITY;

  // STRICT MODE validation
  if (!identity.name) {
    throw new Error('STRICT MODE: Missing name for controlRoom persona');
  }
  if (!identity.backstory) {
    throw new Error('STRICT MODE: Missing backstory for controlRoom persona');
  }
  if (!identity.personality_traits || identity.personality_traits.length === 0) {
    throw new Error('STRICT MODE: Missing personality_traits for controlRoom persona');
  }
  if (!identity.comedy_style) {
    throw new Error('STRICT MODE: Missing comedy_style for controlRoom persona');
  }

  return `## CHARACTER PERSONA: ${identity.name}

YOU ARE: ${identity.name}, ${identity.title}

BACKGROUND:
${identity.backstory}

PERSONALITY TRAITS:
${identity.personality_traits.map(t => `- ${t}`).join('\n')}

COMEDY STYLE:
${identity.comedy_style}

YOUR CONTROL ROOM SUPPORT BEHAVIOR:
You're staffing the Control Room - the help desk for BlankWars coaches. When coaches have questions or need clarification about game mechanics, they come to you. Your unique personality makes even dry technical explanations engaging and memorable.`;
}

/**
 * Builds all prose pieces for the controlRoom domain.
 */
export function buildAllProse(
  data: CharacterData | SystemCharacterData,
  options: ControlRoomBuildOptions
): {
  scene: string;
  role: string;
  persona: string;
} {
  // STRICT MODE: ControlRoom is for host (SystemCharacterData) only
  if ('COMBAT' in data) {
    throw new Error('STRICT MODE: ControlRoom domain requires SystemCharacterData (not CharacterData)');
  }
  const hostData = data as SystemCharacterData;

  // Validate host data
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

  // Validate context
  if (!options.coach_message) {
    throw new Error('STRICT MODE: ControlRoom requires coach_message');
  }

  // Build prose sections
  const scene = buildScene(options);
  const roleText = buildHostRole(hostData, options);
  const persona = buildControlRoomPersona(hostData, options);

  return {
    scene,
    role: roleText,
    persona
  };
}

export type { ControlRoomBuildOptions } from '../../types';
