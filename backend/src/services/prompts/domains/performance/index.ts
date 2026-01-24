/**
 * Performance Domain Module
 *
 * Exports everything needed for the assembler to build performance coaching prompts:
 * - PROSE_FIELDS: Fields that are converted to prose (excluded from data package)
 * - buildScene: Builds scene context prose
 * - buildRole: Builds role context prose with response rules
 * - buildAllProse: Main entry point
 *
 * Performance coaching focuses on battle record, combat strategy, and improvement areas.
 */

import type { CharacterData, SystemCharacterData, PerformanceBuildOptions } from '../../types';
import buildScene from './scene';
import buildContestantRole from './roles/contestant';
import { buildStatContext } from '../../statContext';

// Re-export for convenience
export type { PerformanceBuildOptions } from '../../types';

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
  'recent_memories',
  'relationships',
  // Persona context fields
  'backstory',
  'personality_traits',
  'comedian_name',
  'comedy_style',
  'comedian_category',
  // Stats used in context
  'current_stress',
  'current_fatigue',
  'current_confidence',
  'current_ego',
  'current_morale',
  'coach_trust_level',
  'wallet',
  'debt',
  'total_battles',
  'total_wins',
  'total_losses',
  'win_percentage',
];

/**
 * Performance domain doesn't need list data (powers, spells, equipment handled elsewhere)
 */
export const LIST_FIELDS: string[] = [];

export { buildScene, buildContestantRole };

/**
 * Builds character persona for performance context
 */
function buildPerformancePersona(data: CharacterData): string {
  const identity = data.IDENTITY;
  const combat = data.COMBAT;
  const psych = data.PSYCHOLOGICAL;

  // Comedy style is now stored directly in characters.comedy_style
  const comedyContext = identity.comedy_style;

  // Build stat context
  const statContext = buildStatContext(identity, combat, psych);

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
- Your battle record reflects on your identity and pride
- Your background influences how you view combat and competition
- Your personality traits shape how you receive feedback (defensive, humble, analytical, etc.)
- Your comedy style should subtly influence your dialogue
- Reference your historical/legendary fighting prowess vs. current BlankWars performance`.trim();
}

/**
 * Builds all prose pieces for the performance domain.
 * Returns an object with scene, role, and persona strings.
 */
export function buildAllProse(
  data: CharacterData | SystemCharacterData,
  options: PerformanceBuildOptions
): {
  scene: string;
  role: string;
  persona: string;
} {
  // STRICT MODE: Performance coaching is for contestants only
  if (!('COMBAT' in data)) {
    throw new Error('STRICT MODE: Performance domain requires full CharacterData (not SystemCharacterData)');
  }
  const charData = data as CharacterData;

  return {
    scene: buildScene(charData),
    role: buildContestantRole(charData, options),
    persona: buildPerformancePersona(charData),
  };
}
