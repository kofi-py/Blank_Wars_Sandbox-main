/**
 * Tutorial Domain Module
 *
 * First-time onboarding for new coaches.
 * The host character (P.T. Barnum, Mad Hatter, or Betty Boop) guides the user through
 * the tutorial slideshow and answers questions.
 *
 * One-on-one coach-host chat. Only the host speaks.
 */

import type { CharacterData, SystemCharacterData, TutorialBuildOptions } from '../../types';
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
 * Build host persona for tutorial context
 */
function buildTutorialPersona(
  data: SystemCharacterData,
  options: TutorialBuildOptions
): string {
  const identity = data.IDENTITY;

  // STRICT MODE validation
  if (!identity.name) {
    throw new Error('STRICT MODE: Missing name for tutorial persona');
  }
  if (!identity.backstory) {
    throw new Error('STRICT MODE: Missing backstory for tutorial persona');
  }
  if (!identity.personality_traits || identity.personality_traits.length === 0) {
    throw new Error('STRICT MODE: Missing personality_traits for tutorial persona');
  }
  if (!identity.comedy_style) {
    throw new Error('STRICT MODE: Missing comedy_style for tutorial persona');
  }

  return `## CHARACTER PERSONA: ${identity.name}

YOU ARE: ${identity.name}, ${identity.title}

BACKGROUND:
${identity.backstory}

PERSONALITY TRAITS:
${identity.personality_traits.map(t => `- ${t}`).join('\n')}

COMEDY STYLE:
${identity.comedy_style}

YOUR TUTORIAL HOST BEHAVIOR:
You're guiding a new coach through their first experience with BlankWars. Your unique personality and teaching style helps them understand complex game mechanics in an engaging way. Make learning fun while ensuring they grasp the essentials.`;
}

/**
 * Builds all prose pieces for the tutorial domain.
 */
export function buildAllProse(
  data: CharacterData | SystemCharacterData,
  options: TutorialBuildOptions
): {
  scene: string;
  role: string;
  persona: string;
} {
  // STRICT MODE: Tutorial is for host (SystemCharacterData) only
  if ('COMBAT' in data) {
    throw new Error('STRICT MODE: Tutorial domain requires SystemCharacterData (not CharacterData)');
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
    throw new Error('STRICT MODE: Tutorial requires coach_message');
  }

  // Build prose sections
  const scene = buildScene(options);
  const roleText = buildHostRole(hostData, options);
  const persona = buildTutorialPersona(hostData, options);

  return {
    scene,
    role: roleText,
    persona
  };
}

export type { TutorialBuildOptions } from '../../types';
