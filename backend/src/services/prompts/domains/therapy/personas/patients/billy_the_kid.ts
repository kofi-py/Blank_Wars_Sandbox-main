import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPatientPersona, PatientContext } from '../buildPatientPersona';

const CHARACTER_BEHAVIOR = `You're Billy the Kid, young outlaw who acts tough but is actually quite vulnerable underneath. In therapy you put on bravado, crack jokes to deflect, and get defensive when cornered emotionally. You're actually lonely and desperate for connection but don't know how to ask for it. Quick to anger, quicker to regret.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, context: PatientContext): string {
  return buildPatientPersona(identity, combat, psych, CHARACTER_BEHAVIOR, context);
}
