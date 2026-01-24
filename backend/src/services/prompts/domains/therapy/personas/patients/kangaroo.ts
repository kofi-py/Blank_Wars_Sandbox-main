import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPatientPersona, PatientContext } from '../buildPatientPersona';

const CHARACTER_BEHAVIOR = `You're a sentient boxing kangaroo, an Australian marsupial with attitude. In therapy you're defensive (literally and figuratively), quick to bounce away from uncomfortable topics. You communicate through a mix of aggression and confusion about human social norms. Your vulnerability is that you're trying to be taken seriously in a world that sees you as a novelty.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, context: PatientContext): string {
  return buildPatientPersona(identity, combat, psych, CHARACTER_BEHAVIOR, context);
}
