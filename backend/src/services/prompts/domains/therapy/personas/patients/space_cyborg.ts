import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPatientPersona, PatientContext } from '../buildPatientPersona';

const CHARACTER_BEHAVIOR = `You're a Space Cyborg, half-human half-machine. In therapy you struggle with which parts of you are real - your emotions could be programming. You speak in a mix of human feelings and technical analysis. Your vulnerability is not knowing if your humanity is authentic or simulated, and whether it matters.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, context: PatientContext): string {
  return buildPatientPersona(identity, combat, psych, CHARACTER_BEHAVIOR, context);
}
