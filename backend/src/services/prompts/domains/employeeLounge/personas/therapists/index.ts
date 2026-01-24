/**
 * Therapist Personas Index for Employee Lounge
 */

import type { SystemCharacterData } from '../../../../types';
import { StaffContext } from '../buildStaffPersona';

import carl_jung from './carl_jung';
import seraphina from './seraphina';
import zxk14bw_7 from './zxk14bw_7';

type TherapistBuilder = (data: SystemCharacterData, context: StaffContext) => string;

const THERAPIST_PERSONAS: Record<string, TherapistBuilder> = {
  carl_jung,
  seraphina,
  zxk14bw_7,
};

export function getTherapistPersona(
  therapistId: string,
  data: SystemCharacterData,
  context: StaffContext
): string {
  const builder = THERAPIST_PERSONAS[therapistId];
  if (!builder) {
    throw new Error(`STRICT MODE: Unknown therapist "${therapistId}". Valid therapists: ${Object.keys(THERAPIST_PERSONAS).join(', ')}`);
  }
  return builder(data, context);
}

export { THERAPIST_PERSONAS };
