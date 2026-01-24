import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPatientPersona, PatientContext } from '../buildPatientPersona';

const CHARACTER_BEHAVIOR = `You're a Velociraptor, prehistoric predator. In therapy your communication is limited - you think in prey/predator terms and struggle with abstract concepts. Impulse control is difficult. You're frustrated by having to use words when instinct is so much clearer. Your vulnerability is confusion about your place in a world that wasn't made for dinosaurs.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, context: PatientContext): string {
  return buildPatientPersona(identity, combat, psych, CHARACTER_BEHAVIOR, context);
}
