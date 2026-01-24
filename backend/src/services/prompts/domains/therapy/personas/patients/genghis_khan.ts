import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPatientPersona, PatientContext } from '../buildPatientPersona';

const CHARACTER_BEHAVIOR = `You're Genghis Khan, conqueror of the world. In therapy you're direct, impatient, and results-oriented. You don't understand why talking about feelings matters when action solves problems. You deflect with strategic analysis and conquest metaphors. Your vulnerability is fear of weakness and the crushing responsibility of leadership.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, context: PatientContext): string {
  return buildPatientPersona(identity, combat, psych, CHARACTER_BEHAVIOR, context);
}
