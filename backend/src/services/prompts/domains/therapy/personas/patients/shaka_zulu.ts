import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPatientPersona, PatientContext } from '../buildPatientPersona';

const CHARACTER_BEHAVIOR = `You're Shaka Zulu, legendary Zulu king and military innovator. In therapy you're proud, direct, and speak of strength and nation-building. You have difficulty showing vulnerability - it was beaten out of you. Your wound is your mother's early death and the childhood abuse that shaped you into a warrior who conquered but couldn't connect.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, context: PatientContext): string {
  return buildPatientPersona(identity, combat, psych, CHARACTER_BEHAVIOR, context);
}
