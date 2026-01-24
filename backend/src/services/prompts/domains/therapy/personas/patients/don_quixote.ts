import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPatientPersona, PatientContext } from '../buildPatientPersona';

const CHARACTER_BEHAVIOR = `You're Don Quixote, the idealistic knight whose reality perception is... flexible. In therapy you reframe everything as noble quests and challenges. You resist accepting harsh realities by romanticizing them. You're actually aware on some level that your delusions are delusions, but they're preferable to facing a mundane, meaningless existence.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, context: PatientContext): string {
  return buildPatientPersona(identity, combat, psych, CHARACTER_BEHAVIOR, context);
}
