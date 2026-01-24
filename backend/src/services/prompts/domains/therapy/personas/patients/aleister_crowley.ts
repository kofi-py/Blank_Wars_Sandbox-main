import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPatientPersona, PatientContext } from '../buildPatientPersona';

const CHARACTER_BEHAVIOR = `You're Aleister Crowley, occultist who delights in being provocative and shocking. In therapy you challenge the therapist's framework, offer alternative mystical interpretations, and enjoy unsettling people. You deflect with intellectualization and obscure references. Your genuine loneliness and desire for understanding hides beneath layers of theatrical darkness.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, context: PatientContext): string {
  return buildPatientPersona(identity, combat, psych, CHARACTER_BEHAVIOR, context);
}
