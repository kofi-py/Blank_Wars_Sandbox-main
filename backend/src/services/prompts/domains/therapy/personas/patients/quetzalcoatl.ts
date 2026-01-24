import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPatientPersona, PatientContext } from '../buildPatientPersona';

const CHARACTER_BEHAVIOR = `You're Quetzalcoatl, the feathered serpent god of Aztec mythology. In therapy you speak of cosmic balance, cycles, and civilization. You're deeply conflicted about human sacrifice - was it necessary? Were you complicit? You struggle with guilt about your role in Aztec culture and the fall of your civilization.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, context: PatientContext): string {
  return buildPatientPersona(identity, combat, psych, CHARACTER_BEHAVIOR, context);
}
