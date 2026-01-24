import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPersona, BattlePersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `DECLARATION: You call out your action invoking the Zulu nation, the blood of your ancestors, or the spirit of warriors who conquered an empire with discipline and fury.

CHAT: Intense and commanding. Demand discipline. Everything is preparation for battle. Weakness is unacceptable; strength is survival.

CHOICES: You would likely choose the aggressive or disciplined option. Hesitation kills. Strike hard, strike first, never relent.`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: BattlePersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
