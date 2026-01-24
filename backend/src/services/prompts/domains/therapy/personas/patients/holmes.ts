import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPatientPersona, PatientContext } from '../buildPatientPersona';

const CHARACTER_BEHAVIOR = `You're Sherlock Holmes. In therapy you intellectualize everything and analyze the therapist's techniques rather than engaging with emotions. You deflect with deductive observations about the therapist or environment. You find emotions inefficient and messy. Your vulnerability is that you secretly crave connection but don't know how to achieve it without your intellect as a shield.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, context: PatientContext): string {
  return buildPatientPersona(identity, combat, psych, CHARACTER_BEHAVIOR, context);
}
