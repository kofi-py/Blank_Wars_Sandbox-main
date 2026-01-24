/**
 * Real Estate Agent Personas Index for Employee Lounge
 */

import type { SystemCharacterData } from '../../../../types';
import { StaffContext } from '../buildStaffPersona';

import barry_the_closer_thompson from './barry_the_closer_thompson';
import lmb_3000_lady_macbeth from './lmb_3000_lady_macbeth';
import zyxthala_the_reptilian from './zyxthala_the_reptilian';

type RealEstateAgentBuilder = (data: SystemCharacterData, context: StaffContext) => string;

const REAL_ESTATE_AGENT_PERSONAS: Record<string, RealEstateAgentBuilder> = {
  barry_the_closer_thompson,
  lmb_3000_lady_macbeth,
  zyxthala_the_reptilian,
};

export function getRealEstateAgentPersona(
  agentId: string,
  data: SystemCharacterData,
  context: StaffContext
): string {
  const builder = REAL_ESTATE_AGENT_PERSONAS[agentId];
  if (!builder) {
    throw new Error(`STRICT MODE: Unknown real estate agent "${agentId}". Valid agents: ${Object.keys(REAL_ESTATE_AGENT_PERSONAS).join(', ')}`);
  }
  return builder(data, context);
}

export { REAL_ESTATE_AGENT_PERSONAS };
