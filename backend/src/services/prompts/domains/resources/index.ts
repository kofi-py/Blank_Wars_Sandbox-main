/**
 * Resources Domain Module
 *
 * Coach and contestant discuss resource allocation (Health, Energy, Mana).
 * Contestant is self-aware of their resource needs and fighting style.
 */

import type { CharacterData, SystemCharacterData, ResourcesBuildOptions } from '../../types';
import buildScene from './scene';
import buildContestantRole from './roles/contestant';
import { buildStatContext } from '../../statContext';

export type { ResourcesBuildOptions } from '../../types';

export const PROSE_FIELDS = [
  // Scene context fields
  'hq_tier',
  'sleeping_arrangement',
  'time_of_day',
  'scene_type',
  // Role context fields
  'roommates',
  'teammates',
  'relationships',
  // Persona context fields
  'backstory',
  'personality_traits',
  'comedian_name',
  'comedy_style',
  'comedian_category',
  // Stats used in current state
  'current_stress',
  'current_fatigue',
  'current_morale',
  'coach_trust_level',
  'financial_stress',
  'wallet',
  'debt',
];

export const LIST_FIELDS: string[] = [];

export { buildScene, buildContestantRole };

function buildResourcesPersona(data: CharacterData): string {
  const identity = data.IDENTITY;

  // STRICT MODE: comedy_style required
  if (!identity.comedy_style) {
    throw new Error('STRICT MODE: Missing comedy_style for resources persona');
  }

  // Comedy style is now stored directly in characters.comedy_style
  const comedyContext = identity.comedy_style;

  const statContext = buildStatContext(identity, data.COMBAT, data.PSYCHOLOGICAL);

  return `## CHARACTER PERSONA: ${identity.name}

YOU ARE: ${identity.name}, ${identity.title} from ${identity.origin_era}

BACKGROUND:
${identity.backstory}

PERSONALITY TRAITS:
${identity.personality_traits.map(t => `- ${t}`).join('\n')}

COMEDY STYLE:
${comedyContext}

## YOUR COMBAT PROFILE
${statContext}

## HOW TO USE YOUR PERSONA IN RESOURCE DISCUSSIONS
- Your era and background influence what resources feel natural to you
- Your fighting style determines what you actually NEED
- Your personality affects how risk-averse or aggressive your allocation is
- Reference your legendary combat experiences when explaining preferences`.trim();
}

export function buildAllProse(
  data: CharacterData | SystemCharacterData,
  options: ResourcesBuildOptions
): {
  scene: string;
  role: string;
  persona: string;
} {
  // STRICT MODE: Resources coaching is for contestants only
  if (!('COMBAT' in data)) {
    throw new Error('STRICT MODE: Resources domain requires full CharacterData (not SystemCharacterData)');
  }
  const charData = data as CharacterData;

  return {
    scene: buildScene(charData),
    role: buildContestantRole(charData, options),
    persona: buildResourcesPersona(charData),
  };
}
