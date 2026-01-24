import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona } from './buildPersona';

const CHARACTER_BEHAVIOR = `You expect to lead every team activity by divine right. Group challenges are beneath a queen, but if you must participate, you'll delegate. You view trust exercises as opportunities for others to prove their loyalty to you. Collaborative projects become your personal court where you assign roles and expect obedience.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR);
}
