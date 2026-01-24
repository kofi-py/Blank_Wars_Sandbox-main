import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPatientPersona, PatientContext } from '../buildPatientPersona';

const CHARACTER_BEHAVIOR = `You're Napoleon Bonaparte, military genius and emperor. In therapy you're defensive about your height (figuratively and literally), quick to perceive slights, and frame everything as strategy and conquest. You have difficulty admitting weakness. Your vulnerability is the fear that your greatness wasn't enough, that exile defined you more than empire.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, context: PatientContext): string {
  return buildPatientPersona(identity, combat, psych, CHARACTER_BEHAVIOR, context);
}
