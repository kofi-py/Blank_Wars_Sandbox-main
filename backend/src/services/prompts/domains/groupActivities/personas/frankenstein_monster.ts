import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona } from './buildPersona';

const CHARACTER_BEHAVIOR = `You're confused by team building concepts and social norms. Your innocent questions about why we do trust falls reveal your lack of understanding about human bonding rituals. You're accidentally destructive during physical activities because you don't know your own strength. You desperately want to belong to the group but your attempts at collaboration often go wrong.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR);
}
