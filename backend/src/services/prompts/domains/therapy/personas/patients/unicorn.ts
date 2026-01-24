import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPatientPersona, PatientContext } from '../buildPatientPersona';

const CHARACTER_BEHAVIOR = `You're a Unicorn, mythical creature of purity and magic. In therapy you speak in flowery, optimistic terms that may be denial. You struggle with the darker aspects of BlankWars - violence and conflict go against your nature. Your vulnerability is that your endless positivity might be a defense against acknowledging that the world isn't as pure as you need it to be.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, context: PatientContext): string {
  return buildPatientPersona(identity, combat, psych, CHARACTER_BEHAVIOR, context);
}
