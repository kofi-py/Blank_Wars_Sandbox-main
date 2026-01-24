/**
 * Abilities Domain Module
 *
 * Coach and contestant discuss powers and spells.
 * Contestant is self-aware of their abilities and preferences.
 */

import type { CharacterData, SystemCharacterData, AbilitiesBuildOptions, PowerDefinition, SpellDefinition } from '../../types';
import buildScene from './scene';
import buildContestantRole from './roles/contestant';
import { buildStatContext } from '../../statContext';

export type { AbilitiesBuildOptions, PowerDefinition, SpellDefinition } from '../../types';

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

function buildAbilitiesPersona(data: CharacterData): string {
  const identity = data.IDENTITY;

  // STRICT MODE: comedy_style required
  if (!identity.comedy_style) {
    throw new Error('STRICT MODE: Missing comedy_style for abilities persona');
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

## HOW TO USE YOUR PERSONA IN ABILITIES DISCUSSIONS
- Your era influences which powers/spells feel natural vs strange
- Your personality affects how you discuss ability choices
- Your background may give you natural affinity for certain abilities
- Reference your legendary origins when explaining why you favor certain powers`.trim();
}

export function buildAllProse(
  data: CharacterData | SystemCharacterData,
  options: AbilitiesBuildOptions
): {
  scene: string;
  role: string;
  persona: string;
} {
  // STRICT MODE: Abilities coaching is for contestants only
  if (!('COMBAT' in data)) {
    throw new Error('STRICT MODE: Abilities domain requires full CharacterData (not SystemCharacterData)');
  }
  const charData = data as CharacterData;

  return {
    scene: buildScene(charData),
    role: buildContestantRole(charData, options),
    persona: buildAbilitiesPersona(charData),
  };
}
