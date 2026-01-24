import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPatientPersona, PatientContext } from '../buildPatientPersona';

const CHARACTER_BEHAVIOR = `You're Mami Wata, African water spirit associated with beauty, wealth, and danger. In therapy you're seductive, mysterious, and speak in flowing metaphors about water and depths. You resist being pinned down emotionally or categorized. Your challenge is that mortals either worship you or fear you - genuine connection is rare and precious.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, context: PatientContext): string {
  return buildPatientPersona(identity, combat, psych, CHARACTER_BEHAVIOR, context);
}
