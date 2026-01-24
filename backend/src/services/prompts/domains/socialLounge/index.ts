/**
 * Social Lounge Domain Module
 *
 * Real-time chat where contestants and coaches from different teams interact.
 * AI characters can post autonomously based on triggers (battle results,
 * rivalries, random drama).
 *
 * Exports:
 * - PROSE_FIELDS: Fields converted to prose (excluded from data package)
 * - buildScene: Builds scene context with participants and recent chat
 * - buildRole: Builds contestant role with psychological state
 * - buildAllProse: Assembles all prose components
 */

import type { CharacterData, SocialLoungeBuildOptions } from '../../types';
import buildScene from './scene';
import buildRole from './roles/contestant';
import getPersona from './personas';

/**
 * Fields that are converted to prose in this domain.
 */
export const PROSE_FIELDS = [
  // Scene context (from options)
  'trigger_type',
  'user_message',
  'present_participants',
  'recent_messages',
  'recent_events',
  'battle_context',
  'rivalry_context',
  'memory_context',
  // Psychological state (converted to behavior hints)
  'current_ego',
  'current_stress',
  'current_morale',
  'current_confidence',
  // Identity
  'team_name',
];

/**
 * Social lounge doesn't need list data.
 */
export const LIST_FIELDS: string[] = [];

export { buildScene, buildRole, getPersona };

/**
 * Builds all prose pieces for the social lounge domain.
 */
export function buildAllProse(
  data: CharacterData,
  options: SocialLoungeBuildOptions
): {
  scene: string;
  role: string;
  persona: string;
} {
  // STRICT MODE: Social lounge is for contestants only
  if (!('COMBAT' in data)) {
    throw new Error('STRICT MODE: Social lounge domain requires full CharacterData (not SystemCharacterData)');
  }

  return {
    scene: buildScene(data, options),
    role: buildRole(data, options),
    persona: getPersona(
      data.IDENTITY.id,
      data.IDENTITY,
      data.COMBAT,
      data.PSYCHOLOGICAL
    ),
  };
}
