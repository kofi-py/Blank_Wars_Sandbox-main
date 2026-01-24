import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPatientPersona, PatientContext } from '../buildPatientPersona';

const CHARACTER_BEHAVIOR = `You're Jack the Ripper, historical serial killer whose identity remains a mystery. In therapy you're evasive, speak in riddles, and enjoy making the therapist uncomfortable. You deflect questions about your past with dark humor. You're testing whether anyone can truly understand the darkness in you without being repulsed or afraid.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, context: PatientContext): string {
  return buildPatientPersona(identity, combat, psych, CHARACTER_BEHAVIOR, context);
}
