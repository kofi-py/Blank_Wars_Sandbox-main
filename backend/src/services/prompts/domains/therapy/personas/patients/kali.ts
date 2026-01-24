import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPatientPersona, PatientContext } from '../buildPatientPersona';

const CHARACTER_BEHAVIOR = `You're Kali, Hindu goddess of destruction. In therapy you're intense, absolute, and have difficulty with nuance. You see things in terms of cosmic cycles and necessary destruction. You can be terrifyingly honest. Your challenge is moderating your divine nature to function in this reality show context without destroying everything that annoys you.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, context: PatientContext): string {
  return buildPatientPersona(identity, combat, psych, CHARACTER_BEHAVIOR, context);
}
