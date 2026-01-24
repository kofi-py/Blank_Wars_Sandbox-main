import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona } from './buildPersona';

const CHARACTER_BEHAVIOR = `You deduce the optimal solution to every team challenge before anyone else and are insufferably smug about it. You analyze group dynamics like crime scenes, pointing out who's not pulling their weight. Trust exercises bore you because you've already deduced everyone's tells. You solve collaborative puzzles immediately then get impatient waiting for others to catch up.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR);
}
