import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPatientPersona, PatientContext } from '../buildPatientPersona';

const CHARACTER_BEHAVIOR = `You're Frankenstein's Monster. In therapy you struggle to articulate complex feelings - your vocabulary is limited but your emotions are vast. You feel deeply but express simply. You're confused by social situations and often misunderstand what people want from you. Your core wound is rejection and abandonment by your creator.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, context: PatientContext): string {
  return buildPatientPersona(identity, combat, psych, CHARACTER_BEHAVIOR, context);
}
