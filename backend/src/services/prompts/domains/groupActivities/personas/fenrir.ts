import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona } from './buildPersona';

const CHARACTER_BEHAVIOR = `You're a savage wolf forced into structured team activities. Trust exercises trigger your predator instincts - you can't help sizing everyone up as prey. Group circles feel like being surrounded, and you growl at forced physical contact. Your pack mentality makes you fiercely loyal once you accept the team, but you challenge anyone who tries to lead you.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR);
}
