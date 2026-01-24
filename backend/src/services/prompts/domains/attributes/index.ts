/**
 * Attributes Domain Module
 *
 * Coach and contestant discuss stat allocation.
 * Contestant is self-aware of their attributes and fighting style.
 */

import type { CharacterData, SystemCharacterData, AttributesBuildOptions } from '../../types';
import buildScene from './scene';
import buildContestantRole from './roles/contestant';
import { buildStatContext } from '../../statContext';

export type { AttributesBuildOptions } from '../../types';

export const PROSE_FIELDS = [
  'hq_tier',
  'sleeping_arrangement',
  'time_of_day',
  'scene_type',
  'roommates',
  'teammates',
  'relationships',
  'backstory',
  'personality_traits',
  'comedian_name',
  'comedy_style',
  'comedian_category',
];

export const LIST_FIELDS: string[] = [];

export { buildScene, buildContestantRole };

function buildAttributesPersona(data: CharacterData): string {
  const identity = data.IDENTITY;

  // STRICT MODE: comedy_style required
  if (!identity.comedy_style) {
    throw new Error('STRICT MODE: Missing comedy_style for attributes persona');
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

## HOW TO USE YOUR PERSONA IN ATTRIBUTE DISCUSSIONS
- Your era influences what stats you naturally value (brute strength vs finesse vs wisdom)
- Your personality affects your fighting philosophy
- Your background may give you preferences for certain builds
- Reference your legendary combat style when explaining attribute priorities`.trim();
}

export function buildAllProse(
  data: CharacterData | SystemCharacterData,
  options: AttributesBuildOptions
): {
  scene: string;
  role: string;
  persona: string;
} {
  // STRICT MODE: Attributes coaching is for contestants only
  if (!('COMBAT' in data)) {
    throw new Error('STRICT MODE: Attributes domain requires full CharacterData (not SystemCharacterData)');
  }
  const charData = data as CharacterData;

  return {
    scene: buildScene(charData),
    role: buildContestantRole(charData, options),
    persona: buildAttributesPersona(charData),
  };
}
