/**
 * Real Estate Domain Module
 *
 * Exports everything needed for the assembler to build real estate prompts:
 * - PROSE_FIELDS: Fields converted to prose (excluded from data package)
 * - buildScene: Builds scene context with property/financial info
 * - buildRole: Builds agent role with behavior rules
 * - getAgentPersona: Gets character-specific persona
 * - buildAllProse: Assembles all prose components
 *
 * NOTE: Real estate agents are SYSTEM CHARACTERS - they use SystemCharacterData
 * They interact with coaches (users), not contestants.
 */

import type { SystemCharacterData, RealEstateBuildOptions } from '../../types';
import buildScene from './scene';
import buildAgentRole from './roles/agent';
import { getAgentPersona } from './personas/agents';

/**
 * Fields that are converted to prose in this domain.
 * These should be excluded from the raw data package to avoid redundancy.
 */
export const PROSE_FIELDS = [
  // Scene context (from options)
  'current_hq_tier',
  'current_balance',
  'current_gems',
  'current_room_count',
  'current_bed_count',
  'current_character_count',
  'characters_without_beds',
  'available_tiers',
  // Team performance
  'team_total_wins',
  'team_total_losses',
  'team_win_percentage',
  'team_monthly_earnings',
  'team_total_earnings',
  // Agent reference
  'agent',
  'competing_agents',
  // Coach context
  'coach_name',
  'team_name',
  'coach_message',
  'memory_context',
];

/**
 * Real estate doesn't need list data - no powers, spells, equipment.
 */
export const LIST_FIELDS: string[] = [];

export { buildScene, buildAgentRole, getAgentPersona };

/**
 * Builds all prose pieces for the real estate domain.
 * Returns an object with scene, role, and persona strings.
 */
export function buildAllProse(
  data: SystemCharacterData,
  options: RealEstateBuildOptions
): {
  scene: string;
  role: string;
  persona: string;
} {
  // STRICT MODE: Real estate is for system characters only (agents)
  if ('COMBAT' in data) {
    throw new Error('STRICT MODE: Real estate domain requires SystemCharacterData (not full CharacterData)');
  }

  // Get agent's character_id for persona lookup
  const characterId = data.IDENTITY.id;

  return {
    scene: buildScene(options),
    role: buildAgentRole(options),
    persona: getAgentPersona(characterId, data.IDENTITY),
  };
}
