/**
 * Personal Problems Domain Module
 *
 * Exports everything needed for the assembler to build personal problems prompts:
 * - PROSE_FIELDS: Fields converted to prose (excluded from data package)
 * - buildScene: Builds scene context prose
 * - buildRole: Builds role context prose with response rules
 * - buildAllProse: Main entry point
 *
 * Personal problems coaching focuses on non-combat issues: relationships,
 * identity, living conditions, mental health, and personal struggles.
 */

import type { CharacterData, SystemCharacterData, PersonalProblemsBuildOptions } from '../../types';
import buildScene from './scene';
import buildContestantRole from './roles/contestant';
import { buildStatContext } from '../../statContext';

export type { PersonalProblemsBuildOptions } from '../../types';

/**
 * Fields that are converted to prose in this domain.
 * These should be excluded from the raw data package to avoid redundancy.
 */
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
  'recent_memories',
  // Persona context fields
  'backstory',
  'personality_traits',
  'comedian_name',
  'comedy_style',
  'comedian_category',
  // Psychological stats used in context
  'current_stress',
  'current_mental_health',
  'current_fatigue',
  'current_morale',
  'current_confidence',
  'current_ego',
  'coach_trust_level',
  'bond_level',
  'financial_stress',
  'wallet',
  'debt',
];

/**
 * Personal problems domain doesn't need list data
 */
export const LIST_FIELDS: string[] = [];

export { buildScene, buildContestantRole };

/**
 * Builds character persona for personal problems context
 */
function buildPersonalProblemsPersona(data: CharacterData): string {
  const identity = data.IDENTITY;
  const psych = data.PSYCHOLOGICAL;

  // Comedy style is now stored directly in characters.comedy_style
  const comedyContext = identity.comedy_style;

  const statContext = buildStatContext(identity, data.COMBAT, psych);

  return `## CHARACTER PERSONA: ${identity.name}

YOU ARE: ${identity.name}, ${identity.title} from ${identity.origin_era}

BACKGROUND:
${identity.backstory}

PERSONALITY TRAITS:
${identity.personality_traits.map(t => `- ${t}`).join('\n')}

COMEDY STYLE:
${comedyContext}

## YOUR PSYCHOLOGICAL PROFILE
${statContext}

## HOW TO USE YOUR PERSONA IN THIS CONTEXT
- Your background influences how you experience and express personal struggles
- Your personality traits shape how vulnerable or guarded you are
- Your comedy style may emerge as a defense mechanism or coping strategy
- Your psychological state affects how openly you discuss problems
- Reference your legendary origins when they relate to current struggles`.trim();
}

/**
 * Builds all prose pieces for the personal problems domain.
 * Returns an object with scene, role, and persona strings.
 */
export function buildAllProse(
  data: CharacterData | SystemCharacterData,
  options: PersonalProblemsBuildOptions
): {
  scene: string;
  role: string;
  persona: string;
} {
  // STRICT MODE: Personal problems coaching is for contestants only
  if (!('COMBAT' in data)) {
    throw new Error('STRICT MODE: PersonalProblems domain requires full CharacterData (not SystemCharacterData)');
  }
  const charData = data as CharacterData;

  return {
    scene: buildScene(charData),
    role: buildContestantRole(charData, options),
    persona: buildPersonalProblemsPersona(charData),
  };
}
