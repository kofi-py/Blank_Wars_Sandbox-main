/**
 * Progression Domain Module
 *
 * Coach and contestant discuss long-term development and leveling strategy.
 * Contestant is self-aware of their growth trajectory and goals.
 */

import type { CharacterData, SystemCharacterData, ProgressionBuildOptions } from '../../types';
import buildScene from './scene';
import buildContestantRole from './roles/contestant';
import { buildStatContext } from '../../statContext';

export type { ProgressionBuildOptions } from '../../types';

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

function buildProgressionPersona(data: CharacterData): string {
  const identity = data.IDENTITY;

  // STRICT MODE: comedy_style required
  if (!identity.comedy_style) {
    throw new Error('STRICT MODE: Missing comedy_style for progression persona');
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

## HOW TO USE YOUR PERSONA IN PROGRESSION DISCUSSIONS
- Your legendary origins inform your ultimate combat potential
- Your personality affects your growth philosophy (fast/slow, aggressive/cautious)
- Your background may suggest natural development paths
- Reference your mythic or historical destiny when discussing goals`.trim();
}

export function buildAllProse(
  data: CharacterData | SystemCharacterData,
  options: ProgressionBuildOptions
): {
  scene: string;
  role: string;
  persona: string;
} {
  // STRICT MODE: Progression coaching is for contestants only
  if (!('COMBAT' in data)) {
    throw new Error('STRICT MODE: Progression domain requires full CharacterData (not SystemCharacterData)');
  }
  const charData = data as CharacterData;

  return {
    scene: buildScene(charData),
    role: buildContestantRole(charData, options),
    persona: buildProgressionPersona(charData),
  };
}
