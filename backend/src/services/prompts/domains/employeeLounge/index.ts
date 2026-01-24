/**
 * Employee Lounge Domain Module
 *
 * Exports everything needed for the assembler to build employee lounge prompts:
 * - PROSE_FIELDS: Fields that are converted to prose (excluded from data package)
 * - buildScene: Builds scene context (break room setting)
 * - buildRole: Builds role context based on system character job
 * - buildAllProse: Assembles all prose components
 *
 * NOTE: Employee Lounge is for SYSTEM CHARACTERS - they use SystemCharacterData.
 * This is a group chat between Blank Wars employees assigned to a team.
 */

import type { SystemCharacterData, EmployeeLoungeBuildOptions } from '../../types';
import buildScene from './scene';
import buildRole from './roles/staff';
import { getStaffPersona } from './personas';

/**
 * Fields that are converted to prose in this domain.
 * These should be excluded from the raw data package to avoid redundancy.
 */
export const PROSE_FIELDS = [
  // Scene context (from options)
  'coach_name',
  'team_name',
  'total_wins',
  'total_losses',
  'monthly_earnings',
  'hq_tier',
  'all_staff',
  'recent_messages',
  // Role context
  'speaking_character_role',
  'coach_message',
  'memory_context',
  // Group mode fields
  'group_mode',
  'message_type',
  'active_participants',
  'responding_to',
];

/**
 * Employee lounge doesn't need list data - no powers, spells, or equipment.
 */
export const LIST_FIELDS: string[] = [];

export { buildScene, buildRole };

/**
 * Builds all prose pieces for the employee lounge domain.
 * Returns an object with scene, role, and persona strings.
 */
export function buildAllProse(
  data: SystemCharacterData,
  options: EmployeeLoungeBuildOptions
): {
  scene: string;
  role: string;
  persona: string;
} {
  // STRICT MODE: Employee lounge is for system characters only
  if ('COMBAT' in data) {
    throw new Error('STRICT MODE: Employee lounge domain requires SystemCharacterData (not full CharacterData)');
  }

  return {
    scene: buildScene(options),
    role: buildRole(options),
    persona: getStaffPersona(data, options),
  };
}
