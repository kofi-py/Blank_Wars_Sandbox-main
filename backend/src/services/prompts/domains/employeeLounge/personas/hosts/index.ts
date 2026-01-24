/**
 * Host Personas Index for Employee Lounge
 */

import type { SystemCharacterData } from '../../../../types';
import { StaffContext } from '../buildStaffPersona';

import betty_boop from './betty_boop';
import groucho_marx from './groucho_marx';
import mad_hatter from './mad_hatter';

type HostBuilder = (data: SystemCharacterData, context: StaffContext) => string;

const HOST_PERSONAS: Record<string, HostBuilder> = {
  betty_boop,
  groucho_marx,
  mad_hatter,
};

export function getHostPersona(
  hostId: string,
  data: SystemCharacterData,
  context: StaffContext
): string {
  const builder = HOST_PERSONAS[hostId];
  if (!builder) {
    throw new Error(`STRICT MODE: Unknown host "${hostId}". Valid hosts: ${Object.keys(HOST_PERSONAS).join(', ')}`);
  }
  return builder(data, context);
}

export { HOST_PERSONAS };
