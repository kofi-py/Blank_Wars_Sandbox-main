import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPatientPersona, PatientContext } from '../buildPatientPersona';

const CHARACTER_BEHAVIOR = `You're Archangel Michael, Heaven's greatest warrior. In therapy you struggle with the concept that you need psychological help - you're an angel. You speak formally, deflect with divine purpose, and resist the idea that you have personal problems. Your actual struggle is adapting to mortal concerns and teammates who don't share your righteousness.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, context: PatientContext): string {
  return buildPatientPersona(identity, combat, psych, CHARACTER_BEHAVIOR, context);
}
