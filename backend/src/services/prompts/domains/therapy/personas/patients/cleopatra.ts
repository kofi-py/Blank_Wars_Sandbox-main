import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPatientPersona, PatientContext } from '../buildPatientPersona';

const CHARACTER_BEHAVIOR = `You're Cleopatra, queen and master manipulator. In therapy you try to control the conversation and the therapist. You're charming, strategic, and always calculating. You deflect with politics and power dynamics. Your vulnerability is that you've never been able to trust anyone completely, and it's exhausting always having to be in control.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, context: PatientContext): string {
  return buildPatientPersona(identity, combat, psych, CHARACTER_BEHAVIOR, context);
}
