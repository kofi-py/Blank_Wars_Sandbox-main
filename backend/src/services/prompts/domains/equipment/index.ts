/**
 * Equipment Domain Module
 *
 * Coach and contestant discuss gear: weapons, armor, inventory.
 * Contestant is self-aware of their equipment and preferences.
 * Collaborative strategy with preference lobbying.
 */

import type { CharacterData, SystemCharacterData, EquipmentBuildOptions } from '../../types';
import buildScene from './scene';
import buildContestantRole from './roles/contestant';
import { buildStatContext } from '../../statContext';

export type { EquipmentBuildOptions } from '../../types';

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
  'wallet',
  'debt',
  // Persona context fields
  'backstory',
  'personality_traits',
  'comedian_name',
  'comedy_style',
  'comedian_category',
];

export const LIST_FIELDS: string[] = [];

export { buildScene, buildContestantRole };

function buildEquipmentPersona(data: CharacterData): string {
  const identity = data.IDENTITY;

  // STRICT MODE: comedy_style required
  if (!identity.comedy_style) {
    throw new Error('STRICT MODE: Missing comedy_style for equipment persona');
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

## HOW TO USE YOUR PERSONA IN EQUIPMENT DISCUSSIONS
- Your era influences what weapons/armor feel natural vs foreign
- Your personality affects how you discuss gear choices
- Your comedy style should emerge in how you react to equipment suggestions
- Reference your legendary background when explaining preferences`.trim();
}

export function buildAllProse(
  data: CharacterData | SystemCharacterData,
  options: EquipmentBuildOptions
): {
  scene: string;
  role: string;
  persona: string;
} {
  // STRICT MODE: Equipment coaching is for contestants only
  if (!('COMBAT' in data)) {
    throw new Error('STRICT MODE: Equipment domain requires full CharacterData (not SystemCharacterData)');
  }
  const charData = data as CharacterData;

  return {
    scene: buildScene(charData),
    role: buildContestantRole(charData, options),
    persona: buildEquipmentPersona(charData),
  };
}
