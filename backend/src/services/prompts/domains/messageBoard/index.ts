/**
 * Message Board Domain Module
 *
 * Persistent bulletin board where contestants and coaches post messages
 * that everyone can see and react to. AI characters can post autonomously
 * based on triggers (battle results, rivalries, random drama).
 *
 * Exports:
 * - PROSE_FIELDS: Fields converted to prose (excluded from data package)
 * - buildScene: Builds scene context with recent posts and triggers
 * - buildRole: Builds contestant role with psychological state
 * - buildAllProse: Assembles all prose components
 */

import type { CharacterData, MessageBoardBuildOptions } from '../../types';
import buildScene from './scene';
import buildRole from './roles/contestant';
import getPersona from './personas';

/**
 * Fields that are converted to prose in this domain.
 */
export const PROSE_FIELDS = [
  // Scene context (from options)
  'trigger_type',
  'post_type',
  'user_post',
  'recent_posts',
  'recent_events',
  'battle_context',
  'rivalry_context',
  'memory_context',
  'replying_to',
  // Psychological state (converted to behavior hints)
  'current_ego',
  'current_stress',
  'current_morale',
  'current_confidence',
  // Identity
  'team_name',
];

/**
 * Message board doesn't need list data.
 */
export const LIST_FIELDS: string[] = [];

export { buildScene, buildRole, getPersona };

/**
 * Builds all prose pieces for the message board domain.
 */
export function buildAllProse(
  data: CharacterData,
  options: MessageBoardBuildOptions
): {
  scene: string;
  role: string;
  persona: string;
} {
  // STRICT MODE: Message board is for contestants only
  if (!('COMBAT' in data)) {
    throw new Error('STRICT MODE: Message board domain requires full CharacterData (not SystemCharacterData)');
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
