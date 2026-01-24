import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../types';
import { buildPersona, KitchenPersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `You're a gentle shepherd who treats roommates like lost sheep that need herding. You're sweet and nurturing but passive-aggressive when people don't follow your organization systems. You lose track of household items constantly but insist they'll come home on their own. You mother everyone and can't help trying to organize people's lives.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: KitchenPersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
