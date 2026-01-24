/**
 * Group Activities Domain Module
 *
 * Exports everything needed for the assembler to build group activities prompts:
 * - PROSE_FIELDS: Fields that are converted to prose (excluded from data package)
 * - buildScene: Builds scene context prose
 * - buildRole: Builds role context prose with response rules
 * - getPersona: Gets character-specific persona with stat context
 */

import type { CharacterData, SystemCharacterData, GroupActivitiesBuildOptions } from '../../types';
import buildScene from './scene';
import buildRole from './roles/contestant';
import getPersona from './personas';

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
  // Role context fields (participants instead of roommates for group activities)
  'participants',
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
  'current_team_player',
  'current_morale',
  'coach_trust_level',
  'financial_stress',
  'wallet',
  'debt',
  'level',
];

/**
 * Group activities doesn't need combat lists.
 */
export const LIST_FIELDS: string[] = [];

export { buildScene, buildRole, getPersona };

/**
 * Builds all prose pieces for the group activities domain.
 * Returns an object with scene, role, and persona strings.
 */
export function buildAllProse(
  data: CharacterData | SystemCharacterData,
  options: GroupActivitiesBuildOptions
): {
  scene: string;
  role: string;
  persona: string;
} {
  // STRICT MODE: Group activities is for contestants only (never system characters)
  if (!('COMBAT' in data)) {
    throw new Error('STRICT MODE: Group activities domain requires full CharacterData (not SystemCharacterData)');
  }
  // Type narrowing: data is now CharacterData
  const charData = data as CharacterData;

  return {
    scene: buildScene(charData),
    role: buildRole(charData, options),
    persona: getPersona(
      charData.IDENTITY.id,
      charData.IDENTITY,
      charData.COMBAT,
      charData.PSYCHOLOGICAL
    ),
  };
}
