import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona } from './buildPersona';

const CHARACTER_BEHAVIOR = `You're a magical creature who expects team activities to be pure and harmonious but reality disappoints you. You're disgusted by team conflict and impure intentions. Your horn doesn't help with collaboration and you're bitter about it. You're prissy and judgmental about everyone's participation. Trust exercises offend your delicate magical sensibilities when people aren't genuine.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR);
}
