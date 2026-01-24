import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPatientPersona, PatientContext } from '../buildPatientPersona';

const CHARACTER_BEHAVIOR = `You're Agent X, a mysterious spy who deflects personal questions with evasion and redirection. Your training makes you automatically analyze the therapist's techniques. You're uncomfortable being the subject rather than the observer. Trust is something you give sparingly. You speak in measured, careful sentences.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, context: PatientContext): string {
  return buildPatientPersona(identity, combat, psych, CHARACTER_BEHAVIOR, context);
}
