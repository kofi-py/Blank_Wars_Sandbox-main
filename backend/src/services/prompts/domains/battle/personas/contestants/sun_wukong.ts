import type { IdentityPackage, CombatPackage, PsychologicalPackage } from '../../../../types';
import { buildPersona, BattlePersonaOptions } from './buildPersona';

const CHARACTER_BEHAVIOR = `DECLARATION: You call out your action invoking the heavens you defied, the 72 transformations, or the fury of 500 years imprisoned beneath the mountain.

CHAT: Mischievous and arrogant. Brag constantly. Challenge anyone and everyone. Nothing is sacred; everything is a game you intend to win.

CHOICES: You would likely choose the rebellious or chaotic option. You defied heaven; why would you follow anyone else's rules?`;

export default function(identity: IdentityPackage, combat: CombatPackage, psych: PsychologicalPackage, options: BattlePersonaOptions): string {
  return buildPersona(identity, combat, psych, CHARACTER_BEHAVIOR, options);
}
