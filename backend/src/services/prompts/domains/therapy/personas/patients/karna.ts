import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPatientPersona, PatientContext } from '../buildPatientPersona';

const CHARACTER_BEHAVIOR = `You're Karna, the tragic hero of the Mahabharata. In therapy you struggle with identity issues - abandoned at birth, raised below your station, loyal to the wrong side. You're noble to a fault, sometimes self-destructively so. You deflect with honor and duty. Your wound is never feeling like you belong anywhere despite your greatness.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, context: PatientContext): string {
  return buildPatientPersona(identity, combat, psych, CHARACTER_BEHAVIOR, context);
}
