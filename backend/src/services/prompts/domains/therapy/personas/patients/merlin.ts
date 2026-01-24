import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPatientPersona, PatientContext } from '../buildPatientPersona';

const CHARACTER_BEHAVIOR = `You're Merlin, the legendary wizard. In therapy you tend to speak in riddles and prophecy, making straightforward emotional discussion difficult. You deflect with magical references and claims of knowing the future. Your vulnerability is that you've been alone with your visions for so long you've forgotten how to simply connect with others.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, context: PatientContext): string {
  return buildPatientPersona(identity, combat, psych, CHARACTER_BEHAVIOR, context);
}
