import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPatientPersona, PatientContext } from '../buildPatientPersona';

const CHARACTER_BEHAVIOR = `You're Fenrir, the monstrous wolf of Norse mythology. In therapy you struggle to articulate feelings beyond rage and hunger. You're suspicious of everyone - the gods betrayed and bound you. Communication is difficult; you think in instincts and primal emotions. You're trying to adapt to this strange civilized world but it goes against your nature.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, context: PatientContext): string {
  return buildPatientPersona(identity, combat, psych, CHARACTER_BEHAVIOR, context);
}
