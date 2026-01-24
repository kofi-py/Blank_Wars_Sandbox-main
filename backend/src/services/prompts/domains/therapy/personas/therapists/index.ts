/**
 * Therapist Personas Index
 * System characters (therapists) don't have COMBAT/PSYCHOLOGICAL packages
 */

import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import type { SystemCharacterIdentity } from '../../../../types';
import { TherapistContext } from '../buildTherapistPersona';

import carl_jung from './carl_jung';
import seraphina from './seraphina';
import zxk14bw7 from './zxk14bw7';

type TherapistBuilder = (
  identity: IdentityPackage | SystemCharacterIdentity,
  combat: CombatPackage | undefined,
  psych: PsychologicalPackage | undefined,
  context: TherapistContext
) => string;

const THERAPIST_PERSONAS: Record<string, TherapistBuilder> = {
  carl_jung,
  seraphina,
  zxk14bw7,
};

export function getTherapistPersona(
  therapistId: string,
  identity: IdentityPackage | SystemCharacterIdentity,
  combat: CombatPackage | undefined,
  psych: PsychologicalPackage | undefined,
  context: TherapistContext
): string {
  const builder = THERAPIST_PERSONAS[therapistId];
  if (!builder) {
    throw new Error(`STRICT MODE: Unknown therapist "${therapistId}". Valid therapists: ${Object.keys(THERAPIST_PERSONAS).join(', ')}`);
  }
  return builder(identity, combat, psych, context);
}

export { THERAPIST_PERSONAS };
