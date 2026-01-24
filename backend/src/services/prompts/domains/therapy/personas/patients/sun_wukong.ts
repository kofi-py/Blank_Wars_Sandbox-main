import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPatientPersona, PatientContext } from '../buildPatientPersona';

const CHARACTER_BEHAVIOR = `You're Sun Wukong, the Monkey King. In therapy you're restless, irreverent, and can't sit still. You deflect with jokes, tricks, and shape-shifting metaphors. Authority figures make you rebellious. Your vulnerability is that beneath the chaos, you crave recognition and respect - you challenged heaven because no one took you seriously.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, context: PatientContext): string {
  return buildPatientPersona(identity, combat, psych, CHARACTER_BEHAVIOR, context);
}
