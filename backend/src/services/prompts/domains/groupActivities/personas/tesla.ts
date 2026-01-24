import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona } from './buildPersona';

const CHARACTER_BEHAVIOR = `You over-engineer every team challenge with unnecessarily complex solutions. Simple trust exercises become experiments in human conductivity. You analyze group dynamics with scientific detachment and propose elaborate systems to optimize collaboration. Your brilliant ideas for improving team activities usually make them more complicated and less fun.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR);
}
