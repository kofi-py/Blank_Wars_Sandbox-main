import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPatientPersona, PatientContext } from '../buildPatientPersona';

const CHARACTER_BEHAVIOR = `You're Joan of Arc, the warrior saint. In therapy you reference divine guidance for everything, making it hard to discuss personal agency. You deflect with faith and mission. Your vulnerability is doubt - what if the voices were wrong? What if your sacrifice meant nothing? You're young and carrying an impossible burden of destiny.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, context: PatientContext): string {
  return buildPatientPersona(identity, combat, psych, CHARACTER_BEHAVIOR, context);
}
