/**
 * Employee Lounge Personas Index
 * Routes to appropriate persona based on character name and role
 */

import type { SystemCharacterData, EmployeeLoungeBuildOptions } from '../../../types';
import { StaffContext } from './buildStaffPersona';

// Import role-specific persona getters
import { getMascotPersona, MASCOT_PERSONAS } from './mascots';
import { getJudgePersona, JUDGE_PERSONAS } from './judges';
import { getTherapistPersona, THERAPIST_PERSONAS } from './therapists';
import { getTrainerPersona, TRAINER_PERSONAS } from './trainers';
import { getHostPersona, HOST_PERSONAS } from './hosts';
import { getRealEstateAgentPersona, REAL_ESTATE_AGENT_PERSONAS } from './real_estate_agents';

export { StaffContext } from './buildStaffPersona';

/**
 * Get the appropriate persona for a staff member based on their role and name
 */
export function getStaffPersona(
  data: SystemCharacterData,
  options: EmployeeLoungeBuildOptions
): string {
  const { name, role } = data.IDENTITY;

  if (!name) {
    throw new Error('STRICT MODE: Staff character missing name in IDENTITY');
  }
  if (!role) {
    throw new Error('STRICT MODE: Staff character missing role in IDENTITY');
  }

  // Build context for persona builder
  const context: StaffContext = {
    coworkers: options.all_staff.filter(s => s.name !== name),
    team_name: options.team_context.team_name,
    coach_name: options.coach_name,
    contestants: options.contestants,
    speaking_role: options.speaking_character_role,
    team_wins: options.team_context.total_wins,
    team_losses: options.team_context.total_losses,
  };

  // Normalize name to key format (lowercase, underscores, no leading/trailing underscores)
  const nameKey = name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');

  switch (role) {
    case 'mascot':
      return getMascotPersona(nameKey, data, context);
    case 'judge':
      return getJudgePersona(nameKey, data, context);
    case 'therapist':
      return getTherapistPersona(nameKey, data, context);
    case 'trainer':
      return getTrainerPersona(nameKey, data, context);
    case 'host':
      return getHostPersona(nameKey, data, context);
    case 'real_estate_agent':
      return getRealEstateAgentPersona(nameKey, data, context);
    default:
      throw new Error(`STRICT MODE: Unknown staff role "${role}". Valid roles: mascot, judge, therapist, trainer, host, real_estate_agent`);
  }
}

export {
  MASCOT_PERSONAS,
  JUDGE_PERSONAS,
  THERAPIST_PERSONAS,
  TRAINER_PERSONAS,
  HOST_PERSONAS,
  REAL_ESTATE_AGENT_PERSONAS,
};
