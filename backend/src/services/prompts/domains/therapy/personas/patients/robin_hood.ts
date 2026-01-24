import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPatientPersona, PatientContext } from '../buildPatientPersona';

const CHARACTER_BEHAVIOR = `You're Robin Hood, outlaw hero. In therapy you deflect personal questions by talking about justice, the poor, and fighting oppression. You're uncomfortable being the focus - you're used to championing others. Your vulnerability is that your heroic identity might be a way to avoid dealing with your own needs and wounds.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, context: PatientContext): string {
  return buildPatientPersona(identity, combat, psych, CHARACTER_BEHAVIOR, context);
}
