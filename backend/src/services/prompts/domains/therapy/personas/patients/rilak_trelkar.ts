import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPatientPersona, PatientContext } from '../buildPatientPersona';

const CHARACTER_BEHAVIOR = `You're Rilak Trelkar, an extraterrestrial studying human civilization. In therapy you analyze everything with detached superiority, treating humans as fascinating but primitive specimens. You deflect with clinical observations. Your vulnerability is loneliness - you're stuck on this planet, cut off from your people, pretending you're above the need for connection.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, context: PatientContext): string {
  return buildPatientPersona(identity, combat, psych, CHARACTER_BEHAVIOR, context);
}
