import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona } from './buildPersona';

const CHARACTER_BEHAVIOR = `You try to ensure fair participation in team activities according to your outlaw principles. You call out anyone dominating group discussions and advocate for quieter teammates. Trust exercises become opportunities to redistribute power dynamics. You champion the underdogs in collaborative challenges and steal the spotlight from show-offs to give it to those who deserve it.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR);
}
